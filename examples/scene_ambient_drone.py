# ============================================
# PICO MUSIC WORKSHOP — Ambient Drone
# Slow, spacious textures with wide harmonic intervals.
# ============================================

# pyright: reportMissingImports=false, reportUnknownVariableType=false, reportUnknownMemberType=false

# This scene is designed for long notes and gradual movement.
# Keep notes held, then sculpt the atmosphere with controls.
CONFIG = {
    # Soft pad source keeps the tone smooth and continuous.
    "patch": "pad",
    # Wide interval set: root, fifth, octave, and octave+fifth.
    # This creates open harmony that feels cinematic and calm.
    "scale": [0, 7, 12, 19],
    # C2 foundation for a deep drone bed.
    "base_note": 36,
    # Sweep filter slowly to add evolving brightness motion.
    "pot_a_controls": "filter",
    # Push reverb high for a washed-out ambient space.
    "pot_b_controls": "reverb_mix",
    # Subtle vibrato depth adds gentle organic drift.
    "ldr_controls": "vibrato_depth",
    # Optional ToF sensor bends pitch for occasional glides.
    "tof_controls": "pitch_bend",
}

# ============================================
# Engine (don't edit below this line)
# ============================================
from lib.synth_engine import SynthEngine
engine = SynthEngine(CONFIG)
engine.run()
