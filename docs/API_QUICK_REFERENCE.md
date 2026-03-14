# API Quick Reference (`CONFIG` Dictionary)

Use this as a fast lookup card while editing `code.py`.

## Synth Track (`firmware/code.py`)

| Key | Type | Default | Description | Valid Values |
|---|---|---|---|---|
| `patch` | `str` | `"pad"` | Selects preset timbre/envelope | `"pad"`, `"bass"`, `"pluck"`, `"lead"` |
| `scale` | `list[int]` | `[0, 2, 4, 7, 9]` | Semitone offsets from `base_note` | Any list of semitone offsets, usually within `0-12` |
| `base_note` | `int` | `48` | Root MIDI note number for button mapping | Typical range `24-84` |
| `pot_a_controls` | `str` | `"filter"` | Mapping for Pot A on GP26 | `"filter"`, `"volume"`, `"pitch"` |
| `pot_b_controls` | `str` | `"echo_mix"` | Mapping for Pot B on GP27 | `"echo_mix"`, `"reverb_mix"`, `"distortion_drive"` |
| `ldr_controls` | `str` | `"vibrato_depth"` | Mapping for LDR on GP28 | `"vibrato_depth"`, `"reverb_room"`, `"filter_freq"` |
| `tof_controls` | `str` | `"pitch_bend"` | Mapping for optional distance sensor path | `"pitch_bend"`, `"filter_freq"`, `"volume"` |

Notes:

- Buttons are on GP2-GP5, pull-up, active LOW.
- PWM audio output pin is GP15.

## MIDI Track (`firmware_midi/code.py`)

| Key | Type | Default | Description | Valid Values |
|---|---|---|---|---|
| `midi_channel` | `int` | `0` | Zero-based MIDI channel (`0` = channel 1) | `0-15` |
| `button_notes` | `list[int]` | `[60, 62, 64, 65]` | MIDI notes sent by buttons GP2-GP5 | 4 note numbers, each `0-127` |
| `pot_a_cc` | `int` | `7` | CC sent by Pot A (GP26) | `0-127` |
| `pot_b_cc` | `int` | `10` | CC sent by Pot B (GP27) | `0-127` |
| `ldr_cc` | `int` | `74` | CC sent by LDR (GP28) | `0-127` |
| `tof_cc` | `int` | `1` | CC for optional distance sensor path | `0-127` |
| `velocity` | `int` | `127` | Note-on velocity for button notes | `0-127` |

Notes:

- MIDI track still uses same physical pins GP2-GP5 and GP26-GP28.
- Audio comes from your DAW/plugin, not GP15 PWM.

## Safe Edit Pattern

```python
# Good: change one value, save, test
"patch": "lead"
```

```python
# Also good: keep commas and quotes exactly right
"button_notes": [48, 50, 52, 55]
```

If a change breaks startup, open serial console and read the syntax error line.
