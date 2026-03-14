def map_range(value, in_min, in_max, out_min, out_max):
    if in_max == in_min:
        return out_min
    scaled = (float(value) - float(in_min)) / (float(in_max) - float(in_min))
    return float(out_min) + (scaled * (float(out_max) - float(out_min)))


def clamp(value, minimum, maximum):
    if minimum > maximum:
        minimum, maximum = maximum, minimum
    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value


def lerp(a, b, t):
    return float(a) + ((float(b) - float(a)) * float(t))
