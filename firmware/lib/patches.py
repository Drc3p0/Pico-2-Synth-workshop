import math
from array import array

try:
    np = __import__("ulab").numpy
except Exception:
    np = None


WAVE_SIZE = 256
WAVE_AMP = 32767


def _clamp_wave(value):
    if value > WAVE_AMP:
        return WAVE_AMP
    if value < -WAVE_AMP:
        return -WAVE_AMP
    return int(value)


def _to_wave(values):
    clean = [_clamp_wave(v) for v in values]
    if np is not None:
        return np.array(clean, dtype=np.int16)
    return array("h", clean)


# --- Waveform generation ---------------------------------------------------

def _gen_sine():
    if np is not None:
        phase = (2.0 * math.pi * np.arange(WAVE_SIZE)) / WAVE_SIZE
        return _to_wave(np.sin(phase) * WAVE_AMP)
    return _to_wave(
        [math.sin((2.0 * math.pi * i) / WAVE_SIZE) * WAVE_AMP for i in range(WAVE_SIZE)]
    )


def _gen_saw():
    if np is not None:
        idx = np.arange(WAVE_SIZE)
        return _to_wave((((2.0 * idx) / WAVE_SIZE) - 1.0) * WAVE_AMP)
    return _to_wave(
        [(((2.0 * i) / WAVE_SIZE) - 1.0) * WAVE_AMP for i in range(WAVE_SIZE)]
    )


def _gen_square():
    return _to_wave(
        [WAVE_AMP if i < (WAVE_SIZE // 2) else -WAVE_AMP for i in range(WAVE_SIZE)]
    )


def _gen_triangle():
    return _to_wave(
        [(2.0 * abs((2.0 * (i / WAVE_SIZE)) - 1.0) - 1.0) * WAVE_AMP for i in range(WAVE_SIZE)]
    )


def _gen_outer_space():
    """Detuned sine with secondary harmonic -- eerie, spacey timbre."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        # fundamental sine + slightly detuned 5th harmonic + sub-octave
        sample = (
            math.sin(phase) * 0.50
            + math.sin(phase * 1.498) * 0.25   # slightly detuned ~3/2 ratio
            + math.sin(phase * 0.501) * 0.15    # sub-octave drift
            + math.sin(phase * 3.003) * 0.10    # shimmery upper partial
        )
        vals.append(sample * WAVE_AMP)
    return _to_wave(vals)


def _gen_piano():
    """Harmonic-rich waveform approximating struck-string piano timbre.

    Uses the first 6 partials with amplitudes loosely modeled on a mid-range
    piano string.  The odd/even mix gives body without sounding too hollow
    (like a pure square) or too buzzy (like a raw saw).
    """
    partials = [
        (1, 1.00),   # fundamental
        (2, 0.60),   # octave -- strong in piano
        (3, 0.35),   # 12th
        (4, 0.20),   # double octave
        (5, 0.10),   # major 3rd above double octave
        (6, 0.06),   # triple octave (faint)
    ]
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for harmonic, amp in partials:
            sample += math.sin(phase * harmonic) * amp
        # normalize peak to ~1.0
        vals.append(sample * WAVE_AMP * 0.43)
    return _to_wave(vals)


def _gen_synth_lead():
    """Blend of saw and square with extra upper harmonics -- fat lead tone."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        # saw component
        saw = ((2.0 * i) / WAVE_SIZE) - 1.0
        # square component (band-limited approximation with 3 odd harmonics)
        sq = (
            math.sin(phase) * 1.0
            + math.sin(phase * 3) * 0.333
            + math.sin(phase * 5) * 0.2
        )
        sample = saw * 0.45 + sq * 0.40 + math.sin(phase * 2) * 0.15
        vals.append(sample * WAVE_AMP * 0.55)
    return _to_wave(vals)


def _gen_pad():
    """Warm, round waveform for ambient pads -- sine with gentle even harmonics."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = (
            math.sin(phase) * 0.65
            + math.sin(phase * 2) * 0.20
            + math.sin(phase * 4) * 0.10
            + math.sin(phase * 6) * 0.05
        )
        vals.append(sample * WAVE_AMP)
    return _to_wave(vals)


# Build all waveforms at import time
wave_sine = _gen_sine()
wave_saw = _gen_saw()
wave_square = _gen_square()
wave_triangle = _gen_triangle()
wave_outer_space = _gen_outer_space()
wave_piano = _gen_piano()
wave_synth_lead = _gen_synth_lead()
wave_pad = _gen_pad()


WAVEFORMS = {
    "sine": wave_sine,
    "saw": wave_saw,
    "square": wave_square,
    "triangle": wave_triangle,
    "outer_space": wave_outer_space,
    "piano": wave_piano,
    "synth_lead": wave_synth_lead,
    "pad": wave_pad,
}


# --- Voice presets ----------------------------------------------------------
# Each voice is a complete sound definition: waveform + envelope + FX + modulation.
# The VOICES list defines the cycle order for the voice-select button.

VOICES = [
    {
        "name": "Sine",
        "waveform": "sine",
        "attack_time": 0.08,
        "decay_time": 0.3,
        "release_time": 0.4,
        "sustain_level": 0.8,
        "filter_freq": 3000.0,
        "filter_q": 0.7,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.0,
        "echo_delay_ms": 200.0,
        "echo_decay": 0.3,
        "reverb_mix": 0.15,
        "reverb_roomsize": 0.4,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
    {
        "name": "Saw",
        "waveform": "saw",
        "attack_time": 0.01,
        "decay_time": 0.15,
        "release_time": 0.2,
        "sustain_level": 0.7,
        "filter_freq": 2200.0,
        "filter_q": 1.0,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.002,
        "echo_mix": 0.0,
        "echo_delay_ms": 150.0,
        "echo_decay": 0.25,
        "reverb_mix": 0.0,
        "reverb_roomsize": 0.3,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
    {
        "name": "Square",
        "waveform": "square",
        "attack_time": 0.0,
        "decay_time": 0.1,
        "release_time": 0.15,
        "sustain_level": 0.65,
        "filter_freq": 2800.0,
        "filter_q": 1.2,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.0,
        "echo_delay_ms": 180.0,
        "echo_decay": 0.3,
        "reverb_mix": 0.0,
        "reverb_roomsize": 0.25,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
    {
        "name": "Triangle",
        "waveform": "triangle",
        "attack_time": 0.05,
        "decay_time": 0.2,
        "release_time": 0.35,
        "sustain_level": 0.75,
        "filter_freq": 2500.0,
        "filter_q": 0.8,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.0,
        "echo_delay_ms": 200.0,
        "echo_decay": 0.3,
        "reverb_mix": 0.1,
        "reverb_roomsize": 0.35,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
    {
        "name": "Outer Space",
        "waveform": "outer_space",
        "attack_time": 0.6,
        "decay_time": 1.2,
        "release_time": 2.0,
        "sustain_level": 0.7,
        "filter_freq": 1400.0,
        "filter_q": 0.6,
        "vibrato_rate": 1.8,
        "vibrato_depth": 0.04,
        "detune": 0.005,
        "echo_mix": 0.45,
        "echo_delay_ms": 400.0,
        "echo_decay": 0.55,
        "reverb_mix": 0.7,
        "reverb_roomsize": 0.9,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
    {
        "name": "Piano",
        "waveform": "piano",
        "attack_time": 0.0,
        "decay_time": 0.4,
        "release_time": 0.3,
        "sustain_level": 0.0,
        "filter_freq": 4000.0,
        "filter_q": 0.7,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.1,
        "echo_delay_ms": 200.0,
        "echo_decay": 0.2,
        "reverb_mix": 0.25,
        "reverb_roomsize": 0.5,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
    {
        "name": "Synth Lead",
        "waveform": "synth_lead",
        "attack_time": 0.02,
        "decay_time": 0.12,
        "release_time": 0.18,
        "sustain_level": 0.55,
        "filter_freq": 3200.0,
        "filter_q": 1.1,
        "vibrato_rate": 5.8,
        "vibrato_depth": 0.06,
        "detune": 0.006,
        "echo_mix": 0.12,
        "echo_delay_ms": 150.0,
        "echo_decay": 0.28,
        "reverb_mix": 0.12,
        "reverb_roomsize": 0.45,
        "distortion_mix": 0.5,
        "distortion_drive": 0.62,
    },
    {
        "name": "Pad",
        "waveform": "pad",
        "attack_time": 0.45,
        "decay_time": 0.9,
        "release_time": 1.4,
        "sustain_level": 0.8,
        "filter_freq": 1700.0,
        "filter_q": 0.85,
        "vibrato_rate": 3.2,
        "vibrato_depth": 0.025,
        "detune": 0.003,
        "echo_mix": 0.15,
        "echo_delay_ms": 280.0,
        "echo_decay": 0.35,
        "reverb_mix": 0.52,
        "reverb_roomsize": 0.72,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
]

# Voice names in cycle order (for display / LED mapping)
VOICE_NAMES = [v["name"] for v in VOICES]
NUM_VOICES = len(VOICES)


def get_voice(index):
    """Return a copy of the voice dict at the given index (wraps around)."""
    return VOICES[index % NUM_VOICES].copy()


def get_waveform(name):
    """Return the waveform array for the given name, defaulting to sine."""
    return WAVEFORMS.get(name, wave_sine)


# Legacy compatibility -- get_patch maps old names to closest new voice
_LEGACY_MAP = {
    "pad": 7,       # Pad
    "bass": 1,      # Saw (closest to old bass)
    "pluck": 2,     # Square (closest to old pluck)
    "lead": 6,      # Synth Lead
}


def get_patch(name):
    """Legacy: return a voice dict by old patch name."""
    idx = _LEGACY_MAP.get(name, 0)
    return get_voice(idx)
