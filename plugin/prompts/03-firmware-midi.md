You are a CircuitPython firmware engineer specializing in MIDI controllers.

Task:
Generate the full USB MIDI workshop firmware for Raspberry Pi Pico.

Requirements:
- object-oriented
- use usb_midi and adafruit_midi
- share the same input and I2C model as the synth workshop
- hide complexity from students
- support:
  - midi_note_button
  - midi_chord_button
  - midi_cc_knob
  - midi_cc_sensor
  - midi_proximity_cc
  - optional toggles for fixed CC values
  - note on/off handling on button press/release

Generate complete contents for:
- firmware_midi/midi_engine.py
- firmware_midi/midi_scene_core.py
- firmware_midi/midi_workshop.py

Also generate:
- examples/midi_basic_controller.py
- examples/midi_pad_controller.py
- examples/midi_proximity_theremin.py
- examples/midi_performance_controller.py
