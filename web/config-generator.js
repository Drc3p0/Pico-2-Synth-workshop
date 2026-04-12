// ============================================================
// Config Generator -- builds code.py for the new firmware
// Depends on SynthEngine for voice/scale data.
// ============================================================

var ConfigGenerator = (function () {
  "use strict";

  var VOICES = SynthEngine.VOICES;

  var INPUT_TARGETS = [
    { value: "filter",          label: "Filter cutoff" },
    { value: "volume",          label: "Volume" },
    { value: "pitch",           label: "Pitch" },
    { value: "pitch_bend",      label: "Pitch bend" },
    { value: "echo_mix",        label: "Echo mix" },
    { value: "echo_delay",      label: "Echo delay" },
    { value: "echo_decay",      label: "Echo decay" },
    { value: "reverb_mix",      label: "Reverb mix" },
    { value: "reverb_room",     label: "Reverb room" },
    { value: "reverb_damp",     label: "Reverb damp" },
    { value: "distortion_mix",  label: "Distortion mix" },
    { value: "distortion_drive",label: "Distortion drive" },
    { value: "vibrato_depth",   label: "Vibrato depth" },
    { value: "vibrato_rate",    label: "Vibrato rate" },
    { value: "attack",          label: "Attack" },
    { value: "release",         label: "Release" },
    { value: "none",            label: "Disabled" },
  ];

  var SCALE_OPTIONS = [
    { value: "pentatonic", label: "Pentatonic", intervals: "[0, 2, 4, 7, 9]" },
    { value: "major",      label: "Major",      intervals: "[0, 2, 4, 5, 7, 9, 11]" },
    { value: "minor",      label: "Minor",      intervals: "[0, 2, 3, 5, 7, 8, 10]" },
    { value: "blues",      label: "Blues",       intervals: "[0, 3, 5, 6, 7, 10]" },
    { value: "chromatic",  label: "Chromatic",   intervals: "[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]" },
  ];

  var LED_MODES = [
    { value: "neopixel", label: "NeoPixel (WS2812B)" },
    { value: "rgb",      label: "RGB LED (3 pins)" },
  ];

  // --- State ---

  var state = {
    start_voice: 0,
    scale: "pentatonic",
    base_note: 48,
    button_pins: "2, 3, 6, 7",
    touch_pins: "",
    voice_button_pin: 8,
    led_mode: "neopixel",
    neopixel_pin: 16,
    rgb_pins: "17, 18, 19",
    led_brightness: 0.4,
    audio_pin: 15,
    analog_inputs: [
      { pin: 26, controls: "filter",         alpha: 0.15 },
      { pin: 27, controls: "echo_mix",       alpha: 0.15 },
      { pin: 28, controls: "vibrato_depth",  alpha: 0.15 },
    ],
    i2c_sda: 4,
    i2c_scl: 5,
    tof_controls: "pitch_bend",
    accel_x_controls: "filter_freq",
    accel_y_controls: "reverb_mix",
    accel_shake_controls: "vibrato_depth",
  };

  // --- Helpers ---

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function $(sel) { return document.querySelector(sel); }

  function highlightPython(code) {
    var lines = code.split("\n");
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = escapeHtml(lines[i]);
      if (/^\s*#/.test(lines[i])) {
        result.push('<span class="syn-comment">' + line + "</span>");
        continue;
      }
      var strings = [];
      line = line.replace(/"([^"]*)"/g, function (m) {
        strings.push('<span class="syn-string">' + m + "</span>");
        return "\x00S" + (strings.length - 1) + "\x00";
      });
      line = line.replace(/\b(from|import|True|False|None|try|except|Exception)\b/g, '<span class="syn-keyword">$1</span>');
      line = line.replace(/([\[, (])(-?\d+\.?\d*)/g, '$1<span class="syn-number">$2</span>');
      line = line.replace(/\x00S(\d+)\x00/g, function (m, idx) {
        return strings[parseInt(idx)];
      });
      result.push(line);
    }
    return result.join("\n");
  }

  // --- Build select helper ---

  function buildSelect(id, options, selected, extraClass) {
    var cls = extraClass ? ' class="' + extraClass + '"' : '';
    var html = '<select id="' + id + '"' + cls + '>';
    for (var i = 0; i < options.length; i++) {
      var o = options[i];
      var sel = o.value === selected ? " selected" : "";
      html += '<option value="' + o.value + '"' + sel + ">" + escapeHtml(o.label) + "</option>";
    }
    html += "</select>";
    return html;
  }

  // --- Render config form --------------------------------------------------

  function render() {
    var body = document.getElementById("config-options-body");
    if (!body) return;

    var html = "";

    // Starting voice
    html += '<div class="form-section"><h3>Starting Voice</h3>';
    html += '<div class="radio-group">';
    for (var i = 0; i < VOICES.length; i++) {
      var checked = i === state.start_voice ? " checked" : "";
      html += '<label><input type="radio" name="cfg-voice" value="' + i + '"' + checked + '>'
            + '<span class="radio-label">' + escapeHtml(VOICES[i].name) + '</span></label>';
    }
    html += '</div></div>';

    // Scale
    html += '<div class="form-section"><h3>Scale</h3>';
    html += '<div class="radio-group">';
    for (var s = 0; s < SCALE_OPTIONS.length; s++) {
      var sc = SCALE_OPTIONS[s];
      var chk = sc.value === state.scale ? " checked" : "";
      html += '<label><input type="radio" name="cfg-scale" value="' + sc.value + '"' + chk + '>'
            + '<span class="radio-label">' + escapeHtml(sc.label) + '</span></label>';
    }
    html += '</div></div>';

    // Base note
    html += '<div class="form-section"><h3>Base Note</h3>';
    html += '<div class="slider-container"><div class="slider-row">';
    html += '<input type="range" id="cfg-base-note" min="24" max="84" value="' + state.base_note + '">';
    html += '<span class="slider-value" id="cfg-base-note-val">' + state.base_note + ' (' + SynthEngine.midiToNoteName(state.base_note) + ')</span>';
    html += '</div></div></div>';

    html += '<hr class="form-separator">';

    // Pin assignments
    html += '<div class="form-section"><h3>Pin Assignments</h3>';
    html += '<p class="hint">Enter GPIO numbers separated by commas.</p>';
    html += '<div class="input-row">';
    html += '<div class="input-group"><label for="cfg-btn-pins">Button pins</label>'
          + '<input type="text" id="cfg-btn-pins" value="' + escapeHtml(state.button_pins) + '"></div>';
    html += '<div class="input-group"><label for="cfg-touch-pins">Touch pins (optional)</label>'
          + '<input type="text" id="cfg-touch-pins" value="' + escapeHtml(state.touch_pins) + '" placeholder="e.g. 9, 10, 11"></div>';
    html += '</div>';
    html += '<div class="input-row" style="margin-top:0.75rem">';
    html += '<div class="input-group"><label for="cfg-voice-btn">Voice cycle button</label>'
          + '<input type="number" id="cfg-voice-btn" min="0" max="28" value="' + state.voice_button_pin + '"></div>';
    html += '<div class="input-group"><label for="cfg-audio-pin">Audio output pin</label>'
          + '<input type="number" id="cfg-audio-pin" min="0" max="28" value="' + state.audio_pin + '"></div>';
    html += '</div></div>';

    html += '<hr class="form-separator">';

    // LED config
    html += '<div class="form-section"><h3>Voice LED Indicator</h3>';
    html += '<div class="input-row">';
    html += '<div class="input-group"><label for="cfg-led-mode">LED type</label>'
          + buildSelect("cfg-led-mode", LED_MODES, state.led_mode) + '</div>';
    html += '<div class="input-group" id="cfg-led-pin-group"><label for="cfg-led-pin">LED pin</label>'
          + '<input type="number" id="cfg-led-pin" min="0" max="28" value="' + state.neopixel_pin + '"></div>';
    html += '</div>';
    html += '<div class="input-row" style="margin-top:0.75rem" id="cfg-rgb-row">';
    html += '<div class="input-group"><label for="cfg-rgb-pins">RGB pins (R, G, B)</label>'
          + '<input type="text" id="cfg-rgb-pins" value="' + escapeHtml(state.rgb_pins) + '"></div>';
    html += '<div class="input-group"><label for="cfg-brightness">LED brightness</label>'
          + '<input type="range" id="cfg-brightness" min="0.05" max="1.0" step="0.05" value="' + state.led_brightness + '">'
          + '<span id="cfg-brightness-val">' + state.led_brightness + '</span></div>';
    html += '</div></div>';

    html += '<hr class="form-separator">';

    // Analog inputs
    html += '<div class="form-section"><h3>Analog Inputs</h3>';
    html += '<p class="hint">ADC pins: GP26, GP27, GP28 (GP29 = VSYS). Each maps to a parameter.</p>';
    for (var a = 0; a < state.analog_inputs.length; a++) {
      var ai = state.analog_inputs[a];
      html += '<div class="input-row analog-row" style="margin-top:0.5rem">';
      html += '<div class="input-group"><label>Pin</label>'
            + '<input type="number" class="cfg-adc-pin" data-idx="' + a + '" min="26" max="29" value="' + ai.pin + '"></div>';
      html += '<div class="input-group"><label>Controls</label>'
            + buildSelect("cfg-adc-ctrl-" + a, INPUT_TARGETS, ai.controls) + '</div>';
      html += '</div>';
    }
    html += '<button class="btn-sm" id="cfg-add-analog" style="margin-top:0.5rem">+ Add analog input</button>';
    html += '</div>';

    html += '<hr class="form-separator">';

    // I2C
    html += '<div class="form-section"><h3>I2C Sensors</h3>';
    html += '<div class="input-row">';
    html += '<div class="input-group"><label for="cfg-i2c-sda">I2C SDA pin</label>'
          + '<input type="number" id="cfg-i2c-sda" min="0" max="28" value="' + state.i2c_sda + '"></div>';
    html += '<div class="input-group"><label for="cfg-i2c-scl">I2C SCL pin</label>'
          + '<input type="number" id="cfg-i2c-scl" min="0" max="28" value="' + state.i2c_scl + '"></div>';
    html += '</div>';

    html += '<div class="input-row" style="margin-top:0.75rem">';
    html += '<div class="input-group"><label>ToF sensor controls</label>'
          + buildSelect("cfg-tof", INPUT_TARGETS, state.tof_controls) + '</div>';
    html += '</div>';

    html += '<h4 style="margin-top:0.75rem">Accelerometer (LIS3DH)</h4>';
    html += '<div class="input-row">';
    html += '<div class="input-group"><label>Tilt X controls</label>'
          + buildSelect("cfg-accel-x", INPUT_TARGETS, state.accel_x_controls) + '</div>';
    html += '<div class="input-group"><label>Tilt Y controls</label>'
          + buildSelect("cfg-accel-y", INPUT_TARGETS, state.accel_y_controls) + '</div>';
    html += '</div>';
    html += '<div class="input-row" style="margin-top:0.5rem">';
    html += '<div class="input-group"><label>Shake controls</label>'
          + buildSelect("cfg-accel-shake", INPUT_TARGETS, state.accel_shake_controls) + '</div>';
    html += '</div>';

    html += '</div>';

    body.innerHTML = html;
    bindEvents();
    updateCode();
    updateLEDVisibility();
  }

  // --- Event binding -------------------------------------------------------

  function bindEvents() {
    // Voice radio
    document.querySelectorAll('input[name="cfg-voice"]').forEach(function (r) {
      r.addEventListener("change", function () {
        state.start_voice = parseInt(this.value); updateCode();
      });
    });
    // Scale radio
    document.querySelectorAll('input[name="cfg-scale"]').forEach(function (r) {
      r.addEventListener("change", function () {
        state.scale = this.value; updateCode();
      });
    });
    // Base note
    var bn = document.getElementById("cfg-base-note");
    if (bn) bn.addEventListener("input", function () {
      state.base_note = parseInt(this.value);
      document.getElementById("cfg-base-note-val").textContent =
        state.base_note + " (" + SynthEngine.midiToNoteName(state.base_note) + ")";
      updateCode();
    });
    // Pin text fields
    var btnPins = document.getElementById("cfg-btn-pins");
    if (btnPins) btnPins.addEventListener("input", function () { state.button_pins = this.value; updateCode(); });
    var touchPins = document.getElementById("cfg-touch-pins");
    if (touchPins) touchPins.addEventListener("input", function () { state.touch_pins = this.value; updateCode(); });
    var voiceBtn = document.getElementById("cfg-voice-btn");
    if (voiceBtn) voiceBtn.addEventListener("input", function () { state.voice_button_pin = parseInt(this.value) || 8; updateCode(); });
    var audioPin = document.getElementById("cfg-audio-pin");
    if (audioPin) audioPin.addEventListener("input", function () { state.audio_pin = parseInt(this.value) || 15; updateCode(); });

    // LED
    var ledMode = document.getElementById("cfg-led-mode");
    if (ledMode) ledMode.addEventListener("change", function () {
      state.led_mode = this.value; updateLEDVisibility(); updateCode();
    });
    var ledPin = document.getElementById("cfg-led-pin");
    if (ledPin) ledPin.addEventListener("input", function () { state.neopixel_pin = parseInt(this.value) || 16; updateCode(); });
    var rgbPins = document.getElementById("cfg-rgb-pins");
    if (rgbPins) rgbPins.addEventListener("input", function () { state.rgb_pins = this.value; updateCode(); });
    var bright = document.getElementById("cfg-brightness");
    if (bright) bright.addEventListener("input", function () {
      state.led_brightness = parseFloat(this.value);
      document.getElementById("cfg-brightness-val").textContent = state.led_brightness.toFixed(2);
      updateCode();
    });

    // Analog inputs
    document.querySelectorAll(".cfg-adc-pin").forEach(function (el) {
      el.addEventListener("input", function () {
        var idx = parseInt(this.getAttribute("data-idx"));
        state.analog_inputs[idx].pin = parseInt(this.value) || 26;
        updateCode();
      });
    });
    for (var a = 0; a < state.analog_inputs.length; a++) {
      (function(idx) {
        var sel = document.getElementById("cfg-adc-ctrl-" + idx);
        if (sel) sel.addEventListener("change", function () {
          state.analog_inputs[idx].controls = this.value; updateCode();
        });
      })(a);
    }
    var addAnalog = document.getElementById("cfg-add-analog");
    if (addAnalog) addAnalog.addEventListener("click", function () {
      var nextPin = 26 + state.analog_inputs.length;
      if (nextPin > 29) nextPin = 28;
      state.analog_inputs.push({ pin: nextPin, controls: "none", alpha: 0.15 });
      render();
    });

    // I2C
    var sda = document.getElementById("cfg-i2c-sda");
    if (sda) sda.addEventListener("input", function () { state.i2c_sda = parseInt(this.value) || 4; updateCode(); });
    var scl = document.getElementById("cfg-i2c-scl");
    if (scl) scl.addEventListener("input", function () { state.i2c_scl = parseInt(this.value) || 5; updateCode(); });
    var tof = document.getElementById("cfg-tof");
    if (tof) tof.addEventListener("change", function () { state.tof_controls = this.value; updateCode(); });
    var ax = document.getElementById("cfg-accel-x");
    if (ax) ax.addEventListener("change", function () { state.accel_x_controls = this.value; updateCode(); });
    var ay = document.getElementById("cfg-accel-y");
    if (ay) ay.addEventListener("change", function () { state.accel_y_controls = this.value; updateCode(); });
    var as = document.getElementById("cfg-accel-shake");
    if (as) as.addEventListener("change", function () { state.accel_shake_controls = this.value; updateCode(); });
  }

  function updateLEDVisibility() {
    var rgbRow = document.getElementById("cfg-rgb-row");
    var pinGroup = document.getElementById("cfg-led-pin-group");
    if (!rgbRow) return;
    if (state.led_mode === "rgb") {
      rgbRow.style.display = "";
      if (pinGroup) pinGroup.style.display = "none";
    } else {
      rgbRow.style.display = "none";
      if (pinGroup) pinGroup.style.display = "";
    }
  }

  // --- Code generation -----------------------------------------------------

  function parsePinList(str) {
    return str.split(",").map(function(s){return s.trim();}).filter(function(s){return s !== "";});
  }

  function generateCode() {
    var s = state;
    var scaleObj = SCALE_OPTIONS.find(function(o){return o.value===s.scale;});
    var scaleArr = scaleObj ? scaleObj.intervals : "[0, 2, 4, 7, 9]";

    var btnPins = parsePinList(s.button_pins);
    var touchPins = parsePinList(s.touch_pins);
    var rgbPins = parsePinList(s.rgb_pins);

    var lines = [];
    lines.push("# ============================================================");
    lines.push("# PICO 2 SYNTH WORKSHOP -- Edit your settings below, then save!");
    lines.push("# Generated by Config Tool");
    lines.push("# ============================================================");
    lines.push("");
    lines.push("CONFIG = {");
    lines.push('    "audio_pin": ' + s.audio_pin + ',');
    lines.push('    "start_voice": ' + s.start_voice + ',');
    lines.push('    "scale": ' + scaleArr + ',');
    lines.push('    "base_note": ' + s.base_note + ',');
    lines.push("");

    // Buttons
    lines.push('    "button_pins": [' + btnPins.join(", ") + '],');

    // Touch
    if (touchPins.length > 0) {
      lines.push('    "touch_pins": [' + touchPins.join(", ") + '],');
    }

    lines.push('    "voice_button_pin": ' + s.voice_button_pin + ',');
    lines.push("");

    // LED
    lines.push('    "led_mode": "' + s.led_mode + '",');
    if (s.led_mode === "neopixel") {
      lines.push('    "neopixel_pin": ' + s.neopixel_pin + ',');
    } else {
      lines.push('    "rgb_pins": [' + rgbPins.join(", ") + '],');
    }
    lines.push('    "led_brightness": ' + s.led_brightness.toFixed(2) + ',');
    lines.push("");

    // Analog
    lines.push('    "analog_inputs": [');
    for (var a = 0; a < s.analog_inputs.length; a++) {
      var ai = s.analog_inputs[a];
      lines.push('        {"pin": ' + ai.pin + ', "controls": "' + ai.controls + '", "alpha": ' + ai.alpha.toFixed(2) + '},');
    }
    lines.push('    ],');
    lines.push("");

    // I2C
    lines.push('    "i2c_sda": ' + s.i2c_sda + ',');
    lines.push('    "i2c_scl": ' + s.i2c_scl + ',');
    lines.push('    "tof_controls": "' + s.tof_controls + '",');
    lines.push('    "accel_x_controls": "' + s.accel_x_controls + '",');
    lines.push('    "accel_y_controls": "' + s.accel_y_controls + '",');
    lines.push('    "accel_shake_controls": "' + s.accel_shake_controls + '",');
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

  function updateCode() {
    var pre = document.getElementById("code-preview");
    if (!pre) return;
    pre.innerHTML = highlightPython(generateCode());
  }

  function getRawCode() {
    return generateCode();
  }

  return {
    render: render,
    updateCode: updateCode,
    getRawCode: getRawCode,
  };
})();
