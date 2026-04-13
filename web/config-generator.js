// ============================================================
// Config Generator -- Wiring guide, pinout SVG, code output
// Reads all state from AppState (shared with Play tab).
// ============================================================

var ConfigGenerator = (function () {
  "use strict";

  // --- Pico 2 SVG pinout layout -------------------------------------------

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

  var PIN_COLORS = {
    "Audio Out":"#ef4444", "I2C SDA":"#f97316", "I2C SCL":"#f97316",
    "Voice Btn":"#8b5cf6", "LED":"#22c55e", "RGB R":"#ef4444",
    "RGB G":"#22c55e", "RGB B":"#3b82f6"
  };

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function getPinColor(usage) {
    if (!usage) return null;
    if (PIN_COLORS[usage]) return PIN_COLORS[usage];
    if (usage.indexOf("Btn") >= 0) return "#3b82f6";
    if (usage.indexOf("Touch") >= 0) return "#06b6d4";
    if (usage.indexOf("POT") >= 0 || usage.indexOf("LDR") >= 0) return "#eab308";
    return "#8b5cf6";
  }

  function renderPinoutSVG() {
    var container = document.getElementById("pinout-svg-container");
    if (!container) return;
    var used = AppState.getUsedPins();
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

  // --- Wiring Guide --------------------------------------------------------

  function renderWiringGuide() {
    var body = document.getElementById("wiring-guide-body");
    if (!body) return;

    var html = '<div class="wiring-ref">';

    html += '<p>How to connect components to the Raspberry Pi Pico 2 GPIO pins. '
          + 'All digital inputs use internal pull-ups -- no external resistors needed for buttons.</p>';

    // Buttons
    html += '<h3>Buttons</h3>';
    html += '<p>Wire one leg to a digital GPIO pin, the other to <strong>GND</strong>. '
          + 'The firmware activates the internal pull-up, so the pin reads HIGH when open and LOW when pressed. '
          + 'Any digital pin can be used (GP0-GP22, excluding GP4/GP5 which are reserved for I2C).</p>';
    html += '<p class="wiring-note"><strong>RP2350-A2 erratum:</strong> Buttons MUST be wired pull-UP with switch-to-GND (active LOW). '
          + 'Pull-down wiring does not work reliably on the Pico 2.</p>';
    html += '<div class="wiring-diagram">'
          + '<span>GPIO pin</span> &larr;&mdash; [button/switch] &mdash;&rarr; <span>GND</span>'
          + '</div>';

    // Touch pads
    html += '<h3>Touch Pads</h3>';
    html += '<p>Connect a conductive surface (copper tape, bare PCB pad, aluminum foil) directly to a digital GPIO pin. '
          + 'No connection to GND -- the firmware senses capacitance changes when you touch the pad. '
          + 'Uses the same digital pin pool as buttons.</p>';
    html += '<p class="wiring-note"><strong>RP2350 (Pico 2):</strong> Touch pads require an external '
          + '<strong>1M&ohm; resistor from the GPIO pin to 3V3</strong> due to the RP2350-E9 silicon erratum. '
          + 'Without this resistor, touches will not be detected.</p>';
    html += '<div class="wiring-diagram">'
          + '<span>GPIO pin</span> &larr;&mdash; [conductive pad]<br>'
          + 'Required: <span>GPIO pin</span> &larr;&mdash; [1M&ohm;] &mdash;&rarr; <span>3V3</span>'
          + '</div>';

    // Pots
    html += '<h3>Potentiometers</h3>';
    html += '<p>Wire the outer legs to <strong>3V3</strong> and <strong>GND</strong>, and the wiper (middle leg) '
          + 'to an analog pin: <strong>GP26</strong>, <strong>GP27</strong>, <strong>GP28</strong>, or <strong>GP29</strong>. '
          + 'Maximum 4 ADC pins total (shared with LDR). The firmware reads 0-65535 and normalizes to 0.0-1.0.</p>';
    html += '<div class="wiring-diagram">'
          + '<span>3V3</span> &larr;&mdash; [pot outer leg]<br>'
          + '<span>ADC pin</span> &larr;&mdash; [pot wiper / middle leg]<br>'
          + '<span>GND</span> &larr;&mdash; [pot other outer leg]'
          + '</div>';

    // LDR
    html += '<h3>LDR (Light Sensor)</h3>';
    html += '<p>Wire the LDR and a fixed <strong>10k&ohm; resistor</strong> as a voltage divider between '
          + '3V3 and GND, with the midpoint going to an analog pin (GP26-GP29). '
          + 'Shares the ADC pin pool with potentiometers.</p>';
    html += '<div class="wiring-diagram">'
          + '<span>3V3</span> &larr;&mdash; [LDR] &mdash; midpoint &mdash;&rarr; <span>ADC pin</span><br>'
          + '<span>GND</span> &larr;&mdash; [10k&ohm; resistor] &mdash; midpoint'
          + '</div>';

    // Accelerometer
    html += '<h3>Accelerometer (LIS3DH)</h3>';
    html += '<p>Uses I2C on fixed pins: <strong>SDA = GP' + AppState.get("i2cSda") + '</strong>, '
          + '<strong>SCL = GP' + AppState.get("i2cScl") + '</strong>. '
          + 'Power the module from 3V3 and GND. No external pull-ups needed -- '
          + 'the firmware enables internal pull-ups on the I2C lines. '
          + 'Provides tilt X, tilt Y, and shake detection, each mappable to any FX parameter.</p>';
    html += '<div class="wiring-diagram">'
          + '<span>GP' + AppState.get("i2cScl") + ' (SCL)</span> &larr;&mdash;&rarr; <span>SCL</span><br>'
          + '<span>GP' + AppState.get("i2cSda") + ' (SDA)</span> &larr;&mdash;&rarr; <span>SDA</span><br>'
          + '<span>3V3</span> &larr;&mdash;&rarr; <span>VIN / VCC</span><br>'
          + '<span>GND</span> &larr;&mdash;&rarr; <span>GND</span>'
          + '</div>';

    // ToF
    html += '<h3>ToF Distance Sensor (VL53L0X)</h3>';
    html += '<p>Shares the same I2C bus as the accelerometer. '
          + 'Wire SCL and SDA to the same pins, plus 3V3 and GND. '
          + 'Measures distance 0-200cm, normalized to 0.0-1.0.</p>';

    // Voice LED
    html += '<h3>Voice LED Indicator</h3>';
    html += '<p>Shows which voice is active using color. '
          + 'Use either a <strong>NeoPixel (WS2812B)</strong> on a single data pin, '
          + 'or an <strong>RGB LED</strong> on 3 separate pins (with current-limiting resistors).</p>';
    html += '<div class="wiring-diagram">'
          + 'NeoPixel: <span>GPIO pin</span> &larr;&mdash; [DIN] &nbsp; <span>3V3</span> &rarr; VCC &nbsp; <span>GND</span> &rarr; GND<br>'
          + 'RGB LED: <span>GPIO R</span> &mdash; [220&ohm;] &rarr; R &nbsp; <span>GPIO G</span> &mdash; [220&ohm;] &rarr; G &nbsp; <span>GPIO B</span> &mdash; [220&ohm;] &rarr; B &nbsp; common &rarr; GND'
          + '</div>';

    // Audio
    html += '<h3>Audio Output</h3>';
    html += '<p>PWM audio on <strong>GP' + AppState.get("audioPin") + '</strong>. '
          + 'Connect through a <strong>1k&ohm; resistor</strong> to a small speaker or amplifier input. '
          + 'For best quality, add a low-pass RC filter (1k&ohm; + 100nF capacitor to GND).</p>';
    html += '<div class="wiring-diagram">'
          + '<span>GP' + AppState.get("audioPin") + '</span> &mdash; [1k&ohm;] &mdash;&rarr; speaker + / amp input<br>'
          + '<span>GND</span> &mdash;&rarr; speaker - / amp ground'
          + '</div>';

    // Pin summary
    html += '<h3>Pin Summary</h3>';
    html += '<table class="wiring-table">';
    html += '<tr><th>Type</th><th>Pins</th><th>Max</th></tr>';
    html += '<tr><td>Digital (buttons / touch)</td><td>GP0-GP3, GP6-GP22</td><td>20</td></tr>';
    html += '<tr><td>Analog (pots / LDR)</td><td>GP26, GP27, GP28, GP29</td><td>4</td></tr>';
    html += '<tr><td>I2C (accel / ToF)</td><td>GP' + AppState.get("i2cSda") + ' (SDA), GP' + AppState.get("i2cScl") + ' (SCL)</td><td>fixed</td></tr>';
    html += '<tr><td>Audio (PWM)</td><td>GP' + AppState.get("audioPin") + '</td><td>1</td></tr>';
    html += '</table>';

    // Tips
    html += '<h3>Tips</h3>';
    html += '<ul class="wiring-tips">';
    html += '<li>GP4 (SDA) and GP5 (SCL) are reserved for I2C when using accelerometer or ToF sensor</li>';
    html += '<li>Each pin can only be used by one input -- buttons and touch pads share the digital pool</li>';
    html += '<li>Pots and LDRs share the 4 analog pins -- plan accordingly</li>';
    html += '<li>Use the <strong>Connect Pico</strong> button to test your wiring live before downloading code</li>';
    html += '<li>The voice cycle button (default GP8) is separate from note buttons</li>';
    html += '<li>For a cleaner audio signal, consider an I2S DAC breakout as a post-workshop upgrade</li>';
    html += '</ul>';

    html += '</div>';
    body.innerHTML = html;
  }

  // --- Code generation (uses AppState) -------------------------------------

  var currentFormat = "codepy";  // "codepy" or "configjson"

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

  function highlightJSON(code) {
    var lines = code.split("\n");
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = escapeHtml(lines[i]);
      // Highlight keys ("key":)
      line = line.replace(/"([^"]*)"\s*:/g, '<span class="syn-key">"$1"</span>:');
      // Highlight string values (: "value")
      line = line.replace(/:\s*"([^"]*)"/g, ': <span class="syn-string">"$1"</span>');
      // Highlight numbers
      line = line.replace(/([\[,: ])(-?\d+\.?\d*)/g, '$1<span class="syn-number">$2</span>');
      // Highlight true/false/null
      line = line.replace(/\b(true|false|null)\b/g, '<span class="syn-keyword">$1</span>');
      result.push(line);
    }
    return result.join("\n");
  }

  function setFormat(fmt) {
    currentFormat = fmt;
    updateCode();
    // Update toggle button active states
    var btnCodePy = document.getElementById("btn-fmt-codepy");
    var btnConfig = document.getElementById("btn-fmt-configjson");
    if (btnCodePy) btnCodePy.classList.toggle("active", fmt === "codepy");
    if (btnConfig) btnConfig.classList.toggle("active", fmt === "configjson");
    // Update filename label
    var fnLabel = document.querySelector(".filename");
    if (fnLabel) fnLabel.textContent = fmt === "codepy" ? "code.py" : "config.json";
    // Update download button text
    var dlBtn = document.getElementById("btn-download");
    if (dlBtn) dlBtn.textContent = fmt === "codepy" ? "Download code.py" : "Download config.json";
    // Update description
    var desc = document.getElementById("code-format-desc");
    if (desc) {
      desc.textContent = fmt === "codepy"
        ? "Standalone file with all settings hardcoded. Copy to CIRCUITPY as code.py -- no other files needed."
        : "Settings file read by the firmware on boot. Copy to CIRCUITPY alongside the default code.py and lib/ folder.";
    }
  }

  function updateCode() {
    var pre = document.getElementById("code-preview");
    if (!pre) return;
    if (currentFormat === "configjson") {
      var json = AppState.generateConfigJSON();
      pre.innerHTML = highlightJSON(json);
    } else {
      var code = AppState.generateFirmwareConfig();
      pre.innerHTML = highlightPython(code);
    }
  }

  function getRawCode() { return AppState.generateFirmwareConfig(); }
  function getRawConfigJSON() { return AppState.generateConfigJSON(); }
  function getFormat() { return currentFormat; }

  // --- Render everything ---------------------------------------------------

  function render() {
    renderPinoutSVG();
    renderWiringGuide();
    updateCode();
    _bindSystemPins();
  }

  function _bindSystemPins() {
    var audioPin = document.getElementById("cfg-audio-pin");
    if (audioPin) audioPin.addEventListener("input", function () {
      AppState.set("audioPin", parseInt(this.value) || 15);
      render();
    });
    var voiceBtn = document.getElementById("cfg-voice-btn");
    if (voiceBtn) voiceBtn.addEventListener("input", function () {
      AppState.set("voiceButtonPin", parseInt(this.value) || 8);
      render();
    });
    var ledMode = document.getElementById("cfg-led-mode");
    if (ledMode) ledMode.addEventListener("change", function () {
      AppState.set("ledMode", this.value);
      var pinGroup = document.getElementById("cfg-led-pin-group");
      if (pinGroup) pinGroup.style.display = this.value === "neopixel" ? "" : "none";
      render();
    });
    var ledPin = document.getElementById("cfg-led-pin");
    if (ledPin) ledPin.addEventListener("input", function () {
      AppState.set("neopixelPin", parseInt(this.value) || 16);
      render();
    });
    var sda = document.getElementById("cfg-i2c-sda");
    if (sda) sda.addEventListener("input", function () {
      AppState.set("i2cSda", parseInt(this.value) || 4);
      render();
    });
    var scl = document.getElementById("cfg-i2c-scl");
    if (scl) scl.addEventListener("input", function () {
      AppState.set("i2cScl", parseInt(this.value) || 5);
      render();
    });
  }

  // Listen for any AppState changes to refresh
  AppState.on("change", function () {
    // Debounce: only update if config tab is visible
    var panel = document.getElementById("tab-config");
    if (panel && panel.classList.contains("active")) {
      renderPinoutSVG();
      updateCode();
    }
  });

  return {
    render: render,
    renderPinoutSVG: renderPinoutSVG,
    updateCode: updateCode,
    getRawCode: getRawCode,
    getRawConfigJSON: getRawConfigJSON,
    getFormat: getFormat,
    setFormat: setFormat,
  };
})();
