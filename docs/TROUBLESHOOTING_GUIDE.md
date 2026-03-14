# Troubleshooting Guide

Use this during workshop debugging. Start with symptom, then apply checks top-to-bottom.

## Required CircuitPython Libraries (copy to CIRCUITPY/lib/)
- Synth track: no extra libraries needed (synthio is built-in)
- MIDI track: `adafruit_midi` (download from circuitpython.org/libraries)
- Optional ToF extension: `adafruit_vl53l0x` + `adafruit_bus_device`

## 1) No Sound (Synth Track)

### Checks

1. Confirm you are running Synth Track files (`firmware/` copied to `CIRCUITPY`).
2. Confirm audio pin is GP15 and wired correctly to speaker/amp path.
3. Confirm speaker/amp is powered and volume is up.
4. Confirm `code.py` saved (Pico should auto-reload).
5. Press a known-good button (GP2 or GP3) and test again.

### Fix

- Re-copy clean `firmware/` files and retest with default `CONFIG`.

## 2) Stuck Notes

### Checks

1. Press and release all four buttons (GP2-GP5) once.
2. Check for physically jammed button on breadboard.
3. Confirm no button pin is shorted to GND permanently.

### Fix

- If still stuck, press Pico reset button or unplug/replug USB.

## 3) Pot Does Nothing

### Checks

1. Confirm wiper (middle leg) is on GP26 (Pot A) or GP27 (Pot B).
2. Confirm outer legs are 3.3V and GND.
3. Confirm no loose ground wire.

### Important

- Pot wiring order matters: `3.3V - wiper - GND` across the pot legs.

## 4) LDR Flickers or Is Too Noisy

### Checks

1. Confirm LDR divider is correct: LDR to 3.3V, 10k resistor to GND, midpoint to GP28.
2. Confirm resistor value is 10k (not 100 ohm or 1M by mistake).
3. Check room lighting (stage lighting can fluctuate quickly).

### Fix

- Cover sensor with your hand to stabilize local light.
- Move away from direct projector beam or sun flicker.

## 5) MIDI Not Recognized (MIDI Track)

### Checks

1. Confirm you copied `firmware_midi/` to `CIRCUITPY`.
2. Unplug/replug USB cable.
3. Confirm cable is data-capable, not charge-only.
4. In DAW, enable Pico MIDI input device and arm a track.
5. Verify channel mapping (`midi_channel` in code is zero-based).

### Fix

- Restart DAW after reconnecting device if needed.

## 6) Code Errors After Editing `CONFIG`

### Checks

1. Open serial console (Mu serial REPL or `screen /dev/tty*`).
2. Read traceback line number.
3. Check missing comma, quote, or bracket in `CONFIG`.

### Fix

- Revert to last known-good `CONFIG`, then reapply one change at a time.

## 7) Pico Not Showing as `CIRCUITPY`

### Recovery Steps

1. Hold **BOOTSEL** on Pico 2.
2. Plug USB while holding BOOTSEL.
3. Release when `RPI-RP2` drive appears.
4. Drag correct CircuitPython `.uf2` for Pico 2 to that drive.
5. Wait for reboot, then `CIRCUITPY` should appear.

## Fast Hardware Sanity Checklist

- Buttons on GP2-GP5 to GND (active LOW)
- Pot A GP26, Pot B GP27
- LDR divider midpoint GP28 with 10k to GND
- Shared GND everywhere
- Synth audio pin GP15

If still blocked, ask an instructor to swap in a known-good Pico and cable to isolate whether issue is wiring or board state.
