# ============================================================
# PICO 2 SYNTH WORKSHOP
# ============================================================
# This is the main entry point.  It loads settings from
# config.json (written by the web configurator) and starts
# the synth engine.
#
# To configure:
#   1. Connect to the web interface (drc3p0.github.io/Pico-2-Synth-workshop)
#   2. Pick your sounds and assign physical inputs
#   3. Click "Connect Pico" to test live
#   4. Click "Save to Flash" to persist settings
#
# Settings are stored in /config.json on the CIRCUITPY drive.
# You can also edit config.json by hand if you prefer.
# ============================================================

# Default config -- used if config.json doesn't exist yet
DEFAULTS = {
    "audio_pin": 15,
    "start_voice": 0,
    "scale": [0, 2, 4, 7, 9],
    "base_note": 48,
    "button_pins": [2, 3, 6, 7],
    "voice_button_pin": 8,
    "led_mode": "neopixel",
    "neopixel_pin": 16,
    "led_brightness": 0.4,
    "analog_inputs": [
        {"pin": 26, "controls": "filter", "alpha": 0.15},
        {"pin": 27, "controls": "echo_mix", "alpha": 0.15},
        {"pin": 28, "controls": "vibrato_depth", "alpha": 0.15},
    ],
    "i2c_sda": 4,
    "i2c_scl": 5,
    "tof_controls": "pitch_bend",
    "accel_x_controls": "filter_freq",
    "accel_y_controls": "reverb_mix",
    "accel_shake_controls": "vibrato_depth",
}

# Load saved config (merged with defaults)
try:
    from lib.config_store import load_config
except Exception:
    from config_store import load_config

CONFIG = load_config(DEFAULTS)

# Start the synth engine
try:
    SynthEngine = __import__("lib.synth_engine", None, None, ("SynthEngine",), 0).SynthEngine
except Exception:
    SynthEngine = __import__("synth_engine", None, None, ("SynthEngine",), 0).SynthEngine

engine = SynthEngine(CONFIG)
engine.run()
