# ============================================
# PICO MUSIC WORKSHOP - Basic MIDI Controller
# 4 buttons for notes, 2 knobs for core mix control
# ============================================

CONFIG = {
    # MIDI channel (1-16 in your DAW, subtract 1 here)
    "midi_channel": 0,

    # Button notes (C major shape)
    "button_notes": [60, 62, 64, 65],

    # CC numbers:
    # CC7  = Channel Volume
    # CC10 = Pan
    # CC74 = Brightness/Filter Cutoff (common synth mapping)
    # CC1  = Mod Wheel (great for vibrato or modulation depth)
    "pot_a_cc": 7,
    "pot_b_cc": 10,
    "ldr_cc": 74,
    "tof_cc": 1,

    "velocity": 127,
}

_midi_engine_module = __import__("lib.midi_engine", None, None, ["MIDIEngine"])
MIDIEngine = getattr(_midi_engine_module, "MIDIEngine")

engine = MIDIEngine(CONFIG)
engine.run()
