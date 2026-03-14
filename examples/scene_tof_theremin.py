# ============================================
# PICO MUSIC WORKSHOP — ToF Theremin
# Gesture-based lead where hand distance bends pitch in real time.
# ============================================

# pyright: reportMissingImports=false, reportUnknownVariableType=false, reportUnknownMemberType=false

# A theremin is played without touching the instrument.
# Here, proximity data acts like a virtual pitch hand.
CONFIG = {
    # Lead preset keeps notes focused and expressive.
    "patch": "lead",
    # Full major-scale intervals for melodic freedom.
    "scale": [0, 2, 4, 5, 7, 9, 11],
    # C3 center so bends can travel up or down musically.
    "base_note": 48,
    # Pot A shapes brightness while performing.
    "pot_a_controls": "filter",
    # Pot B adds rhythmic space with echo.
    "pot_b_controls": "echo_mix",
    # LDR adjusts room/reverb size for depth.
    "ldr_controls": "reverb_room",
    # Hand distance maps to pitch bend, theremin-style.
    "tof_controls": "pitch_bend",
}

# ============================================
# Engine (don't edit below this line)
# ============================================
from lib.synth_engine import SynthEngine
engine = SynthEngine(CONFIG)
engine.run()
