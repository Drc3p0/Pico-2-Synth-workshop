CONFIG = {
    "midi_channel": 0,
    "button_notes": [36, 38, 42, 46],
    "pot_a_cc": 7,
    "pot_b_cc": 10,
    "ldr_cc": 74,
    "tof_cc": 1,
    "velocity": 100,
}

_midi_engine_module = __import__("lib.midi_engine", None, None, ["MIDIEngine"])
MIDIEngine = getattr(_midi_engine_module, "MIDIEngine")

engine = MIDIEngine(CONFIG)
engine.run()
