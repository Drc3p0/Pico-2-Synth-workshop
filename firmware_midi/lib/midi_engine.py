"""USB MIDI engine for the Pico music workshop."""

import time


def _optional_import(module_name):
    try:
        return __import__(module_name, None, None, ["*"])
    except Exception:
        return None


board = _optional_import("board")
usb_midi_module = _optional_import("usb_midi")
adafruit_midi_module = _optional_import("adafruit_midi")
note_on_module = _optional_import("adafruit_midi.note_on")
note_off_module = _optional_import("adafruit_midi.note_off")
cc_module = _optional_import("adafruit_midi.control_change")
inputs_module = _optional_import("lib.inputs")

if inputs_module is None:
    inputs_module = _optional_import("inputs")


class _FallbackButtonManager:
    def __init__(self, pins=None):
        self.available = False

    def check(self):
        return []


class _FallbackSmoothedAnalog:
    def __init__(self, pin, alpha=0.2):
        self.available = False

    @property
    def cc_value(self):
        return 0


class _FallbackOptionalVL53L0X:
    def __init__(self, sda=None, scl=None):
        self.available = False

    def normalized(self, min_mm=50, max_mm=500):
        return 0.0


ButtonManagerClass = _FallbackButtonManager
SmoothedAnalogClass = _FallbackSmoothedAnalog
OptionalVL53L0XClass = _FallbackOptionalVL53L0X

if inputs_module is not None:
    maybe_button_manager = getattr(inputs_module, "ButtonManager", None)
    maybe_smoothed_analog = getattr(inputs_module, "SmoothedAnalog", None)
    maybe_vl53 = getattr(inputs_module, "OptionalVL53L0X", None)

    if maybe_button_manager is not None:
        ButtonManagerClass = maybe_button_manager
    if maybe_smoothed_analog is not None:
        SmoothedAnalogClass = maybe_smoothed_analog
    if maybe_vl53 is not None:
        OptionalVL53L0XClass = maybe_vl53

NoteOn = getattr(note_on_module, "NoteOn", None)
NoteOff = getattr(note_off_module, "NoteOff", None)
ControlChange = getattr(cc_module, "ControlChange", None)


def _clamp_int(value, lower, upper):
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _pin(name):
    if board is None:
        return None
    return getattr(board, name, None)


class MIDIEngine:
    """Maps workshop inputs to USB MIDI notes and CC messages."""

    DEFAULT_BUTTON_NOTES = [60, 62, 64, 65]

    DEFAULT_CONFIG = {
        "midi_channel": 0,
        "button_notes": DEFAULT_BUTTON_NOTES,
        "pot_a_cc": 7,
        "pot_b_cc": 10,
        "ldr_cc": 74,
        "tof_cc": 1,
        "velocity": 127,
    }

    @staticmethod
    def _get_int_setting(config_dict, key, default):
        value = config_dict.get(key, default)
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        return default

    @classmethod
    def _get_button_notes(cls, config_dict):
        value = config_dict.get("button_notes", cls.DEFAULT_BUTTON_NOTES)
        if not isinstance(value, (list, tuple)):
            return list(cls.DEFAULT_BUTTON_NOTES)

        notes = []
        for note_value in value:
            if isinstance(note_value, bool):
                notes.append(int(note_value))
            elif isinstance(note_value, int):
                notes.append(note_value)
            elif isinstance(note_value, float):
                notes.append(int(note_value))

            if len(notes) >= len(cls.DEFAULT_BUTTON_NOTES):
                break

        while len(notes) < len(cls.DEFAULT_BUTTON_NOTES):
            notes.append(cls.DEFAULT_BUTTON_NOTES[len(notes)])

        return notes

    def __init__(self, config):
        merged_config = dict(self.DEFAULT_CONFIG)
        if isinstance(config, dict):
            for key, value in config.items():
                merged_config[key] = value

        self.midi_channel = _clamp_int(
            self._get_int_setting(merged_config, "midi_channel", 0),
            0,
            15,
        )
        self.button_notes = self._get_button_notes(merged_config)
        self.pot_a_cc = _clamp_int(self._get_int_setting(merged_config, "pot_a_cc", 7), 0, 127)
        self.pot_b_cc = _clamp_int(self._get_int_setting(merged_config, "pot_b_cc", 10), 0, 127)
        self.ldr_cc = _clamp_int(self._get_int_setting(merged_config, "ldr_cc", 74), 0, 127)
        self.tof_cc = _clamp_int(self._get_int_setting(merged_config, "tof_cc", 1), 0, 127)
        self.velocity = _clamp_int(self._get_int_setting(merged_config, "velocity", 127), 0, 127)

        self.tof_min_mm = self._get_int_setting(merged_config, "tof_min_mm", 50)
        self.tof_max_mm = self._get_int_setting(merged_config, "tof_max_mm", 500)

        self._midi = None
        self._setup_midi()

        self.buttons = ButtonManagerClass((
            _pin("GP2"),
            _pin("GP3"),
            _pin("GP4"),
            _pin("GP5"),
        ))

        self.pot_a = SmoothedAnalogClass(_pin("GP26"), alpha=0.2)
        self.pot_b = SmoothedAnalogClass(_pin("GP27"), alpha=0.2)
        self.ldr = SmoothedAnalogClass(_pin("GP28"), alpha=0.15)
        self.tof = OptionalVL53L0XClass(sda=_pin("GP4"), scl=_pin("GP5"))

        self._analog_interval = 0.01
        self._last_analog_time = 0.0
        self._last_cc_values = {}

    def _setup_midi(self):
        if adafruit_midi_module is None or usb_midi_module is None:
            self._midi = None
            return

        try:
            midi_out_port = usb_midi_module.ports[1]
            self._midi = adafruit_midi_module.MIDI(
                midi_out=midi_out_port,
                out_channel=self.midi_channel,
            )
        except Exception:
            self._midi = None

    def _send(self, message):
        if self._midi is None or message is None:
            return

        try:
            self._midi.send(message)
        except Exception:
            pass

    def _note_for_button(self, button_index):
        if 0 <= button_index < len(self.button_notes):
            return _clamp_int(int(self.button_notes[button_index]), 0, 127)

        fallback_notes = self.DEFAULT_BUTTON_NOTES
        if 0 <= button_index < len(fallback_notes):
            return fallback_notes[button_index]

        return 60

    def _handle_button_event(self, button_index, pressed):
        note = self._note_for_button(button_index)

        if pressed:
            if NoteOn is None:
                return
            self._send(NoteOn(note, self.velocity))
            return

        if NoteOff is None:
            return
        self._send(NoteOff(note, 0))

    def _send_cc_if_changed(self, key, cc_number, cc_value):
        cc_value = _clamp_int(int(cc_value), 0, 127)
        last_value = self._last_cc_values.get(key)

        if last_value == cc_value:
            return

        self._last_cc_values[key] = cc_value

        if ControlChange is None:
            return
        self._send(ControlChange(cc_number, cc_value))

    def _read_tof_cc_value(self):
        if not self.tof.available:
            return None

        normalized = self.tof.normalized(self.tof_min_mm, self.tof_max_mm)
        return _clamp_int(int(normalized * 127), 0, 127)

    def _update_continuous_controls(self):
        self._send_cc_if_changed("pot_a", self.pot_a_cc, self.pot_a.cc_value)
        self._send_cc_if_changed("pot_b", self.pot_b_cc, self.pot_b.cc_value)
        self._send_cc_if_changed("ldr", self.ldr_cc, self.ldr.cc_value)

        tof_cc_value = self._read_tof_cc_value()
        if tof_cc_value is not None:
            self._send_cc_if_changed("tof", self.tof_cc, tof_cc_value)

    def run(self):
        while True:
            button_events = self.buttons.check()
            for button_index, pressed in button_events:
                self._handle_button_event(button_index, pressed)

            now = time.monotonic()
            if (now - self._last_analog_time) >= self._analog_interval:
                self._last_analog_time = now
                self._update_continuous_controls()
