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


def clamp(value, minimum, maximum):
    if minimum > maximum:
        minimum, maximum = maximum, minimum
    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value


class SmoothedAnalog:
    def __init__(self, pin, alpha=0.15):
        self.alpha = clamp(alpha, 0.0, 1.0)
        self._adc = None
        self._available = False
        self._smoothed = 0.0

        try:
            if analogio is None:
                raise RuntimeError("analogio unavailable")
            self._adc = analogio.AnalogIn(pin)
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


class ButtonManager:
    def __init__(self, pins, value_when_pressed=False, pull=True):
        self._keys = None
        self._available = False

        try:
            if keypad is None:
                raise RuntimeError("keypad unavailable")
            self._keys = keypad.Keys(
                pins,
                value_when_pressed=value_when_pressed,
                pull=pull,
            )
            self._available = True
        except Exception:
            self._keys = None

    @property
    def available(self):
        return self._available

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


class OptionalVL53L0X:
    def __init__(self, sda_pin=None, scl_pin=None):
        self._i2c = None
        self._sensor = None
        self._available = False

        if sda_pin is None and board is not None and hasattr(board, "GP4"):
            sda_pin = board.GP4
        if scl_pin is None and board is not None and hasattr(board, "GP5"):
            scl_pin = board.GP5

        try:
            if busio is None:
                raise RuntimeError("busio unavailable")
            adafruit_vl53l0x = __import__("adafruit_vl53l0x")
            if sda_pin is None or scl_pin is None:
                raise RuntimeError("I2C pins unavailable")

            self._i2c = busio.I2C(scl=scl_pin, sda=sda_pin)
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
            if self._i2c is not None:
                try:
                    self._i2c.deinit()
                except Exception:
                    pass
                self._i2c = None

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

        if self._i2c is not None:
            try:
                self._i2c.deinit()
            except Exception:
                pass
