"""Pico 2 Synth Engine -- feature-packed, student-configurable.

Supports:
  - 8 built-in voices, cycled with a dedicated button
  - LED voice indicator (NeoPixel or RGB)
  - Buttons and/or capacitive touchpads for notes (any GPIO)
  - Analog inputs on any ADC pin, each mappable to any parameter
  - I2C sensors: VL53L0X ToF + LIS3DH accelerometer (shared bus)
  - Full FX chain: echo, reverb, distortion, lowpass filter
  - All parameters mappable to any input via CONFIG
"""

import time

board = __import__("board")
audiopwmio = __import__("audiopwmio")
synthio = __import__("synthio")


def _load_symbol(module_names, symbol_name):
    for module_name in module_names:
        try:
            module = __import__(module_name, None, None, (symbol_name,), 0)
            return getattr(module, symbol_name)
        except Exception:
            continue
    raise ImportError(symbol_name)


# Helpers
map_range = _load_symbol(("lib.helpers", "helpers"), "map_range")
clamp = _load_symbol(("lib.helpers", "helpers"), "clamp")
lerp = _load_symbol(("lib.helpers", "helpers"), "lerp")

# Inputs
SmoothedAnalog = _load_symbol(("lib.inputs", "inputs"), "SmoothedAnalog")
ButtonManager = _load_symbol(("lib.inputs", "inputs"), "ButtonManager")
TouchManager = _load_symbol(("lib.inputs", "inputs"), "TouchManager")
SingleButton = _load_symbol(("lib.inputs", "inputs"), "SingleButton")
OptionalVL53L0X = _load_symbol(("lib.inputs", "inputs"), "OptionalVL53L0X")
OptionalLIS3DH = _load_symbol(("lib.inputs", "inputs"), "OptionalLIS3DH")
make_shared_i2c = _load_symbol(("lib.inputs", "inputs"), "make_shared_i2c")

# Patches / voices
get_voice = _load_symbol(("lib.patches", "patches"), "get_voice")
get_waveform = _load_symbol(("lib.patches", "patches"), "get_waveform")
NUM_VOICES = _load_symbol(("lib.patches", "patches"), "NUM_VOICES")

# Effects
EffectsChain = _load_symbol(("lib.fx", "fx"), "EffectsChain")

# LED
VoiceLED = _load_symbol(("lib.voice_led", "voice_led"), "VoiceLED")


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SAMPLE_RATE = 28000
CHANNEL_COUNT = 1
BUFFER_SIZE = 4096

DEFAULT_SCALE = [0, 2, 4, 7, 9]
DEFAULT_BASE_NOTE = 48

# All valid mapping targets that an input can control
VALID_TARGETS = (
    "filter",
    "volume",
    "pitch",
    "echo_mix",
    "echo_delay",
    "echo_decay",
    "reverb_mix",
    "reverb_room",
    "reverb_damp",
    "distortion_mix",
    "distortion_drive",
    "vibrato_depth",
    "vibrato_rate",
    "attack",
    "release",
    "pitch_bend",
    "filter_freq",
    "none",
)


# ---------------------------------------------------------------------------
# SynthEngine
# ---------------------------------------------------------------------------

class SynthEngine:
    def __init__(self, config):
        # ---- Merge config with defaults ------------------------------------
        defaults = {
            # Audio output
            "audio_pin": 15,

            # Voice
            "start_voice": 0,

            # Scale / tuning
            "scale": DEFAULT_SCALE,
            "base_note": DEFAULT_BASE_NOTE,

            # Note inputs -- buttons (pull-up, active LOW)
            "button_pins": [2, 3, 6, 7],

            # Note inputs -- capacitive touch (optional, empty = disabled)
            "touch_pins": [],
            "touch_threshold_adjust": 0,

            # Voice cycle button
            "voice_button_pin": 8,

            # LED indicator
            "led_mode": "neopixel",       # "neopixel" or "rgb"
            "neopixel_pin": 16,
            "rgb_pins": [17, 18, 19],     # [R, G, B] GPIOs
            "led_brightness": 0.4,

            # Analog inputs: list of dicts, each with "pin" and "controls"
            # Default: two pots + one LDR
            "analog_inputs": [
                {"pin": 26, "controls": "filter",     "alpha": 0.15},
                {"pin": 27, "controls": "echo_mix",   "alpha": 0.15},
                {"pin": 28, "controls": "vibrato_depth", "alpha": 0.15},
            ],

            # I2C bus
            "i2c_sda": 4,
            "i2c_scl": 5,

            # ToF sensor mapping
            "tof_controls": "pitch_bend",

            # Accelerometer mappings
            "accel_x_controls": "filter_freq",
            "accel_y_controls": "reverb_mix",
            "accel_shake_controls": "vibrato_depth",
        }

        self.config = defaults.copy()
        if isinstance(config, dict):
            self.config.update(config)

        # ---- Scale / tuning ------------------------------------------------
        self.scale = self._validate_scale(self.config.get("scale", DEFAULT_SCALE))
        self.base_note = self._to_int(self.config.get("base_note"), DEFAULT_BASE_NOTE)

        # ---- Voice system --------------------------------------------------
        self.voice_index = self._to_int(self.config.get("start_voice"), 0) % NUM_VOICES
        self.voice = get_voice(self.voice_index)
        self.waveform = get_waveform(self.voice.get("waveform", "sine"))
        self.envelope = self._build_envelope()

        # Per-voice synth parameters
        self.filter_freq = clamp(float(self.voice.get("filter_freq", 1000.0)), 200.0, 8000.0)
        self.filter_q = clamp(float(self.voice.get("filter_q", 1.0)), 0.5, 4.0)
        self.vibrato_rate = max(0.0, float(self.voice.get("vibrato_rate", 0.0)))
        self.vibrato_depth = clamp(float(self.voice.get("vibrato_depth", 0.0)), 0.0, 0.1)
        self.detune = clamp(float(self.voice.get("detune", 0.0)), 0.0, 0.01)

        self.pitch_offset_from_input = 0.0
        self.master_volume = 1.0

        # ---- Audio output --------------------------------------------------
        audio_pin_obj = self._get_pin(self.config.get("audio_pin", 15))
        self.audio = audiopwmio.PWMAudioOut(audio_pin_obj)
        self.synth = synthio.Synthesizer(
            sample_rate=SAMPLE_RATE,
            channel_count=CHANNEL_COUNT,
        )

        # ---- Effects chain -------------------------------------------------
        try:
            self.effects = EffectsChain(SAMPLE_RATE, CHANNEL_COUNT, BUFFER_SIZE)
            self.mixer = self.effects.build_chain(self.synth)
            self.effects.update_from_patch(self.voice)
        except Exception:
            self.effects = None
            self.mixer = self.synth

        self.audio.play(self.mixer)
        self._set_master_volume(0.95)

        # ---- Note inputs: buttons ------------------------------------------
        btn_pins = self.config.get("button_pins", [])
        if btn_pins:
            self.buttons = ButtonManager(
                btn_pins,
                value_when_pressed=False,
                pull=True,
            )
        else:
            self.buttons = None

        # ---- Note inputs: touchpads ----------------------------------------
        touch_pins = self.config.get("touch_pins", [])
        if touch_pins:
            self.touch = TouchManager(
                touch_pins,
                threshold_adjust=self.config.get("touch_threshold_adjust", 0),
            )
        else:
            self.touch = None

        # Total note count (buttons first, then touchpads)
        self._button_count = self.buttons.count if self.buttons and self.buttons.available else 0
        self._touch_count = self.touch.count if self.touch and self.touch.available else 0
        self._total_notes = self._button_count + self._touch_count

        # ---- Voice cycle button --------------------------------------------
        vc_pin = self.config.get("voice_button_pin")
        if vc_pin is not None:
            self.voice_button = SingleButton(vc_pin, value_when_pressed=False, pull=True)
        else:
            self.voice_button = None

        # ---- LED indicator -------------------------------------------------
        led_mode = self.config.get("led_mode", "neopixel")
        try:
            self.led = VoiceLED(
                mode=led_mode,
                neopixel_pin=self.config.get("neopixel_pin", 16),
                rgb_pins=self.config.get("rgb_pins", [17, 18, 19]),
                brightness=self.config.get("led_brightness", 0.4),
            )
            self.led.set_voice(self.voice_index)
        except Exception:
            self.led = None

        # ---- Analog inputs -------------------------------------------------
        self.analog_inputs = []
        for adef in self.config.get("analog_inputs", []):
            pin = adef.get("pin")
            controls = adef.get("controls", "none")
            alpha = adef.get("alpha", 0.15)
            if pin is not None:
                sa = SmoothedAnalog(pin, alpha=alpha)
                if sa.available:
                    self.analog_inputs.append({"sensor": sa, "controls": controls})

        # ---- I2C bus (shared) ----------------------------------------------
        self._i2c = make_shared_i2c(
            sda_pin=self.config.get("i2c_sda", 4),
            scl_pin=self.config.get("i2c_scl", 5),
        )

        # ---- ToF sensor ----------------------------------------------------
        tof_target = self.config.get("tof_controls", "pitch_bend")
        if tof_target != "none":
            self.tof = OptionalVL53L0X(i2c=self._i2c)
            self.tof_controls = self._pick(tof_target, VALID_TARGETS, "pitch_bend")
        else:
            self.tof = None
            self.tof_controls = "none"

        # ---- LIS3DH accelerometer -----------------------------------------
        accel_x = self.config.get("accel_x_controls", "none")
        accel_y = self.config.get("accel_y_controls", "none")
        accel_shake = self.config.get("accel_shake_controls", "none")
        any_accel = (accel_x != "none" or accel_y != "none" or accel_shake != "none")

        if any_accel:
            self.accel = OptionalLIS3DH(i2c=self._i2c)
            self.accel_x_controls = self._pick(accel_x, VALID_TARGETS, "none")
            self.accel_y_controls = self._pick(accel_y, VALID_TARGETS, "none")
            self.accel_shake_controls = self._pick(accel_shake, VALID_TARGETS, "none")
        else:
            self.accel = None
            self.accel_x_controls = "none"
            self.accel_y_controls = "none"
            self.accel_shake_controls = "none"

        # ---- Active note tracking ------------------------------------------
        self.active_note = None
        self.active_note_number = None
        self.active_input_id = None  # ("button", idx) or ("touch", idx)
        self.active_filter = None
        self.active_vibrato = None

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    def _to_int(self, value, default):
        if isinstance(value, int):
            return value
        try:
            return int(value)
        except Exception:
            return default

    def _get_pin(self, pin_id):
        if hasattr(pin_id, "__class__") and not isinstance(pin_id, (int, str)):
            return pin_id
        if isinstance(pin_id, int):
            name = "GP{}".format(pin_id)
        else:
            name = str(pin_id).upper()
        return getattr(board, name)

    def _pick(self, value, allowed, fallback):
        if value in allowed:
            return value
        return fallback

    def _validate_scale(self, scale):
        if not isinstance(scale, list) or not scale:
            return DEFAULT_SCALE[:]
        clean = []
        for item in scale:
            try:
                clean.append(int(item))
            except Exception:
                continue
        return clean if clean else DEFAULT_SCALE[:]

    def _build_envelope(self):
        return synthio.Envelope(
            attack_time=max(0.0, float(self.voice.get("attack_time", 0.01))),
            decay_time=max(0.0, float(self.voice.get("decay_time", 0.2))),
            sustain_level=clamp(float(self.voice.get("sustain_level", 0.7)), 0.0, 1.0),
            release_time=max(0.0, float(self.voice.get("release_time", 0.2))),
        )

    # -----------------------------------------------------------------------
    # Voice cycling
    # -----------------------------------------------------------------------

    def _switch_voice(self, index):
        """Load a new voice by index, updating waveform, envelope, and FX."""
        self._release_note()
        self.voice_index = index % NUM_VOICES
        self.voice = get_voice(self.voice_index)
        self.waveform = get_waveform(self.voice.get("waveform", "sine"))
        self.envelope = self._build_envelope()

        self.filter_freq = clamp(float(self.voice.get("filter_freq", 1000.0)), 200.0, 8000.0)
        self.filter_q = clamp(float(self.voice.get("filter_q", 1.0)), 0.5, 4.0)
        self.vibrato_rate = max(0.0, float(self.voice.get("vibrato_rate", 0.0)))
        self.vibrato_depth = clamp(float(self.voice.get("vibrato_depth", 0.0)), 0.0, 0.1)
        self.detune = clamp(float(self.voice.get("detune", 0.0)), 0.0, 0.01)

        if self.effects is not None:
            self.effects.update_from_patch(self.voice)

        if self.led is not None:
            try:
                self.led.set_voice(self.voice_index)
            except Exception:
                pass

    def _next_voice(self):
        self._switch_voice(self.voice_index + 1)

    # -----------------------------------------------------------------------
    # Note generation
    # -----------------------------------------------------------------------

    def _midi_note_for_index(self, note_index):
        scale_step = self.scale[note_index % len(self.scale)]
        octave_offset = (note_index // len(self.scale)) * 12
        return self.base_note + scale_step + octave_offset

    def _note_frequency(self, midi_note):
        bend = self.pitch_offset_from_input
        frequency = synthio.midi_to_hz(midi_note + bend)
        if self.detune > 0.0:
            frequency *= 1.0 + self.detune
        return frequency

    def _build_note_filter(self, frequency):
        try:
            return synthio.BlockBiquad(
                synthio.FilterMode.LOW_PASS,
                frequency=frequency,
                Q=self.filter_q,
            )
        except Exception:
            return None

    def _build_vibrato(self):
        if self.vibrato_rate <= 0.0 or self.vibrato_depth <= 0.0:
            return None
        return synthio.LFO(
            rate=self.vibrato_rate,
            scale=self.vibrato_depth / 12.0,
            offset=0.0,
        )

    def _release_note(self):
        if self.active_note is None:
            return
        try:
            self.synth.release(self.active_note)
        except Exception:
            pass
        self.active_note = None
        self.active_note_number = None
        self.active_input_id = None
        self.active_filter = None
        self.active_vibrato = None

    def _press_note(self, midi_note, input_id):
        self._release_note()

        note_kwargs = {
            "waveform": self.waveform,
            "envelope": self.envelope,
        }

        self.active_filter = self._build_note_filter(self.filter_freq)
        if self.active_filter is not None:
            note_kwargs["filter"] = self.active_filter

        self.active_vibrato = self._build_vibrato()
        if self.active_vibrato is not None:
            note_kwargs["bend"] = self.active_vibrato

        note = synthio.Note(self._note_frequency(midi_note), **note_kwargs)
        try:
            note.amplitude = 1.0
        except Exception:
            pass

        self.synth.press(note)
        self.active_note = note
        self.active_note_number = midi_note
        self.active_input_id = input_id

    def _refresh_active_frequency(self):
        if self.active_note is None or self.active_note_number is None:
            return
        try:
            self.active_note.frequency = self._note_frequency(self.active_note_number)
        except Exception:
            pass

    # -----------------------------------------------------------------------
    # Parameter application (unified for any input source)
    # -----------------------------------------------------------------------

    def _set_filter_frequency(self, target_frequency):
        target_frequency = clamp(target_frequency, 200.0, 8000.0)
        self.filter_freq = lerp(self.filter_freq, target_frequency, 0.35)

        if self.active_note is None:
            return
        if self.active_filter is not None:
            try:
                self.active_filter.frequency = self.filter_freq
                return
            except Exception:
                pass
        self.active_filter = self._build_note_filter(self.filter_freq)
        if self.active_filter is not None:
            try:
                self.active_note.filter = self.active_filter
            except Exception:
                pass

    def _set_master_volume(self, volume):
        self.master_volume = clamp(volume, 0.0, 1.0)
        try:
            self.mixer.voice[0].level = self.master_volume
        except Exception:
            pass

    def _set_vibrato_depth(self, depth):
        self.vibrato_depth = clamp(depth, 0.0, 0.1)
        if self.active_note is None:
            return
        if self.active_vibrato is not None:
            try:
                self.active_vibrato.scale = self.vibrato_depth / 12.0
                return
            except Exception:
                pass
        if self.vibrato_depth <= 0.0:
            try:
                self.active_note.bend = 0.0
            except Exception:
                pass
            return
        self.active_vibrato = self._build_vibrato()
        if self.active_vibrato is not None:
            try:
                self.active_note.bend = self.active_vibrato
            except Exception:
                pass

    def _set_vibrato_rate(self, rate):
        self.vibrato_rate = clamp(rate, 0.0, 20.0)
        if self.active_vibrato is not None:
            try:
                self.active_vibrato.rate = self.vibrato_rate
            except Exception:
                pass

    def _apply_target(self, target, normalized, is_bipolar=False):
        """Route a normalized input value (0.0-1.0 or -1.0 to 1.0 for bipolar)
        to the named parameter target."""

        if target == "none":
            return

        # Filter
        if target in ("filter", "filter_freq"):
            if is_bipolar:
                freq = map_range((normalized + 1.0) / 2.0, 0.0, 1.0, 200.0, 4000.0)
            else:
                freq = map_range(normalized, 0.0, 1.0, 200.0, 4000.0)
            self._set_filter_frequency(freq)

        # Volume
        elif target == "volume":
            if is_bipolar:
                vol = map_range(abs(normalized), 0.0, 1.0, 0.05, 1.0)
            else:
                vol = map_range(normalized, 0.0, 1.0, 0.05, 1.0)
            self._set_master_volume(vol)

        # Pitch / pitch bend
        elif target in ("pitch", "pitch_bend"):
            if is_bipolar:
                self.pitch_offset_from_input = normalized * 7.0
            else:
                self.pitch_offset_from_input = map_range(normalized, 0.0, 1.0, -7.0, 7.0)
            self._refresh_active_frequency()

        # Vibrato depth
        elif target == "vibrato_depth":
            if is_bipolar:
                depth = abs(normalized) * 0.1
            else:
                depth = map_range(normalized, 0.0, 1.0, 0.0, 0.1)
            self._set_vibrato_depth(depth)

        # Vibrato rate
        elif target == "vibrato_rate":
            if is_bipolar:
                rate = abs(normalized) * 15.0
            else:
                rate = map_range(normalized, 0.0, 1.0, 0.0, 15.0)
            self._set_vibrato_rate(rate)

        # Attack time (rebuild envelope is expensive, so we store for next note)
        elif target == "attack":
            if is_bipolar:
                val = abs(normalized)
            else:
                val = normalized
            self.voice["attack_time"] = map_range(val, 0.0, 1.0, 0.0, 1.5)
            self.envelope = self._build_envelope()

        # Release time
        elif target == "release":
            if is_bipolar:
                val = abs(normalized)
            else:
                val = normalized
            self.voice["release_time"] = map_range(val, 0.0, 1.0, 0.02, 3.0)
            self.envelope = self._build_envelope()

        # FX: Echo
        elif target == "echo_mix":
            if self.effects:
                self.effects.set_echo_mix(abs(normalized) if is_bipolar else normalized)
        elif target == "echo_delay":
            if self.effects:
                delay = map_range(abs(normalized) if is_bipolar else normalized,
                                  0.0, 1.0, 30.0, 800.0)
                self.effects.set_echo_delay_ms(delay)
        elif target == "echo_decay":
            if self.effects:
                self.effects.set_echo_decay(abs(normalized) if is_bipolar else normalized)

        # FX: Reverb
        elif target == "reverb_mix":
            if self.effects:
                self.effects.set_reverb_mix(abs(normalized) if is_bipolar else normalized)
        elif target == "reverb_room":
            if self.effects:
                self.effects.set_reverb_roomsize(abs(normalized) if is_bipolar else normalized)
        elif target == "reverb_damp":
            if self.effects:
                self.effects.set_reverb_damp(abs(normalized) if is_bipolar else normalized)

        # FX: Distortion
        elif target == "distortion_mix":
            if self.effects:
                self.effects.set_distortion_mix(abs(normalized) if is_bipolar else normalized)
        elif target == "distortion_drive":
            if self.effects:
                self.effects.set_distortion_drive(abs(normalized) if is_bipolar else normalized)

    # -----------------------------------------------------------------------
    # Input polling
    # -----------------------------------------------------------------------

    def _apply_buttons(self):
        if self.buttons is not None and self.buttons.available:
            for idx, pressed in self.buttons.check():
                if pressed:
                    midi = self._midi_note_for_index(idx)
                    self._press_note(midi, ("button", idx))
                elif self.active_input_id == ("button", idx):
                    self._release_note()

    def _apply_touch(self):
        if self.touch is not None and self.touch.available:
            for idx, pressed in self.touch.check():
                # Touch note indices continue after buttons
                note_idx = self._button_count + idx
                if pressed:
                    midi = self._midi_note_for_index(note_idx)
                    self._press_note(midi, ("touch", idx))
                elif self.active_input_id == ("touch", idx):
                    self._release_note()

    def _apply_voice_button(self):
        if self.voice_button is not None and self.voice_button.available:
            if self.voice_button.pressed():
                self._next_voice()

    def _apply_analog(self):
        for ainput in self.analog_inputs:
            sensor = ainput["sensor"]
            target = ainput["controls"]
            if target == "none":
                continue
            self._apply_target(target, sensor.normalized)

    def _apply_tof(self):
        if self.tof is None or not self.tof.available:
            return
        if self.tof_controls == "none":
            return
        normalized = self.tof.normalized()
        if normalized is None:
            return
        self._apply_target(self.tof_controls, normalized)

    def _apply_accel(self):
        if self.accel is None or not self.accel.available:
            return

        # X axis (bipolar: -1.0 to 1.0)
        if self.accel_x_controls != "none":
            self._apply_target(self.accel_x_controls, self.accel.tilt_x, is_bipolar=True)

        # Y axis (bipolar: -1.0 to 1.0)
        if self.accel_y_controls != "none":
            self._apply_target(self.accel_y_controls, self.accel.tilt_y, is_bipolar=True)

        # Shake (unipolar: 0.0 to 1.0)
        if self.accel_shake_controls != "none":
            self._apply_target(self.accel_shake_controls, self.accel.shake)

    # -----------------------------------------------------------------------
    # Main loop
    # -----------------------------------------------------------------------

    def run(self):
        while True:
            self._apply_voice_button()
            self._apply_buttons()
            self._apply_touch()
            self._apply_analog()
            self._apply_tof()
            self._apply_accel()

            time.sleep(0.005)
