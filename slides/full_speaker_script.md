# Full Speaker Script - Raspberry Pi Pico 2 Music Workshop

## Slide 1 - Welcome to Pico Music Lab
Welcome, everyone. In this workshop, you are going to build a real electronic instrument using a Raspberry Pi Pico 2. By the end, each of you will have a device you can play, modify, and keep improving after class. We will follow checkpoints so nobody gets lost, and we will support each other when hardware gremlins show up.

## Slide 2 - What We Will Build in 3 Hours
Here is the full arc for today. First we get sound from two buttons and a speaker, then we add knobs, then a light sensor, then two more buttons to make a four-note instrument. After that, you will personalize your sound and optionally try advanced extensions. We close with a short showcase so everyone hears what others built.

## Slide 3 - Learning Goals
Our goals are practical. You will learn digital inputs with buttons, analog inputs with potentiometers and an LDR, and how to run CircuitPython 10+ on Pico 2. You will also learn a reliable workflow where you only edit the `CONFIG` dictionary in `code.py`, so you can customize safely without breaking core logic.

## Slide 4 - Agenda and Timing
Let me quickly map the schedule. We spend the first 15 minutes on orientation, then hardware and early builds until the break at 1 hour 10 minutes. After break, we add the LDR, complete the full instrument, and move into creative and advanced time. The final 20 minutes are showcase and wrap-up.

## Slide 5 - Workshop Norms and Safety
Two norms keep this workshop smooth: build in checkpoints, and ask for help early. If you are rewiring many connections, unplug USB first. Start with low speaker volume before any sound test. If your build fails, that is normal and expected, and we will debug it methodically.

## Slide 6 - Microcontroller vs Computer
A microcontroller is a tiny computer that runs one focused job very reliably. For us, that means reading controls and producing sound or MIDI with low latency. Unlike a laptop running many apps, the Pico directly controls GPIO pins in real time. That is why microcontrollers are great for musical interfaces.

## Slide 7 - Meet Raspberry Pi Pico 2 (RP2350)
This board is the Raspberry Pi Pico 2 with the RP2350 chip. It uses 3.3-volt logic, so we avoid feeding 5-volt signals directly into GPIO pins. Some pins are digital-only, and some are analog-capable for ADC reading. We are using CircuitPython 10+ so we can edit quickly and immediately test.

## Slide 8 - CircuitPython Workflow
The workflow is simple: plug in Pico, open the `CIRCUITPY` drive, edit `code.py`, and save. On save, the board re-runs your code automatically. If something looks wrong, use serial console printouts to inspect values. We keep this workshop stable by changing only `CONFIG`, not engine internals.

## Slide 9 - Audio Path Overview
Our sound path starts at PWM output on GP15. That signal goes to your speaker module or amplifier input, with a shared ground. If there is no sound later, GP15 routing and ground are the first checks. Keep volume low before the first successful tone test.

## Slide 10 - Hardware Map for This Workshop
Here is the pin map we will reuse all day. Buttons go on GP2 through GP5 with pull-up logic. Pots go to GP26 and GP27, and the LDR divider node goes to GP28. A shared ground rail is not optional; it is essential.

## Slide 11 - Choose Your Track
You now choose your software output track. Track A makes sound directly on the Pico using synthio. Track B sends USB MIDI to a host like a DAW or virtual instrument. Hardware is the same for both, and you can switch later by copying either `firmware/` contents (synth) or `firmware_midi/` contents (MIDI) to the Pico.

## Slide 12 - Track A: Onboard Synthio
In synth track, Pico generates audio locally using `synthio`. You can use built-in effects such as Echo, Reverb, and Distortion. This is ideal if you want immediate standalone sound from your hardware. We will also use patch presets like pad, bass, pluck, and lead.

## Slide 13 - Track B: USB MIDI Controller
In MIDI track, Pico behaves as a controller. It sends `NoteOn`, `NoteOff`, and `ControlChange` messages through USB using `usb_midi` and `adafruit_midi`. Your DAW or synth app produces the audio. This track is perfect if you want richer instruments and recording workflows.

## Slide 14 - Digital Inputs: Two States
Digital input means the pin reads one of two states: HIGH or LOW. Buttons are perfect for this because they are naturally on-or-off actions. In our wiring, unpressed is HIGH and pressed is LOW. That behavior is called active LOW.

## Slide 15 - Pull-Up Buttons (Active LOW)
We use internal pull-ups so we do not need extra resistors for each button. One side of each button goes to a GPIO pin, the other side goes to ground. When pressed, the pin is pulled to ground and reads LOW. In code, a common pattern is `if not button.value:` to detect press.

## Slide 16 - Analog Inputs: Continuous Values
Analog input is different because values vary continuously across a range. Pots and LDRs provide these continuous control signals. In CircuitPython, we often normalize readings so they are easy to map between 0.0 and 1.0. This gives smooth control over tone and effects.

## Slide 17 - Potentiometer Wiring Basics
Each potentiometer has three legs. The middle leg is the wiper, and it must go to the ADC pin. The two outer legs go to 3V3 and ground. If direction feels reversed, swap the outer legs; that only changes turning direction.

## Slide 18 - LDR + 10k Voltage Divider
The LDR changes resistance based on light, but ADC reads voltage, so we build a voltage divider. We wire 3V3 to LDR, then a node, then 10k resistor to ground, and read the node with GP28. Covering and uncovering the sensor changes the node voltage. That gives us a gesture control input.

## Slide 19 - Common Ground and Power Rails
Most weird hardware behavior comes from missing common ground. Every component ground must connect back to Pico ground. Every sensor using 3V3 must share the same 3V3 rail. Ground-first wiring habits make debugging much faster.

## Slide 20 - Build Strategy: Checkpoints
We will follow checkpoints instead of one giant build. First we confirm tone from buttons, then we confirm knob response, then LDR response, then full four-note playability. If a checkpoint fails, we pause and fix it before adding more complexity. This keeps failure states small and solvable.

## Slide 21 - Parts for Build 1
For build one, confirm you have Pico 2, breadboard, USB cable, two buttons, speaker or amp module, and jumper wires. Place components with room to add more later. Do not crowd your breadboard early. Clean layout saves time during debugging.

## Slide 22 - Wiring Step 1: Audio Output
First make audio wiring. Connect GP15 to your speaker module input, and connect Pico ground to module ground. Power the amp module according to its spec, usually from 3V3 or VBUS. Keep gain low until we validate tone.

## Slide 23 - Wiring Step 2: Button 1 on GP2
Now add button one. Place the button across the breadboard center gap so opposite legs are electrically separate. Connect one side to GP2 and the opposite side to ground. We use internal pull-up in code, so no external resistor is needed.

## Slide 24 - Wiring Step 3: Button 2 on GP3
Add button two the same way. One side goes to GP3 and the opposite side to ground. Keep orientation consistent with button one so debugging is easy. Double-check that each button is on distinct breadboard rows.

## Slide 25 - Code Checkpoint: First Tone
Now confirm this minimum `CONFIG` setup and save `code.py`.

```python
CONFIG = {
    "patch": "pad",
    "scale": [0, 2, 4, 7, 9],
    "base_note": 48,
}

# MIDI track alternative
CONFIG = {
    "midi_channel": 0,
    "button_notes": [60, 62, 64, 65],
    "velocity": 127,
}
```

Press each button. You should hear two distinct notes in synth track, or see note events in MIDI track. If notes do not match buttons, we will verify `button_notes` and note mapping values.

## Slide 26 - Troubleshooting: No Sound Yet?
If you hear nothing, check GP15 first. It is very common to move one pin over by accident. Next, verify shared ground between Pico and the speaker module, then verify amp power and volume. Finally, confirm your file saved and board restarted by checking the serial console.

## Slide 27 - Build 2 Goal: Knobs Shape Sound
Great, now we add two potentiometers so your instrument becomes expressive. Pot one will usually control cutoff or CC1, and pot two will control resonance or CC74. The important thing is that knob movement causes obvious change. If you cannot hear or see change, we debug before moving on.

## Slide 28 - Wiring Pot 1 to GP26
Wire pot one now. Connect one outer leg to 3V3, center wiper to GP26, and the other outer leg to ground. Open serial and print the reading while rotating to confirm range movement. If value stays flat, your wiper is likely miswired.

## Slide 29 - Wiring Pot 2 to GP27
Repeat the same pattern for pot two, but route the wiper to GP27. Keep analog wires tidy and not stretched loosely across the board. Rotate both knobs and confirm each one changes a different value. Distinct behavior means mapping is working.

## Slide 30 - CONFIG Edit Example for Pots
Here are practical `CONFIG` examples for both tracks.

```python
# Synth track
CONFIG.update({
    "pot_a_controls": "filter",
    "pot_b_controls": "echo_mix",
})

# MIDI track
CONFIG.update({
    "pot_a_cc": 7,
    "pot_b_cc": 10,
})
```

Save, rotate knobs, and verify one control at a time so you can isolate issues quickly.

## Slide 31 - Troubleshooting Pots
If readings are stuck near minimum or maximum, check that the center pin is truly the wiper. If values jump or flicker badly, reseat wires and confirm ground continuity. If turning direction feels backward, swap the two outer pot legs. Backward direction is not a failure, just preference.

## Slide 32 - Build 3 Goal: Light Controls Sound
Now we add the LDR so light affects sound behavior. You can map this to effect depth, filter brightness, or MIDI expression. The checkpoint is simple: covering the sensor should produce a repeatable change. This makes the instrument feel performative and tactile.

## Slide 33 - LDR Wiring Step-by-Step
Build the divider carefully. Connect 3V3 to one LDR leg, connect the second LDR leg to a shared node row, connect a 10k resistor from that node to ground, and connect GP28 to the same node. The ADC must read the node, not the direct 3V3 leg.

## Slide 34 - CONFIG Edit Example for LDR Mapping
Add this style of mapping and calibration to `CONFIG`.

```python
CONFIG.update({
    "ldr_controls": "vibrato_depth",  # synth track
    "ldr_cc": 74,                       # MIDI track
})
```

After saving, test in both room light and with your hand covering the sensor, then tune min/max.

## Slide 35 - Troubleshooting LDR Behavior
If the sensor does nothing, you likely wired GP28 to the wrong row or skipped the resistor leg to ground. If behavior is inverted, swap LDR and resistor positions in the divider. If changes are too jumpy, smooth in software and narrow calibration range. LDRs are noisy by nature, so some filtering is normal.

## Slide 36 - Build 4 Goal: Four-Note Instrument
Now we complete the instrument by adding two more buttons. Final button pins are GP2, GP3, GP4, and GP5, all active LOW with pull-ups. When finished, each button triggers a distinct note. This is our full playable checkpoint.

## Slide 37 - Wiring Buttons 3 and 4
Add button three from GP4 to ground, and button four from GP5 to ground. Keep orientation matching your first two buttons. Consistency makes visual inspection much easier. After wiring, do a slow row-by-row check for accidental bridges.

## Slide 38 - Note Mapping and Debounce
Use a simple pentatonic set like C4, D4, E4, G4 or MIDI notes 60, 62, 64, 67. Debounce in software prevents false double triggers from physical switch bounce. In synth mode this avoids repeated note spam; in MIDI mode it prevents messy NoteOn bursts. Test each button separately and then in quick combinations.

## Slide 39 - Full Build Validation Checklist
Run a complete system check now. Confirm all four buttons produce unique notes, both pots change mapped parameters, and the LDR responds to light changes. Verify wires are firmly seated and no part is overheating. If all checks pass, you are ready for creative customization.

## Slide 40 - Core Rule: Edit CONFIG Only
From here onward, all creative changes happen in `CONFIG`. We leave engine code untouched so the workshop stays stable for everyone. If something breaks, restore last known-good `CONFIG` and continue. This method keeps experimentation safe.

## Slide 41 - CONFIG Skeleton
Think of `CONFIG` as your instrument definition file. It holds patch/scale choices, note mapping, and controller mappings. Use only firmware-supported keys for your selected track, and keep note lists aligned with button order. One edit at a time is the safest habit.

## Slide 42 - Synth Track CONFIG Example
Here is a strong synth-mode baseline.

```python
CONFIG = {
    "patch": "pad",
    "scale": [0, 2, 4, 7, 9],
    "base_note": 48,
    "pot_a_controls": "filter",
    "pot_b_controls": "echo_mix",
    "ldr_controls": "vibrato_depth",
    "tof_controls": "pitch_bend",
}
```

This should sound musical quickly while still leaving plenty of room for personal taste.

## Slide 43 - MIDI Track CONFIG Example
Here is a practical MIDI-mode baseline.

```python
CONFIG = {
    "midi_channel": 0,
    "button_notes": [60, 62, 64, 65],
    "pot_a_cc": 7,
    "pot_b_cc": 10,
    "ldr_cc": 74,
    "tof_cc": 1,
    "velocity": 127,
}
```

With this setup, your host synth receives notes plus expressive controller data.

## Slide 44 - Safe Editing Workflow
Use a loop: change one value, save, test, and only then make another change. If behavior breaks, revert the most recent change before editing anything else. Use serial prints to validate raw inputs first, then mapping behavior second. This is how professionals debug embedded music systems under time pressure.

## Slide 45 - Creative Time Prompt
Now it is your instrument. Pick a mood first, like ambient, punchy, dreamy, or aggressive. Then choose a patch and scale that match that mood. Finally shape controls so the instrument feels fun to perform, not just technically correct.

## Slide 46 - Preset Patches
Use patch presets as starting points, not limits. `pad` is soft and spacious, `bass` is thick and grounded, `pluck` is short and rhythmic, and `lead` is focused for melody. Start with one preset and make two small parameter changes. Small, intentional moves usually sound better than random big changes.

## Slide 47 - Pentatonic Scale Advantage
Pentatonic is the easiest scale for fast success because it avoids many harsh clashes. In C pentatonic, notes are C, D, E, G, and A. That means beginners can play freely and still sound musical. If you feel stuck, return to pentatonic and focus on expression controls.

## Slide 48 - Mapping Ideas That Feel Musical
A good mapping creates a clear relationship between gesture and sound. Try pot one to filter cutoff for brightness, pot two to reverb or echo for space, and LDR to expression depth. In MIDI mode, CC74 is a classic brightness control and CC11 is a strong expression lane. Pick mappings you can hear instantly.

## Slide 49 - Mini Challenges During Creative Time
Try this sequence: five minutes to make a calm ambient patch, then five minutes to make a punchy bass patch. After that, swap instruments with a neighbor and see if they can perform with your mapping immediately. If they can, your interface is clear. If not, refine control direction and range.

## Slide 50 - Fast Track Option A: VL53L0X Distance Sensor
If you are ahead, try adding a VL53L0X time-of-flight sensor. It measures distance in millimeters and opens up gesture control without touching the instrument. You can map distance to filter sweeps, pitch effects, or MIDI CC. Keep your base build intact so you can revert quickly.

## Slide 51 - VL53L0X Wiring and I2C Pins
For the workshop standard, wire I2C with SDA on GP4 and SCL on GP5, plus 3V3 and ground. Confirm all four wires are firm because I2C is sensitive to poor connections. If scan fails, check SDA/SCL swap first. Then verify sensor power and correct board orientation.

### Important: GP4/GP5 Pin Conflict
Buttons 3 and 4 use GP4 and GP5. The VL53L0X ToF sensor also uses GP4 (SDA) and GP5 (SCL) for I2C.
You cannot use 4 buttons AND the ToF sensor at the same time with default wiring.
For the ToF extension: keep only 2 buttons (GP2, GP3) and use GP4/GP5 for I2C.

## Slide 52 - Option B: Explore Example Modes
If you skip VL53L0X, use this time to explore example modes like arpeggiator, drum-trigger MIDI, or ambient drone behavior. Work from known-good wiring and only change one behavior at a time. Save working versions as you go so you can backtrack. The goal is confidence, not complexity for its own sake.

## Slide 53 - Showcase Format
For showcase, each student or pair gets about 30 to 45 seconds. Share your track choice, one mapping you are proud of, and one bug you solved. Keep it short so everyone gets a turn. Celebrate progress, not polish.

## Slide 54 - Reflection Prompts
Take a minute to reflect. What surprised you most about how hardware choices change software behavior? Which control felt most expressive for your playing style? What would your version two include next week?

## Slide 55 - Where to Go Next
If you continue after class, you can add more buttons, create a sequencer, build a looper, or design an enclosure with labels and knobs. MIDI users can build complete DAW templates around their controller mappings. Synth users can expand patches and effects for live performance. This is a strong foundation for bigger instrument projects.

## Slide 56 - Wrap-Up and Resources
You built a working digital instrument in three hours, which is a big achievement. Before teardown, save your final `code.py` and take a wiring photo. Use the starter repo and pinout references to keep iterating at home. Thank you for the energy today, and keep making strange sounds.
