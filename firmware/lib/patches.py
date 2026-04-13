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
# Voices are grouped: Core synth, Synth leads/basses, Drums (single voice,
# per-key sounds), Noise/experimental, Drone/ambient -- matching the web
# engine exactly.
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


# === Drums (individual waveforms for per-key drum kit) =====================

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


def _gen_clap():
    """Clap -- mid-frequency noise burst."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k in range(1, 21):
            if k < 3:
                amp = 0.2
            else:
                amp = (0.5 / k) * (1 + math.sin(k * 2.3) * 0.6)
            sample += math.sin(phase * k) * amp
        vals.append(sample * WAVE_AMP * 0.35)
    return _to_wave(vals)


def _gen_tom():
    """Tom -- strong fundamental with a few harmonics."""
    partials = [(1, 1.0), (2, 0.55), (3, 0.2), (4, 0.05)]
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for harmonic, amp in partials:
            sample += math.sin(phase * harmonic) * amp
        vals.append(sample * WAVE_AMP * 0.55)
    return _to_wave(vals)


def _gen_rim():
    """Rimshot -- metallic, bell-like."""
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


def _gen_cowbell():
    """Cowbell -- two dominant non-octave partials."""
    partials = [(1, 0.3), (2, 0.1), (3, 0.8), (4, 0.05), (5, 0.6), (6, 0.02)]
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for harmonic, amp in partials:
            sample += math.sin(phase * harmonic) * amp
        vals.append(sample * WAVE_AMP * 0.35)
    return _to_wave(vals)


def _gen_shaker():
    """Shaker -- mostly high-frequency content."""
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for k in range(1, 33):
            if k < 6:
                amp = 0.02
            else:
                amp = 0.25 / math.sqrt(k)
            sample += math.sin(phase * k) * amp
        vals.append(sample * WAVE_AMP * 0.40)
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
    """Rich organ-like drone with strong bass undertone.

    Heavy on low harmonics (1st, 2nd, 3rd) plus 5th and octave partials
    for a warm, rumbling foundation distinct from Pad (gentle) and
    Outer Space (detuned/eerie).
    """
    partials = [
        (1, 1.0), (2, 0.85), (3, 0.7), (4, 0.4),
        (5, 0.15), (6, 0.55), (7, 0.08), (8, 0.25),
        (9, 0.04), (10, 0.12),
    ]
    vals = []
    for i in range(WAVE_SIZE):
        phase = (2.0 * math.pi * i) / WAVE_SIZE
        sample = 0.0
        for harmonic, amp in partials:
            sample += math.sin(phase * harmonic) * amp
        vals.append(sample * WAVE_AMP * 0.28)
    return _to_wave(vals)


# ---------------------------------------------------------------------------
# Build all waveforms at import time
# ---------------------------------------------------------------------------

wave_sine = _gen_sine()
wave_square = _gen_square()
wave_piano = _gen_piano()
wave_synth_lead = _gen_synth_lead()
wave_super_saw = _gen_super_saw()
wave_reese_bass = _gen_reese_bass()
wave_kick = _gen_kick()
wave_snare = _gen_snare()
wave_hihat = _gen_hihat()
wave_clap = _gen_clap()
wave_tom = _gen_tom()
wave_rim = _gen_rim()
wave_cowbell = _gen_cowbell()
wave_shaker = _gen_shaker()
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
    "super_saw": wave_super_saw,
    "reese_bass": wave_reese_bass,
    "kick": wave_kick,
    "snare": wave_snare,
    "hihat": wave_hihat,
    "clap": wave_clap,
    "tom": wave_tom,
    "rim": wave_rim,
    "cowbell": wave_cowbell,
    "shaker": wave_shaker,
    "bitcrush": wave_bitcrush,
    "noise_wash": wave_noise_wash,
    "vox": wave_vox,
    "outer_space": wave_outer_space,
    "pad": wave_pad,
    "drone": wave_drone,
}


# ---------------------------------------------------------------------------
# Drum kit -- per-key sound definitions for the "Drums" voice
# ---------------------------------------------------------------------------
# When the Drums voice is active, each note-input index maps to a different
# drum sound.  The synth engine uses this list to select waveform + envelope
# per key press.

DRUM_KIT = [
    {"name": "Kick",    "waveform": "kick",    "attack_time": 0.0, "decay_time": 0.12, "release_time": 0.08, "sustain_level": 0.0, "filter_freq": 400.0,  "midi_note": 36},
    {"name": "Snare",   "waveform": "snare",   "attack_time": 0.0, "decay_time": 0.08, "release_time": 0.06, "sustain_level": 0.0, "filter_freq": 2000.0, "midi_note": 38},
    {"name": "Hi-Hat",  "waveform": "hihat",   "attack_time": 0.0, "decay_time": 0.04, "release_time": 0.03, "sustain_level": 0.0, "filter_freq": 2000.0, "midi_note": 42},
    {"name": "Clap",    "waveform": "clap",    "attack_time": 0.0, "decay_time": 0.10, "release_time": 0.08, "sustain_level": 0.0, "filter_freq": 2000.0, "midi_note": 39},
    {"name": "Tom",     "waveform": "tom",     "attack_time": 0.0, "decay_time": 0.15, "release_time": 0.10, "sustain_level": 0.0, "filter_freq": 800.0,  "midi_note": 45},
    {"name": "Rim",     "waveform": "rim",     "attack_time": 0.0, "decay_time": 0.05, "release_time": 0.04, "sustain_level": 0.0, "filter_freq": 2000.0, "midi_note": 37},
    {"name": "Cowbell", "waveform": "cowbell",  "attack_time": 0.0, "decay_time": 0.20, "release_time": 0.15, "sustain_level": 0.0, "filter_freq": 2000.0, "midi_note": 56},
    {"name": "Shaker",  "waveform": "shaker",  "attack_time": 0.0, "decay_time": 0.06, "release_time": 0.04, "sustain_level": 0.0, "filter_freq": 2000.0, "midi_note": 70},
]

NUM_DRUM_SOUNDS = len(DRUM_KIT)


# ---------------------------------------------------------------------------
# Voice presets
# ---------------------------------------------------------------------------
# Each voice is a complete sound definition: waveform + envelope + FX + modulation.
# The VOICES list defines the cycle order for the voice-select button.
# Order and parameters match the web synth engine exactly.
#
# The "Drums" voice sets is_drum_kit=True; the engine uses DRUM_KIT above
# for per-key waveform/envelope selection.
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
        "filter_freq": 2000.0,
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
        "filter_freq": 2000.0,
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
        "filter_freq": 2000.0,
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
        "filter_freq": 2000.0,
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
        "name": "Super Saw",
        "waveform": "super_saw",
        "attack_time": 0.01,
        "decay_time": 0.2,
        "release_time": 0.25,
        "sustain_level": 0.75,
        "filter_freq": 2000.0,
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

    # === Drums (single voice, per-key sounds via DRUM_KIT) ===
    {
        "name": "Drums",
        "waveform": "kick",
        "is_drum_kit": True,
        "attack_time": 0.0,
        "decay_time": 0.12,
        "release_time": 0.08,
        "sustain_level": 0.0,
        "filter_freq": 2000.0,
        "vibrato_rate": 0.0,
        "vibrato_depth": 0.0,
        "detune": 0.0,
        "echo_mix": 0.08,
        "echo_delay_ms": 100.0,
        "echo_decay": 0.15,
        "reverb_mix": 0.15,
        "reverb_roomsize": 0.3,
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
        "filter_freq": 2000.0,
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
        "filter_freq": 800.0,
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


def get_drum_sound(key_index):
    """Return a copy of the drum kit entry for the given key index (wraps)."""
    return DRUM_KIT[key_index % NUM_DRUM_SOUNDS].copy()


# Legacy compatibility -- get_patch maps old names to closest new voice
_LEGACY_MAP = {
    "pad": 12,       # Pad
    "bass": 5,       # Reese Bass
    "pluck": 1,      # Square
    "lead": 3,       # Synth Lead
}


def get_patch(name):
    """Legacy: return a voice dict by old patch name."""
    idx = _LEGACY_MAP.get(name, 0)
    return get_voice(idx)
