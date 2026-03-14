"""Input helpers for the Pico music workshop MIDI track."""


def _optional_import(module_name):
    try:
        return __import__(module_name)
    except Exception:
        return None


analogio = _optional_import("analogio")
board = _optional_import("board")
busio = _optional_import("busio")
keypad = _optional_import("keypad")


class _BoardFallback:
    GP2 = None
    GP3 = None
    GP4 = None
    GP5 = None
    GP26 = None
    GP27 = None
    GP28 = None


if board is None:
    board = _BoardFallback()


def _clamp_float(value, lower, upper):
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


class SmoothedAnalog:
    """analogio.AnalogIn wrapper with EMA smoothing and MIDI-friendly accessors."""

    def __init__(self, pin, alpha=0.2):
        self._alpha = _clamp_float(alpha, 0.0, 1.0)
        self._analog_in = None
        self._smoothed = 0.0
        self._last_value = 0
        self._initialized = False
        self.available = False

        try:
            if analogio is None:
                raise RuntimeError("analogio unavailable")
            self._analog_in = analogio.AnalogIn(pin)
            self.available = True
        except Exception:
            self._analog_in = None

    def update(self):
        if not self.available or self._analog_in is None:
            return self._last_value

        try:
            raw = self._analog_in.value
        except Exception:
            return self._last_value

        if not self._initialized:
            self._smoothed = float(raw)
            self._initialized = True
        else:
            self._smoothed += self._alpha * (raw - self._smoothed)

        self._last_value = int(self._smoothed)
        return self._last_value

    @property
    def value(self):
        return self.update()

    @property
    def normalized(self):
        return self.value / 65535.0

    @property
    def cc_value(self):
        return (self.value & 0xFF00) >> 9

    def deinit(self):
        if self._analog_in is None:
            return

        try:
            self._analog_in.deinit()
        except Exception:
            pass


class ButtonManager:
    """keypad.Keys wrapper that reports button press/release changes."""

    DEFAULT_PINS = (board.GP2, board.GP3, board.GP4, board.GP5)

    def __init__(self, pins=None):
        self._keys = None
        self.available = False

        if pins is None:
            pins = self.DEFAULT_PINS

        try:
            if keypad is None:
                raise RuntimeError("keypad unavailable")
            self._keys = keypad.Keys(
                tuple(pins),
                value_when_pressed=False,
                pull=True,
            )
            self.available = True
        except Exception:
            self._keys = None

    def check(self):
        if not self.available or self._keys is None:
            return []

        events = []

        while True:
            try:
                event = self._keys.events.get()
            except Exception:
                return events

            if event is None:
                break

            pressed = bool(getattr(event, "pressed", False))
            released = bool(getattr(event, "released", False))

            if pressed or released:
                events.append((event.key_number, pressed))

        return events

    def deinit(self):
        if self._keys is None:
            return

        try:
            self._keys.deinit()
        except Exception:
            pass


class OptionalVL53L0X:
    """Defensive VL53L0X wrapper that never crashes when unavailable."""

    def __init__(self, sda=board.GP4, scl=board.GP5):
        self.available = False
        self._i2c = None
        self._sensor = None
        self._last_distance_mm = 0

        try:
            adafruit_vl53l0x = _optional_import("adafruit_vl53l0x")
            if adafruit_vl53l0x is None or busio is None:
                raise RuntimeError("VL53L0X stack unavailable")

            self._i2c = busio.I2C(scl=scl, sda=sda)
            self._sensor = adafruit_vl53l0x.VL53L0X(self._i2c)
            self.available = True
        except Exception:
            self._i2c = None
            self._sensor = None
            self.available = False

    @property
    def distance_mm(self):
        if not self.available or self._sensor is None:
            return 0

        try:
            distance = self._sensor.range
            if distance is None:
                return self._last_distance_mm
            self._last_distance_mm = int(distance)
        except Exception:
            return self._last_distance_mm

        return self._last_distance_mm

    def normalized(self, min_mm=50, max_mm=500):
        if not self.available:
            return 0.0

        span = max_mm - min_mm
        if span <= 0:
            return 0.0

        normalized_value = (self.distance_mm - min_mm) / float(span)
        return _clamp_float(normalized_value, 0.0, 1.0)

    def deinit(self):
        self.available = False
        self._sensor = None

        if self._i2c is None:
            return

        try:
            self._i2c.deinit()
        except Exception:
            pass
