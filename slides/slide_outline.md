# Raspberry Pi Pico 2 Music Workshop Slide Outline (56 Slides)

## 1. Welcome & Intro (Slides 1-5)

### Slide 1 - Welcome to Pico Music Lab
- Today we build a playable electronic instrument with Raspberry Pi Pico 2.
- You will leave with a working device and code you can remix.
- Two tracks: onboard synthio synth OR USB MIDI controller.
- Everyone follows the same wiring milestones; software branch differs later.
- Suggested visual: `visuals/workshop_hero_collage.svg`

### Slide 2 - What We Will Build in 3 Hours
- Milestones: first tone, knobs control sound, light controls sound, full 4-button instrument.
- Final options: expressive standalone synth or MIDI controller for DAW/synth apps.
- We pause for one short break and end with student showcase.
- Suggested visual: `visuals/timeline_3hour_workshop.svg`

### Slide 3 - Learning Goals
- Understand digital input (buttons) and analog input (pots, LDR).
- Use CircuitPython 10+ on Pico 2 (RP2350).
- Edit only `CONFIG` in `code.py` to customize instrument behavior.
- Practice fast troubleshoot loops: wire check, pin check, print check, test tone.
- Suggested visual: `visuals/learning_goals_icons.svg`

### Slide 4 - Agenda and Timing
- 0:00-0:15 intro and orientation.
- 0:15-1:10 hardware and first two builds.
- 1:10-1:20 break.
- 1:20-2:40 sensor + full build + creative + advanced.
- 2:40-3:00 showcase and wrap-up.
- Suggested visual: `visuals/agenda_block_schedule.svg`

### Slide 5 - Workshop Norms and Safety
- Power off USB before moving many wires.
- Keep volume low before first sound test.
- Build in checkpoints; do not race ahead without hearing/seeing expected result.
- Ask for help early: "No sound" is usually one wire or pin mismatch.
- Suggested visual: `visuals/bench_safety_checklist.svg`

## 2. What Is a Microcontroller / Pico 2 (Slides 6-10)

### Slide 6 - Microcontroller vs Computer
- Microcontroller: one focused program, direct pin control, real-time responses.
- Laptop: many processes, high overhead, less direct hardware IO.
- Pico 2 is ideal for instruments because latency can be very low.
- Suggested visual: `visuals/mcu_vs_computer.svg`

### Slide 7 - Meet Raspberry Pi Pico 2 (RP2350)
- Dual-core RP2350 microcontroller board.
- 3.3V logic; do not connect 5V signals directly to GPIO.
- GPIO pins support digital input/output; some pins support ADC.
- Runs CircuitPython 10+ for beginner-friendly rapid iteration.
- Suggested visual: `visuals/pico_pinout_poster.svg`

### Slide 8 - CircuitPython Workflow
- Plug in Pico 2 and open `CIRCUITPY` drive.
- `code.py` runs automatically on save.
- Use serial console for print debugging.
- Our template keeps logic fixed; students edit `CONFIG` values.
- Suggested visual: `visuals/circuitpython_save_and_run.svg`

### Slide 9 - Audio Path Overview
- PWM audio output pin: GP15.
- GP15 feeds amplifier/speaker module input.
- Start with low gain to protect ears and speaker.
- If no sound: verify GP15 jumper, ground, and power rails first.
- Suggested visual: `visuals/audio_signal_flow_gp15.svg`

### Slide 10 - Hardware Map for This Workshop
- Buttons: GP2, GP3, GP4, GP5.
- Pots: GP26 (A0), GP27 (A1).
- LDR voltage divider: GP28 (A2) with 10k resistor.
- Common ground is mandatory across all components.
- Suggested visual: `visuals/full_pin_assignment_map.svg`

## 3. Track Choice: Synth vs MIDI (Slides 11-13)

### Slide 11 - Choose Your Track
- Track A: onboard synthio synth (sound comes from Pico rig).
- Track B: USB MIDI controller (Pico sends MIDI to host).
- Both tracks use same physical controls and same `CONFIG` editing style.
- You can switch tracks later by copying either `firmware/` (synth) or `firmware_midi/` (MIDI) to the Pico.
- Suggested visual: `visuals/track_choice_split.svg`

### Slide 12 - Track A: Onboard Synthio
- Uses `synthio` engine in CircuitPython 10+.
- Native effects available: Echo, Reverb, Distortion.
- Great for standalone instrument demos and immediate speaker feedback.
- Patch presets: `pad`, `bass`, `pluck`, `lead`.
- Suggested visual: `visuals/synthio_signal_chain.svg`

### Slide 13 - Track B: USB MIDI Controller
- Uses `usb_midi` + `adafruit_midi`.
- Sends `NoteOn`, `NoteOff`, and `ControlChange` messages.
- Host examples: Ableton Live, GarageBand, FL Studio, hardware synth over USB host.
- Great if you want full DAW instruments and recording workflow.
- Suggested visual: `visuals/usb_midi_flow.svg`

## 4. Analog vs Digital, Buttons, Pots, Sensors (Slides 14-20)

### Slide 14 - Digital Inputs: Two States
- Digital pins read HIGH or LOW.
- Buttons are ideal digital controls: pressed/not pressed.
- With pull-up wiring, unpressed=HIGH and pressed=LOW (active LOW).
- Suggested visual: `visuals/digital_high_low_wave.svg`

### Slide 15 - Pull-Up Buttons (Active LOW)
- Each button input uses internal pull-up resistor.
- One side of button to GPIO (GP2-GP5), other side to GND.
- Pressing button connects GPIO to GND -> reads LOW.
- Code logic checks `if not button.value` for pressed state.
- Suggested visual: `visuals/breadboard_button.svg`

### Slide 16 - Analog Inputs: Continuous Values
- ADC reads ranges, not just two states.
- Pots and LDR provide smoothly changing control signals.
- CircuitPython returns normalized values from 0.0 to 1.0 (or raw 16-bit if needed).
- Suggested visual: `visuals/analog_continuous_signal.svg`

### Slide 17 - Potentiometer Wiring Basics
- Pot has 3 pins: VCC, wiper, GND.
- Wire outer pins to 3V3 and GND.
- Wire center wiper to ADC pin (GP26 or GP27).
- Reversed outer pins only flips direction; not harmful.
- Suggested visual: `visuals/pot_wiring_tripin.svg`

### Slide 18 - LDR + 10k Voltage Divider
- LDR resistance changes with light level.
- Build divider: 3V3 -> LDR -> node -> 10k -> GND.
- Connect divider node to GP28 (ADC).
- Brighter/darker direction depends on which side LDR is placed.
- Suggested visual: `visuals/ldr_voltage_divider.svg`

### Slide 19 - Common Ground and Power Rails
- Tie all component grounds to Pico GND rail.
- Tie all sensor/pot 3V3 points to Pico 3V3 rail.
- Floating grounds cause noisy readings and random behavior.
- Ground first, signal second is a safe wiring habit.
- Suggested visual: `visuals/common_ground_star.svg`

### Slide 20 - Build Strategy: Checkpoints
- Add small hardware chunks, test immediately.
- Checkpoint 1: two buttons trigger audible tone.
- Checkpoint 2: pots clearly change sound.
- Checkpoint 3: LDR affects tone/filter/CC.
- Checkpoint 4: four buttons playable instrument.
- Suggested visual: `visuals/checkpoint_ladder.svg`

## 5. First Build: 2 Buttons + Speaker (Slides 21-26)

### Slide 21 - Parts for Build 1
- Pico 2, breadboard, USB cable.
- 2 momentary buttons.
- Speaker or amplified speaker module.
- Jumper wires.
- Suggested visual: `visuals/parts_flatlay_build1.svg`

### Slide 22 - Wiring Step 1: Audio Output
- Pico GP15 -> speaker signal input (or amp IN).
- Pico GND -> speaker/amp GND.
- Pico 3V3 or VBUS -> amp power (depends on module spec).
- Keep volume knob low before first boot.
- Suggested visual: `visuals/wiring_gp15_speaker.svg`

### Slide 23 - Wiring Step 2: Button 1 on GP2
- Place button across breadboard center gap.
- One button leg -> GP2.
- Opposite leg -> GND rail.
- No external resistor needed because internal pull-up is enabled in code.
- Suggested visual: `visuals/wiring_button_gp2.svg`

### Slide 24 - Wiring Step 3: Button 2 on GP3
- Place second button across center gap.
- One leg -> GP3.
- Opposite leg -> GND rail.
- Verify no accidental shorts between neighboring rows.
- Suggested visual: `visuals/wiring_button_gp3.svg`

### Slide 25 - Code Checkpoint: First Tone
- Synth track: confirm `CONFIG["base_note"]` and `CONFIG["scale"]` are set for your first two notes.
- MIDI track: confirm `CONFIG["button_notes"]` starts with two distinct notes.
- Press each button and listen for a note.
- If both notes are identical, check note map in `CONFIG`.
- Suggested visual: `visuals/config_first_tone_snippet.svg`

### Slide 26 - Troubleshooting: No Sound Yet?
- Verify speaker wired to GP15, not GP14/GP16.
- Confirm common GND between Pico and speaker module.
- Check amp power and volume level.
- Ensure board mounted as `CIRCUITPY` and `code.py` actually saved.
- Use serial print: button state changes when pressed.
- Suggested visual: `visuals/troubleshoot_no_sound_flowchart.svg`

## 6. Adding Pots (Slides 27-31)

### Slide 27 - Build 2 Goal: Knobs Shape Sound
- Add two pots for expressive control.
- Pot 1 on GP26: map to cutoff / MIDI CC1 (mod).
- Pot 2 on GP27: map to resonance / MIDI CC74 (brightness).
- Target checkpoint: turning knob causes obvious sound change.
- Suggested visual: `visuals/build2_goal_pots.svg`

### Slide 28 - Wiring Pot 1 to GP26
- Pot outer pin A -> 3V3 rail.
- Pot center wiper -> GP26 (ADC0).
- Pot outer pin B -> GND rail.
- Twist knob and observe changing ADC value in serial monitor.
- Suggested visual: `visuals/wiring_pot_gp26.svg`

### Slide 29 - Wiring Pot 2 to GP27
- Pot outer pin A -> 3V3 rail.
- Pot center wiper -> GP27 (ADC1).
- Pot outer pin B -> GND rail.
- Keep wire runs short for cleaner analog readings.
- Suggested visual: `visuals/wiring_pot_gp27.svg`

### Slide 30 - CONFIG Edit Example for Pots
- Synth track snippet:
  - `"pot_a_controls": "filter"`
  - `"pot_b_controls": "echo_mix"`
- MIDI track snippet:
  - `"pot_a_cc": 7`
  - `"pot_b_cc": 10`
- Suggested visual: `visuals/config_pot_mapping_dualtrack.svg`

### Slide 31 - Troubleshooting Pots
- If value is stuck near 0 or 1, wiper may be on wrong pin.
- If value jumps noisily, check ground and loose jumper.
- If turning clockwise feels backward, swap the two outer pot wires.
- Suggested visual: `visuals/troubleshoot_pot_noise.svg`

## 7. Adding LDR (Slides 32-35)

### Slide 32 - Build 3 Goal: Light Controls Sound
- Add LDR on GP28 using 10k divider.
- Map light to effect depth, filter, or MIDI CC.
- Checkpoint: covering sensor causes clear timbre or CC change.
- Suggested visual: `visuals/build3_goal_ldr.svg`

### Slide 33 - LDR Wiring Step-by-Step
- Connect LDR leg 1 -> 3V3 rail.
- Connect LDR leg 2 -> shared node row.
- Connect 10k resistor from node row -> GND rail.
- Connect node row -> GP28 (ADC2).
- Suggested visual: `visuals/wiring_ldr_gp28.svg`

### Slide 34 - CONFIG Edit Example for LDR Mapping
- Synth track: `"ldr_controls": "vibrato_depth"` or `"filter_freq"`
- MIDI track: `"ldr_cc": 74` (brightness) or another CC number
- Suggested visual: `visuals/config_ldr_mapping.svg`

### Slide 35 - Troubleshooting LDR Behavior
- No response: confirm divider node goes to GP28, not direct 3V3.
- Inverted behavior: swap LDR and resistor positions in divider.
- Too sensitive: smooth with software averaging and narrower min/max.
- Suggested visual: `visuals/troubleshoot_ldr_curve.svg`

## 8. Full Build: 4 Buttons (Slides 36-39)

### Slide 36 - Build 4 Goal: Four-Note Instrument
- Add two more buttons on GP4 and GP5.
- Final button set: GP2-GP5 with pull-up, active LOW.
- Target checkpoint: each button triggers a different scale note.
- Suggested visual: `visuals/build4_goal_four_buttons.svg`

### Slide 37 - Wiring Buttons 3 and 4
- Button 3 one leg -> GP4, opposite leg -> GND.
- Button 4 one leg -> GP5, opposite leg -> GND.
- Place buttons with consistent orientation to reduce miswires.
- Suggested visual: `visuals/wiring_buttons_gp4_gp5.svg`

### Slide 38 - Note Mapping and Debounce
- Example pentatonic map: C4, D4, E4, G4.
- Debounce prevents double triggers from contact bounce.
- Track A: direct synth note trigger.
- Track B: send NoteOn/NoteOff over USB MIDI.
- Suggested visual: `visuals/four_button_note_map.svg`

### Slide 39 - Full Build Validation Checklist
- Press each button: unique pitch or MIDI note.
- Turn each pot: distinct mapped parameter changes.
- Cover/uncover LDR: measurable response.
- Confirm no hot components, no loose power rails.
- Suggested visual: `visuals/full_build_checklist.svg`

## 9. The Code: How CONFIG Dict Works (Slides 40-44)

### Slide 40 - Core Rule: Edit CONFIG Only
- Students customize behavior by editing dictionary values.
- Core engine code stays untouched for workshop reliability.
- Fast recovery: restore known-good `CONFIG` block if broken.
- Suggested visual: `visuals/config_only_rule.svg`

### Slide 41 - CONFIG Skeleton
- Keys include: patch/scale, note mapping, and control mappings.
- Use only firmware-supported keys in each track.
- Keep value types correct: numbers for notes/CC, strings for control targets.
- Suggested visual: `visuals/config_skeleton_highlight.svg`

### Slide 42 - Synth Track CONFIG Example
- `"patch": "pad"`
- `"scale": [0, 2, 4, 7, 9]`
- `"base_note": 48`
- `"pot_a_controls": "filter"`, `"pot_b_controls": "echo_mix"`
- `"ldr_controls": "vibrato_depth"`, `"tof_controls": "pitch_bend"`
- Suggested visual: `visuals/config_synth_example.svg`

### Slide 43 - MIDI Track CONFIG Example
- `"midi_channel": 0`
- `"button_notes": [60, 62, 64, 65]`
- `"pot_a_cc": 7`, `"pot_b_cc": 10`
- `"ldr_cc": 74`, `"tof_cc": 1`
- `"velocity": 127`
- Buttons send NoteOn/NoteOff, analog controls send ControlChange.
- Suggested visual: `visuals/config_midi_example.svg`

### Slide 44 - Safe Editing Workflow
- Change one value at a time, save, test.
- If broken, undo recent edit before changing more values.
- Use serial console printouts for pin/value sanity checks.
- Suggested visual: `visuals/edit_test_loop.svg`

## 10. Creative Exploration: Presets, Scales, Mappings (Slides 45-49)

### Slide 45 - Creative Time Prompt
- Make your instrument feel intentional: one mood, one performance idea.
- Choose a patch and scale first, then tune control mappings.
- Suggested visual: `visuals/creative_prompt_board.svg`

### Slide 46 - Preset Patches
- `pad`: soft attack, wide texture.
- `bass`: strong low harmonics, short decay.
- `pluck`: fast attack/decay, rhythmic articulation.
- `lead`: focused, expressive, good for melody.
- Suggested visual: `visuals/patch_cards_pad_bass_pluck_lead.svg`

### Slide 47 - Pentatonic Scale Advantage
- Pentatonic avoids harsh clashes for beginners.
- "Sounds good no matter what" for random or fast playing.
- Example in C pentatonic: C, D, E, G, A.
- Suggested visual: `visuals/pentatonic_keyboard_overlay.svg`

### Slide 48 - Mapping Ideas That Feel Musical
- Pot1 -> filter cutoff for brightness sweeps.
- Pot2 -> reverb/echo mix for space.
- LDR -> expression/volume for gesture control.
- MIDI track: map CC74 to synth brightness in DAW.
- Suggested visual: `visuals/mapping_ideas_matrix.svg`

### Slide 49 - Mini Challenges During Creative Time
- Build a calm ambient patch in 5 minutes.
- Build a punchy bass patch in 5 minutes.
- Pair up and trade instruments to test each other’s mappings.
- Suggested visual: `visuals/creative_challenges_timer.svg`

## 11. Advanced: VL53L0X or Examples (Slides 50-52)

### Slide 50 - Fast Track Option A: VL53L0X Distance Sensor
- Time-of-flight sensor gives distance in mm.
- Use I2C wiring: SDA/SCL + power + ground.
- Map distance to pitch bend, filter, or MIDI CC.
- Suggested visual: `visuals/vl53l0x_overview.svg`

### Slide 51 - VL53L0X Wiring and I2C Pins
- Workshop standard I2C pins: SDA GP4, SCL GP5.
- Sensor VIN -> 3V3, GND -> GND.
- Keep wires short; I2C errors often come from loose SDA/SCL.

### Important: GP4/GP5 Pin Conflict
Buttons 3 and 4 use GP4 and GP5. The VL53L0X ToF sensor also uses GP4 (SDA) and GP5 (SCL) for I2C.
You cannot use 4 buttons AND the ToF sensor at the same time with default wiring.
For the ToF extension: keep only 2 buttons (GP2, GP3) and use GP4/GP5 for I2C.
- Suggested visual: `visuals/wiring_vl53l0x_i2c.svg`

### Slide 52 - Option B: Explore Example Modes
- Arpeggiator pattern mode.
- Drum-trigger mode via MIDI notes.
- Sensor-only ambient drone mode.
- Keep base wiring intact so you can always revert.
- Suggested visual: `visuals/advanced_examples_grid.svg`

## 12. Showcase & Wrap-Up (Slides 53-56)

### Slide 53 - Showcase Format
- 30-45 seconds per student/pair.
- Share: track chosen, favorite mapping, one challenge solved.
- Audience listens for expressive control and creative intent.
- Suggested visual: `visuals/showcase_stage_layout.svg`

### Slide 54 - Reflection Prompts
- What surprised you about hardware + code interaction?
- Which control felt most expressive: buttons, pots, or LDR?
- What would you add next with more time?
- Suggested visual: `visuals/reflection_prompts_cards.svg`

### Slide 55 - Where to Go Next
- Add more notes with button matrix.
- Add sequencer or looper behavior.
- Build a printed enclosure and label controls.
- Use USB MIDI with favorite DAW instrument chain.
- Suggested visual: `visuals/next_steps_roadmap.svg`

### Slide 56 - Wrap-Up and Resources
- Congrats: you built a real playable digital instrument.
- Save your `code.py` and take a wiring photo before teardown.
- Resource pack: starter repo, docs, pinout, example presets.
- Thank you and keep making strange sounds.
- Suggested visual: `visuals/thank_you_resources.svg`
