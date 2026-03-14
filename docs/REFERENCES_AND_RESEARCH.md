# References and Research

This workshop is built on CircuitPython audio/MIDI tools plus classroom-tested teaching patterns.

## Core Technical Docs

- CircuitPython docs: https://docs.circuitpython.org/
- `synthio` API: https://docs.circuitpython.org/en/latest/shared-bindings/synthio/
- `usb_midi` API: https://docs.circuitpython.org/en/latest/shared-bindings/usb_midi/
- `adafruit_midi` library docs: https://docs.circuitpython.org/projects/midi/en/latest/
- `audiopwmio` (PWM audio): https://docs.circuitpython.org/en/latest/shared-bindings/audiopwmio/

## Audio Effects + Mixing Modules

- `audiodelays`: https://docs.circuitpython.org/en/latest/shared-bindings/audiodelays/
- `audiofilters`: https://docs.circuitpython.org/en/latest/shared-bindings/audiofilters/
- `audiofreeverb`: https://docs.circuitpython.org/en/latest/shared-bindings/audiofreeverb/
- `audiomixer`: https://docs.circuitpython.org/en/latest/shared-bindings/audiomixer/

## Tutorials and Community Knowledge

- todbot synthio tutorial repo: https://github.com/todbot/circuitpython-synthio-tricks
- todbot synthio examples/tricks notes: https://github.com/todbot/circuitpython-tricks
- Adafruit Learn home: https://learn.adafruit.com/
- Adafruit MIDI controller guide collection: https://learn.adafruit.com/search?q=midi+controller

## Hardware References

- Raspberry Pi Pico 2 product page: https://www.raspberrypi.com/products/raspberry-pi-pico-2/
- RP2350 data sheet: https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf
- RP2350 errata notes: https://www.raspberrypi.com/documentation/microcontrollers/rp2350.html

### Workshop Hardware Constraint Note

The workshop standard uses pull-up, active-LOW button wiring (GP2-GP5 to GND on press), aligned with RP2350 A2 practical guidance for stable classroom behavior.

## Workshop Design References

- Teardown 2023 workshop facilitation notes (internal event reference)
- Karel the Robot pattern (progressive abstraction pedagogy)
- Progressive disclosure model for beginners: start with constrained editable surface (`CONFIG`) before engine internals

## Credits

- CircuitPython core developers and maintainers
- Adafruit learning ecosystem and open hardware education resources
- Open-source contributors to synthio/MIDI examples used as inspiration
