# Student Checkpoints (Build in Stages)

Build in this exact order. Test after each checkpoint before adding more wires.

## Shared Wiring Rules

- Use **pull-up + active LOW** button wiring on GP2-GP5.
- For each button: one side to GPIO pin, other side to GND.
- Pots: one outer leg to 3.3V, other outer leg to GND, center wiper to analog pin.
- LDR on GP28 must be in a **voltage divider** with a 10k resistor.

### Important: GP4/GP5 Pin Conflict
Buttons 3 and 4 use GP4 and GP5. The VL53L0X ToF sensor also uses GP4 (SDA) and GP5 (SCL) for I2C.
You cannot use 4 buttons AND the ToF sensor at the same time with default wiring.
For the ToF extension: keep only 2 buttons (GP2, GP3) and use GP4/GP5 for I2C.

---

## Checkpoint 1 - 2 Buttons + Speaker (First Sound)

### Wire

- Button 1 -> GP2 to GND
- Button 2 -> GP3 to GND
- Audio output -> GP15 to speaker/amp input (Synth Track)
- Common GND shared

### Expect

- Pressing GP2 or GP3 button triggers a tone/event.
- Releasing button stops/changes note behavior.

### If It Fails

- No sound: verify GP15 path and speaker power.
- No button response: confirm button goes to GND (not 3.3V).
- Constantly on note: button likely miswired or shorted.

---

## Checkpoint 2 - Add 2 Pots (Knob Control)

### Wire

- Pot A wiper -> GP26
- Pot B wiper -> GP27
- Both pots also connected to 3.3V and GND on outer pins

### Expect

- Turning Pot A changes first mapped parameter (often filter or volume).
- Turning Pot B changes second mapped parameter (often FX amount).

### If It Fails

- If value does not change: check wiper really goes to GP26/GP27.
- If value jumps/noisy: check stable GND and 3.3V connections.
- If backwards behavior: swap pot outer legs (3.3V/GND sides).

---

## Checkpoint 3 - Add LDR (Light Control)

### Wire

- One side of LDR to 3.3V
- Other side of LDR to GP28
- 10k resistor from GP28 to GND

This creates the required voltage divider.

### Expect

- Covering/uncovering LDR changes mapped sound or MIDI parameter.

### If It Fails

- Flickering values: too much ambient change; shield sensor with your hand.
- No effect: verify resistor is 10k and connected GP28 -> resistor -> GND.

---

## Checkpoint 4 - Add 2 More Buttons (4-Note Instrument)

### Wire

- Button 3 -> GP4 to GND
- Button 4 -> GP5 to GND

Now all four buttons are active: GP2, GP3, GP4, GP5.

### Expect

- Four playable notes/events from four buttons.

### If It Fails

- Missing one note: check that button's GPIO and GND jumper.
- Wrong note order: verify button order in your wiring and `button_notes`/scale setup.

---

## Checkpoint 5 - Edit `CONFIG` (Personalize Instrument)

### Edit

- Open `code.py` and change only the `CONFIG` dictionary.

Examples:

```python
# Synth track
"patch": "pluck"
"scale": [0, 2, 4, 7, 9]
"pot_a_controls": "volume"
```

```python
# MIDI track
"button_notes": [60, 62, 64, 67]
"pot_a_cc": 1
"velocity": 96
```

### Expect

- New sound behavior after save/reload.

### If It Fails

- Syntax error: check commas, quotes, and brackets in `CONFIG`.
- No update: confirm file saved to `CIRCUITPY/code.py`.

---

## Done Criteria

You are complete when:

- 4 buttons trigger events
- Pot A + Pot B are clearly changing output
- LDR changes output when covered/uncovered
- You successfully changed at least 2 `CONFIG` values
