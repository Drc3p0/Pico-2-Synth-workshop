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


map_range = _load_symbol(("lib.helpers", "helpers"), "map_range")
clamp = _load_symbol(("lib.helpers", "helpers"), "clamp")
lerp = _load_symbol(("lib.helpers", "helpers"), "lerp")

SmoothedAnalog = _load_symbol(("lib.inputs", "inputs"), "SmoothedAnalog")
ButtonManager = _load_symbol(("lib.inputs", "inputs"), "ButtonManager")
OptionalVL53L0X = _load_symbol(("lib.inputs", "inputs"), "OptionalVL53L0X")

get_patch = _load_symbol(("lib.patches", "patches"), "get_patch")
get_waveform = _load_symbol(("lib.patches", "patches"), "get_waveform")

EffectsChain = _load_symbol(("lib.fx", "fx"), "EffectsChain")


SAMPLE_RATE = 28000
CHANNEL_COUNT = 1
BUFFER_SIZE = 4096

WAVE_SIZE = 256
WAVE_AMP = 32767

DEFAULT_SCALE = [0, 2, 4, 7, 9]
DEFAULT_BASE_NOTE = 48


class SynthEngine:
    def __init__(self, config):
        defaults = {
            "patch": "pad",
            "scale": DEFAULT_SCALE,
            "base_note": DEFAULT_BASE_NOTE,
            "pot_a_controls": "filter",
            "pot_b_controls": "echo_mix",
            "ldr_controls": "vibrato_depth",
            "tof_controls": "pitch_bend",
        }

        self.config = defaults.copy()
        if isinstance(config, dict):
            self.config.update(config)

        self.scale = self._validate_scale(self.config.get("scale", DEFAULT_SCALE))
        base_note_value = self.config.get("base_note", DEFAULT_BASE_NOTE)
        if isinstance(base_note_value, int):
            self.base_note = base_note_value
        elif isinstance(base_note_value, (float, str)):
            try:
                self.base_note = int(base_note_value)
            except Exception:
                self.base_note = DEFAULT_BASE_NOTE
        else:
            self.base_note = DEFAULT_BASE_NOTE

        self.pot_a_controls = self._pick(
            self.config.get("pot_a_controls"),
            ("filter", "volume", "pitch"),
            "filter",
        )
        self.pot_b_controls = self._pick(
            self.config.get("pot_b_controls"),
            ("echo_mix", "reverb_mix", "distortion_drive"),
            "echo_mix",
        )
        self.ldr_controls = self._pick(
            self.config.get("ldr_controls"),
            ("vibrato_depth", "reverb_room", "filter_freq"),
            "vibrato_depth",
        )
        self.tof_controls = self._pick(
            self.config.get("tof_controls"),
            ("pitch_bend", "filter_freq", "volume"),
            "pitch_bend",
        )

        self.patch = get_patch(self.config.get("patch", "pad"))
        self.waveform = get_waveform(self.patch.get("waveform", "sine"))
        self.envelope = self._build_envelope()

        self.filter_freq = clamp(float(self.patch.get("filter_freq", 1000.0)), 200.0, 8000.0)
        self.filter_q = clamp(float(self.patch.get("filter_q", 1.0)), 0.5, 4.0)
        self.vibrato_rate = max(0.0, float(self.patch.get("vibrato_rate", 0.0)))
        self.vibrato_depth = clamp(float(self.patch.get("vibrato_depth", 0.0)), 0.0, 0.1)
        self.detune = clamp(float(self.patch.get("detune", 0.0)), 0.0, 0.01)

        self.pitch_offset_from_pot = 0.0
        self.pitch_offset_from_tof = 0.0
        self.master_volume = 1.0

        self.audio = audiopwmio.PWMAudioOut(board.GP15)
        self.synth = synthio.Synthesizer(sample_rate=SAMPLE_RATE, channel_count=CHANNEL_COUNT)

        try:
            self.effects = EffectsChain(SAMPLE_RATE, CHANNEL_COUNT, BUFFER_SIZE)
            self.mixer = self.effects.build_chain(self.synth)
            self.effects.update_from_patch(self.patch)
        except Exception:
            self.effects = None
            self.mixer = self.synth

        self.audio.play(self.mixer)
        self._set_master_volume(0.95)

        self.buttons = ButtonManager(
            (board.GP2, board.GP3, board.GP4, board.GP5),
            value_when_pressed=False,
            pull=True,
        )

        self.pot_a = SmoothedAnalog(board.GP26, alpha=0.15)
        self.pot_b = SmoothedAnalog(board.GP27, alpha=0.15)
        self.ldr = SmoothedAnalog(board.GP28, alpha=0.15)

        self.tof = OptionalVL53L0X(sda_pin=board.GP4, scl_pin=board.GP5)

        self.active_note = None
        self.active_note_number = None
        self.active_button_index = None
        self.active_filter = None
        self.active_vibrato = None

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

        if not clean:
            return DEFAULT_SCALE[:]

        return clean

    def _build_envelope(self):
        return synthio.Envelope(
            attack_time=max(0.0, float(self.patch.get("attack_time", 0.01))),
            decay_time=max(0.0, float(self.patch.get("decay_time", 0.2))),
            sustain_level=clamp(float(self.patch.get("sustain_level", 0.7)), 0.0, 1.0),
            release_time=max(0.0, float(self.patch.get("release_time", 0.2))),
        )

    def _midi_note_for_button(self, button_index):
        scale_step = self.scale[button_index % len(self.scale)]
        return self.base_note + scale_step

    def _note_frequency(self, midi_note):
        bend_semitones = self.pitch_offset_from_pot + self.pitch_offset_from_tof
        frequency = synthio.midi_to_hz(midi_note + bend_semitones)
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
        self.active_button_index = None
        self.active_filter = None
        self.active_vibrato = None

    def _press_note(self, midi_note, button_index):
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
        self.active_button_index = button_index

    def _refresh_active_frequency(self):
        if self.active_note is None or self.active_note_number is None:
            return

        try:
            self.active_note.frequency = self._note_frequency(self.active_note_number)
        except Exception:
            pass

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

    def _apply_buttons(self):
        for button_index, pressed in self.buttons.check():
            if pressed:
                self._press_note(self._midi_note_for_button(button_index), button_index)
            elif button_index == self.active_button_index:
                self._release_note()

    def _apply_pot_a(self, normalized):
        if self.pot_a_controls == "filter":
            self._set_filter_frequency(map_range(normalized, 0.0, 1.0, 200.0, 4000.0))
        elif self.pot_a_controls == "volume":
            self._set_master_volume(map_range(normalized, 0.0, 1.0, 0.05, 1.0))
        elif self.pot_a_controls == "pitch":
            self.pitch_offset_from_pot = map_range(normalized, 0.0, 1.0, -12.0, 12.0)
            self._refresh_active_frequency()

    def _apply_pot_b(self, normalized):
        if self.effects is None:
            return
        if self.pot_b_controls == "echo_mix":
            self.effects.update_from_sensors(normalized, None)
        elif self.pot_b_controls == "reverb_mix":
            self.effects.set_reverb_mix(normalized)
        elif self.pot_b_controls == "distortion_drive":
            self.effects.set_distortion_drive(normalized)

    def _apply_ldr(self, normalized):
        if self.ldr_controls == "vibrato_depth":
            self._set_vibrato_depth(map_range(normalized, 0.0, 1.0, 0.0, 0.1))
        elif self.ldr_controls == "reverb_room":
            if self.effects is not None:
                self.effects.update_from_sensors(None, normalized)
        elif self.ldr_controls == "filter_freq":
            self._set_filter_frequency(map_range(normalized, 0.0, 1.0, 200.0, 4000.0))

    def _apply_tof(self):
        if not self.tof.available:
            if self.pitch_offset_from_tof != 0.0:
                self.pitch_offset_from_tof = 0.0
                self._refresh_active_frequency()
            return

        normalized = self.tof.normalized()
        if normalized is None:
            return

        if self.tof_controls == "pitch_bend":
            self.pitch_offset_from_tof = map_range(normalized, 0.0, 1.0, -7.0, 7.0)
            self._refresh_active_frequency()
        else:
            if self.pitch_offset_from_tof != 0.0:
                self.pitch_offset_from_tof = 0.0
                self._refresh_active_frequency()

            if self.tof_controls == "filter_freq":
                self._set_filter_frequency(map_range(normalized, 0.0, 1.0, 200.0, 4000.0))
            elif self.tof_controls == "volume":
                self._set_master_volume(map_range(normalized, 0.0, 1.0, 0.05, 1.0))

    def run(self):
        while True:
            self._apply_buttons()

            self._apply_pot_a(self.pot_a.normalized)
            self._apply_pot_b(self.pot_b.normalized)
            self._apply_ldr(self.ldr.normalized)
            self._apply_tof()

            time.sleep(0.005)
