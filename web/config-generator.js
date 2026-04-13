// ============================================================
// Config Generator -- builds code.py for the new firmware
// Pico 2 SVG pinout, add-row UI, scale-constrained notes,
// ADC "include" checkboxes with limit enforcement.
// ============================================================

var ConfigGenerator = (function () {
  "use strict";

  var VOICES = SynthEngine.VOICES;
  var MAX_ADC = 4; // GP26, GP27, GP28, GP29

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
    { value: "distortion_mix",  label: "Distortion mix" },
    { value: "distortion_drive",label: "Distortion drive" },
    { value: "vibrato_depth",   label: "Vibrato depth" },
    { value: "vibrato_rate",    label: "Vibrato rate" },
    { value: "attack",          label: "Attack" },
    { value: "release",         label: "Release" },
    { value: "scale_select",    label: "Scale (cycle)" },
    { value: "octave_shift",    label: "Octave shift" },
    { value: "none",            label: "Disabled" },
  ];

  var ALL_DIGITAL_PINS = [0,1,2,3,6,7,8,9,10,11,12,13,14,16,17,18,19,20,21,22];
  var ALL_ADC_PINS = [26,27,28,29];

  var SCALE_OPTIONS = [];
  (function() {
    var labels = SynthEngine.SCALE_LABELS;
    var scales = SynthEngine.SCALES;
    for (var key in labels) {
      SCALE_OPTIONS.push({
        value: key,
        label: labels[key],
        intervals: JSON.stringify(scales[key])
      });
    }
  })();

  var LED_MODES = [
    { value: "neopixel", label: "NeoPixel (WS2812B)" },
    { value: "rgb",      label: "RGB LED (3 pins)" },
  ];

  // --- State ---------------------------------------------------------------

  var state = {
    start_voice: 0,
    scale: "pentatonic",
    base_note: 48,
    buttons: [
      { pin: 2, note: 60 },
      { pin: 3, note: 62 },
      { pin: 6, note: 64 },
      { pin: 7, note: 67 },
    ],
    touches: [],
    voice_button_pin: 8,
    led_mode: "neopixel",
    neopixel_pin: 16,
    rgb_pins: [17, 18, 19],
    led_brightness: 0.4,
    audio_pin: 15,
    // Each analog: { pin, controls, enabled }
    analogs: [
      { pin: 26, controls: "filter",         enabled: true },
      { pin: 27, controls: "echo_mix",       enabled: true },
      { pin: 28, controls: "vibrato_depth",  enabled: true },
    ],
    i2c_sda: 4,
    i2c_scl: 5,
    tof_controls: "pitch_bend",
    accel_x_controls: "filter_freq",
    accel_y_controls: "reverb_mix",
    accel_shake_controls: "vibrato_depth",
  };

  // --- Helpers -------------------------------------------------------------

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

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
      line = line.replace(/\x00S(\d+)\x00/g, function (m, idx) { return strings[parseInt(idx)]; });
      result.push(line);
    }
    return result.join("\n");
  }

  function buildSelect(id, options, selected, cls) {
    var extra = cls ? ' class="' + cls + '"' : '';
    var html = '<select id="' + id + '"' + extra + '>';
    for (var i = 0; i < options.length; i++) {
      var o = options[i];
      var sel = String(o.value) === String(selected) ? " selected" : "";
      html += '<option value="' + escapeHtml(String(o.value)) + '"' + sel + ">" + escapeHtml(o.label) + "</option>";
    }
    html += "</select>";
    return html;
  }

  // --- Scale-constrained note list -----------------------------------------

  function getScaleNotes(scaleName, baseOctave) {
    var intervals = SynthEngine.SCALES[scaleName] || SynthEngine.SCALES.pentatonic;
    var notes = [];
    // Generate notes across 4 octaves centered around base
    for (var oct = Math.max(0, baseOctave - 1); oct <= Math.min(9, baseOctave + 3); oct++) {
      for (var s = 0; s < intervals.length; s++) {
        var midi = (oct + 1) * 12 + intervals[s]; // octave 0 = C0 = midi 12
        if (midi >= 0 && midi <= 127) notes.push(midi);
      }
    }
    return notes;
  }

  function buildNoteSelect(id, cls, selectedNote) {
    var baseOctave = Math.floor(state.base_note / 12) - 1;
    var validNotes = getScaleNotes(state.scale, baseOctave);
    // Ensure current note is in list even if out of scale
    if (validNotes.indexOf(selectedNote) < 0) validNotes.push(selectedNote);
    validNotes.sort(function(a,b){return a-b;});

    var html = '<select id="' + id + '" class="' + cls + '">';
    for (var i = 0; i < validNotes.length; i++) {
      var n = validNotes[i];
      var sel = n === selectedNote ? " selected" : "";
      html += '<option value="' + n + '"' + sel + '>' + n + ' - ' + SynthEngine.midiToNoteName(n) + '</option>';
    }
    html += '</select>';
    return html;
  }

  // --- Used pins tracking --------------------------------------------------

  function getUsedPins() {
    var used = {};
    used[state.audio_pin] = "Audio Out";
    used[state.i2c_sda] = "I2C SDA";
    used[state.i2c_scl] = "I2C SCL";
    used[state.voice_button_pin] = "Voice Btn";
    if (state.led_mode === "neopixel") {
      used[state.neopixel_pin] = "LED";
    } else {
      for (var r = 0; r < state.rgb_pins.length; r++) used[state.rgb_pins[r]] = "RGB " + ["R","G","B"][r];
    }
    for (var b = 0; b < state.buttons.length; b++) used[state.buttons[b].pin] = "Btn " + (b+1);
    for (var t = 0; t < state.touches.length; t++) used[state.touches[t].pin] = "Touch " + (t+1);
    for (var a = 0; a < state.analogs.length; a++) {
      if (state.analogs[a].enabled) used[state.analogs[a].pin] = "ADC " + (a+1);
    }
    return used;
  }

  function countEnabledADC() {
    var c = 0;
    for (var i = 0; i < state.analogs.length; i++) { if (state.analogs[i].enabled) c++; }
    return c;
  }

  function nextAvailableDigitalPin() {
    var used = getUsedPins();
    for (var i = 0; i < ALL_DIGITAL_PINS.length; i++) {
      if (!used[ALL_DIGITAL_PINS[i]]) return ALL_DIGITAL_PINS[i];
    }
    return 0;
  }

  function nextAvailableADCPin() {
    var used = getUsedPins();
    for (var i = 0; i < ALL_ADC_PINS.length; i++) {
      if (!used[ALL_ADC_PINS[i]]) return ALL_ADC_PINS[i];
    }
    return 26;
  }

  // --- Pico 2 SVG pinout --------------------------------------------------

  var PICO_LEFT_PINS = [
    { pin: 0, label: "GP0", row: 0 }, { pin: 1, label: "GP1", row: 1 },
    { pin: null, label: "GND", row: 2 }, { pin: 2, label: "GP2", row: 3 },
    { pin: 3, label: "GP3", row: 4 }, { pin: 4, label: "GP4", row: 5 },
    { pin: 5, label: "GP5", row: 6 }, { pin: null, label: "GND", row: 7 },
    { pin: 6, label: "GP6", row: 8 }, { pin: 7, label: "GP7", row: 9 },
    { pin: 8, label: "GP8", row: 10 }, { pin: 9, label: "GP9", row: 11 },
    { pin: null, label: "GND", row: 12 }, { pin: 10, label: "GP10", row: 13 },
    { pin: 11, label: "GP11", row: 14 }, { pin: 12, label: "GP12", row: 15 },
    { pin: 13, label: "GP13", row: 16 }, { pin: null, label: "GND", row: 17 },
    { pin: 14, label: "GP14", row: 18 }, { pin: 15, label: "GP15", row: 19 },
  ];
  var PICO_RIGHT_PINS = [
    { pin: null, label: "VBUS", row: 0 }, { pin: null, label: "VSYS", row: 1 },
    { pin: null, label: "GND", row: 2 }, { pin: null, label: "3V3_EN", row: 3 },
    { pin: null, label: "3V3", row: 4 }, { pin: null, label: "ADC_VREF", row: 5 },
    { pin: 28, label: "GP28", row: 6 }, { pin: null, label: "GND", row: 7 },
    { pin: 27, label: "GP27", row: 8 }, { pin: 26, label: "GP26", row: 9 },
    { pin: null, label: "RUN", row: 10 }, { pin: 22, label: "GP22", row: 11 },
    { pin: null, label: "GND", row: 12 }, { pin: 21, label: "GP21", row: 13 },
    { pin: 20, label: "GP20", row: 14 }, { pin: 19, label: "GP19", row: 15 },
    { pin: 18, label: "GP18", row: 16 }, { pin: null, label: "GND", row: 17 },
    { pin: 17, label: "GP17", row: 18 }, { pin: 16, label: "GP16", row: 19 },
  ];

  var PIN_COLORS = { "Audio Out":"#ef4444", "I2C SDA":"#f97316", "I2C SCL":"#f97316", "Voice Btn":"#8b5cf6", "LED":"#22c55e", "RGB R":"#ef4444", "RGB G":"#22c55e", "RGB B":"#3b82f6" };

  function getPinColor(usage) {
    if (!usage) return null;
    if (PIN_COLORS[usage]) return PIN_COLORS[usage];
    if (usage.startsWith("Btn")) return "#3b82f6";
    if (usage.startsWith("Touch")) return "#06b6d4";
    if (usage.startsWith("ADC")) return "#eab308";
    return "#8b5cf6";
  }

  function renderPinoutSVG() {
    var container = document.getElementById("pinout-svg-container");
    if (!container) return;
    var used = getUsedPins();
    var W = 600, H = 520, pinH = 22, pinGap = 2;
    var boardW = 100, boardX = (W - boardW) / 2, boardY = 20, boardH = (pinH + pinGap) * 20 + 10, pinW = 160;

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:600px;font-family:monospace;font-size:11px">';
    svg += '<rect x="' + boardX + '" y="' + boardY + '" width="' + boardW + '" height="' + boardH + '" rx="8" fill="#1a5c2a" stroke="#2d8a4e" stroke-width="2"/>';
    svg += '<rect x="' + (boardX + boardW/2 - 15) + '" y="' + (boardY - 8) + '" width="30" height="14" rx="3" fill="#888" stroke="#666" stroke-width="1"/>';
    svg += '<text x="' + (W/2) + '" y="' + (boardY + boardH/2) + '" text-anchor="middle" fill="#4ade80" font-size="13" font-weight="bold" transform="rotate(-90,' + (W/2) + ',' + (boardY + boardH/2) + ')">PICO 2</text>';

    function drawPinRow(pinDef, side) {
      var y = boardY + 15 + pinDef.row * (pinH + pinGap);
      var isLeft = side === "left";
      var usage = pinDef.pin !== null ? used[pinDef.pin] : null;
      var color = getPinColor(usage);
      var isGnd = pinDef.label === "GND";
      var isPower = ["VBUS","VSYS","3V3_EN","3V3","ADC_VREF","RUN"].indexOf(pinDef.label) >= 0;
      var dotX = isLeft ? boardX - 3 : boardX + boardW + 3;
      var dotColor = color || (isGnd ? "#555" : (isPower ? "#dc2626" : "#666"));
      svg += '<circle cx="' + dotX + '" cy="' + (y + pinH/2) + '" r="4" fill="' + dotColor + '"/>';
      var lx, textAnchor, bgX;
      if (isLeft) { lx = boardX - 12; textAnchor = "end"; bgX = lx - pinW + 5; }
      else { lx = boardX + boardW + 12; textAnchor = "start"; bgX = lx - 5; }
      if (color) {
        svg += '<rect x="' + bgX + '" y="' + y + '" width="' + pinW + '" height="' + pinH + '" rx="4" fill="' + color + '" opacity="0.15"/>';
        svg += '<rect x="' + bgX + '" y="' + y + '" width="' + pinW + '" height="' + pinH + '" rx="4" fill="none" stroke="' + color + '" stroke-width="1" opacity="0.4"/>';
      }
      var fillColor = color || (isGnd ? "#666" : (isPower ? "#f87171" : "#aaa"));
      svg += '<text x="' + lx + '" y="' + (y + pinH/2 + 4) + '" text-anchor="' + textAnchor + '" fill="' + fillColor + '" font-weight="' + (color ? "bold" : "normal") + '">' + pinDef.label;
      if (usage) svg += '<tspan fill="' + color + '" font-size="9"> ' + escapeHtml(usage) + '</tspan>';
      svg += '</text>';
    }
    for (var i = 0; i < PICO_LEFT_PINS.length; i++) drawPinRow(PICO_LEFT_PINS[i], "left");
    for (var j = 0; j < PICO_RIGHT_PINS.length; j++) drawPinRow(PICO_RIGHT_PINS[j], "right");
    svg += '</svg>';
    container.innerHTML = svg;
  }

  // --- Render config form --------------------------------------------------

  function render() {
    var body = document.getElementById("config-options-body");
    if (!body) return;
    var enabledCount = countEnabledADC();
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
    html += buildSelect("cfg-scale", SCALE_OPTIONS, state.scale);
    html += '</div>';

    // Base note
    html += '<div class="form-section"><h3>Base Note</h3>';
    html += '<div class="slider-container"><div class="slider-row">';
    html += '<input type="range" id="cfg-base-note" min="24" max="84" value="' + state.base_note + '">';
    html += '<span class="slider-value" id="cfg-base-note-val">' + state.base_note + ' (' + SynthEngine.midiToNoteName(state.base_note) + ')</span>';
    html += '</div></div></div>';
    html += '<hr class="form-separator">';

    // --- Note Buttons ---
    html += '<div class="form-section"><h3>Note Buttons</h3>';
    html += '<p class="hint">Each button triggers a note from the selected scale. Pull-up, active LOW.</p>';
    for (var b = 0; b < state.buttons.length; b++) {
      var btn = state.buttons[b];
      html += '<div class="input-row pin-row" style="margin-top:0.5rem">';
      html += '<div class="input-group"><label>Pin</label><input type="number" class="cfg-btn-pin" data-idx="' + b + '" min="0" max="22" value="' + btn.pin + '"></div>';
      html += '<div class="input-group"><label>Note</label>' + buildNoteSelect("cfg-btn-note-" + b, "cfg-btn-note", btn.note) + '</div>';
      html += '<button class="btn-remove" data-type="button" data-idx="' + b + '">x</button>';
      html += '</div>';
    }
    html += '<button class="btn-sm" id="cfg-add-button" style="margin-top:0.5rem">+ Add button</button>';
    html += '</div>';
    html += '<hr class="form-separator">';

    // --- Touch Pads ---
    html += '<div class="form-section"><h3>Touch Pads</h3>';
    html += '<p class="hint">Capacitive touch on copper tape. Optional.</p>';
    for (var t = 0; t < state.touches.length; t++) {
      var tch = state.touches[t];
      html += '<div class="input-row pin-row" style="margin-top:0.5rem">';
      html += '<div class="input-group"><label>Pin</label><input type="number" class="cfg-touch-pin" data-idx="' + t + '" min="0" max="22" value="' + tch.pin + '"></div>';
      html += '<div class="input-group"><label>Note</label>' + buildNoteSelect("cfg-touch-note-" + t, "cfg-touch-note", tch.note) + '</div>';
      html += '<button class="btn-remove" data-type="touch" data-idx="' + t + '">x</button>';
      html += '</div>';
    }
    html += '<button class="btn-sm" id="cfg-add-touch" style="margin-top:0.5rem">+ Add touchpad</button>';
    html += '</div>';
    html += '<hr class="form-separator">';

    // System pins
    html += '<div class="form-section"><h3>System Pins</h3>';
    html += '<div class="input-row">';
    html += '<div class="input-group"><label>Voice cycle button</label><input type="number" id="cfg-voice-btn" min="0" max="22" value="' + state.voice_button_pin + '"></div>';
    html += '<div class="input-group"><label>Audio output pin</label><input type="number" id="cfg-audio-pin" min="0" max="22" value="' + state.audio_pin + '"></div>';
    html += '</div></div>';
    html += '<hr class="form-separator">';

    // LED
    html += '<div class="form-section"><h3>Voice LED Indicator</h3>';
    html += '<div class="input-row">';
    html += '<div class="input-group"><label>LED type</label>' + buildSelect("cfg-led-mode", LED_MODES, state.led_mode) + '</div>';
    html += '<div class="input-group" id="cfg-led-pin-group"><label>LED pin</label><input type="number" id="cfg-led-pin" min="0" max="22" value="' + state.neopixel_pin + '"></div>';
    html += '</div>';
    html += '<div class="input-row" style="margin-top:0.75rem" id="cfg-rgb-row">';
    html += '<div class="input-group"><label>R</label><input type="number" class="cfg-rgb-pin" data-idx="0" min="0" max="22" value="' + state.rgb_pins[0] + '"></div>';
    html += '<div class="input-group"><label>G</label><input type="number" class="cfg-rgb-pin" data-idx="1" min="0" max="22" value="' + state.rgb_pins[1] + '"></div>';
    html += '<div class="input-group"><label>B</label><input type="number" class="cfg-rgb-pin" data-idx="2" min="0" max="22" value="' + state.rgb_pins[2] + '"></div>';
    html += '</div>';
    html += '<div class="input-row" style="margin-top:0.5rem"><div class="input-group"><label>Brightness</label>';
    html += '<input type="range" id="cfg-brightness" min="0.05" max="1.0" step="0.05" value="' + state.led_brightness + '">';
    html += '<span id="cfg-brightness-val">' + state.led_brightness.toFixed(2) + '</span></div></div>';
    html += '</div>';
    html += '<hr class="form-separator">';

    // --- Analog Inputs with Include checkboxes ---
    html += '<div class="form-section"><h3>Analog Inputs (ADC)</h3>';
    html += '<p class="hint">Pico 2 has ' + MAX_ADC + ' ADC pins (GP26-29). Check "Include" to assign to hardware. '
          + '<strong>' + enabledCount + '/' + MAX_ADC + ' used.</strong></p>';

    for (var a = 0; a < state.analogs.length; a++) {
      var ai = state.analogs[a];
      var chk = ai.enabled ? " checked" : "";
      var disabledAttr = (!ai.enabled && enabledCount >= MAX_ADC) ? ' disabled title="Max ' + MAX_ADC + ' ADC inputs reached"' : '';
      var rowDim = ai.enabled ? "" : " adc-disabled";

      html += '<div class="input-row pin-row adc-row' + rowDim + '" style="margin-top:0.5rem">';
      html += '<div class="input-group adc-check-group">'
            + '<label class="adc-include-label"><input type="checkbox" class="cfg-adc-enable" data-idx="' + a + '"' + chk + disabledAttr + '> Include</label>'
            + '</div>';
      html += '<div class="input-group"><label>Pin</label><input type="number" class="cfg-adc-pin" data-idx="' + a + '" min="26" max="29" value="' + ai.pin + '"' + (ai.enabled ? '' : ' disabled') + '></div>';
      html += '<div class="input-group"><label>Controls</label>' + buildSelect("cfg-adc-ctrl-" + a, INPUT_TARGETS, ai.controls) + '</div>';
      html += '<button class="btn-remove" data-type="analog" data-idx="' + a + '">x</button>';
      html += '</div>';
    }

    var canAddMore = state.analogs.length < INPUT_TARGETS.length; // don't create infinite rows
    html += '<button class="btn-sm" id="cfg-add-analog" style="margin-top:0.5rem"' + (canAddMore ? '' : ' disabled') + '>+ Add analog mapping</button>';
    html += '</div>';
    html += '<hr class="form-separator">';

    // I2C
    html += '<div class="form-section"><h3>I2C Sensors</h3>';
    html += '<div class="input-row">';
    html += '<div class="input-group"><label>SDA</label><input type="number" id="cfg-i2c-sda" min="0" max="28" value="' + state.i2c_sda + '"></div>';
    html += '<div class="input-group"><label>SCL</label><input type="number" id="cfg-i2c-scl" min="0" max="28" value="' + state.i2c_scl + '"></div>';
    html += '</div>';
    html += '<div class="input-row" style="margin-top:0.75rem">';
    html += '<div class="input-group"><label>ToF controls</label>' + buildSelect("cfg-tof", INPUT_TARGETS, state.tof_controls) + '</div>';
    html += '</div>';
    html += '<h4 style="margin-top:0.75rem">Accelerometer (LIS3DH)</h4>';
    html += '<div class="input-row">';
    html += '<div class="input-group"><label>Tilt X</label>' + buildSelect("cfg-accel-x", INPUT_TARGETS, state.accel_x_controls) + '</div>';
    html += '<div class="input-group"><label>Tilt Y</label>' + buildSelect("cfg-accel-y", INPUT_TARGETS, state.accel_y_controls) + '</div>';
    html += '</div>';
    html += '<div class="input-row" style="margin-top:0.5rem">';
    html += '<div class="input-group"><label>Shake</label>' + buildSelect("cfg-accel-shake", INPUT_TARGETS, state.accel_shake_controls) + '</div>';
    html += '</div></div>';

    body.innerHTML = html;
    bindEvents();
    updateCode();
    updateLEDVisibility();
    renderPinoutSVG();
  }

  // --- Event binding -------------------------------------------------------

  function bindEvents() {
    // Voice
    document.querySelectorAll('input[name="cfg-voice"]').forEach(function (r) {
      r.addEventListener("change", function () { state.start_voice = parseInt(this.value); updateCode(); renderPinoutSVG(); });
    });
    // Scale -- also re-render to update note dropdowns
    var scaleSel = document.getElementById("cfg-scale");
    if (scaleSel) scaleSel.addEventListener("change", function () {
      state.scale = this.value;
      // Auto-reassign button/touch notes to nearest scale note
      _snapNotesToScale();
      render();
    });
    // Base note
    var bn = document.getElementById("cfg-base-note");
    if (bn) bn.addEventListener("input", function () {
      state.base_note = parseInt(this.value);
      document.getElementById("cfg-base-note-val").textContent = state.base_note + " (" + SynthEngine.midiToNoteName(state.base_note) + ")";
      updateCode();
    });

    // Button pin
    document.querySelectorAll(".cfg-btn-pin").forEach(function (el) {
      el.addEventListener("input", function () {
        state.buttons[parseInt(this.dataset.idx)].pin = parseInt(this.value) || 0;
        updateCode(); renderPinoutSVG();
      });
    });
    // Button note (select)
    document.querySelectorAll(".cfg-btn-note").forEach(function (el) {
      el.addEventListener("change", function () {
        var idx = parseInt(this.id.replace("cfg-btn-note-", ""));
        state.buttons[idx].note = parseInt(this.value);
        updateCode();
      });
    });
    // Touch pin
    document.querySelectorAll(".cfg-touch-pin").forEach(function (el) {
      el.addEventListener("input", function () {
        state.touches[parseInt(this.dataset.idx)].pin = parseInt(this.value) || 0;
        updateCode(); renderPinoutSVG();
      });
    });
    // Touch note (select)
    document.querySelectorAll(".cfg-touch-note").forEach(function (el) {
      el.addEventListener("change", function () {
        var idx = parseInt(this.id.replace("cfg-touch-note-", ""));
        state.touches[idx].note = parseInt(this.value);
        updateCode();
      });
    });

    // Remove buttons
    document.querySelectorAll(".btn-remove").forEach(function (el) {
      el.addEventListener("click", function () {
        var type = this.dataset.type, idx = parseInt(this.dataset.idx);
        if (type === "button" && state.buttons.length > 1) state.buttons.splice(idx, 1);
        else if (type === "touch") state.touches.splice(idx, 1);
        else if (type === "analog" && state.analogs.length > 1) state.analogs.splice(idx, 1);
        render();
      });
    });

    // Add buttons
    var addBtn = document.getElementById("cfg-add-button");
    if (addBtn) addBtn.addEventListener("click", function () {
      var scaleNotes = getScaleNotes(state.scale, Math.floor(state.base_note / 12) - 1);
      var lastNote = state.buttons.length > 0 ? state.buttons[state.buttons.length-1].note : state.base_note;
      var next = _nextScaleNoteAfter(scaleNotes, lastNote);
      state.buttons.push({ pin: nextAvailableDigitalPin(), note: next });
      render();
    });
    var addTouch = document.getElementById("cfg-add-touch");
    if (addTouch) addTouch.addEventListener("click", function () {
      var scaleNotes = getScaleNotes(state.scale, Math.floor(state.base_note / 12) - 1);
      var lastNote = state.touches.length > 0 ? state.touches[state.touches.length-1].note : state.base_note + 12;
      var next = _nextScaleNoteAfter(scaleNotes, lastNote);
      state.touches.push({ pin: nextAvailableDigitalPin(), note: next });
      render();
    });
    var addAnalog = document.getElementById("cfg-add-analog");
    if (addAnalog) addAnalog.addEventListener("click", function () {
      var en = countEnabledADC() < MAX_ADC;
      state.analogs.push({ pin: nextAvailableADCPin(), controls: "none", enabled: en });
      render();
    });

    // ADC enable checkboxes
    document.querySelectorAll(".cfg-adc-enable").forEach(function (el) {
      el.addEventListener("change", function () {
        var idx = parseInt(this.dataset.idx);
        if (this.checked && countEnabledADC() >= MAX_ADC) {
          // Can't enable more -- find one to disable first, or reject
          this.checked = false;
          return;
        }
        state.analogs[idx].enabled = this.checked;
        render();
      });
    });

    // ADC pin/controls
    document.querySelectorAll(".cfg-adc-pin").forEach(function (el) {
      el.addEventListener("input", function () {
        state.analogs[parseInt(this.dataset.idx)].pin = parseInt(this.value) || 26;
        updateCode(); renderPinoutSVG();
      });
    });
    for (var a = 0; a < state.analogs.length; a++) {
      (function(idx) {
        var sel = document.getElementById("cfg-adc-ctrl-" + idx);
        if (sel) sel.addEventListener("change", function () { state.analogs[idx].controls = this.value; updateCode(); });
      })(a);
    }

    // System pins
    var voiceBtn = document.getElementById("cfg-voice-btn");
    if (voiceBtn) voiceBtn.addEventListener("input", function () { state.voice_button_pin = parseInt(this.value) || 8; updateCode(); renderPinoutSVG(); });
    var audioPin = document.getElementById("cfg-audio-pin");
    if (audioPin) audioPin.addEventListener("input", function () { state.audio_pin = parseInt(this.value) || 15; updateCode(); renderPinoutSVG(); });

    // LED
    var ledMode = document.getElementById("cfg-led-mode");
    if (ledMode) ledMode.addEventListener("change", function () { state.led_mode = this.value; updateLEDVisibility(); updateCode(); renderPinoutSVG(); });
    var ledPin = document.getElementById("cfg-led-pin");
    if (ledPin) ledPin.addEventListener("input", function () { state.neopixel_pin = parseInt(this.value) || 16; updateCode(); renderPinoutSVG(); });
    document.querySelectorAll(".cfg-rgb-pin").forEach(function (el) {
      el.addEventListener("input", function () {
        state.rgb_pins[parseInt(this.dataset.idx)] = parseInt(this.value) || 0;
        updateCode(); renderPinoutSVG();
      });
    });
    var bright = document.getElementById("cfg-brightness");
    if (bright) bright.addEventListener("input", function () {
      state.led_brightness = parseFloat(this.value);
      document.getElementById("cfg-brightness-val").textContent = state.led_brightness.toFixed(2);
      updateCode();
    });

    // I2C
    var sda = document.getElementById("cfg-i2c-sda");
    if (sda) sda.addEventListener("input", function () { state.i2c_sda = parseInt(this.value) || 4; updateCode(); renderPinoutSVG(); });
    var scl = document.getElementById("cfg-i2c-scl");
    if (scl) scl.addEventListener("input", function () { state.i2c_scl = parseInt(this.value) || 5; updateCode(); renderPinoutSVG(); });
    var tof = document.getElementById("cfg-tof");
    if (tof) tof.addEventListener("change", function () { state.tof_controls = this.value; updateCode(); });
    var ax = document.getElementById("cfg-accel-x");
    if (ax) ax.addEventListener("change", function () { state.accel_x_controls = this.value; updateCode(); });
    var ay = document.getElementById("cfg-accel-y");
    if (ay) ay.addEventListener("change", function () { state.accel_y_controls = this.value; updateCode(); });
    var as = document.getElementById("cfg-accel-shake");
    if (as) as.addEventListener("change", function () { state.accel_shake_controls = this.value; updateCode(); });
  }

  // --- Note helpers --------------------------------------------------------

  function _nextScaleNoteAfter(scaleNotes, lastNote) {
    for (var i = 0; i < scaleNotes.length; i++) {
      if (scaleNotes[i] > lastNote) return scaleNotes[i];
    }
    return Math.min(127, lastNote + 2);
  }

  function _snapNotesToScale() {
    var scaleNotes = getScaleNotes(state.scale, Math.floor(state.base_note / 12) - 1);
    function snap(n) {
      var best = scaleNotes[0] || n;
      var bestDist = Math.abs(n - best);
      for (var i = 1; i < scaleNotes.length; i++) {
        var d = Math.abs(n - scaleNotes[i]);
        if (d < bestDist) { best = scaleNotes[i]; bestDist = d; }
      }
      return best;
    }
    for (var b = 0; b < state.buttons.length; b++) state.buttons[b].note = snap(state.buttons[b].note);
    for (var t = 0; t < state.touches.length; t++) state.touches[t].note = snap(state.touches[t].note);
  }

  function updateLEDVisibility() {
    var rgbRow = document.getElementById("cfg-rgb-row");
    var pinGroup = document.getElementById("cfg-led-pin-group");
    if (!rgbRow) return;
    rgbRow.style.display = state.led_mode === "rgb" ? "" : "none";
    if (pinGroup) pinGroup.style.display = state.led_mode === "neopixel" ? "" : "none";
  }

  // --- Code generation -----------------------------------------------------

  function generateCode() {
    var s = state;
    var scaleObj = SCALE_OPTIONS.find(function(o){ return o.value === s.scale; });
    var scaleArr = scaleObj ? scaleObj.intervals : "[0, 2, 4, 7, 9]";
    var enabledAnalogs = s.analogs.filter(function(a){ return a.enabled; });

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

    var btnPins = s.buttons.map(function(b){ return b.pin; });
    var btnNotes = s.buttons.map(function(b){ return b.note; });
    lines.push('    "button_pins": [' + btnPins.join(", ") + '],');
    lines.push('    "button_notes": [' + btnNotes.join(", ") + '],');

    if (s.touches.length > 0) {
      var tchPins = s.touches.map(function(t){ return t.pin; });
      var tchNotes = s.touches.map(function(t){ return t.note; });
      lines.push('    "touch_pins": [' + tchPins.join(", ") + '],');
      lines.push('    "touch_notes": [' + tchNotes.join(", ") + '],');
    }

    lines.push('    "voice_button_pin": ' + s.voice_button_pin + ',');
    lines.push("");
    lines.push('    "led_mode": "' + s.led_mode + '",');
    if (s.led_mode === "neopixel") lines.push('    "neopixel_pin": ' + s.neopixel_pin + ',');
    else lines.push('    "rgb_pins": [' + s.rgb_pins.join(", ") + '],');
    lines.push('    "led_brightness": ' + s.led_brightness.toFixed(2) + ',');
    lines.push("");

    lines.push('    "analog_inputs": [');
    for (var a = 0; a < enabledAnalogs.length; a++) {
      var ai = enabledAnalogs[a];
      lines.push('        {"pin": ' + ai.pin + ', "controls": "' + ai.controls + '", "alpha": 0.15},');
    }
    lines.push('    ],');
    lines.push("");
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

  function getRawCode() { return generateCode(); }

  return { render: render, updateCode: updateCode, getRawCode: getRawCode };
})();
