# Post-Workshop Finishing Guide

Nice work finishing the workshop. This guide helps you continue at home.

## 1) Keep CircuitPython Updated

- Download latest Pico 2 firmware from: https://circuitpython.org/board/raspberry_pi_pico2/
- Update steps:
  1. Hold BOOTSEL while plugging in USB.
  2. Drag the `.uf2` file to `RPI-RP2`.
  3. Wait for reboot and `CIRCUITPY` drive.

Tip: back up your `code.py` and `lib/` folder before updating.

## 2) Add More Patches in `patches.py`

Create a new patch by copying an existing patch dict and changing parameters.

Example pattern:

```python
PATCHES["my_soft_pad"] = {
    "waveform": "sine",
    "attack": 0.15,
    "decay": 0.2,
    "sustain": 0.7,
    "release": 0.4,
}
```

Then in `code.py`:

```python
"patch": "my_soft_pad"
```

## 3) Upgrade Audio Quality with I2S DAC

PWM on GP15 is great for workshops, but I2S DAC sounds cleaner.

High-level path:

1. Add an I2S DAC breakout (for example MAX98357A class parts).
2. Move audio output from PWM path to I2S output pins used by your board setup.
3. Update audio output code in engine to use I2S class instead of `audiopwmio`.

Keep your original PWM version as fallback while testing.

## 4) Add VL53L0X Distance Control

You can map distance to pitch/filter/effects.

Typical wiring (check your breakout labels):

- Sensor VIN -> 3.3V
- Sensor GND -> GND
- Sensor SDA/SCL -> Pico I2C pins used by your firmware

Then set `tof_controls` (synth) or `tof_cc` (MIDI) in `CONFIG`.

## 5) Where to Buy Parts

- Adafruit: https://www.adafruit.com/
- DigiKey: https://www.digikey.com/
- Mouser: https://www.mouser.com/
- SparkFun: https://www.sparkfun.com/
- Pimoroni: https://shop.pimoroni.com/

Search terms:

- "Raspberry Pi Pico 2"
- "10k resistor pack"
- "breadboard jumper kit"
- "photoresistor LDR"
- "panel-mount potentiometer" or "trim pot"

## 6) Community and Support

- CircuitPython Discord: https://adafru.it/discord
- Adafruit Forums: https://forums.adafruit.com/
- CircuitPython documentation: https://docs.circuitpython.org/

## 7) Next Project Ideas

1. Add OLED display for patch name and control values.
2. Add NeoPixels for note and sensor visual feedback.
3. Build wireless MIDI bridge with BLE or Wi-Fi bridge hardware.
4. Add sequencer mode with recorded button loops.
5. Build a printed enclosure for live performance use.

## Personal Progress Checklist

- [ ] I can change presets (`pad`, `bass`, `pluck`, `lead`)
- [ ] I can edit scale and base note confidently
- [ ] I can remap pots/LDR to new parameters or MIDI CCs
- [ ] I can recover a board using BOOTSEL + UF2
- [ ] I have one custom instrument/controller preset saved
