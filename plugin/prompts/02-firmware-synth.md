You are a CircuitPython firmware engineer.

Task:
Generate the full onboard synth workshop firmware for Raspberry Pi Pico.

Requirements:
- object-oriented
- use synthio
- use patch presets
- hide complexity from students
- support:
  - note_button
  - chord_button
  - analog_cutoff
  - analog_resonance
  - analog_volume
  - analog_delay_mix
  - analog_reverb_mix
  - analog_delay_time
  - analog_distortion
  - analog_pitch_bend
  - proximity_pitch
  - proximity_cutoff
  - proximity_volume
  - enable_delay
  - enable_reverbish
  - enable_distortion

Generate complete runnable contents for:
- firmware/config.py
- firmware/helpers.py
- firmware/inputs.py
- firmware/i2c_devices.py
- firmware/patches.py
- firmware/fx.py
- firmware/synth_engine.py
- firmware/scene_core.py
- firmware/workshop.py
- firmware/scene.py
- firmware/code.py

Also generate:
- examples/scene_beginner.py
- examples/scene_ambient_drone.py
- examples/scene_acid_machine.py
- examples/scene_tof_theremin.py

No stubs.
