# ============================================
# PICO MUSIC WORKSHOP — Synth Track
# Edit the settings below, then save!
# ============================================

CONFIG = {
    # Choose your sound: "pad", "bass", "pluck", "lead"
    "patch": "pad",

    # Musical scale (semitone offsets from base note)
    # Pentatonic: [0, 2, 4, 7, 9]  Major: [0, 2, 4, 5, 7, 9, 11]  Blues: [0, 3, 5, 6, 7, 10]
    "scale": [0, 2, 4, 7, 9],

    # Base MIDI note (48 = C3, 60 = C4)
    "base_note": 48,

    # What each sensor controls
    "pot_a_controls": "filter",        # Knob A: "filter", "volume", "pitch"
    "pot_b_controls": "echo_mix",      # Knob B: "echo_mix", "reverb_mix", "distortion_drive"
    "ldr_controls": "vibrato_depth",   # Light sensor: "vibrato_depth", "reverb_room", "filter_freq"
    "tof_controls": "pitch_bend",      # Distance sensor: "pitch_bend", "filter_freq", "volume"
}

# ============================================
# Engine (don't edit below this line)
# ============================================
try:
    SynthEngine = __import__("lib.synth_engine", None, None, ("SynthEngine",), 0).SynthEngine
except Exception:
    SynthEngine = __import__("synth_engine", None, None, ("SynthEngine",), 0).SynthEngine
engine = SynthEngine(CONFIG)
engine.run()
