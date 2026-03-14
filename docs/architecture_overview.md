# Architecture Overview

This workshop uses a **"config dict + hidden library"** architecture so beginners can make meaningful changes immediately while advanced students can dig deeper when ready.

## Platform and Runtime

- **Board:** Raspberry Pi Pico 2 (RP2350)
- **Firmware base:** CircuitPython 10+
- **Workshop delivery model:** same breadboard hardware for all students, with two firmware tracks:
  - `firmware/code.py` for the onboard synth track
  - `firmware_midi/code.py` for the USB MIDI controller track

Using one hardware build and two firmware personalities keeps logistics simple while supporting both sound-design and controller-focused learners.

## Core Pattern: Student Surface vs Engine Layer

The project is intentionally split into two layers:

1. **Student-facing surface (`code.py`)**
   - One editable file
   - Contains configuration dictionaries, feature toggles, and small mapping decisions
   - Safe to experiment with during a live class

2. **Engine layer (`lib/`)**
   - Reusable logic for input handling, synthesis/MIDI routing, effects, smoothing, and helpers
   - Hidden from beginners by default to reduce cognitive load
   - Opened later for advanced students

This creates a predictable teaching contract: students edit one place first, then progressively reveal internals.

## Two Tracks on Shared Hardware

### Synth Track (Onboard Audio)

- Runs entirely on Pico 2
- Generates sound with `synthio`
- Outputs audio from onboard PWM pin through a mixer and effects chain

### MIDI Track (External Instrument Control)

- Uses `usb_midi` + `adafruit_midi`
- Same buttons/sensors become MIDI note and control sources
- Audio is produced by a DAW/synth on host computer instead of Pico PWM output

The divergence between tracks is firmware behavior, not wiring, which minimizes classroom rewiring errors.

## Audio Signal Chain (Synth Track)

The synth firmware uses this chain (signal flows from source to output):

1. `synthio.Synthesizer` — tone generator (oscillators, per-note Biquad filter, envelopes)
2. `audiofilters.Distortion` — drive/overdrive stage
3. `audiodelays.Echo` — delay/echo effect
4. `audiofreeverb.Freeverb` — reverb
5. `audiomixer.Mixer` — level control and glitch-prevention buffer
6. `audiopwmio.PWMAudioOut(GP15)` — physical output

In code, effects are chained by calling `.play()` backwards:
`audio.play(mixer)`, `mixer.voice[0].play(reverb)`, `reverb.play(echo)`, `echo.play(distortion)`, `distortion.play(synth)`.

If effects modules are unavailable, the engine falls back to dry synth output (synth → mixer → audio).

## Input Architecture

### Digital Buttons

- Implemented with `keypad.Keys`
- Pins: GP2-GP5
- Electrical configuration: pull-up resistors, active LOW presses
- Press = pin pulled to GND

### Analog Controls

- `analogio.AnalogIn` channels:
  - GP26: Pot 1
  - GP27: Pot 2
  - GP28: LDR (photoresistor voltage divider)

### Optional Proximity Sensor

- VL53L0X on I2C
- GP4 = SDA, GP5 = SCL
- Enabled only for advanced extension activity

## MIDI Mapping Model (MIDI Track)

The MIDI firmware translates physical input into USB MIDI messages:

- **Buttons** -> `NoteOn` / `NoteOff`
- **Pots, LDR, VL53L0X** -> continuous CC values
- Transport path: sensor reading -> normalization/smoothing -> mapping -> `adafruit_midi` message send over `usb_midi`

This mirrors synth-track parameter mapping so students can transfer concepts across tracks.

## Patch Preset System

Patches are dictionary-based presets that define:

- waveform (sine/saw/square/triangle families)
- envelope behavior (attack/decay/sustain/release)
- filter defaults
- effects parameters (echo/reverb/distortion amounts and key timings)

Because patches are plain dicts, students can copy/modify presets without learning class hierarchies first.

## RP2350 A2 Erratum Constraint

Due to RP2350 A2 input behavior constraints used in this workshop:

- Buttons must be wired for **pull-UP + switch to GND**
- Do **not** use pull-down style button wiring

This rule is enforced across docs and starter firmware to avoid intermittent input faults.

## Progressive Disclosure Model (3 Levels)

The curriculum is built around three explicit depth levels:

1. **Level 1: Edit config dict values**
   - Change notes, scales, filter ranges, effect amounts, CC mappings
   - No structural code edits required

2. **Level 2: Uncomment/add small lines**
   - Enable optional features (extra mappings, alternate sensor routes, extension blocks)
   - Introduces control flow and feature toggles safely

3. **Level 3: Open `lib/` internals**
   - Modify engine behavior, smoothing strategy, effect routing, and helper math
   - For advanced students who want architecture-level control

This progression keeps beginners successful early while preserving authentic depth for fast learners.
