# Dry Run and Repairs Checklist

Use this before the event day to reduce live failures.

## 1) Test Every Kit End-to-End (Required)

For each kit:

1. Boot Pico 2 and confirm `CIRCUITPY` appears.
2. Run Synth Track (`firmware/`) and verify:
   - Buttons GP2-GP5 trigger notes
   - Pots GP26/GP27 change parameters
   - LDR GP28 with 10k divider changes parameter
   - Audio output works on GP15
3. Run MIDI Track (`firmware_midi/`) and verify:
   - Notes send from 4 buttons
   - CC sends from pots + LDR
   - Device appears as USB MIDI input on host

Record pass/fail status per kit number.

## 2) Verify CircuitPython Version on Every Pico

- Target runtime: CircuitPython 10+.
- Standardize all boards to the same version to avoid inconsistent behavior.

## 3) Venue Compatibility Test

- Test with the actual USB hubs planned for the room.
- Test on likely attendee OS mix (macOS/Windows/Linux if possible).
- Validate DAW MIDI detection on at least two machines.

## 4) Audio Check in Venue

- Validate GP15 synth output level in real room noise conditions.
- Bring at least one powered speaker and one headphone solution.
- Confirm cables/adapters (3.5mm, 1/4", etc.) match venue equipment.

## 5) Spare Hardware Policy (Minimum 10%)

For 50 students, prepare at least:

- 5 spare Pico 2 boards
- 5 spare USB data cables
- Spare buttons, pots, LDRs, 10k resistors, jumper sets

## 6) Print/Share Student Aids

- Print or QR-link:
  - `docs/STUDENT_QUICKSTART.md`
  - `docs/STUDENT_CHECKPOINTS.md`
  - `docs/API_QUICK_REFERENCE.md`
  - `docs/TROUBLESHOOTING_GUIDE.md`

## 7) Presenter Computer Readiness

- Load slide deck on presenter machine.
- Pre-open repository and docs tabs.
- Keep one known-good `code.py` for synth and MIDI ready to paste.

## 8) Repair Bench Procedure

When a kit fails:

1. Swap cable first (fastest high-probability fix).
2. Swap Pico second.
3. Re-test with known-good wiring harness.
4. Mark failed part and remove from circulation.

## 9) Final Go/No-Go Checklist (Morning Of)

- [ ] 50 tested kits staged
- [ ] 10% spares staged separately
- [ ] All docs links reachable
- [ ] Presenter station and projection tested
- [ ] Audio demo path tested in room
- [ ] Helpers briefed on common failures
