# QA Report - Raspberry Pi Pico 2 Music Workshop

Scope reviewed: firmware, firmware_midi, examples, docs, slides, web tool, and BOM/cost files listed in the task.

## Pin Assignment Consistency - FAIL

- **F1: I2C pin conflict across content (GP4/GP5 vs GP0/GP1).**
  - Code uses GP4/GP5 for I2C in synth and MIDI engines (`firmware/lib/synth_engine.py:126`, `firmware_midi/lib/midi_engine.py:168`, `firmware/lib/inputs.py:140-143`).
  - Slides teach GP0/GP1 for VL53L0X (`slides/slide_outline.md:364`, `slides/full_speaker_script.md:227`).
  - Architecture doc says GP4/GP5 (`docs/architecture_overview.md:80-81`).

- **F2: Slides teach pin-oriented CONFIG keys that do not exist in firmware.**
  - Examples use `audio_pin`, `button_pins`, `pot_pins`, `ldr_pin`, `mode` (`slides/slide_outline.md:180-181,219,248,303,310-312`; `slides/full_speaker_script.md:80-83,107-108,135,171-173,191,193-199`).
  - Runtime firmware only consumes synth keys (`patch`, `scale`, `base_note`, `pot_a_controls`, `pot_b_controls`, `ldr_controls`, `tof_controls`) and MIDI keys (`midi_channel`, `button_notes`, `pot_a_cc`, `pot_b_cc`, `ldr_cc`, `tof_cc`, `velocity`) (`firmware/code.py:6-22`, `firmware_midi/code.py:6-22`).

## Code Correctness - CONCERN

- **C1: Example scene contains invalid control value and silently falls back.**
  - `examples/scene_beginner.py:23` uses `"ldr_controls": "vibrato"`.
  - Engine only allows `vibrato_depth`, `reverb_room`, `filter_freq` (`firmware/lib/synth_engine.py:81-85`).
  - Result: learner edits appear accepted but do not do what example claims.

- **C2: Optional ToF and buttons share GP4/GP5 in both tracks without conflict handling.**
  - Buttons are always initialized on GP2-5 (`firmware/lib/synth_engine.py:116-120`, `firmware_midi/lib/midi_engine.py:158-163`).
  - ToF is also always initialized on GP4/GP5 (`firmware/lib/synth_engine.py:126`, `firmware_midi/lib/midi_engine.py:168`).
  - This creates pin-function contention in the full 4-button build.

- **C3: Synth effects stack hard-fails if specific modules are missing in firmware build.**
  - `EffectsChain` raises `RuntimeError` when any effects module import is missing (`firmware/lib/fx.py:39-47`).
  - No fallback mode in `SynthEngine` for "dry synth" if those modules are unavailable.

## Documentation Accuracy - FAIL

- **D1: Slide content repeatedly documents unsupported CONFIG schema.**
  - `mode`, `note_numbers`, `cc_numbers`, `pot_targets`, etc. are taught in slides (`slides/slide_outline.md:303,310-312`; `slides/full_speaker_script.md:171,194,196-197`) but not implemented in firmware.

- **D2: Track-switching guidance is incorrect.**
  - Script says switching tracks happens via a `mode` setting (`slides/full_speaker_script.md:34`).
  - Actual process is copying either `firmware/` or `firmware_midi/` (`docs/STUDENT_QUICKSTART.md:32-34`).

- **D3: Synth signal chain order in architecture doc does not match code chain.**
  - Doc sequence lists Echo -> Reverb -> Distortion before synth (`docs/architecture_overview.md:53-57`).
  - Code chain is synth -> distortion -> echo -> reverb -> mixer (`firmware/lib/fx.py:103-106`).

## Student Experience Gaps - FAIL

- **S1: Learners are shown non-functional config snippets in the main teaching assets.**
  - First-time students following slides/scripts will copy keys ignored by firmware, causing silent "why did nothing change" failures.

- **S2: No explicit warning that ToF wiring collides with GP4/GP5 button wiring.**
  - Students are told to add buttons 3/4 and later add ToF, but no explicit rewire/track constraint is documented in reviewed student-facing files.

- **S3: MIDI dependencies are not clearly listed in student setup path.**
  - MIDI engine requires `adafruit_midi` (`firmware_midi/lib/midi_engine.py:15-18`), but quickstart does not explicitly require installing that library bundle.

## Instructor Pain Points - CONCERN

- **I1: Slides and firmware disagree on configuration model, which causes live support load spikes.**
  - In a 50-person room this converts into many parallel "config changed but nothing happened" requests.

- **I2: ToF extension is scheduled as optional advanced content but pin conflict is undocumented.**
  - Instructors/helpers will have to debug hidden GP4/GP5 contention during advanced block.

- **I3: Staffing and tooling estimates are thin for throughput debugging.**
  - Run-of-show suggests 1 lead + 2 helpers (`docs/INSTRUCTOR_RUN_OF_SHOW.md:87-88`), while cost doc budgets only one 7-port USB hub (`bom/cost_estimate.md:66`) for a 50-seat workshop context.

## Hardware Risks - CONCERN

- **H1: Basic kit specifies `Speaker/Piezo Buzzer (8 ohm, 0.5W)` without mandatory amplifier module.**
  - BOM item is ambiguous and can lead to unusably quiet output or wrong wiring assumptions (`bom/workshop_bom.md:13`).
  - Teaching script assumes speaker module/amp power path (`slides/full_speaker_script.md:67`).

- **H2: Jumper quantity is likely insufficient for full build.**
  - Basic BOM provides one 10-wire pack (`bom/workshop_bom.md:14`) despite 4 buttons + 2 pots + LDR divider + power rails + audio path typically requiring more than 10 jumpers.

## Missing Content - CONCERN

- **M1: No single "required CircuitPython libraries" checklist for both tracks.**
  - Missing explicit list for `adafruit_midi` (MIDI track) and optional `adafruit_vl53l0x` (advanced extension).

- **M2: No explicit browser compatibility test evidence for web config tool in docs package.**
  - Deployment-critical for conference use, but no test matrix or known limitations documented in reviewed docs.

---

## Findings Index

- FAIL: F1, F2, D1, D2, D3, S1
- CONCERN: C1, C2, C3, S2, S3, I1, I2, I3, H1, H2, M1, M2
