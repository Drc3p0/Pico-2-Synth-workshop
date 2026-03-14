# Design Rationale

This document explains why the workshop architecture uses specific technical and pedagogical choices.

## Why a Config Dict Instead of OOP-First APIs

The workshop uses a **config dict in `code.py` + hidden `lib/` engine** model instead of asking beginners to define classes and inheritance trees.

- Inspired by the Teardown 2023 teaching pattern: expose one editable surface, keep complexity behind stable helpers.
- Similar to the Karel the Robot learning model: constrained commands first, internals later.
- Lowers syntax burden in first hour, so students can focus on cause-and-effect ("change value -> hear result").
- Makes instructor support faster because student code shape stays predictable.

OOP concepts are still available later by opening `lib/`, but they are not a prerequisite for first success.

## Why Pico 2 (RP2350) Instead of Pico 1

Pico 2 was selected for reliability and sonic capability in a live classroom.

- Supports the native effects stack used here (`audiodelays`, `audiofreeverb`, `audiofilters`) with practical headroom.
- Extra RAM and compute margin improve stability when combining synthesis, input polling, smoothing, and effects.
- RP2350 A2 erratum is manageable in workshop constraints by standardizing pull-up-to-GND button wiring.

Pico 1 can run simplified builds, but Pico 2 better supports the full architecture without trimming core features.

## Why PWM Audio Instead of I2S

PWM output is used for the base workshop path.

- Fewer wires and fewer failure points during rapid assembly.
- No external DAC board required, reducing parts cost and setup variability.
- Faster bring-up for beginners: one pin (`GP15`) and immediate audible feedback.
- Better workshop reliability: less connector fragility and fewer compatibility surprises.

I2S can provide higher fidelity, but the complexity cost is not worth it for a 3-hour beginner session.

## Why `keypad.Keys` Instead of Manual Debounce

Button handling uses `keypad.Keys` rather than hand-written debounce loops.

- Hardware-assisted/event-driven behavior is more robust under mixed workload.
- Reduces timing bugs caused by polling jitter when audio and sensor code run together.
- Cleaner architecture: button presses become discrete events, not ad hoc state checks.
- Simplifies beginner mental model and keeps engine code maintainable.

## Why ADC Masking with `& 0xFF00`

ADC readings on RP2040/RP2350 can show low-bit instability near the noise floor.

- Applying `value & 0xFF00` discards noisy least-significant bits.
- Produces steadier control values before additional smoothing.
- Reduces audible zippering and jitter in mapped synth/MIDI parameters.

This is a pragmatic workshop-grade denoising step, not precision instrumentation.

## Why EMA Smoothing for LDR Input

LDR readings naturally drift with ambient light flicker and room changes.

- Exponential moving average (EMA) smooths rapid fluctuations while preserving playable responsiveness.
- Lightweight enough to run continuously without harming audio timing.
- Improves consistency across classrooms with different lighting conditions.

EMA gives a better feel than raw readings while avoiding heavy filter math.

## Why Pentatonic Scale as Default

Default note sets use pentatonic intervals.

- Pentatonic mappings minimize dissonant combinations from random button presses.
- Beginners get musical results quickly, reinforcing confidence.
- Supports improvisation with limited controls (2-4 buttons) without theory overhead.

The goal is immediate musicality, not theory instruction in the first session.

## Why Progressive 2-Then-4 Button Build

The hardware sequence starts with 2 buttons, then expands to 4.

- Shortens time-to-first-sound in the critical first build window.
- Reduces early wiring errors and debugging complexity.
- Creates a clear success checkpoint before adding complexity.
- Lets instructors stabilize the room before full instrument wiring.

This pacing directly improves completion rate in mixed-experience cohorts.

## Why VL53L0X Continuous Mode

The optional time-of-flight sensor is run in continuous mode.

- Single blocking reads around ~20 ms can stall control loops.
- In audio contexts, that stall can introduce parameter stepping and audible glitches.
- Continuous mode decouples acquisition from per-loop blocking waits, keeping interaction smoother.

Because VL53L0X is an advanced extension, continuous mode preserves quality without penalizing the base path.

## Overall Design Principle

The architecture prioritizes three outcomes:

1. **Fast first success** (hear something quickly).
2. **Stable classroom operation** (predictable wiring and runtime behavior).
3. **Real depth when desired** (students can open `lib/` and go far beyond presets).

Every major technical choice supports at least one of these outcomes, and most support all three.
