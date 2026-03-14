# Repair Actions for QA Findings

Each item below maps to one or more IDs in `docs/QA_REPORT.md`.

## RA-01 - Unify I2C Pins Across Slides/Docs

- **Problems covered:** F1
- **Files to change:**
  - `slides/slide_outline.md`
  - `slides/full_speaker_script.md`
- **Exact fix:** replace GP0/GP1 wording with GP4/GP5 everywhere.

```md
- Pico default I2C0 example: SDA GP0, SCL GP1 (or board-configured pair).
+ Workshop standard I2C pins: SDA GP4, SCL GP5.
+ Note: GP4/GP5 are shared with Button 3/4 wiring; use ToF only in extension mode with alternate button plan.
```

- **Priority:** CRITICAL

## RA-02 - Replace Unsupported Slide CONFIG Schema

- **Problems covered:** F2, D1, D2, S1, I1
- **Files to change:**
  - `slides/slide_outline.md`
  - `slides/full_speaker_script.md`
- **Exact fix:** remove unsupported keys (`mode`, `audio_pin`, `button_pins`, `pot_pins`, `pot_targets`, `cc_numbers`, `note_numbers`, `ldr_pin`) and use real firmware keys.

```python
# Synth track (actual firmware schema)
CONFIG = {
    "patch": "pad",
    "scale": [0, 2, 4, 7, 9],
    "base_note": 48,
    "pot_a_controls": "filter",
    "pot_b_controls": "echo_mix",
    "ldr_controls": "vibrato_depth",
    "tof_controls": "pitch_bend",
}

# MIDI track (actual firmware schema)
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

- **Priority:** CRITICAL

## RA-03 - Correct Invalid Example Mapping Value

- **Problems covered:** C1
- **Files to change:**
  - `examples/scene_beginner.py`
- **Exact fix:**

```python
"ldr_controls": "vibrato" -> "ldr_controls": "vibrato_depth"
```

- **Priority:** HIGH

## RA-04 - Document and Resolve GP4/GP5 ToF/Button Contention

- **Problems covered:** C2, S2, I2
- **Files to change:**
  - `docs/STUDENT_QUICKSTART.md`
  - `docs/STUDENT_CHECKPOINTS.md`
  - `docs/INSTRUCTOR_RUN_OF_SHOW.md`
  - `slides/slide_outline.md`
  - `slides/full_speaker_script.md`
- **Exact fix (documentation minimum):** add explicit warning and classroom rule.

```md
### Important Pin Conflict
Buttons 3/4 use GP4/GP5, and VL53L0X I2C also uses GP4/GP5.
Do not run 4-button mode and ToF extension on the same default wiring.
For ToF extension: either (a) keep only GP2/GP3 buttons, or (b) move buttons 3/4 to alternate pins and update firmware.
```

- **Priority:** HIGH

## RA-05 - Add Dry-Synth Fallback if Effects Modules Missing

- **Problems covered:** C3
- **Files to change:**
  - `firmware/lib/synth_engine.py`
- **Exact fix:** wrap `EffectsChain` creation in `try/except` and fall back to direct synth playback.

```python
try:
    self.effects = EffectsChain(SAMPLE_RATE, CHANNEL_COUNT, BUFFER_SIZE)
    self.mixer = self.effects.build_chain(self.synth)
    self.effects.update_from_patch(self.patch)
except Exception:
    self.effects = None
    self.mixer = self.synth

self.audio.play(self.mixer)
```

- **Priority:** HIGH

## RA-06 - Fix Architecture Signal-Chain Description

- **Problems covered:** D3
- **Files to change:**
  - `docs/architecture_overview.md`
- **Exact fix:** update order to reflect actual code path.

```md
Audio processing order in code:
1. `synthio.Synthesizer`
2. `audiofilters.Distortion`
3. `audiodelays.Echo`
4. `audiofreeverb.Freeverb`
5. `audiomixer.Mixer`
6. `audiopwmio.PWMAudioOut(GP15)`
```

- **Priority:** MEDIUM

## RA-07 - Add Required Library Install Checklist

- **Problems covered:** S3, M1
- **Files to change:**
  - `docs/STUDENT_QUICKSTART.md`
  - `docs/TROUBLESHOOTING_GUIDE.md`
  - `docs/API_QUICK_REFERENCE.md`
- **Exact fix:** add explicit dependency list and failure symptoms.

```md
## Required CircuitPython Libraries
- MIDI track: `adafruit_midi`
- Optional ToF extension: `adafruit_vl53l0x`

If MIDI track runs but DAW receives no events, verify `adafruit_midi` is present in `CIRCUITPY/lib`.
```

- **Priority:** CRITICAL

## RA-08 - Align Web Tool Defaults With Firmware Defaults

- **Problems covered:** M2 (consistency risk), I1 (support burden)
- **Files to change:**
  - `web/app.js`
- **Exact fix:** set defaults to match `firmware_midi/code.py`.

```javascript
button_notes: [60, 62, 64, 65]
pot_a_cc: 7
pot_b_cc: 10
tof_cc: 1
velocity: 127
```

- **Priority:** MEDIUM

## RA-09 - Clarify Audio Output Hardware in BOM

- **Problems covered:** H1
- **Files to change:**
  - `bom/workshop_bom.md`
  - `bom/cost_estimate.md`
- **Exact fix:** replace ambiguous speaker row with explicit amp module path.

```md
Add required amp module line item and keep speaker as separate line item:
- PAM8302/PAM8403 amplifier module (required for classroom-audible synth track)
- 8 ohm mini speaker
```

- **Priority:** HIGH

## RA-10 - Increase Jumper Wire Quantity per Kit

- **Problems covered:** H2
- **Files to change:**
  - `bom/workshop_bom.md`
  - `bom/cost_estimate.md`
- **Exact fix:**

```md
Change jumper pack from 10 wires to at least 30 wires per student kit.
```

- **Priority:** HIGH

## RA-11 - Fix Throughput Tooling for 50-Person Lab

- **Problems covered:** I3
- **Files to change:**
  - `bom/cost_estimate.md`
  - `docs/INSTRUCTOR_RUN_OF_SHOW.md`
- **Exact fix:** increase hub count and add flashing-station workflow.

```md
Replace single 7-port hub with multi-hub plan (for example, 8x 7-port hubs for 50 seats).
Add run-of-show note assigning one flashing station per helper.
```

- **Priority:** MEDIUM

## RA-12 - Add Browser Test Matrix to Deployment Docs

- **Problems covered:** M2
- **Files to change:**
  - `docs/FINAL_DEPLOYMENT_CHECKLIST.md`
  - `docs/TROUBLESHOOTING_GUIDE.md`
- **Exact fix:** include browser/version smoke tests for `web/index.html` + `web/app.js` and clipboard/download fallback verification.

- **Priority:** MEDIUM
