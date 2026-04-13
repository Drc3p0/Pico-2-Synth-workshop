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


# ---------------------------------------------------------------------------
# Waveform generation
# ---------------------------------------------------------------------------
# Each function returns a 256-sample int16 wavetable suitable for synthio.
# Voices are grouped: Core synth, Synth leads/basses, Drums/percussion,
# Noise/experimental, Drone/ambient — matching the web engine exactly.
# ---------------------------------------------------------------------------

# === Core synth ============================================================

def _gen_sine():
    if np is not None:
        phase = (2.0 * math.pi * np.arange(WAVE_SIZE)) / WAVE_SIZE
        return _to_wave(np.sin(phase) * WAVE_AMP)
    return _to_wave(
        [math.sin((2.0 * math.pi * i) / WAVE_SIZE) * WAVE_AMP for i in range(WAVE_SIZE)]
    )


def _gen_square():
    return _to_wave(
        [WAVE_AMP if i < (WAVE_SIZE // 2) else -WAVE_AMP for i in range(WAVE_SIZE)]
    )


def _gen_piano():
    """Harmonic-rich waveform approximating struck-string piano timbre."""
    partials = [
        (1, 1.00),
        (2, 0.60),
        (3, 0.35),
        (4, 0.20),
        (5, 0.10),
        (6, 0.06),
    ]
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for harmonic, amp in partials:
            sample += math.sin(phase * harmonic) * amp
        vals.append(sample * WAVE_AMP * 0.43)
    return _to_wave(vals)


# === Synth leads / basses ==================================================

def _gen_synth_lead():
    """Blend of saw and square with extra upper harmonics -- fat lead tone."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        saw = ((2.0 * i) / WAVE_SIZE) - 1.0
        sq = (
            math.sin(phase) * 1.0
            + math.sin(phase * 3) * 0.333
            + math.sin(phase * 5) * 0.2
        )
        sample = saw * 0.45 + sq * 0.40 + math.sin(phase * 2) * 0.15
        vals.append(sample * WAVE_AMP * 0.55)
    return _to_wave(vals)


def _gen_acid():
    """Saw-like with emphasized resonant mid-harmonics -- TB-303 character."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k in range(1, 25):
            saw = (1.0 / k) * (1 if k % 2 else -1) * -1
            boost = 1.5 if 3 <= k <= 6 else 1.0
            sample += math.sin(phase * k) * saw * boost
        vals.append(sample * WAVE_AMP * 0.35)
    return _to_wave(vals)


def _gen_super_saw():
    """Multiple detuned saw layers -- thick and wide."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k in range(1, 21):
            base = (1.0 / k) * (1 if k % 2 else -1) * -1
            sample += math.sin(phase * k) * base * 1.2
        vals.append(sample * WAVE_AMP * 0.30)
    return _to_wave(vals)


def _gen_reese_bass():
    """Two detuned saws -- heavy sub bass."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k in range(1, 21):
            saw1 = (1.0 / k) * (1 if k % 2 else -1) * -1
            saw2 = saw1 * 0.8
            sample += math.sin(phase * k) * (saw1 + saw2) * 0.5
        vals.append(sample * WAVE_AMP * 0.35)
    return _to_wave(vals)


# === Drums / percussion ====================================================

def _gen_kick():
    """Heavy fundamental with fast decay harmonics."""
    partials = [(1, 1.0), (2, 0.4), (3, 0.1)]
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for harmonic, amp in partials:
            sample += math.sin(phase * harmonic) * amp
        vals.append(sample * WAVE_AMP * 0.65)
    return _to_wave(vals)


def _gen_snare():
    """Noisy mid-range with some fundamental."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k in range(1, 25):
            if k == 1:
                sample += math.sin(phase * k) * 0.5
            else:
                noise = math.sin(k * 3.14159 * 0.7) * 0.3 + 0.2
                sample += math.sin(phase * k) * noise / math.sqrt(k)
        vals.append(sample * WAVE_AMP * 0.35)
    return _to_wave(vals)


def _gen_hihat():
    """Inharmonic metallic -- lots of upper partials, weak fundamental."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k in range(1, 33):
            if k < 4:
                amp = 0.05
            else:
                amp = (0.3 / math.sqrt(k)) * (math.sin(k * 1.7) * 0.5 + 0.5)
            sample += math.sin(phase * k) * amp
        vals.append(sample * WAVE_AMP * 0.45)
    return _to_wave(vals)


def _gen_metal_perc():
    """Bell/metallic inharmonic spectrum."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k in range(1, 17):
            amp = 0.4 / (k * 0.7)
            if k % 3 == 0:
                amp *= 1.8
            sample += math.sin(phase * k) * amp
        vals.append(sample * WAVE_AMP * 0.25)
    return _to_wave(vals)


# === Noise / experimental ==================================================

def _gen_bitcrush():
    """Harsh digital staircase -- strong odd harmonics with sharp edges."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k in range(1, 25):
            amp = 0.8 / k if k % 2 else 0.4 / k
            sample += math.sin(phase * k) * amp
        vals.append(sample * WAVE_AMP * 0.40)
    return _to_wave(vals)


def _gen_noise_wash():
    """Dense harmonic wash -- all partials with pseudo-random amplitudes."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k in range(1, 33):
            amp = (0.5 / k) * (1 + math.sin(k * 2.718) * 0.5)
            sample += math.sin(phase * k) * amp
        vals.append(sample * WAVE_AMP * 0.30)
    return _to_wave(vals)


def _gen_vox():
    """Vocal formant approximation -- emphasize partials near formant freqs."""
    formant_amps = [0.8, 0.3, 0.6, 0.9, 0.4, 0.2, 0.5, 0.1, 0.3]
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k, amp in enumerate(formant_amps, 1):
            sample += math.sin(phase * k) * amp
        vals.append(sample * WAVE_AMP * 0.30)
    return _to_wave(vals)


# === Drone / ambient =======================================================

def _gen_outer_space():
    """Detuned sine with secondary harmonic -- eerie, spacey timbre."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = (
            math.sin(phase) * 0.50
            + math.sin(phase * 1.498) * 0.25
            + math.sin(phase * 0.501) * 0.15
            + math.sin(phase * 3.003) * 0.10
        )
        vals.append(sample * WAVE_AMP)
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


def _gen_drone():
    """Perfect 5ths and octaves -- rich, organ-like drone."""
    partials = [
        (1, 1.0), (2, 0.5), (3, 0.7), (4, 0.25),
        (5, 0.15), (6, 0.6), (7, 0.1), (8, 0.3),
    ]
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for harmonic, amp in partials:
            sample += math.sin(phase * harmonic) * amp
        vals.append(sample * WAVE_AMP * 0.30)
    return _to_wave(vals)


# ---------------------------------------------------------------------------
# Build all waveforms at import time
# ---------------------------------------------------------------------------

wave_sine = _gen_sine()
wave_square = _gen_square()
wave_piano = _gen_piano()
wave_synth_lead = _gen_synth_lead()
wave_acid = _gen_acid()
wave_super_saw = _gen_super_saw()
wave_reese_bass = _gen_reese_bass()
wave_kick = _gen_kick()
wave_snare = _gen_snare()
wave_hihat = _gen_hihat()
wave_metal_perc = _gen_metal_perc()
wave_bitcrush = _gen_bitcrush()
wave_noise_wash = _gen_noise_wash()
wave_vox = _gen_vox()
wave_outer_space = _gen_outer_space()
wave_pad = _gen_pad()
wave_drone = _gen_drone()


WAVEFORMS = {
    "sine": wave_sine,
    "square": wave_square,
    "piano": wave_piano,
    "synth_lead": wave_synth_lead,
    "acid": wave_acid,
    "super_saw": wave_super_saw,
    "reese_bass": wave_reese_bass,
    "kick": wave_kick,
    "snare": wave_snare,
    "hihat": wave_hihat,
    "metal_perc": wave_metal_perc,
    "bitcrush": wave_bitcrush,
    "noise_wash": wave_noise_wash,
    "vox": wave_vox,
    "outer_space": wave_outer_space,
    "pad": wave_pad,
    "drone": wave_drone,
}


# ---------------------------------------------------------------------------
# Voice presets
# ---------------------------------------------------------------------------
# Each voice is a complete sound definition: waveform + envelope + FX + modulation.
# The VOICES list defines the cycle order for the voice-select button.
# Order and parameters match the web synth engine exactly.
# ---------------------------------------------------------------------------

VOICES = [
    # === Core synth ===
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

    # === Synth leads / basses ===
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
        "name": "Acid",
        "waveform": "acid",
        "attack_time": 0.0,
        "decay_time": 0.15,
        "release_time": 0.08,
        "sustain_level": 0.3,
        "filter_freq": 1200.0,
        "filter_q": 3.5,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.2,
        "echo_delay_ms": 120.0,
        "echo_decay": 0.4,
        "reverb_mix": 0.0,
        "reverb_roomsize": 0.3,
        "distortion_mix": 0.3,
        "distortion_drive": 0.4,
    },
    {
        "name": "Super Saw",
        "waveform": "super_saw",
        "attack_time": 0.01,
        "decay_time": 0.2,
        "release_time": 0.25,
        "sustain_level": 0.75,
        "filter_freq": 3500.0,
        "filter_q": 0.8,
        "vibrato_rate": 0.3,
        "vibrato_depth": 0.03,
        "detune": 0.012,
        "echo_mix": 0.08,
        "echo_delay_ms": 100.0,
        "echo_decay": 0.2,
        "reverb_mix": 0.15,
        "reverb_roomsize": 0.4,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
    {
        "name": "Reese Bass",
        "waveform": "reese_bass",
        "attack_time": 0.005,
        "decay_time": 0.15,
        "release_time": 0.1,
        "sustain_level": 0.7,
        "filter_freq": 600.0,
        "filter_q": 1.5,
        "vibrato_rate": 0.2,
        "vibrato_depth": 0.04,
        "detune": 0.008,
        "echo_mix": 0.0,
        "echo_delay_ms": 100.0,
        "echo_decay": 0.2,
        "reverb_mix": 0.05,
        "reverb_roomsize": 0.3,
        "distortion_mix": 0.15,
        "distortion_drive": 0.3,
    },

    # === Drums / percussion ===
    {
        "name": "Kick",
        "waveform": "kick",
        "attack_time": 0.0,
        "decay_time": 0.12,
        "release_time": 0.08,
        "sustain_level": 0.0,
        "filter_freq": 500.0,
        "filter_q": 0.5,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.0,
        "echo_delay_ms": 100.0,
        "echo_decay": 0.1,
        "reverb_mix": 0.05,
        "reverb_roomsize": 0.2,
        "distortion_mix": 0.2,
        "distortion_drive": 0.3,
    },
    {
        "name": "Snare",
        "waveform": "snare",
        "attack_time": 0.0,
        "decay_time": 0.08,
        "release_time": 0.06,
        "sustain_level": 0.0,
        "filter_freq": 3500.0,
        "filter_q": 0.6,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.1,
        "echo_delay_ms": 80.0,
        "echo_decay": 0.15,
        "reverb_mix": 0.2,
        "reverb_roomsize": 0.35,
        "distortion_mix": 0.15,
        "distortion_drive": 0.2,
    },
    {
        "name": "Hi-Hat",
        "waveform": "hihat",
        "attack_time": 0.0,
        "decay_time": 0.04,
        "release_time": 0.03,
        "sustain_level": 0.0,
        "filter_freq": 6000.0,
        "filter_q": 0.4,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.05,
        "echo_delay_ms": 60.0,
        "echo_decay": 0.1,
        "reverb_mix": 0.15,
        "reverb_roomsize": 0.25,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },
    {
        "name": "Metal Perc",
        "waveform": "metal_perc",
        "attack_time": 0.0,
        "decay_time": 0.3,
        "release_time": 0.4,
        "sustain_level": 0.0,
        "filter_freq": 5000.0,
        "filter_q": 1.0,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.25,
        "echo_delay_ms": 200.0,
        "echo_decay": 0.3,
        "reverb_mix": 0.35,
        "reverb_roomsize": 0.5,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },

    # === Noise / experimental ===
    {
        "name": "Bitcrush",
        "waveform": "bitcrush",
        "attack_time": 0.0,
        "decay_time": 0.1,
        "release_time": 0.12,
        "sustain_level": 0.6,
        "filter_freq": 2000.0,
        "filter_q": 2.0,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.15,
        "echo_delay_ms": 130.0,
        "echo_decay": 0.35,
        "reverb_mix": 0.1,
        "reverb_roomsize": 0.3,
        "distortion_mix": 0.7,
        "distortion_drive": 0.8,
    },
    {
        "name": "Noise Wash",
        "waveform": "noise_wash",
        "attack_time": 0.3,
        "decay_time": 0.8,
        "release_time": 1.0,
        "sustain_level": 0.5,
        "filter_freq": 1800.0,
        "filter_q": 0.5,
        "vibrato_rate": 1.5,
        "vibrato_depth": 0.05,
        "detune": 0.004,
        "echo_mix": 0.35,
        "echo_delay_ms": 350.0,
        "echo_decay": 0.5,
        "reverb_mix": 0.6,
        "reverb_roomsize": 0.8,
        "distortion_mix": 0.1,
        "distortion_drive": 0.15,
    },
    {
        "name": "Vox",
        "waveform": "vox",
        "attack_time": 0.15,
        "decay_time": 0.3,
        "release_time": 0.35,
        "sustain_level": 0.6,
        "filter_freq": 2200.0,
        "filter_q": 1.8,
        "vibrato_rate": 4.5,
        "vibrato_depth": 0.05,
        "detune": 0.003,
        "echo_mix": 0.1,
        "echo_delay_ms": 180.0,
        "echo_decay": 0.25,
        "reverb_mix": 0.3,
        "reverb_roomsize": 0.5,
        "distortion_mix": 0.0,
        "distortion_drive": 0.0,
    },

    # === Drone / ambient ===
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
    {
        "name": "Drone",
        "waveform": "drone",
        "attack_time": 0.8,
        "decay_time": 2.0,
        "release_time": 3.0,
        "sustain_level": 0.9,
        "filter_freq": 1200.0,
        "filter_q": 0.5,
        "vibrato_rate": 0.8,
        "vibrato_depth": 0.04,
        "detune": 0.007,
        "echo_mix": 0.3,
        "echo_delay_ms": 500.0,
        "echo_decay": 0.6,
        "reverb_mix": 0.75,
        "reverb_roomsize": 0.9,
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
    "pad": 16,       # Pad
    "bass": 6,       # Reese Bass
    "pluck": 1,      # Square
    "lead": 3,       # Synth Lead
}


def get_patch(name):
    """Legacy: return a voice dict by old patch name."""
    idx = _LEGACY_MAP.get(name, 0)
    return get_voice(idx)
