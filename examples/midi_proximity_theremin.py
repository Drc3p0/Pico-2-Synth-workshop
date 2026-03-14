CONFIG = {
    "midi_channel": 0,
    "button_notes": [72, 74, 76, 79],
    "pot_a_cc": 7,
    "pot_b_cc": 10,
    "ldr_cc": 74,
    "tof_cc": 1,
    "velocity": 127,
}

# DAW tip: map incoming CC1 to your synth's pitch bend or oscillator pitch range.
_midi_engine_module = __import__("lib.midi_engine", None, None, ["MIDIEngine"])
MIDIEngine = getattr(_midi_engine_module, "MIDIEngine")

engine = MIDIEngine(CONFIG)
engine.run()
