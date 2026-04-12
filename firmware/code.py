# ============================================================
# PICO 2 SYNTH WORKSHOP -- Edit your settings below, then save!
# ============================================================
#
# VOICES (cycle with the voice button):
#   0 = Sine,  1 = Saw,  2 = Square,  3 = Triangle,
#   4 = Outer Space,  5 = Piano,  6 = Synth Lead,  7 = Pad
#
# SCALES (semitone offsets from base note):
#   Pentatonic: [0, 2, 4, 7, 9]
#   Major:      [0, 2, 4, 5, 7, 9, 11]
#   Minor:      [0, 2, 3, 5, 7, 8, 10]
#   Blues:      [0, 3, 5, 6, 7, 10]
#   Chromatic:  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
#
# INPUT TARGETS (what a sensor controls):
#   "filter"           Filter cutoff (200-4000 Hz)
#   "volume"           Master volume
#   "pitch" / "pitch_bend"   Pitch bend (+/- 7 semitones)
#   "echo_mix"         Echo wet/dry mix
#   "echo_delay"       Echo delay time
#   "echo_decay"       Echo feedback amount
#   "reverb_mix"       Reverb wet/dry mix
#   "reverb_room"      Reverb room size
#   "reverb_damp"      Reverb damping
#   "distortion_mix"   Distortion wet/dry mix
#   "distortion_drive" Distortion drive amount
#   "vibrato_depth"    Vibrato intensity
#   "vibrato_rate"     Vibrato speed
#   "attack"           Envelope attack time
#   "release"          Envelope release time
#   "none"             Disabled
#
# PIN REFERENCE (Pico 2):
#   Digital (buttons/touch): GP0-GP22 (avoid GP4/GP5 if using I2C sensors)
#   ADC (pots/LDR):          GP26, GP27, GP28  (GP29 = VSYS, use with care)
#   I2C:                      GP4 (SDA), GP5 (SCL) by default
#   Audio out:                GP15 by default
#   LED:                      GP16 by default (NeoPixel) or GP17-19 (RGB)
#
# ============================================================

CONFIG = {
    # -- Audio output pin --
    "audio_pin": 15,

    # -- Starting voice (0-7, see list above) --
    "start_voice": 0,

    # -- Musical scale and root note --
    "scale": [0, 2, 4, 7, 9],   # pentatonic
    "base_note": 48,              # C3

    # -- Note buttons (active LOW, pull-up) --
    # Add or remove pin numbers to use more or fewer buttons.
    "button_pins": [2, 3, 6, 7],

    # -- Capacitive touch pads (optional) --
    # Uncomment and add GPIO numbers to enable touch inputs.
    # Touch notes continue after button notes in the scale.
    # "touch_pins": [9, 10, 11, 12],
    # "touch_threshold_adjust": 200,

    # -- Voice cycle button --
    "voice_button_pin": 8,

    # -- Voice LED indicator --
    "led_mode": "neopixel",       # "neopixel" or "rgb"
    "neopixel_pin": 16,           # GPIO for NeoPixel data
    # "rgb_pins": [17, 18, 19],   # [R, G, B] GPIOs (if led_mode is "rgb")
    "led_brightness": 0.4,

    # -- Analog inputs --
    # Each entry: {"pin": GPIO_NUMBER, "controls": "TARGET", "alpha": SMOOTHING}
    # Add as many as you have ADC pins for.
    "analog_inputs": [
        {"pin": 26, "controls": "filter",         "alpha": 0.15},   # Pot A
        {"pin": 27, "controls": "echo_mix",        "alpha": 0.15},   # Pot B
        {"pin": 28, "controls": "vibrato_depth",   "alpha": 0.15},   # LDR
    ],

    # -- I2C bus (shared by ToF sensor and accelerometer) --
    "i2c_sda": 4,
    "i2c_scl": 5,

    # -- VL53L0X Time-of-Flight distance sensor (I2C) --
    "tof_controls": "pitch_bend",     # or "none" to disable

    # -- LIS3DH Accelerometer (I2C) --
    "accel_x_controls": "filter_freq",      # tilt left/right
    "accel_y_controls": "reverb_mix",       # tilt forward/back
    "accel_shake_controls": "vibrato_depth", # shake intensity
}

# ============================================================
# Engine (don't edit below this line)
# ============================================================
try:
    SynthEngine = __import__("lib.synth_engine", None, None, ("SynthEngine",), 0).SynthEngine
except Exception:
    SynthEngine = __import__("synth_engine", None, None, ("SynthEngine",), 0).SynthEngine
engine = SynthEngine(CONFIG)
engine.run()
