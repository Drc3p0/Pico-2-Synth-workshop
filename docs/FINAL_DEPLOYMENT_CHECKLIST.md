# Final Deployment Checklist (Pre-Workshop)

## Core Readiness

- [ ] All firmware tested on real Pico 2 hardware
- [ ] CircuitPython 10+ verified on all Picos
- [ ] Web config generator tested in Chrome, Firefox, Safari
- [ ] All SVG diagrams render correctly (open each in browser)
- [ ] Slide deck reviewed for flow and timing
- [ ] BOM quantities confirmed against actual supplier stock
- [ ] Spare parts budget included (10% overage)
- [ ] USB cables tested (data, not charge-only!)
- [ ] Venue audio checked (can students hear their speakers?)
- [ ] Student handouts printed
- [ ] Instructor run-of-show printed

## Firmware Consistency Gates

- [ ] Synth track defaults match workshop constants (`patch=pad`, `scale=[0,2,4,7,9]`, `base_note=48`)
- [ ] MIDI track defaults match docs and web tool (`button_notes`, CCs, velocity)
- [ ] Pin map confirmed in both tracks: GP2-5 buttons, GP26/27 pots, GP28 LDR, GP15 audio
- [ ] Sample rate and buffer validated in synth engine (`28000`, `4096`)
- [ ] `examples/` files run without invalid config values

## Documentation/Slides Integrity

- [ ] Slide snippets use only implemented CONFIG keys (no `mode`, `button_pins`, `audio_pin`, etc.)
- [ ] I2C pin references are consistent everywhere (SDA GP4, SCL GP5)
- [ ] ToF extension explicitly warns about GP4/GP5 conflict with buttons 3/4
- [ ] `architecture_overview.md` signal-chain order matches firmware implementation
- [ ] Student docs include required CircuitPython library list (`adafruit_midi`, optional `adafruit_vl53l0x`)

## Hardware and Logistics

- [ ] Audio output hardware is explicit: amp module + speaker (not ambiguous speaker-only kit)
- [ ] Jumper quantity per kit is enough for full build (>10 wires)
- [ ] Enough powered USB hubs for the room (not a single 7-port hub for 50 seats)
- [ ] At least one fully assembled known-good demo kit ready at instructor table
- [ ] At least one known-good spare Pico + cable pair per helper
- [ ] Labeling in place for pre-tested kits (kit ID + test date)

## Browser and Tooling Validation

- [ ] Web tool copy button tested on all target browsers
- [ ] Web tool download button tested on all target browsers
- [ ] Web tool generated `code.py` diff-checked against firmware schema
- [ ] Browser fallback behavior documented when clipboard API is unavailable

## Dry-Run Signoff

- [ ] Full 3-hour rehearsal completed by instructor team
- [ ] Two-track switch rehearsal completed (`firmware/` vs `firmware_midi/` copy workflow)
- [ ] Troubleshooting drill run for top failures (no sound, no MIDI, bad wiring, syntax errors)
- [ ] Checkpoint timing validated with at least one beginner tester
- [ ] Final go/no-go signoff recorded by lead instructor
