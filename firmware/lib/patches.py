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


if np is not None:
    _indices = np.arange(WAVE_SIZE)
    _phase = (2.0 * math.pi * _indices) / WAVE_SIZE

    wave_sine = _to_wave(np.sin(_phase) * WAVE_AMP)
    wave_saw = _to_wave((((2.0 * _indices) / WAVE_SIZE) - 1.0) * WAVE_AMP)
    wave_square = _to_wave(
        [WAVE_AMP if i < (WAVE_SIZE // 2) else -WAVE_AMP for i in range(WAVE_SIZE)]
    )
    wave_triangle = _to_wave(
        [
            (2.0 * abs((2.0 * (i / WAVE_SIZE)) - 1.0) - 1.0) * WAVE_AMP
            for i in range(WAVE_SIZE)
        ]
    )
else:
    wave_sine = _to_wave(
        [math.sin((2.0 * math.pi * i) / WAVE_SIZE) * WAVE_AMP for i in range(WAVE_SIZE)]
    )
    wave_saw = _to_wave(
        [(((2.0 * i) / WAVE_SIZE) - 1.0) * WAVE_AMP for i in range(WAVE_SIZE)]
    )
    wave_square = _to_wave(
        [WAVE_AMP if i < (WAVE_SIZE // 2) else -WAVE_AMP for i in range(WAVE_SIZE)]
    )
    wave_triangle = _to_wave(
        [
            (2.0 * abs((2.0 * (i / WAVE_SIZE)) - 1.0) - 1.0) * WAVE_AMP
            for i in range(WAVE_SIZE)
        ]
    )


WAVEFORMS = {
    "sine": wave_sine,
    "saw": wave_saw,
    "square": wave_square,
    "triangle": wave_triangle,
}


PATCHES = {
    "pad": {
        "waveform": "sine",
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
    "bass": {
        "waveform": "saw",
        "attack_time": 0.005,
        "decay_time": 0.14,
        "release_time": 0.08,
        "sustain_level": 0.72,
        "filter_freq": 620.0,
        "filter_q": 1.2,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.001,
        "echo_mix": 0.0,
        "echo_delay_ms": 120.0,
        "echo_decay": 0.2,
        "reverb_mix": 0.0,
        "reverb_roomsize": 0.15,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
    "pluck": {
        "waveform": "square",
        "attack_time": 0.0,
        "decay_time": 0.08,
        "release_time": 0.16,
        "sustain_level": 0.0,
        "filter_freq": 2800.0,
        "filter_q": 1.8,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.42,
        "echo_delay_ms": 220.0,
        "echo_decay": 0.5,
        "reverb_mix": 0.08,
        "reverb_roomsize": 0.4,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
    "lead": {
        "waveform": "saw",
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
}


def get_patch(name):
    return PATCHES.get(name, PATCHES["pad"]).copy()


def get_waveform(name):
    return WAVEFORMS.get(name, wave_sine)
