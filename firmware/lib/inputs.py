"""Flexible input handling for the Pico 2 Synth.

All pin assignments are student-configurable via CONFIG.  Buttons and
touchpads can be placed on any digital GPIO.  Analog inputs can use any
ADC-capable pin (GP26-GP28, optionally GP29).  I2C sensors (ToF, LIS3DH
accelerometer) share one I2C bus on configurable SDA/SCL pins.
"""

try:
    analogio = __import__("analogio")
except Exception:
    analogio = None

try:
    board = __import__("board")
except Exception:
    board = None

try:
    busio = __import__("busio")
except Exception:
    busio = None

try:
    keypad = __import__("keypad")
except Exception:
    keypad = None

try:
    touchio = __import__("touchio")
except Exception:
    touchio = None

try:
    digitalio = __import__("digitalio")
except Exception:
    digitalio = None

import math


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clamp(value, minimum, maximum):
    if minimum > maximum:
        minimum, maximum = maximum, minimum
    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value


def _resolve_pin(pin_id):
    """Convert a pin identifier to a board pin object.

    Accepts:
      - A board pin object directly (e.g. board.GP2)
      - An integer GPIO number (e.g. 2 -> board.GP2)
      - A string name (e.g. "GP2" -> board.GP2)
    """
    if pin_id is None:
        return None
    # Already a pin object
    if hasattr(pin_id, "__class__") and not isinstance(pin_id, (int, str)):
        return pin_id
    if isinstance(pin_id, int):
        name = "GP{}".format(pin_id)
    else:
        name = str(pin_id).upper()
    if board is not None and hasattr(board, name):
        return getattr(board, name)
    return None


# ---------------------------------------------------------------------------
# SmoothedAnalog -- configurable ADC pin
# ---------------------------------------------------------------------------

class SmoothedAnalog:
    """EMA-smoothed analog input on any ADC-capable pin."""

    def __init__(self, pin, alpha=0.15):
        self.alpha = clamp(alpha, 0.0, 1.0)
        self._adc = None
        self._available = False
        self._smoothed = 0.0

        resolved = _resolve_pin(pin)
        try:
            if analogio is None:
                raise RuntimeError("analogio unavailable")
            if resolved is None:
                raise RuntimeError("invalid analog pin")
            self._adc = analogio.AnalogIn(resolved)
            self._smoothed = float(self._adc.value)
            self._available = True
        except Exception:
            self._adc = None
            self._smoothed = 0.0

    @property
    def available(self):
        return self._available

    def _update(self):
        if not self._available or self._adc is None:
            return int(self._smoothed)
        try:
            raw = float(self._adc.value)
            self._smoothed += (raw - self._smoothed) * self.alpha
        except Exception:
            pass
        return int(self._smoothed)

    @property
    def value(self):
        return self._update()

    @property
    def normalized(self):
        return clamp(self.value / 65535.0, 0.0, 1.0)

    @property
    def cc_value(self):
        return clamp((self.value & 0xFF00) >> 9, 0, 127)

    def deinit(self):
        if self._adc is not None:
            try:
                self._adc.deinit()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# ButtonManager -- hardware-debounced buttons on any digital GPIOs
# ---------------------------------------------------------------------------

class ButtonManager:
    """Debounced button input using keypad.Keys.

    *pins* is a list/tuple of pin identifiers (int, str, or board pin).
    """

    def __init__(self, pins, value_when_pressed=False, pull=True):
        self._keys = None
        self._available = False
        self._count = 0

        resolved = []
        for p in pins:
            rp = _resolve_pin(p)
            if rp is not None:
                resolved.append(rp)

        if not resolved:
            return

        self._count = len(resolved)
        try:
            if keypad is None:
                raise RuntimeError("keypad unavailable")
            self._keys = keypad.Keys(
                tuple(resolved),
                value_when_pressed=value_when_pressed,
                pull=pull,
            )
            self._available = True
        except Exception:
            self._keys = None

    @property
    def available(self):
        return self._available

    @property
    def count(self):
        return self._count

    def check(self):
        events = []
        if not self._available or self._keys is None:
            return events
        try:
            while True:
                event = self._keys.events.get()
                if event is None:
                    break
                if getattr(event, "pressed", False):
                    events.append((event.key_number, True))
                elif getattr(event, "released", False):
                    events.append((event.key_number, False))
        except Exception:
            return []
        return events

    def deinit(self):
        if self._keys is not None:
            try:
                self._keys.deinit()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# TouchManager -- capacitive touch inputs on any touch-capable GPIOs
# ---------------------------------------------------------------------------

class TouchManager:
    """Capacitive touch inputs using touchio.TouchIn.

    Each pin becomes an independent touch sensor.  The manager tracks
    press/release state so the API matches ButtonManager.
    """

    def __init__(self, pins, threshold_adjust=0):
        self._pads = []
        self._states = []
        self._available = False

        for p in pins:
            rp = _resolve_pin(p)
            if rp is None:
                continue
            try:
                if touchio is None:
                    raise RuntimeError("touchio unavailable")
                pad = touchio.TouchIn(rp)
                if threshold_adjust:
                    try:
                        pad.threshold += threshold_adjust
                    except Exception:
                        pass
                self._pads.append(pad)
                self._states.append(False)
            except Exception:
                continue

        if self._pads:
            self._available = True

    @property
    def available(self):
        return self._available

    @property
    def count(self):
        return len(self._pads)

    def check(self):
        """Return list of (index, pressed_bool) events since last check."""
        events = []
        for i, pad in enumerate(self._pads):
            try:
                touched = pad.value
            except Exception:
                continue
            if touched and not self._states[i]:
                events.append((i, True))
                self._states[i] = True
            elif not touched and self._states[i]:
                events.append((i, False))
                self._states[i] = False
        return events

    def deinit(self):
        for pad in self._pads:
            try:
                pad.deinit()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# SingleButton -- one dedicated button (for voice cycling, etc.)
# ---------------------------------------------------------------------------

class SingleButton:
    """A single debounced button on any GPIO.  Returns press events only."""

    def __init__(self, pin, value_when_pressed=False, pull=True):
        self._key = None
        self._available = False

        resolved = _resolve_pin(pin)
        if resolved is None:
            return

        try:
            if keypad is None:
                raise RuntimeError("keypad unavailable")
            self._key = keypad.Keys(
                (resolved,),
                value_when_pressed=value_when_pressed,
                pull=pull,
            )
            self._available = True
        except Exception:
            self._key = None

    @property
    def available(self):
        return self._available

    def pressed(self):
        """Return True if the button was pressed since last call."""
        if not self._available or self._key is None:
            return False
        try:
            while True:
                event = self._key.events.get()
                if event is None:
                    break
                if getattr(event, "pressed", False):
                    return True
        except Exception:
            pass
        return False

    def deinit(self):
        if self._key is not None:
            try:
                self._key.deinit()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# OptionalVL53L0X -- I2C time-of-flight distance sensor
# ---------------------------------------------------------------------------

class OptionalVL53L0X:
    def __init__(self, i2c=None, sda_pin=None, scl_pin=None):
        self._i2c_owned = False
        self._i2c = i2c
        self._sensor = None
        self._available = False

        if self._i2c is None:
            sda = _resolve_pin(sda_pin)
            scl = _resolve_pin(scl_pin)
            if sda is None and board is not None and hasattr(board, "GP4"):
                sda = board.GP4
            if scl is None and board is not None and hasattr(board, "GP5"):
                scl = board.GP5
            try:
                if busio is None:
                    raise RuntimeError("busio unavailable")
                if sda is None or scl is None:
                    raise RuntimeError("I2C pins unavailable")
                self._i2c = busio.I2C(scl=scl, sda=sda)
                self._i2c_owned = True
            except Exception:
                return

        try:
            adafruit_vl53l0x = __import__("adafruit_vl53l0x")
            self._sensor = adafruit_vl53l0x.VL53L0X(self._i2c)
            try:
                self._sensor.measurement_timing_budget = 20000
            except Exception:
                pass
            try:
                self._sensor.start_continuous()
            except Exception:
                try:
                    self._sensor.continuous_mode = True
                except Exception:
                    pass
            self._available = True
        except Exception:
            self._available = False
            self._sensor = None

    @property
    def available(self):
        return self._available

    @property
    def distance_mm(self):
        if not self._available or self._sensor is None:
            return None
        try:
            distance = None
            if hasattr(self._sensor, "range"):
                distance = self._sensor.range
            elif hasattr(self._sensor, "distance"):
                distance = self._sensor.distance
            if distance is None:
                return None
            distance = int(distance)
            if distance <= 0:
                return None
            return distance
        except Exception:
            return None

    def normalized(self, min_mm=50, max_mm=400):
        distance = self.distance_mm
        if distance is None:
            return None
        if max_mm <= min_mm:
            return 0.0
        return clamp((distance - min_mm) / float(max_mm - min_mm), 0.0, 1.0)

    def deinit(self):
        if self._sensor is not None:
            try:
                if hasattr(self._sensor, "stop_continuous"):
                    self._sensor.stop_continuous()
            except Exception:
                pass
        if self._i2c_owned and self._i2c is not None:
            try:
                self._i2c.deinit()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# OptionalLIS3DH -- I2C accelerometer
# ---------------------------------------------------------------------------

class OptionalLIS3DH:
    """LIS3DH 3-axis accelerometer over I2C.

    Provides:
      - tilt_x, tilt_y  : normalized -1.0 to 1.0 based on gravity vector
      - shake           : normalized 0.0 to 1.0 magnitude of deviation from 1g
    """

    def __init__(self, i2c=None, sda_pin=None, scl_pin=None, address=0x18):
        self._i2c_owned = False
        self._i2c = i2c
        self._sensor = None
        self._available = False
        self._smooth_x = 0.0
        self._smooth_y = 0.0
        self._smooth_z = 0.0
        self._smooth_shake = 0.0
        self._alpha = 0.2

        if self._i2c is None:
            sda = _resolve_pin(sda_pin)
            scl = _resolve_pin(scl_pin)
            if sda is None and board is not None and hasattr(board, "GP4"):
                sda = board.GP4
            if scl is None and board is not None and hasattr(board, "GP5"):
                scl = board.GP5
            try:
                if busio is None:
                    raise RuntimeError("busio unavailable")
                if sda is None or scl is None:
                    raise RuntimeError("I2C pins unavailable")
                self._i2c = busio.I2C(scl=scl, sda=sda)
                self._i2c_owned = True
            except Exception:
                return

        try:
            adafruit_lis3dh = __import__("adafruit_lis3dh")
            self._sensor = adafruit_lis3dh.LIS3DH_I2C(self._i2c, address=address)
            self._sensor.range = adafruit_lis3dh.RANGE_2_G
            self._sensor.data_rate = adafruit_lis3dh.DATARATE_100_HZ
            self._available = True
        except Exception:
            self._available = False
            self._sensor = None

    @property
    def available(self):
        return self._available

    def read(self):
        """Read and smooth accelerometer.  Returns (x, y, z) in m/s^2 or None."""
        if not self._available or self._sensor is None:
            return None
        try:
            x, y, z = self._sensor.acceleration
            self._smooth_x += (x - self._smooth_x) * self._alpha
            self._smooth_y += (y - self._smooth_y) * self._alpha
            self._smooth_z += (z - self._smooth_z) * self._alpha
            return (self._smooth_x, self._smooth_y, self._smooth_z)
        except Exception:
            return None

    @property
    def tilt_x(self):
        """Normalized tilt along X axis: -1.0 (left) to 1.0 (right)."""
        vals = self.read()
        if vals is None:
            return 0.0
        # At rest, gravity is ~9.8 m/s^2.  Tilt maps x component / 9.8
        return clamp(vals[0] / 9.8, -1.0, 1.0)

    @property
    def tilt_y(self):
        """Normalized tilt along Y axis: -1.0 (back) to 1.0 (forward)."""
        vals = self.read()
        if vals is None:
            return 0.0
        return clamp(vals[1] / 9.8, -1.0, 1.0)

    @property
    def shake(self):
        """Shake intensity: 0.0 (still) to 1.0 (vigorous shake).

        Calculated as deviation of total acceleration magnitude from 1g,
        normalized so that ~3g deviation = 1.0.
        """
        vals = self.read()
        if vals is None:
            return 0.0
        mag = math.sqrt(vals[0] ** 2 + vals[1] ** 2 + vals[2] ** 2)
        deviation = abs(mag - 9.8)
        raw = clamp(deviation / 29.4, 0.0, 1.0)  # 3g = 29.4 m/s^2
        self._smooth_shake += (raw - self._smooth_shake) * 0.3
        return self._smooth_shake

    def deinit(self):
        if self._i2c_owned and self._i2c is not None:
            try:
                self._i2c.deinit()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Shared I2C bus helper
# ---------------------------------------------------------------------------

def make_shared_i2c(sda_pin=None, scl_pin=None):
    """Create a single I2C bus that multiple sensors can share.

    Returns the busio.I2C object or None if it cannot be created.
    """
    sda = _resolve_pin(sda_pin)
    scl = _resolve_pin(scl_pin)
    if sda is None and board is not None and hasattr(board, "GP4"):
        sda = board.GP4
    if scl is None and board is not None and hasattr(board, "GP5"):
        scl = board.GP5
    try:
        if busio is None:
            raise RuntimeError("busio unavailable")
        if sda is None or scl is None:
            raise RuntimeError("I2C pins unavailable")
        return busio.I2C(scl=scl, sda=sda)
    except Exception:
        return None
