"""Audio effects chain for the Pico 2 Synth.

Signal path:  synthio.Synthesizer -> Distortion -> Echo -> Freeverb -> Mixer -> PWM out

All effect parameters are individually settable so any input (pot, LDR,
ToF, accelerometer axis, etc.) can be routed to any parameter via the
engine's mapping system.
"""


def clamp(value, minimum, maximum):
    if minimum > maximum:
        minimum, maximum = maximum, minimum
    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value


try:
    audiodelays = __import__("audiodelays")
except Exception:
    audiodelays = None

try:
    audiofilters = __import__("audiofilters")
except Exception:
    audiofilters = None

try:
    audiofreeverb = __import__("audiofreeverb")
except Exception:
    audiofreeverb = None

try:
    audiomixer = __import__("audiomixer")
except Exception:
    audiomixer = None

try:
    synthio = __import__("synthio")
except Exception:
    synthio = None


class EffectsChain:
    def __init__(self, sample_rate, channel_count, buffer_size):
        if (
            audiodelays is None
            or audiofilters is None
            or audiofreeverb is None
            or audiomixer is None
            or synthio is None
        ):
            raise RuntimeError("Audio effects modules are unavailable")

        self.cfg = {
            "sample_rate": sample_rate,
            "channel_count": channel_count,
            "buffer_size": buffer_size,
        }

        self.mixer = audiomixer.Mixer(voice_count=1, **self.cfg)

        # LFOs for subtle animation of effect parameters
        self._echo_mix_lfo = synthio.LFO(rate=0.11, scale=0.0, offset=0.0)
        self._reverb_room_lfo = synthio.LFO(rate=0.07, scale=0.0, offset=0.5)
        self._dist_drive_lfo = synthio.LFO(rate=0.14, scale=0.0, offset=0.0)

        distortion_mode = audiofilters.DistortionMode.CLIP
        self.distortion = audiofilters.Distortion(
            mode=distortion_mode,
            soft_clip=True,
            drive=self._dist_drive_lfo,
            mix=0.0,
            pre_gain=0.0,
            post_gain=-8.0,
            **self.cfg
        )
        self.echo = audiodelays.Echo(
            max_delay_ms=900,
            delay_ms=250.0,
            decay=0.35,
            mix=self._echo_mix_lfo,
            **self.cfg
        )
        self.reverb = audiofreeverb.Freeverb(
            roomsize=self._reverb_room_lfo,
            damp=0.42,
            mix=0.0,
            **self.cfg
        )

    # --- Internal helpers ---------------------------------------------------

    def _set_attr(self, obj, attr_name, value):
        try:
            setattr(obj, attr_name, value)
            return True
        except Exception:
            return False

    def _set_lfo_target(self, lfo, value, wiggle=0.015):
        target = clamp(float(value), 0.0, 1.0)
        span = min(target, 1.0 - target, wiggle)
        try:
            lfo.offset = target
            lfo.scale = span
        except Exception:
            return target
        return lfo

    # --- Chain setup --------------------------------------------------------

    def build_chain(self, synth):
        try:
            self.distortion.play(synth)
            self.echo.play(self.distortion)
            self.reverb.play(self.echo)
            self.mixer.voice[0].play(self.reverb)
        except Exception:
            self.mixer.voice[0].play(synth)

        self.mixer.voice[0].level = 1.0
        return self.mixer

    # --- Individual parameter setters (all normalized 0.0-1.0 input) --------

    # Echo
    def set_echo_mix(self, value):
        mod = self._set_lfo_target(self._echo_mix_lfo, value)
        if mod is not self._echo_mix_lfo:
            self._set_attr(self.echo, "mix", mod)

    def set_echo_delay_ms(self, delay_ms):
        self._set_attr(self.echo, "delay_ms", clamp(float(delay_ms), 10.0, 900.0))

    def set_echo_decay(self, decay):
        self._set_attr(self.echo, "decay", clamp(float(decay), 0.0, 1.0))

    # Reverb
    def set_reverb_mix(self, value):
        self._set_attr(self.reverb, "mix", clamp(float(value), 0.0, 1.0))

    def set_reverb_roomsize(self, value):
        mod = self._set_lfo_target(self._reverb_room_lfo, value)
        if mod is not self._reverb_room_lfo:
            self._set_attr(self.reverb, "roomsize", mod)

    def set_reverb_damp(self, value):
        self._set_attr(self.reverb, "damp", clamp(float(value), 0.0, 1.0))

    # Distortion
    def set_distortion_mix(self, value):
        self._set_attr(self.distortion, "mix", clamp(float(value), 0.0, 1.0))

    def set_distortion_drive(self, value):
        mod = self._set_lfo_target(self._dist_drive_lfo, value, wiggle=0.02)
        if mod is not self._dist_drive_lfo:
            self._set_attr(self.distortion, "drive", mod)

    # --- Batch update from a voice/patch dict -------------------------------

    def update_from_patch(self, patch_dict):
        self.set_echo_mix(patch_dict.get("echo_mix", 0.0))
        self.set_echo_delay_ms(patch_dict.get("echo_delay_ms", 250.0))
        self.set_echo_decay(patch_dict.get("echo_decay", 0.35))

        self.set_reverb_mix(patch_dict.get("reverb_mix", 0.0))
        self.set_reverb_roomsize(patch_dict.get("reverb_roomsize", 0.5))

        self.set_distortion_mix(patch_dict.get("distortion_mix", 0.0))
        self.set_distortion_drive(patch_dict.get("distortion_drive", 0.0))

    # --- Legacy convenience -------------------------------------------------

    def update_from_sensors(self, pot_b_normalized, ldr_normalized):
        if pot_b_normalized is not None:
            self.set_echo_mix(pot_b_normalized)
        if ldr_normalized is not None:
            self.set_reverb_roomsize(ldr_normalized)
