// ============================================================
// Serial Bridge -- Web Serial connection to Pico 2
// Reads input events from Pico over USB and routes them
// through AppState assignments to trigger synth actions.
//
// Protocol (Pico -> Browser, one line per event):
//   B<idx>:1       -- button <idx> pressed
//   B<idx>:0       -- button <idx> released
//   T<idx>:1       -- touch <idx> pressed
//   T<idx>:0       -- touch <idx> released
//   A<pin>:<0-1>   -- analog pin value (normalized 0.0-1.0)
//   TX:<-1 to 1>   -- accelerometer tilt X
//   TY:<-1 to 1>   -- accelerometer tilt Y
//   SH:<0-1>       -- accelerometer shake
//   TOF:<0-1>      -- ToF sensor normalized
// ============================================================

var SerialBridge = (function () {
  "use strict";

  var port = null;
  var reader = null;
  var reading = false;
  var buffer = "";

  // Track which keys are currently pressed via serial (for release)
  var serialHeldKeys = {}; // midi -> true

  // --- Connection ----------------------------------------------------------

  function isSupported() {
    return "serial" in navigator;
  }

  function isConnected() {
    return port !== null && reading;
  }

  async function connect() {
    if (!isSupported()) {
      alert("Web Serial is not supported in this browser. Use Chrome or Edge.");
      return false;
    }

    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      reading = true;
      AppState.set("serialConnected", true);
      _readLoop();
      // Tell the Pico we're connected (triggers LED animation)
      await _sendCommand("CMD:CONNECTED");
      return true;
    } catch (e) {
      console.error("Serial connect error:", e);
      port = null;
      reading = false;
      AppState.set("serialConnected", false);
      return false;
    }
  }

  async function disconnect() {
    // Tell the Pico we're disconnecting
    await _sendCommand("CMD:DISCONNECTED");
    reading = false;
    if (reader) {
      try { await reader.cancel(); } catch (e) {}
      reader = null;
    }
    if (port) {
      try { await port.close(); } catch (e) {}
      port = null;
    }
    // Release any held notes
    for (var midi in serialHeldKeys) {
      SynthEngine.noteOff(parseInt(midi));
    }
    serialHeldKeys = {};
    AppState.set("serialConnected", false);
  }

  // --- Send command to Pico -------------------------------------------------

  async function _sendCommand(cmd) {
    if (!port || !port.writable) return;
    try {
      var encoder = new TextEncoder();
      var writer = port.writable.getWriter();
      await writer.write(encoder.encode(cmd + "\n"));
      writer.releaseLock();
    } catch (e) {
      console.error("Serial send error:", e);
    }
  }

  // --- Read loop -----------------------------------------------------------

  async function _readLoop() {
    var decoder = new TextDecoderStream();
    var inputStream = port.readable.pipeTo(decoder.writable);
    reader = decoder.readable.getReader();

    try {
      while (reading) {
        var result = await reader.read();
        if (result.done) break;
        buffer += result.value;
        _processBuffer();
      }
    } catch (e) {
      console.error("Serial read error:", e);
    } finally {
      reader = null;
      reading = false;
      AppState.set("serialConnected", false);
    }
  }

  function _processBuffer() {
    var lines = buffer.split("\n");
    // Keep the last incomplete line in buffer
    buffer = lines.pop() || "";

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.length > 0) _parseLine(line);
    }
  }

  // --- Parse and route events ----------------------------------------------

  function _parseLine(line) {
    var muted = AppState.get("serialMuted");

    // Button: B<idx>:0|1
    var bMatch = line.match(/^B(\d+):(\d)$/);
    if (bMatch) {
      var bIdx = parseInt(bMatch[1]);
      var bPressed = bMatch[2] === "1";
      _handleDigitalInput("button", bIdx, bPressed, muted);
      AppState.emit("serial:input", { type: "button", index: bIdx, pressed: bPressed });
      return;
    }

    // Touch: T<idx>:0|1
    var tMatch = line.match(/^T(\d+):(\d)$/);
    if (tMatch) {
      var tIdx = parseInt(tMatch[1]);
      var tPressed = tMatch[2] === "1";
      _handleDigitalInput("touch", tIdx, tPressed, muted);
      AppState.emit("serial:input", { type: "touch", index: tIdx, pressed: tPressed });
      return;
    }

    // Analog: A<pin>:<value>
    var aMatch = line.match(/^A(\d+):([\d.]+)$/);
    if (aMatch) {
      var aPin = parseInt(aMatch[1]);
      var aVal = parseFloat(aMatch[2]);
      _handleAnalogInput("pot", aPin, aVal, muted);
      AppState.emit("serial:input", { type: "analog", pin: aPin, value: aVal });
      return;
    }

    // Accel tilt X: TX:<value>
    var txMatch = line.match(/^TX:([-\d.]+)$/);
    if (txMatch) {
      _handleSensorInput("accel_x", parseFloat(txMatch[1]), muted);
      return;
    }

    // Accel tilt Y: TY:<value>
    var tyMatch = line.match(/^TY:([-\d.]+)$/);
    if (tyMatch) {
      _handleSensorInput("accel_y", parseFloat(tyMatch[1]), muted);
      return;
    }

    // Shake: SH:<value>
    var shMatch = line.match(/^SH:([\d.]+)$/);
    if (shMatch) {
      _handleSensorInput("accel_shake", parseFloat(shMatch[1]), muted);
      return;
    }

    // ToF: TOF:<value>
    var tofMatch = line.match(/^TOF:([\d.]+)$/);
    if (tofMatch) {
      _handleSensorInput("tof", parseFloat(tofMatch[1]), muted);
      return;
    }
  }

  // --- Input routing -------------------------------------------------------

  function _handleDigitalInput(type, idx, pressed, muted) {
    // Find which key this input maps to
    var assignments = AppState.get("keyAssignments");
    for (var k = 0; k < assignments.length; k++) {
      var ka = assignments[k];
      if (ka.type === type) {
        // Count how many of this type we've seen to match idx
        var typeCount = 0;
        for (var j = 0; j < k; j++) {
          if (assignments[j].type === type) typeCount++;
        }
        if (typeCount === idx) {
          // This is the key
          var scale = AppState.get("scale");
          var octave = AppState.get("octave");
          var baseNote = octave * 12 + 24;
          var notes = SynthEngine.scaleNotes(scale, baseNote, 12);
          var midi = notes[k];

          if (pressed) {
            if (!muted) SynthEngine.noteOn(midi, k);
            serialHeldKeys[midi] = true;
          } else {
            if (!muted) SynthEngine.noteOff(midi);
            delete serialHeldKeys[midi];
          }

          // Visual feedback on keyboard
          var keyEl = document.querySelector('.key[data-index="' + k + '"]');
          if (keyEl) {
            if (pressed) keyEl.classList.add("pressed");
            else keyEl.classList.remove("pressed");
          }
          break;
        }
      }
    }
  }

  function _handleAnalogInput(source, pin, value, muted) {
    if (muted) return;
    var assignments = AppState.get("fxAssignments");
    for (var param in assignments) {
      var fa = assignments[param];
      if ((fa.source === "pot" || fa.source === "ldr") && fa.pin === pin) {
        _applyAnalogToParam(param, value);
      }
    }
  }

  function _handleSensorInput(source, value, muted) {
    if (muted) return;
    var assignments = AppState.get("fxAssignments");
    for (var param in assignments) {
      var fa = assignments[param];
      if (fa.source === source) {
        // Normalize bipolar inputs to 0-1
        var normalized = (source === "accel_x" || source === "accel_y")
          ? (value + 1.0) / 2.0
          : value;
        _applyAnalogToParam(param, normalized);
      }
    }
  }

  function _applyAnalogToParam(param, normalized) {
    // Map normalized 0-1 to the appropriate param range
    var v;
    switch (param) {
      case "filterFreq":    v = 50 + normalized * 1950; break;
      case "echoMix":       v = normalized; break;
      case "echoDelay":     v = 0.07 + normalized * 0.73; break;
      case "echoDecay":     v = normalized; break;
      case "reverbMix":     v = normalized; break;
      case "reverbRoom":    v = normalized; break;
      case "distMix":       v = normalized; break;
      case "distDrive":     v = normalized; break;
      case "vibratoDepth":  v = normalized * 0.5; break;
      case "vibratoRate":   v = normalized * 13; break;
      case "attack":        v = normalized * 1.5; break;
      case "decay":         v = 0.01 + normalized * 1.99; break;
      case "sustain":       v = normalized; break;
      case "release":       v = 0.01 + normalized * 2.99; break;
      case "volume":        v = normalized; break;
      case "droneSpeed":    SynthEngine.setDroneSpeed(normalized); return;
      default: return;
    }
    SynthEngine.setParam(param, v);
    // Emit so UI can update sliders
    AppState.emit("serial:param", { param: param, value: v, normalized: normalized });
  }

  // --- Public API ----------------------------------------------------------

  return {
    isSupported: isSupported,
    isConnected: isConnected,
    connect: connect,
    disconnect: disconnect,
  };
})();
