# Speaker Notes by Slide - Raspberry Pi Pico 2 Music Workshop

## Slide 1
- Timing: 0:00-0:03
- Key points: warm welcome; hands-on outcome; two tracks share hardware.
- Common questions: "Do I have to pick track now?" -> no, pick at slide 11 and can switch later.
- Troubleshooting tips: none yet; set expectation that glitches are normal.

## Slide 2
- Timing: 0:03-0:05
- Key points: milestones and checkpoints; final showcase.
- Common questions: "Will we finish?" -> yes if checkpoint pacing is followed.
- Troubleshooting tips: remind students not to skip checkpoints.

## Slide 3
- Timing: 0:05-0:07
- Key points: digital vs analog; CircuitPython workflow; CONFIG-only edits.
- Common questions: "Can we edit other code?" -> not during workshop.
- Troubleshooting tips: if code breaks later, revert CONFIG only.

## Slide 4
- Timing: 0:07-0:09
- Key points: timeline overview and break at 1:10.
- Common questions: "How much creative time?" -> dedicated 20+ minutes.
- Troubleshooting tips: call out catch-up windows built into milestones.

## Slide 5
- Timing: 0:09-0:15
- Key points: unplug before major rewires; low volume first; ask early.
- Common questions: "Can I hot-swap a single jumper?" -> yes, but power down for bigger rewires.
- Troubleshooting tips: safety first, ears first, board first.

## Slide 6
- Timing: 0:15-0:17
- Key points: MCU is single-purpose, low latency, direct GPIO.
- Common questions: "Could phone do this?" -> yes via apps, but less direct hardware control.
- Troubleshooting tips: keep explanation practical, not theoretical.

## Slide 7
- Timing: 0:17-0:19
- Key points: RP2350, 3.3V logic, GPIO + ADC distinction.
- Common questions: "Can I use 5V sensor?" -> only with proper level shifting.
- Troubleshooting tips: repeat 3.3V rule.

## Slide 8
- Timing: 0:19-0:21
- Key points: save `code.py` to run; use serial prints.
- Common questions: "Where is serial monitor?" -> IDE/device monitor instructions.
- Troubleshooting tips: if code not running, check file name exactly `code.py`.

## Slide 9
- Timing: 0:21-0:23
- Key points: GP15 PWM audio path; common ground requirement.
- Common questions: "Can I use another pin?" -> not in workshop template.
- Troubleshooting tips: no sound later -> inspect GP15 first.

## Slide 10
- Timing: 0:23-0:30
- Key points: full pin map before wiring starts.
- Common questions: "Can I rearrange pins?" -> only if CONFIG matches exactly.
- Troubleshooting tips: have students label jumper colors by signal type.

## Slide 11
- Timing: 0:30-0:32
- Key points: choose synth or MIDI track; same hardware.
- Common questions: "Can we switch tracks mid-workshop?" -> yes, mode change in CONFIG.
- Troubleshooting tips: track confusion -> emphasize outputs differ, inputs same.

## Slide 12
- Timing: 0:32-0:34
- Key points: synthio standalone output; effects and patches.
- Common questions: "Will this work without laptop audio app?" -> yes, with speaker path.
- Troubleshooting tips: for synth track, confirm audio hardware connected.

## Slide 13
- Timing: 0:34-0:36
- Key points: MIDI message types and host role.
- Common questions: "Why no sound from Pico in MIDI mode?" -> MIDI sends data only.
- Troubleshooting tips: verify DAW input device and armed track.

## Slide 14
- Timing: 0:36-0:38
- Key points: digital HIGH/LOW basics.
- Common questions: "Why does pressed equal LOW?" -> pull-up wiring.
- Troubleshooting tips: none, conceptual slide.

## Slide 15
- Timing: 0:38-0:40
- Key points: internal pull-up, active LOW, button-to-ground wiring.
- Common questions: "Need resistor?" -> no, internal pull-up enabled.
- Troubleshooting tips: if always pressed, pin may be shorted to ground.

## Slide 16
- Timing: 0:40-0:42
- Key points: analog continuous control for expressive mapping.
- Common questions: "Is analog more accurate?" -> more granular, still noisy.
- Troubleshooting tips: prepare students for slight analog jitter.

## Slide 17
- Timing: 0:42-0:44
- Key points: pot 3-pin roles; center is wiper.
- Common questions: "Outer pin order matters?" -> only direction.
- Troubleshooting tips: stuck reading -> verify center to ADC.

## Slide 18
- Timing: 0:44-0:46
- Key points: LDR requires divider with 10k.
- Common questions: "Can I wire LDR directly to ADC?" -> no, need reference resistor.
- Troubleshooting tips: emphasize divider node concept.

## Slide 19
- Timing: 0:46-0:48
- Key points: shared ground and clean rails.
- Common questions: "Can grounds be separate?" -> no for this setup.
- Troubleshooting tips: random behavior almost always grounding.

## Slide 20
- Timing: 0:48-0:50
- Key points: checkpoint strategy and pacing.
- Common questions: "Can I add all parts now?" -> no, incremental only.
- Troubleshooting tips: isolate one subsystem before adding another.

## Slide 21
- Timing: 0:50-0:52
- Key points: confirm parts for Build 1.
- Common questions: "I only have piezo" -> okay, still works for test tone.
- Troubleshooting tips: quick visual inventory before wiring.

## Slide 22
- Timing: 0:52-0:55
- Key points: GP15 audio wiring, power and ground to amp.
- Common questions: "Direct speaker from pin okay?" -> low volume only; amp preferred.
- Troubleshooting tips: volume down before first test.

## Slide 23
- Timing: 0:55-0:57
- Key points: first button on GP2.
- Common questions: "Button orientation?" -> across breadboard gap.
- Troubleshooting tips: if no response, rotate button 90 degrees and re-seat.

## Slide 24
- Timing: 0:57-1:00
- Key points: second button on GP3, mirror first wiring.
- Common questions: "Can both share same ground rail?" -> yes.
- Troubleshooting tips: accidental same-row short is common.

## Slide 25
- Timing: 1:00-1:05
- Key points: first CONFIG checkpoint; first audible tone.
- Common questions: "No reboot after save?" -> ensure correct drive and file name.
- Troubleshooting tips: verify GP15 audio wiring and button connections to GP2/GP3.

## Slide 26
- Timing: 1:05-1:10
- Key points: no-sound flowchart and fast debug order.
- Common questions: "Speaker polarity?" -> for many small speakers, polarity less critical but keep consistent.
- Troubleshooting tips: GP15 -> GND -> amp power -> volume -> serial prints.

## Slide 27
- Timing: 1:20-1:23
- Key points: post-break restart; add pot expressiveness.
- Common questions: "Which pot controls what?" -> pot1 primary tone, pot2 secondary tone.
- Troubleshooting tips: one pot at a time to avoid confusion.

## Slide 28
- Timing: 1:23-1:27
- Key points: pot1 to GP26.
- Common questions: "Why GP26?" -> ADC-capable pin.
- Troubleshooting tips: if flat value, wiper likely miswired.

## Slide 29
- Timing: 1:27-1:31
- Key points: pot2 to GP27.
- Common questions: "Can both share 3V3 and GND?" -> yes.
- Troubleshooting tips: noisy values -> reseat jumpers, shorten leads.

## Slide 30
- Timing: 1:31-1:35
- Key points: show synth and MIDI CONFIG edits for pots.
- Common questions: "Do I need both `pot_targets` and `cc_numbers`?" -> MIDI needs CC numbers for CC targets.
- Troubleshooting tips: index alignment of lists is critical.

## Slide 31
- Timing: 1:35-1:40
- Key points: pot troubleshooting patterns.
- Common questions: "Pot works backwards" -> swap outer legs.
- Troubleshooting tips: stuck at 65535/0 indicates wiring extreme or short.

## Slide 32
- Timing: 1:40-1:42
- Key points: introduce LDR expressive control.
- Common questions: "Will room lights affect this?" -> yes, calibrate min/max.
- Troubleshooting tips: use hand shade for repeatable test.

## Slide 33
- Timing: 1:42-1:46
- Key points: step-by-step divider wiring to GP28.
- Common questions: "Resistor value exact?" -> 10k preferred; nearby works with recalibration.
- Troubleshooting tips: ADC must read divider node, not rail.

## Slide 34
- Timing: 1:46-1:50
- Key points: LDR CONFIG mapping and calibration values.
- Common questions: "Why min/max?" -> normalize range, reduce dead zones.
- Troubleshooting tips: start with measured raw min/max from serial.

## Slide 35
- Timing: 1:50-1:55
- Key points: inverted, noisy, or dead LDR fixes.
- Common questions: "Can I smooth more?" -> yes, moving average.
- Troubleshooting tips: check resistor leg really reaches ground rail.

## Slide 36
- Timing: 1:55-1:57
- Key points: final two buttons complete instrument.
- Common questions: "Can I duplicate note?" -> yes, but distinct notes recommended.
- Troubleshooting tips: keep pin order consistent with note order.

## Slide 37
- Timing: 1:57-2:00
- Key points: wire GP4 and GP5 to ground buttons.
- Common questions: "Need separate ground wire per button?" -> shared rail fine.
- Troubleshooting tips: check no sideways button placement mistakes.

## Slide 38
- Timing: 2:00-2:03
- Key points: pentatonic mapping and debounce rationale.
- Common questions: "Why pentatonic not major?" -> safer harmonically under time pressure.
- Troubleshooting tips: repeated triggers -> debounce interval too short.

## Slide 39
- Timing: 2:03-2:05
- Key points: full validation checklist before creative phase.
- Common questions: "Do we need perfect tuning now?" -> no, just functional controls.
- Troubleshooting tips: test one control family at a time.

## Slide 40
- Timing: 2:05-2:08
- Key points: CONFIG-only policy during creative edits.
- Common questions: "Can I optimize engine?" -> after workshop, not during.
- Troubleshooting tips: keep backup copy of known-good CONFIG block.

## Slide 41
- Timing: 2:08-2:11
- Key points: CONFIG schema mental model.
- Common questions: "String vs board pin object?" -> use provided string format in starter.
- Troubleshooting tips: mismatched list lengths cause mapping bugs.

## Slide 42
- Timing: 2:11-2:14
- Key points: synth CONFIG baseline with effects.
- Common questions: "Are effects heavy on CPU?" -> modest levels are fine.
- Troubleshooting tips: crackle may indicate extreme settings; dial back distortion/voice count.

## Slide 43
- Timing: 2:14-2:17
- Key points: MIDI CONFIG baseline with Note + CC.
- Common questions: "Channel numbering base?" -> workshop uses human-friendly 1-16.
- Troubleshooting tips: no MIDI response -> verify DAW input and armed track.

## Slide 44
- Timing: 2:17-2:20
- Key points: one-change test loop.
- Common questions: "Can I batch edit fast?" -> risky; avoid in timed workshop.
- Troubleshooting tips: rollback immediately after first bad change.

## Slide 45
- Timing: 2:20-2:24
- Key points: define musical intent before tweaking parameters.
- Common questions: "What if I have no idea?" -> start with pad + pentatonic.
- Troubleshooting tips: if overwhelmed, lock one control and vary one at a time.

## Slide 46
- Timing: 2:24-2:28
- Key points: patch personality differences.
- Common questions: "Best patch for beginners?" -> pad for forgiving play.
- Troubleshooting tips: if sound harsh, reduce distortion and resonance.

## Slide 47
- Timing: 2:28-2:31
- Key points: pentatonic "always sounds good" argument.
- Common questions: "Can I use minor pentatonic?" -> yes, great for moody tones.
- Troubleshooting tips: off-feel melodies usually note map order issue.

## Slide 48
- Timing: 2:31-2:35
- Key points: proven mapping ideas for expressiveness.
- Common questions: "Which CC for brightness?" -> CC74.
- Troubleshooting tips: if host ignores CC, map CC in DAW/synth first.

## Slide 49
- Timing: 2:35-2:40
- Key points: mini challenges and peer swap test.
- Common questions: "Can I keep refining one patch?" -> yes, challenge optional.
- Troubleshooting tips: if peer cannot play it, simplify mapping ranges.

## Slide 50
- Timing: 2:40-2:44
- Key points: advanced option with VL53L0X distance sensing.
- Common questions: "Required for everyone?" -> no, fast-track only.
- Troubleshooting tips: keep baseline project untouched in backup file.

## Slide 51
- Timing: 2:44-2:48
- Key points: I2C wiring and pin defaults.
- Common questions: "Sensor not detected" -> check SDA/SCL swap and power.
- Troubleshooting tips: run I2C scan; reseat cables; shorten leads.

## Slide 52
- Timing: 2:48-2:52
- Key points: alternate advanced examples if skipping VL53L0X.
- Common questions: "Which example easiest?" -> arpeggiator first.
- Troubleshooting tips: preserve known-good config snapshot before experiments.

## Slide 53
- Timing: 2:52-2:55
- Key points: showcase rules, short format, supportive feedback.
- Common questions: "Solo or pair?" -> either.
- Troubleshooting tips: if a build fails live, demo design intent verbally.

## Slide 54
- Timing: 2:55-2:57
- Key points: reflection prompts reinforce learning transfer.
- Common questions: "Can we share code after?" -> yes, encourage repo sharing.
- Troubleshooting tips: none; keep momentum positive.

## Slide 55
- Timing: 2:57-2:59
- Key points: next-step project ideas.
- Common questions: "Best first extension?" -> enclosure + labeling + saved presets.
- Troubleshooting tips: suggest one manageable next milestone.

## Slide 56
- Timing: 2:59-3:00
- Key points: celebrate completion; save `code.py`; take wiring photo.
- Common questions: "Where are resources?" -> starter repo and docs links.
- Troubleshooting tips: remind students to unplug safely before teardown.
