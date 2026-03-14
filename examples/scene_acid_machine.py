# ============================================
# PICO MUSIC WORKSHOP — Acid Machine
# Punchy, repetitive lead phrasing inspired by classic acid lines.
# ============================================

# pyright: reportMissingImports=false, reportUnknownVariableType=false, reportUnknownMemberType=false

# Acid house grew from simple sequencers, resonant filters,
# and hypnotic repetition. This scene leans into that formula.
CONFIG = {
    # "lead" gives sharper transients and cut for squelchy riffs.
    "patch": "lead",
    # Repetitive interval pattern emphasizes root notes,
    # with occasional octave and fifth jumps for acid motion.
    "scale": [0, 0, 12, 0, 0, 7, 0, 12],
    # C2 keeps the line heavy and club-friendly.
    "base_note": 36,
    # Resonant filter sweep is the core acid performance gesture.
    "pot_a_controls": "filter",
    # Distortion drive adds bite and harmonic aggression.
    "pot_b_controls": "distortion_drive",
    # LDR directly pushes filter frequency for expressive squelch.
    "ldr_controls": "filter_freq",
    # Optional ToF mapping for hand-controlled pitch bends.
    "tof_controls": "pitch_bend",
}

# ============================================
# Engine (don't edit below this line)
# ============================================
from lib.synth_engine import SynthEngine
engine = SynthEngine(CONFIG)
engine.run()
