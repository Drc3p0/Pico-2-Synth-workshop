"""Voice indicator LED driver.

Supports two modes selected in CONFIG:
  - "neopixel" : single WS2812B/NeoPixel on one data pin (any GPIO)
  - "rgb"      : common-cathode RGB LED on three GPIOs (R, G, B)

Each voice index maps to a distinct colour so the player always knows
which voice is active.
"""

try:
    digitalio = __import__("digitalio")
except Exception:
    digitalio = None

try:
    board = __import__("board")
except Exception:
    board = None


def _resolve_pin(pin_id):
    if pin_id is None:
        return None
    if hasattr(pin_id, "__class__") and not isinstance(pin_id, (int, str)):
        return pin_id
    if isinstance(pin_id, int):
        name = "GP{}".format(pin_id)
    else:
        name = str(pin_id).upper()
    if board is not None and hasattr(board, name):
        return getattr(board, name)
    return None


# Colour table for up to 16 voices.  Index = voice index.
# Tuple format: (R, G, B) with values 0-255.
# Designed for maximum visual distinctness on cheap LEDs.
VOICE_COLOURS = [
    (255, 0, 0),       # 0  Sine         -> Red
    (0, 255, 0),       # 1  Saw          -> Green
    (0, 0, 255),       # 2  Square       -> Blue
    (255, 255, 0),     # 3  Triangle     -> Yellow
    (128, 0, 255),     # 4  Outer Space  -> Purple
    (255, 128, 0),     # 5  Piano        -> Orange
    (0, 255, 255),     # 6  Synth Lead   -> Cyan
    (255, 0, 128),     # 7  Pad          -> Magenta/Pink
    # Extended slots if students add custom voices:
    (255, 255, 255),   # 8  White
    (0, 128, 255),     # 9  Sky blue
    (128, 255, 0),     # 10 Lime
    (255, 64, 64),     # 11 Coral
    (64, 255, 128),    # 12 Mint
    (255, 0, 255),     # 13 Fuchsia
    (128, 128, 0),     # 14 Olive
    (0, 128, 128),     # 15 Teal
]


class VoiceLED:
    """Unified voice indicator.  Construct with mode and pin config from CONFIG."""

    def __init__(self, mode="neopixel", neopixel_pin=16,
                 rgb_pins=None, brightness=0.4):
        """
        Args:
            mode: "neopixel" or "rgb"
            neopixel_pin: GPIO for NeoPixel data line (int, str, or pin obj)
            rgb_pins: dict or list of 3 GPIOs for RGB LED {"r": pin, "g": pin, "b": pin}
                      or [r_pin, g_pin, b_pin]
            brightness: 0.0-1.0 master brightness (NeoPixel only)
        """
        self._mode = mode.lower() if isinstance(mode, str) else "neopixel"
        self._pixel = None
        self._rgb_outs = None
        self._available = False
        self._brightness = max(0.05, min(1.0, brightness))

        if self._mode == "neopixel":
            self._init_neopixel(neopixel_pin)
        elif self._mode == "rgb":
            self._init_rgb(rgb_pins)

    def _init_neopixel(self, pin):
        resolved = _resolve_pin(pin)
        if resolved is None:
            return
        try:
            neopixel = __import__("neopixel")
            self._pixel = neopixel.NeoPixel(resolved, 1, brightness=self._brightness,
                                            auto_write=True)
            self._pixel.fill((0, 0, 0))
            self._available = True
        except Exception:
            self._pixel = None

    def _init_rgb(self, pins):
        if digitalio is None:
            return

        # Accept dict or list
        if isinstance(pins, dict):
            pin_list = [pins.get("r"), pins.get("g"), pins.get("b")]
        elif isinstance(pins, (list, tuple)) and len(pins) >= 3:
            pin_list = list(pins[:3])
        else:
            pin_list = [17, 18, 19]  # default GPIOs

        outs = []
        for p in pin_list:
            resolved = _resolve_pin(p)
            if resolved is None:
                return
            try:
                do = digitalio.DigitalInOut(resolved)
                do.direction = digitalio.Direction.OUTPUT
                do.value = False
                outs.append(do)
            except Exception:
                # Clean up any already-created outputs
                for o in outs:
                    try:
                        o.deinit()
                    except Exception:
                        pass
                return

        self._rgb_outs = outs
        self._available = True

    @property
    def available(self):
        return self._available

    def set_voice(self, voice_index):
        """Update the LED to show the colour for the given voice index."""
        if not self._available:
            return

        colour = VOICE_COLOURS[voice_index % len(VOICE_COLOURS)]

        if self._mode == "neopixel" and self._pixel is not None:
            try:
                self._pixel.fill(colour)
            except Exception:
                pass

        elif self._mode == "rgb" and self._rgb_outs is not None:
            # Binary on/off per channel: threshold at 128
            try:
                self._rgb_outs[0].value = colour[0] >= 128  # R
                self._rgb_outs[1].value = colour[1] >= 128  # G
                self._rgb_outs[2].value = colour[2] >= 128  # B
            except Exception:
                pass

    def off(self):
        """Turn the LED off."""
        if not self._available:
            return
        if self._mode == "neopixel" and self._pixel is not None:
            try:
                self._pixel.fill((0, 0, 0))
            except Exception:
                pass
        elif self._mode == "rgb" and self._rgb_outs is not None:
            for out in self._rgb_outs:
                try:
                    out.value = False
                except Exception:
                    pass

    def deinit(self):
        if self._pixel is not None:
            try:
                self._pixel.fill((0, 0, 0))
                self._pixel.deinit()
            except Exception:
                pass
        if self._rgb_outs is not None:
            for out in self._rgb_outs:
                try:
                    out.value = False
                    out.deinit()
                except Exception:
                    pass
