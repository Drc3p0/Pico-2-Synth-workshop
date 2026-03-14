CONFIG = {
    "midi_channel": 0,
    "button_notes": [48, 55, 60, 64],
    "pot_a_cc": 7,
    "pot_b_cc": 91,
    "ldr_cc": 74,
    "tof_cc": 11,
    "velocity": 127,
}

_midi_engine_module = __import__("lib.midi_engine", None, None, ["MIDIEngine"])
MIDIEngine = getattr(_midi_engine_module, "MIDIEngine")

engine = MIDIEngine(CONFIG)
engine.run()
