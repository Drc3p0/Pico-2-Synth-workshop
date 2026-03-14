# ============================================
# PICO MUSIC WORKSHOP — Beginner Scene
# Simplest starter patch with musical-safe settings.
# ============================================

# pyright: reportMissingImports=false, reportUnknownVariableType=false, reportUnknownMemberType=false

# This CONFIG dictionary is the student-editable surface.
CONFIG = {
    # "pad" is a smooth, sustained preset that is easy to play.
    "patch": "pad",
    # Major pentatonic intervals (relative to base_note).
    # This scale is forgiving, so random button presses still sound good.
    "scale": [0, 2, 4, 7, 9],
    # 48 is C3 in MIDI note numbers.
    # C3 sits in a comfortable low-mid range for beginner ears.
    "base_note": 48,
    # Pot A sweeps the filter (darker <-> brighter tone).
    "pot_a_controls": "filter",
    # Pot B sets how much reverb is mixed in.
    "pot_b_controls": "reverb_mix",
    # LDR controls vibrato amount for expressive movement.
    "ldr_controls": "vibrato_depth",
    # Optional ToF mapping (if the sensor is present in your build).
    "tof_controls": "pitch_bend",
}

# ============================================
# Engine (don't edit below this line)
# ============================================
from lib.synth_engine import SynthEngine
engine = SynthEngine(CONFIG)
engine.run()
