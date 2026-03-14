# File Tree

This repository is organized around two firmware tracks (synth and MIDI), shared examples, and workshop support assets.

```text
firmware/
├── code.py              <- Student-facing synth file
└── lib/
    ├── synth_engine.py  <- Main loop, note management, sensor->parameter mapping
    ├── inputs.py        <- SmoothedAnalog, button/pot/LDR/VL53L0X abstraction
    ├── patches.py       <- Waveforms (sine/saw/sq/tri) + preset dicts (pad, bass, pluck, lead)
    ├── fx.py            <- Effects chain setup (Echo, Reverb, Distortion via audiomixer)
    ├── helpers.py       <- map_range, clamp, midi_to_hz wrapper
    └── i2c_devices.py   <- VL53L0X continuous-mode wrapper

firmware_midi/
├── code.py              <- Student-facing MIDI file
└── lib/
    ├── midi_engine.py   <- MIDI send loop, CC mapping, note triggers
    └── inputs.py        <- Same as firmware/lib/inputs.py (copy)

examples/
├── scene_beginner.py              <- Simplest synth code.py
├── scene_ambient_drone.py         <- Evolving pad with LFO modulation
├── scene_acid_machine.py          <- Resonant filter sweep, saw wave
├── scene_tof_theremin.py          <- VL53L0X controls pitch
├── midi_basic_controller.py       <- 4 buttons = 4 notes, 2 pots = 2 CCs
├── midi_pad_controller.py         <- Velocity-sensitive pad mode
├── midi_proximity_theremin.py     <- VL53L0X -> pitch bend
└── midi_performance_controller.py <- Full CC mapping

visuals/         <- SVG diagrams
slides/          <- Slide deck + speaker notes
docs/            <- This folder
bom/             <- Bill of materials
flyers/          <- Event promotional copy
web/             <- Browser config generator
```

## Directory Roles

- `firmware/`: onboard synthesis track; students hear sound directly from Pico PWM audio output.
- `firmware_midi/`: USB MIDI controller track; students control external instruments from same hardware build.
- `examples/`: ready-to-run scenes for fast iteration, extension activities, and recovery when a student file gets broken.
- `visuals/`: diagrams used during hardware walkthroughs and troubleshooting.
- `slides/`: instructor presentation assets and speaking prompts.
- `docs/`: architecture, run-of-show, troubleshooting, and handoff documentation.
- `bom/`: ordering and prep references for workshop kits.
- `flyers/`: public-facing event messaging.
- `web/`: browser-based generator for student configuration scaffolding.

## Firmware Responsibility Split

- `code.py` files are intentionally minimal and student-editable.
- `lib/` files contain reusable logic that supports the progressive disclosure model:
  - beginner edits happen in top-level config
  - intermediate edits toggle/add small mappings
  - advanced edits happen inside engines and abstractions
