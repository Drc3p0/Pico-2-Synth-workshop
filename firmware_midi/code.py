# ============================================
# PICO MUSIC WORKSHOP - MIDI Controller Track
# Edit the settings below, then save!
# ============================================

CONFIG = {
    # MIDI channel (1-16 in your DAW, subtract 1 here)
    "midi_channel": 0,  # = MIDI channel 1

    # Notes for each button (MIDI note numbers)
    # Button 1=GP2, Button 2=GP3, Button 3=GP4, Button 4=GP5
    "button_notes": [60, 62, 64, 65],  # C4, D4, E4, F4

    # CC assignments for knobs and sensors
    "pot_a_cc": 7,     # Knob A -> Volume (CC7)
    "pot_b_cc": 10,    # Knob B -> Pan (CC10)
    "ldr_cc": 74,      # Light sensor -> Filter Cutoff (CC74)
    "tof_cc": 1,       # Distance sensor -> Mod Wheel (CC1)

    # Note velocity (0-127, how hard the note hits)
    "velocity": 127,
}

# ============================================
# Engine (don't edit below this line)
# ============================================
from lib.midi_engine import MIDIEngine

engine = MIDIEngine(CONFIG)
engine.run()
