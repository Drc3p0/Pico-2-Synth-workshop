# Instructor Run of Show (3 Hours)

Audience: up to 50 students in a maker-conference environment.

Goal: every student leaves with a working Pico 2 instrument (Synth Track) or USB MIDI controller (MIDI Track) and confidence editing `CONFIG`.

## Pre-Workshop (Before Doors Open)

### Hardware Prep

- Prepare 50 complete kits (+10% spares).
- Pre-flash all Pico 2 boards with CircuitPython 10+.
- Verify each kit once end-to-end on both tracks.
- Label kits if possible (kit number + tested date).

### Room Prep

- Test venue power strips and USB hubs.
- Confirm projector visibility for live coding.
- Prepare a "known-good demo kit" at instructor table.
- Print or display quick links to docs:
  - `docs/STUDENT_QUICKSTART.md`
  - `docs/STUDENT_CHECKPOINTS.md`
  - `docs/TROUBLESHOOTING_GUIDE.md`

### Talking Points to Open With

- "Edit only `CONFIG` in `code.py`."
- "Buttons are pull-up active LOW: GP2-GP5 -> button -> GND."
- "Two tracks, same hardware: Synth (onboard sound) or MIDI (DAW sound)."

### Important: GP4/GP5 Pin Conflict
Buttons 3 and 4 use GP4 and GP5. The VL53L0X ToF sensor also uses GP4 (SDA) and GP5 (SCL) for I2C.
You cannot use 4 buttons AND the ToF sensor at the same time with default wiring.
For the ToF extension: keep only 2 buttons (GP2, GP3) and use GP4/GP5 for I2C.

## During Workshop (Minute-by-Minute)

| Time | Instructor Focus | Student Outcome |
|---|---|---|
| 0:00-0:10 | Welcome, goals, show final demo | Understand workshop path |
| 0:10-0:20 | Explain pin map and active-LOW buttons | Correct wiring mental model |
| 0:20-0:35 | Guide Checkpoint 1 (2 buttons + GP15 audio) | First tone works |
| 0:35-0:50 | Stabilize stragglers before moving on | Group re-sync |
| 0:50-1:10 | Guide Checkpoint 2 (pots on GP26/GP27) | Knob control works |
| 1:10-1:20 | Break + side troubleshooting | Fewer blockers after break |
| 1:20-1:40 | Guide Checkpoint 3 (LDR divider on GP28 + 10k) | Light control works |
| 1:40-2:00 | Guide Checkpoint 4 (add GP4/GP5 buttons) | 4-note instrument/controller |
| 2:00-2:25 | Guide Checkpoint 5 (`CONFIG` creativity) | Personalized mapping/sound |
| 2:25-2:45 | Optional advanced support (VL53L0X) | Fast learners engaged |
| 2:45-2:58 | Student showcases | Confidence + closure |
| 2:58-3:00 | Wrap and post-workshop pointers | Clear next steps |

## Facilitation Strategy

### When to Pause for Stragglers

- Always pause after Checkpoint 1 and Checkpoint 2.
- Do not add new wiring if >20% of room is still blocked.
- Use "hands up" checks before advancing.

### When to Circulate

- During first 10 minutes of each checkpoint.
- During every save/reload moment (syntax mistakes appear here).
- During track switching (Synth vs MIDI confusion is common).

### Common Bottlenecks and Fast Interventions

1. **USB cable is charge-only**
   - Symptom: no `CIRCUITPY`, no MIDI device.
   - Fix: swap cable immediately.

2. **Shared computers / paired students**
   - Symptom: one student idle.
   - Fix: assign wiring + editor roles, swap every checkpoint.

3. **Wrong track copied**
   - Symptom: expecting audio but loaded MIDI firmware (or reverse).
   - Fix: re-copy correct folder (`firmware/` vs `firmware_midi/`).

4. **Button wiring not active LOW**
   - Symptom: stuck or inverted behavior.
   - Fix: rewire button to GPIO + GND only.

5. **Pot or LDR unstable**
   - Symptom: values jump wildly.
   - Fix: verify 3.3V/wiper/GND for pots and 10k divider for LDR.

## Staffing Recommendation

- 1 lead instructor + 2 helpers for 50 students.
- One helper handles wiring issues, one helper handles software/editor issues.

## Post-Workshop Wrap

- Decide kit policy: collect kits or let students keep them.
- Share repo link and `docs/POST_WORKSHOP_FINISHING_GUIDE.md`.
- Encourage students to save their final `CONFIG` values.
- Capture quick feedback: "What worked? What got confusing?"
