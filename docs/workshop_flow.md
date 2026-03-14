# Workshop Flow (3 Hours)

This timeline is optimized for first-time embedded learners: quick wins early, stable checkpoints, and optional depth for fast students.

## At-a-Glance Schedule

| Time | Segment | Goals | Checkpoint |
|---|---|---|---|
| 0:00-0:15 | Welcome and orientation | Introduce Pico 2, CircuitPython workflow, and workshop outcome | Everyone can describe what they will build |
| 0:15-0:30 | Hardware intro | Explain buttons, pots, LDR, voltage dividers, analog vs digital signals | Students identify each component role |
| 0:30-0:50 | First build (2 buttons + speaker) | Wire GP2, GP3, GP15 and run first firmware | **Hear a tone** |
| 0:50-1:10 | Add 2 pots | Wire GP26 and GP27 and map to sound controls | **Knob changes filter/volume** |
| 1:10-1:20 | Break | Pause, reset, assist stragglers | Group synced for second half |
| 1:20-1:40 | Add LDR | Wire GP28 photoresistor divider and map to parameter | **Covering sensor changes sound** |
| 1:40-2:00 | Full build (add 2 buttons) | Add GP4 and GP5 for expanded input set | **4-note instrument works** |
| 2:00-2:20 | Creative time | Edit config dict, swap presets, change scales/mappings | Personalized instrument behavior |
| 2:20-2:40 | Advanced options | VL53L0X extension or curated example scenes | Optional advanced interaction complete |
| 2:40-2:55 | Showcase | Student demos and quick feedback | Each student shares one outcome |
| 2:55-3:00 | Wrap-up | Resources, next steps, take-home guide | Students leave with continuation plan |

## Detailed Segment Notes

### 0:00-0:15 — Welcome, context, and objective

- Set expectations: this is a hands-on build, not a lecture-heavy session.
- Explain Pico 2 in plain terms: a microcontroller running real-time interaction code.
- Show end goal: playable mini-instrument or MIDI controller built from the same hardware kit.
- Confirm setup basics: USB connection, CircuitPython drive visibility, file edit workflow.

### 0:15-0:30 — Hardware and signal concepts

- Introduce component functions:
  - Buttons = discrete digital events
  - Pots = continuous analog controls
  - LDR = light-dependent analog control
- Explain voltage dividers for pot and LDR readings.
- Contrast digital HIGH/LOW with analog ranges.
- Reinforce workshop wiring standard: pull-up style buttons (active LOW).

### 0:30-0:50 — First build: 2 buttons + speaker

- Wire two buttons to GP2 and GP3.
- Connect audio output path to GP15.
- Run first starter firmware and validate event handling.
- Checkpoint: each student must hear a stable tone from button interaction.

**Track divergence starts after this checkpoint:**

- **Synth track:** continue with onboard sound shaping.
- **MIDI track:** keep same physical inputs, but shift target to outbound USB MIDI messages.

### 0:50-1:10 — Add 2 pots (GP26, GP27)

- Wire two potentiometers into analog inputs GP26 and GP27.
- Validate smooth value changes in firmware.
- Map one pot to filter control and one to volume (or mapped CC in MIDI track).
- Checkpoint: turning knobs produces obvious parameter change.

### 1:10-1:20 — Break

- Mandatory pause to reduce fatigue and keep momentum.
- Instructor uses this window for targeted troubleshooting and rewiring fixes.

### 1:20-1:40 — Add LDR (GP28)

- Build LDR voltage divider and connect to GP28.
- Demonstrate ambient-light sensitivity and mapping curve behavior.
- Checkpoint: covering/uncovering sensor audibly or visibly changes output.

### 1:40-2:00 — Full build: add GP4 and GP5 buttons

- Extend from 2 to 4 buttons total (GP2-GP5).
- Validate all notes/events trigger correctly.
- Checkpoint: students have a playable 4-note instrument/controller layout.

### 2:00-2:20 — Creative parameter exploration

- Students modify config dict values safely:
  - preset selection
  - scale changes
  - effect depth or CC routing
- Encourage quick A/B comparisons and save known-good versions.

### 2:20-2:40 — Advanced path

- Fast students add optional VL53L0X on I2C.
- Others explore curated example scenes to learn by mutation.
- Focus is extension without blocking baseline success for the room.

### 2:40-2:55 — Showcase

- Each student demonstrates one sound/controller behavior they created.
- Instructor highlights diverse mappings to reinforce that architecture supports creativity.

### 2:55-3:00 — Wrap-up

- Share follow-up docs, examples, and next-step learning path.
- Provide take-home guide for rebuilding, modifying, and extending independently.

## Track-Specific Flow Notes

- **Shared through first checkpoint (0:30-0:50):** identical wiring and button-event validation.
- **Synth track after divergence:** emphasizes local audio signal chain, patch changes, and effect sculpting.
- **MIDI track after divergence:** emphasizes note/CC mapping discipline, host synth testing, and performance control ergonomics.
- **Rejoin at showcase:** both tracks present equally valid musical outcomes from same hardware base.
