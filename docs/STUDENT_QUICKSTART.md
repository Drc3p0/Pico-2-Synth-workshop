# Student Quickstart (Pico 2 Music Workshop)

This guide gets you from unopened kit to playable instrument quickly.

## Before You Start

You need:

- Raspberry Pi Pico 2 (RP2350) with CircuitPython 10+
- USB data cable
- Breadboard + jumpers
- 4 buttons, 2 pots, 1 LDR, 1x 10k resistor
- Speaker or amp for Synth Track (GP15 PWM audio)

Pin map used in this workshop:

- Buttons: GP2, GP3, GP4, GP5 (pull-up, active LOW)
- Pot A: GP26
- Pot B: GP27
- LDR: GP28 (10k voltage divider)
- Audio out: GP15 (Synth Track)

### Important: GP4/GP5 Pin Conflict
Buttons 3 and 4 use GP4 and GP5. The VL53L0X ToF sensor also uses GP4 (SDA) and GP5 (SCL) for I2C.
You cannot use 4 buttons AND the ToF sensor at the same time with default wiring.
For the ToF extension: keep only 2 buttons (GP2, GP3) and use GP4/GP5 for I2C.

## Required CircuitPython Libraries (copy to CIRCUITPY/lib/)
- Synth track: no extra libraries needed (synthio is built-in)
- MIDI track: `adafruit_midi` (download from circuitpython.org/libraries)
- Optional ToF extension: `adafruit_vl53l0x` + `adafruit_bus_device`

## Step-by-Step Setup

1. **Plug in Pico 2 by USB**
   - Connect Pico 2 to your computer with a data cable.

2. **Open the CIRCUITPY drive**
   - A new drive named `CIRCUITPY` appears.

3. **Copy workshop firmware**
   - For onboard synth: copy files from `firmware/` to `CIRCUITPY`.
   - For MIDI controller: copy files from `firmware_midi/` to `CIRCUITPY`.

4. **Open `code.py` in any text editor**
   - Use Mu, VS Code, Thonny, or plain text editor.

5. **Edit only the `CONFIG` dictionary**
   - Keep changes above the line that says engine/do-not-edit.

6. **Save**
   - Pico reloads automatically in about 1-2 seconds.

## `CONFIG` Keys (Synth Track)

From `firmware/code.py`:

```python
CONFIG = {
    "patch": "pad",
    "scale": [0, 2, 4, 7, 9],
    "base_note": 48,
    "pot_a_controls": "filter",
    "pot_b_controls": "echo_mix",
    "ldr_controls": "vibrato_depth",
    "tof_controls": "pitch_bend",
}
```

- `patch`: sound style (`pad`, `bass`, `pluck`, `lead`)
- `scale`: semitone offsets used for button notes
- `base_note`: starting MIDI note number (example: 48 = C3, 60 = C4)
- `pot_a_controls`: parameter mapped to GP26
- `pot_b_controls`: parameter mapped to GP27
- `ldr_controls`: parameter mapped to GP28 light sensor
- `tof_controls`: parameter for optional distance sensor path

## `CONFIG` Keys (MIDI Track)

From `firmware_midi/code.py`:

```python
CONFIG = {
    "midi_channel": 0,
    "button_notes": [60, 62, 64, 65],
    "pot_a_cc": 7,
    "pot_b_cc": 10,
    "ldr_cc": 74,
    "tof_cc": 1,
    "velocity": 127,
}
```

- `midi_channel`: 0-15 (0 = MIDI channel 1)
- `button_notes`: notes for GP2-GP5 buttons
- `pot_a_cc`, `pot_b_cc`, `ldr_cc`, `tof_cc`: MIDI CC numbers (0-127)
- `velocity`: note-on velocity (0-127)

## Good First Changes to Try

Try one change, save, test, then continue.

### Synth Track

- Change preset:

```python
"patch": "lead"
```

- Change base note lower:

```python
"base_note": 36
```

- Try a major scale:

```python
"scale": [0, 2, 4, 5, 7, 9, 11]
```

### MIDI Track

- Put notes in pentatonic shape:

```python
"button_notes": [48, 50, 52, 55]
```

- Move Pot A from volume to modulation:

```python
"pot_a_cc": 1
```

- Reduce note velocity:

```python
"velocity": 90
```

## What If Nothing Happens?

1. Confirm you copied the right track folder (`firmware/` or `firmware_midi/`).
2. Confirm buttons are wired to GP2-GP5 and to GND (active LOW).
3. For synth audio, confirm speaker path from GP15 and power/ground.
4. Confirm `code.py` actually saved (watch Pico auto-reload).
5. Open serial console (Mu serial, or `screen /dev/tty*`) for Python errors.
6. Use `docs/TROUBLESHOOTING_GUIDE.md` for specific symptom fixes.

Next: follow `docs/STUDENT_CHECKPOINTS.md` to build in small, testable stages.
