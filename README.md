# Pico Music Workshop

A complete Raspberry Pi Pico 2 (RP2350) music workshop with two tracks:

1. **Onboard Synth** — CircuitPython `synthio` with native effects (delay, reverb, distortion)
2. **USB MIDI Controller** — `adafruit_midi` + `usb_midi` for controlling DAWs and software synths

Students pick **one track** at the start. Same hardware base, different firmware.

## Architecture

Students edit **one file**: `code.py`. A config dict at the top controls everything.
The engine lives in `lib/` and is pre-flashed — students never touch it.

```
CIRCUITPY/
├── code.py              ← Students edit ONLY this
└── lib/
    ├── synth_engine.py  ← Hidden engine (synth track)
    ├── midi_engine.py   ← Hidden engine (MIDI track)
    ├── inputs.py        ← Button/pot/LDR/VL53L0X handling
    ├── patches.py       ← Synth patch presets
    ├── fx.py            ← Effects chain (Echo, Reverb, Distortion)
    ├── helpers.py       ← Utility functions
    ├── i2c_devices.py   ← Optional VL53L0X support
    └── adafruit_*.mpy   ← Standard Adafruit libraries
```

## Hardware

- Raspberry Pi Pico 2 (RP2350) + CircuitPython 10+
- 2-4 buttons (GP2-GP5, pull-up, active LOW)
- 2 potentiometers (GP26 ADC0, GP27 ADC1)
- 1 LDR (GP28 ADC2) with voltage divider
- PWM audio output (GP15) with RC filter
- Optional: VL53L0X ToF sensor (I2C on GP4 SDA, GP5 SCL)

## Workshop Duration

3 hours. Students start with 2 buttons, expand to 4 in the full build phase.

## Repo Structure

| Folder | Contents |
|--------|----------|
| `firmware/` | Synth track: `code.py` + `lib/` engine |
| `firmware_midi/` | MIDI track: `code.py` + `lib/` engine |
| `examples/` | Ready-to-copy `code.py` variants for both tracks |
| `visuals/` | SVG diagrams (pinout, wiring, signal flow) |
| `slides/` | 50-60 slide deck with full speaker script |
| `docs/` | Architecture, student guides, instructor guide, troubleshooting |
| `bom/` | Bill of materials + cost estimates |
| `flyers/` | Promotional copy for events |
| `web/` | Browser-based config generator (no build step) |
| `plugin/` | Prompt templates used to generate this workshop |
| `scripts/` | Helper scripts for workflow tracking |

## Generation Workflow

This repo was generated using staged LLM prompts. See `plugin/prompts/` for the prompt sequence.

## Student-Editable Files

- `firmware/code.py` (synth track)
- `firmware_midi/code.py` (MIDI track)

Everything else is pre-flashed infrastructure.
