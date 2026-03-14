# Pico 2 Music Workshop - Start Here

Welcome. This repository is for a 3-hour Raspberry Pi Pico 2 music workshop (RP2350 + CircuitPython 10+), designed for a maker-conference classroom with about 50 students.

## What You Build

One hardware build, two software tracks:

- **Synth Track** (`firmware/`): Pico 2 generates sound locally using `synthio`.
- **MIDI Track** (`firmware_midi/`): Pico 2 sends USB MIDI to a DAW or software synth.

Both tracks share the same wiring:

- PWM audio output: **GP15** (Synth Track audio pin)
- Buttons: **GP2-GP5** (pull-up wiring, active LOW)
- Potentiometer A: **GP26**
- Potentiometer B: **GP27**
- LDR: **GP28** with a **10k voltage divider**

## One Rule for Students

Students should edit only the `CONFIG` dictionary in `code.py`:

- Synth Track: `firmware/code.py`
- MIDI Track: `firmware_midi/code.py`

Save the file -> Pico auto-reloads.

## Docs Map

- `docs/STUDENT_QUICKSTART.md` - first hands-on steps
- `docs/STUDENT_CHECKPOINTS.md` - progressive build milestones
- `docs/API_QUICK_REFERENCE.md` - all `CONFIG` keys and valid values
- `docs/TROUBLESHOOTING_GUIDE.md` - common issues and fixes
- `docs/INSTRUCTOR_RUN_OF_SHOW.md` - minute-by-minute facilitation plan
- `docs/DRY_RUN_AND_REPAIRS.md` - pre-event test and spare strategy
- `docs/POST_WORKSHOP_FINISHING_GUIDE.md` - student continuation path
- `docs/REFERENCES_AND_RESEARCH.md` - external docs, credits, and design references

## Quick Prep Checklist

Before class:

1. Confirm each Pico 2 is on CircuitPython 10+.
2. Decide student track: Synth or MIDI.
3. Confirm USB cables are data-capable.
4. Verify at least one known-good hardware kit end-to-end.
5. Print or share `docs/API_QUICK_REFERENCE.md` and `docs/TROUBLESHOOTING_GUIDE.md`.

## Default Musical Settings

- Presets: `pad`, `bass`, `pluck`, `lead`
- Default scale: pentatonic `[0, 2, 4, 7, 9]`

If you are a student, continue with `docs/STUDENT_QUICKSTART.md`.
