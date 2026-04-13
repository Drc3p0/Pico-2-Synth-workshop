"""Config storage -- read/write config.json on CIRCUITPY flash.

Provides load_config() and save_config() for persistent settings.
Falls back to defaults if config.json doesn't exist or is corrupt.
"""

import json


CONFIG_PATH = "/config.json"


def load_config(defaults=None):
    """Load config from flash.  Returns merged dict (defaults + saved)."""
    config = defaults.copy() if defaults else {}
    try:
        with open(CONFIG_PATH, "r") as f:
            saved = json.load(f)
        if isinstance(saved, dict):
            config.update(saved)
    except Exception:
        pass  # file missing or corrupt -- use defaults
    return config


def save_config(config):
    """Write config dict to flash as JSON.  Returns True on success."""
    try:
        # CircuitPython: filesystem must be writable (boot.py not blocking)
        import storage
        try:
            storage.remount("/", readonly=False)
        except Exception:
            pass  # already writable or not needed

        with open(CONFIG_PATH, "w") as f:
            json.dump(config, f)
        return True
    except Exception as e:
        print("SAVE_ERR:" + str(e))
        return False
