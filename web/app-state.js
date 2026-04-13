// ============================================================
// App State -- single source of truth shared between Play + Config tabs
// All pin assignments, voice/FX settings, and serial state live here.
// Other modules read/write via AppState.get()/set()/on().
// ============================================================

var AppState = (function () {
  "use strict";

  // --- Available hardware pins ---------------------------------------------

  var DIGITAL_PINS = [0,1,2,3,6,7,8,9,10,11,12,13,14,16,17,18,19,20,21,22];
  var ADC_PINS = [26,27,28,29];
  var MAX_ADC = 4;

  // Physical input sources that can control an FX parameter
  var ANALOG_SOURCES = [
    { value: "none",        label: "None",       needsPin: false },
    { value: "pot",         label: "Pot",         needsPin: true, pinType: "adc" },
    { value: "ldr",         label: "LDR",         needsPin: true, pinType: "adc" },
    { value: "tof",         label: "ToF sensor",  needsPin: false },
    { value: "accel_x",     label: "Accel tilt X",needsPin: false },
    { value: "accel_y",     label: "Accel tilt Y",needsPin: false },
    { value: "accel_shake", label: "Accel shake", needsPin: false },
  ];

  // Targets that analog inputs can control (FX params + extras)
  var FX_TARGETS = [
    "filterFreq", "echoMix", "echoDelay", "echoDecay",
    "reverbMix", "reverbRoom", "distMix", "distDrive",
    "vibratoDepth", "vibratoRate", "attack", "decay",
    "sustain", "release", "volume", "droneSpeed",
  ];

  var FX_TARGET_LABELS = {
    filterFreq: "Filter Cutoff",
    echoMix: "Echo Mix",
    echoDelay: "Echo Delay",
    echoDecay: "Echo Decay",
    reverbMix: "Reverb Mix",
    reverbRoom: "Reverb Room",
    distMix: "Distortion Mix",
    distDrive: "Distortion Drive",
    vibratoDepth: "Vibrato Depth",
    vibratoRate: "Vibrato Rate",
    attack: "Attack",
    decay: "Decay",
    sustain: "Sustain",
    release: "Release",
    volume: "Volume",
    droneSpeed: "Drone Speed",
  };

  // --- State ---------------------------------------------------------------

  var state = {
    // Voice / scale / tuning
    voiceIndex: 0,
    scale: "pentatonic",
    octave: 3,
    baseNote: 48,

    // Per-key physical input assignments (12 keys max)
    // Each: { type: "none"|"button"|"touch", pin: <number> }
    keyAssignments: [],

    // Per-FX-slider physical input assignment
    // Key = fxState param name, value = { source: "none"|"pot"|"ldr"|"tof"|"accel_x"|..., pin: <number or null> }
    fxAssignments: {},

    // System pins
    audioPin: 15,
    voiceButtonPin: 8,
    ledMode: "neopixel",   // "neopixel" or "rgb"
    neopixelPin: 16,
    rgbPins: [17, 18, 19],
    ledBrightness: 0.4,
    i2cSda: 4,
    i2cScl: 5,

    // Serial
    serialConnected: false,
    serialMuted: false,
  };

  // Initialize key assignments (12 keys, first 4 get buttons by default)
  var DEFAULT_BUTTON_PINS = [2, 3, 6, 7];
  for (var i = 0; i < 12; i++) {
    if (i < DEFAULT_BUTTON_PINS.length) {
      state.keyAssignments.push({ type: "button", pin: DEFAULT_BUTTON_PINS[i] });
    } else {
      state.keyAssignments.push({ type: "none", pin: 0 });
    }
  }

  // Initialize FX assignments (all "none" by default, with some sensible defaults)
  for (var t = 0; t < FX_TARGETS.length; t++) {
    state.fxAssignments[FX_TARGETS[t]] = { source: "none", pin: null };
  }
  // Default analog mappings
  state.fxAssignments.filterFreq = { source: "pot", pin: 26 };
  state.fxAssignments.echoMix = { source: "pot", pin: 27 };
  state.fxAssignments.vibratoDepth = { source: "pot", pin: 28 };

  // --- Event system --------------------------------------------------------

  var listeners = {};

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function (f) { return f !== fn; });
  }

  function emit(event, data) {
    var fns = listeners[event] || [];
    for (var i = 0; i < fns.length; i++) {
      try { fns[i](data); } catch (e) { console.error("AppState event error:", e); }
    }
  }

  // --- Accessors -----------------------------------------------------------

  function get(key) { return state[key]; }

  function set(key, value) {
    state[key] = value;
    emit("change", { key: key, value: value });
    emit("change:" + key, value);
  }

  function getState() {
    // Return a shallow copy for reading
    var copy = {};
    for (var k in state) copy[k] = state[k];
    return copy;
  }

  // --- Pin helpers ---------------------------------------------------------

  function getUsedPins() {
    var used = {};
    used[state.audioPin] = "Audio Out";
    used[state.i2cSda] = "I2C SDA";
    used[state.i2cScl] = "I2C SCL";
    used[state.voiceButtonPin] = "Voice Btn";

    if (state.ledMode === "neopixel") {
      used[state.neopixelPin] = "LED";
    } else {
      var labels = ["RGB R", "RGB G", "RGB B"];
      for (var r = 0; r < state.rgbPins.length; r++) {
        used[state.rgbPins[r]] = labels[r];
      }
    }

    // Key assignments
    for (var i = 0; i < state.keyAssignments.length; i++) {
      var ka = state.keyAssignments[i];
      if (ka.type !== "none") {
        var prefix = ka.type === "button" ? "Btn" : "Touch";
        used[ka.pin] = prefix + " " + (i + 1);
      }
    }

    // FX analog assignments (ADC pins)
    for (var param in state.fxAssignments) {
      var fa = state.fxAssignments[param];
      if (fa.source === "pot" || fa.source === "ldr") {
        if (fa.pin !== null) {
          used[fa.pin] = fa.source.toUpperCase() + " " + FX_TARGET_LABELS[param];
        }
      }
    }

    return used;
  }

  function countUsedADC() {
    var pins = {};
    for (var param in state.fxAssignments) {
      var fa = state.fxAssignments[param];
      if ((fa.source === "pot" || fa.source === "ldr") && fa.pin !== null) {
        pins[fa.pin] = true;
      }
    }
    var count = 0;
    for (var p in pins) count++;
    return count;
  }

  function nextAvailableDigitalPin() {
    var used = getUsedPins();
    for (var i = 0; i < DIGITAL_PINS.length; i++) {
      if (!used[DIGITAL_PINS[i]]) return DIGITAL_PINS[i];
    }
    return 0;
  }

  function nextAvailableADCPin() {
    var used = getUsedPins();
    for (var i = 0; i < ADC_PINS.length; i++) {
      if (!used[ADC_PINS[i]]) return ADC_PINS[i];
    }
    return 26;
  }

  // --- Key assignment helpers ----------------------------------------------

  function setKeyAssignment(index, type, pin) {
    if (index < 0 || index >= state.keyAssignments.length) return;
    state.keyAssignments[index] = { type: type, pin: pin };
    emit("change", { key: "keyAssignments" });
    emit("change:keyAssignments", state.keyAssignments);
  }

  function setFxAssignment(param, source, pin) {
    state.fxAssignments[param] = { source: source, pin: pin };
    emit("change", { key: "fxAssignments" });
    emit("change:fxAssignments", state.fxAssignments);
  }

  // --- Firmware config target name mapping ---------------------------------
  // Maps web fxState param names to firmware CONFIG target names

  var FX_TO_FIRMWARE = {
    filterFreq: "filter",
    echoMix: "echo_mix",
    echoDelay: "echo_delay",
    echoDecay: "echo_decay",
    reverbMix: "reverb_mix",
    reverbRoom: "reverb_room",
    distMix: "distortion_mix",
    distDrive: "distortion_drive",
    vibratoDepth: "vibrato_depth",
    vibratoRate: "vibrato_rate",
    attack: "attack",
    decay: "release",  // note: firmware uses release for decay target
    sustain: "none",   // no direct firmware target for sustain
    release: "release",
    volume: "volume",
    droneSpeed: "none",
  };

  // --- Generate firmware CONFIG dict ---------------------------------------

  function generateFirmwareConfig() {
    var s = state;
    var scaleIntervals = SynthEngine.SCALES[s.scale] || SynthEngine.SCALES.pentatonic;

    // Collect assigned button and touch pins/notes
    var buttonPins = [], buttonNotes = [];
    var touchPins = [], touchNotes = [];
    var baseNote = s.octave * 12 + 24;
    var notes = SynthEngine.scaleNotes(s.scale, baseNote, 12);

    for (var i = 0; i < s.keyAssignments.length; i++) {
      var ka = s.keyAssignments[i];
      if (ka.type === "button") {
        buttonPins.push(ka.pin);
        buttonNotes.push(notes[i] || baseNote);
      } else if (ka.type === "touch") {
        touchPins.push(ka.pin);
        touchNotes.push(notes[i] || baseNote);
      }
    }

    // Collect analog inputs (deduplicate by pin)
    var analogInputs = [];
    var seenPins = {};
    for (var param in s.fxAssignments) {
      var fa = s.fxAssignments[param];
      if ((fa.source === "pot" || fa.source === "ldr") && fa.pin !== null) {
        var fwTarget = FX_TO_FIRMWARE[param] || "none";
        if (fwTarget === "none") continue;
        var pinKey = String(fa.pin);
        if (!seenPins[pinKey]) {
          seenPins[pinKey] = true;
          analogInputs.push({ pin: fa.pin, controls: fwTarget });
        }
      }
    }

    // ToF and accelerometer targets
    var tofControls = "none";
    var accelX = "none", accelY = "none", accelShake = "none";
    for (var p2 in s.fxAssignments) {
      var fa2 = s.fxAssignments[p2];
      var fw2 = FX_TO_FIRMWARE[p2] || "none";
      if (fw2 === "none") continue;
      if (fa2.source === "tof") tofControls = fw2;
      else if (fa2.source === "accel_x") accelX = fw2;
      else if (fa2.source === "accel_y") accelY = fw2;
      else if (fa2.source === "accel_shake") accelShake = fw2;
    }

    var lines = [];
    lines.push("# ============================================================");
    lines.push("# PICO 2 SYNTH WORKSHOP -- Edit your settings below, then save!");
    lines.push("# Generated by Config Tool");
    lines.push("# ============================================================");
    lines.push("");
    lines.push("CONFIG = {");
    lines.push('    "audio_pin": ' + s.audioPin + ',');
    lines.push('    "start_voice": ' + s.voiceIndex + ',');
    lines.push('    "scale": ' + JSON.stringify(scaleIntervals) + ',');
    lines.push('    "base_note": ' + baseNote + ',');
    lines.push("");

    if (buttonPins.length > 0) {
      lines.push('    "button_pins": [' + buttonPins.join(", ") + '],');
      lines.push('    "button_notes": [' + buttonNotes.join(", ") + '],');
    }
    if (touchPins.length > 0) {
      lines.push('    "touch_pins": [' + touchPins.join(", ") + '],');
      lines.push('    "touch_notes": [' + touchNotes.join(", ") + '],');
    }

    lines.push('    "voice_button_pin": ' + s.voiceButtonPin + ',');
    lines.push("");
    lines.push('    "led_mode": "' + s.ledMode + '",');
    if (s.ledMode === "neopixel") {
      lines.push('    "neopixel_pin": ' + s.neopixelPin + ',');
    } else {
      lines.push('    "rgb_pins": [' + s.rgbPins.join(", ") + '],');
    }
    lines.push('    "led_brightness": ' + s.ledBrightness.toFixed(2) + ',');
    lines.push("");

    lines.push('    "analog_inputs": [');
    for (var a = 0; a < analogInputs.length; a++) {
      var ai = analogInputs[a];
      lines.push('        {"pin": ' + ai.pin + ', "controls": "' + ai.controls + '", "alpha": 0.15},');
    }
    lines.push('    ],');
    lines.push("");
    lines.push('    "i2c_sda": ' + s.i2cSda + ',');
    lines.push('    "i2c_scl": ' + s.i2cScl + ',');
    lines.push('    "tof_controls": "' + tofControls + '",');
    lines.push('    "accel_x_controls": "' + accelX + '",');
    lines.push('    "accel_y_controls": "' + accelY + '",');
    lines.push('    "accel_shake_controls": "' + accelShake + '",');
    lines.push("}");
    lines.push("");
    lines.push("# ============================================================");
    lines.push("# Engine (don't edit below this line)");
    lines.push("# ============================================================");
    lines.push("try:");
    lines.push('    SynthEngine = __import__("lib.synth_engine", None, None, ("SynthEngine",), 0).SynthEngine');
    lines.push("except Exception:");
    lines.push('    SynthEngine = __import__("synth_engine", None, None, ("SynthEngine",), 0).SynthEngine');
    lines.push("engine = SynthEngine(CONFIG)");
    lines.push("engine.run()");
    lines.push("");
    return lines.join("\n");
  }

  // --- Public API ----------------------------------------------------------

  return {
    DIGITAL_PINS: DIGITAL_PINS,
    ADC_PINS: ADC_PINS,
    MAX_ADC: MAX_ADC,
    ANALOG_SOURCES: ANALOG_SOURCES,
    FX_TARGETS: FX_TARGETS,
    FX_TARGET_LABELS: FX_TARGET_LABELS,

    get: get,
    set: set,
    getState: getState,
    on: on,
    off: off,
    emit: emit,

    getUsedPins: getUsedPins,
    countUsedADC: countUsedADC,
    nextAvailableDigitalPin: nextAvailableDigitalPin,
    nextAvailableADCPin: nextAvailableADCPin,

    setKeyAssignment: setKeyAssignment,
    setFxAssignment: setFxAssignment,

    generateFirmwareConfig: generateFirmwareConfig,
  };
})();
