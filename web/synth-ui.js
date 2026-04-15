// ============================================================
// Synth UI -- Keyboard, voice selector, FX controls, loop, arp
// Now includes inline pin assignment dropdowns for each key and FX slider.
// Depends on SynthEngine, AppState
// ============================================================

var SynthUI = (function () {
  "use strict";

  var KEY_MAP = ["a","s","d","f","g","h","j","k","l",";","'","\\"];
  var NUM_KEYS = 12;
  var currentNotes = [];
  var keyHeld = {};

  // --- Voice buttons -------------------------------------------------------

  function renderVoiceButtons() {
    var container = document.getElementById("voice-buttons");
    if (!container) return;
    var html = "";
    for (var i = 0; i < SynthEngine.VOICES.length; i++) {
      var v = SynthEngine.VOICES[i];
      var cls = i === SynthEngine.getVoiceIndex() ? " active" : "";
      html += '<button class="voice-btn' + cls + '" data-voice="' + i + '" '
            + 'style="--voice-color:' + v.color + '">'
            + v.name + '</button>';
    }
    container.innerHTML = html;

    var btns = container.querySelectorAll(".voice-btn");
    for (var j = 0; j < btns.length; j++) {
      btns[j].addEventListener("click", function () {
        var idx = parseInt(this.getAttribute("data-voice"));
        selectVoice(idx);
      });
    }
  }

  function selectVoice(index) {
    var newIdx = SynthEngine.setVoice(index);
    AppState.set("voiceIndex", newIdx);
    var btns = document.querySelectorAll(".voice-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", i === newIdx);
    }
    syncSlidersFromEngine();
    renderKeyboard();
  }

  // --- Keyboard rendering with inline pin assignments ----------------------

  function updateNotes() {
    var scale = AppState.get("scale");
    var octave = AppState.get("octave");
    var baseNote = octave * 12 + 24;
    currentNotes = SynthEngine.scaleNotes(scale, baseNote, NUM_KEYS);
  }

  function _buildKeyAssignSelect(keyIdx) {
    var ka = AppState.get("keyAssignments")[keyIdx];
    var type = ka ? ka.type : "none";
    var pin = ka ? ka.pin : 0;

    var html = '<div class="key-assign">';
    html += '<select class="key-assign-type" data-key="' + keyIdx + '">';
    html += '<option value="none"' + (type === "none" ? " selected" : "") + '>None</option>';
    html += '<option value="button"' + (type === "button" ? " selected" : "") + '>Button</option>';
    html += '<option value="touch"' + (type === "touch" ? " selected" : "") + '>Touch</option>';
    html += '</select>';

    if (type !== "none") {
      html += '<select class="key-assign-pin" data-key="' + keyIdx + '">';
      var pins = AppState.DIGITAL_PINS;
      for (var i = 0; i < pins.length; i++) {
        var sel = pins[i] === pin ? " selected" : "";
        html += '<option value="' + pins[i] + '"' + sel + '>GP' + pins[i] + '</option>';
      }
      html += '</select>';
    }
    html += '</div>';
    return html;
  }

  function renderKeyboard() {
    updateNotes();
    var container = document.getElementById("keyboard");
    if (!container) return;
    var isDrum = SynthEngine.isDrumKit();
    var drumLabels = isDrum ? SynthEngine.getDrumKeyLabels(NUM_KEYS) : null;
    var html = "";
    for (var i = 0; i < NUM_KEYS; i++) {
      var midi = currentNotes[i];
      var topLabel = isDrum ? drumLabels[i] : SynthEngine.midiToNoteName(midi);
      var keyLabel = KEY_MAP[i] ? KEY_MAP[i].toUpperCase() : "";
      html += '<div class="key-column">';
      html += '<button class="key" data-index="' + i + '" data-midi="' + midi + '">'
            + '<span class="key-note">' + topLabel + '</span>'
            + '<span class="key-bind">' + keyLabel + '</span>'
            + '</button>';
      html += _buildKeyAssignSelect(i);
      html += '</div>';
    }
    container.innerHTML = html;
    bindKeyboardClicks();
    bindKeyAssignments();
  }

  function bindKeyboardClicks() {
    var keys = document.querySelectorAll(".key");
    for (var i = 0; i < keys.length; i++) {
      (function(el) {
        el.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          var midi = parseInt(el.getAttribute("data-midi"));
          var idx = parseInt(el.getAttribute("data-index"));
          SynthEngine.noteOn(midi, idx);
          el.classList.add("pressed");
        });
        // iOS Safari grants user-activation on pointerup/touchend, not
        // pointerdown. If this is the first interaction and the context
        // was still suspended during pointerdown, unlock now and replay.
        el.addEventListener("pointerup", function (e) {
          e.preventDefault();
          var midi = parseInt(el.getAttribute("data-midi"));
          if (SynthEngine.needsUnlock()) {
            var idx = parseInt(el.getAttribute("data-index"));
            SynthEngine.unlockAudio();
            SynthEngine.noteOff(midi);
            SynthEngine.noteOn(midi, idx);
            setTimeout(function () {
              SynthEngine.noteOff(midi);
              el.classList.remove("pressed");
            }, 200);
          } else {
            SynthEngine.noteOff(midi);
            el.classList.remove("pressed");
          }
        });
        el.addEventListener("pointerleave", function (e) {
          var midi = parseInt(el.getAttribute("data-midi"));
          SynthEngine.noteOff(midi);
          el.classList.remove("pressed");
        });
      })(keys[i]);
    }
  }

  function bindKeyAssignments() {
    // Type selector
    document.querySelectorAll(".key-assign-type").forEach(function (el) {
      el.addEventListener("change", function () {
        var keyIdx = parseInt(this.dataset.key);
        var type = this.value;
        var pin = type === "none" ? 0 : AppState.nextAvailableDigitalPin();
        AppState.setKeyAssignment(keyIdx, type, pin);
        renderKeyboard(); // re-render to show/hide pin select
      });
    });
    // Pin selector
    document.querySelectorAll(".key-assign-pin").forEach(function (el) {
      el.addEventListener("change", function () {
        var keyIdx = parseInt(this.dataset.key);
        var pin = parseInt(this.value);
        var ka = AppState.get("keyAssignments")[keyIdx];
        AppState.setKeyAssignment(keyIdx, ka.type, pin);
      });
    });
  }

  // --- Computer keyboard input ---------------------------------------------

  function _isTextInput(el) {
    var tag = el.tagName;
    if (tag === "TEXTAREA") return true;
    if (tag === "SELECT") return true;
    if (tag === "INPUT") {
      var type = (el.type || "").toLowerCase();
      if (type === "range") return false;
      return true;
    }
    return false;
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    if (_isTextInput(e.target)) return;

    if (e.code === "Space") {
      e.preventDefault();
      var newIdx = SynthEngine.nextVoice();
      AppState.set("voiceIndex", newIdx);
      var btns = document.querySelectorAll(".voice-btn");
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle("active", i === newIdx);
      }
      syncSlidersFromEngine();
      renderKeyboard();
      return;
    }

    var key = e.key.toLowerCase();
    var idx = KEY_MAP.indexOf(key);
    if (idx < 0 || idx >= currentNotes.length) return;
    if (keyHeld[key]) return;

    e.preventDefault();
    keyHeld[key] = true;
    var midi = currentNotes[idx];
    SynthEngine.noteOn(midi, idx);

    var el = document.querySelector('.key[data-index="' + idx + '"]');
    if (el) el.classList.add("pressed");
  }

  function onKeyUp(e) {
    if (_isTextInput(e.target)) return;

    var key = e.key.toLowerCase();
    var idx = KEY_MAP.indexOf(key);
    if (idx < 0 || idx >= currentNotes.length) return;

    keyHeld[key] = false;
    var midi = currentNotes[idx];
    SynthEngine.noteOff(midi);

    var el = document.querySelector('.key[data-index="' + idx + '"]');
    if (el) el.classList.remove("pressed");
  }

  // --- FX slider binding with inline analog assignment dropdowns ------------

  var SLIDER_MAP = [
    { id: "fx-filter-freq",  param: "filterFreq",    display: "val-filter-freq",  fmt: function(v){return Math.round(v);} },
    { id: "fx-echo-mix",     param: "echoMix",        display: "val-echo-mix",     fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-echo-delay",   param: "echoDelay",      display: "val-echo-delay",   fmt: function(v){return Math.round(v);},        scale:0.001 },
    { id: "fx-echo-decay",   param: "echoDecay",      display: "val-echo-decay",   fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-reverb-mix",   param: "reverbMix",      display: "val-reverb-mix",   fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-reverb-room",  param: "reverbRoom",     display: "val-reverb-room",  fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-dist-mix",     param: "distMix",        display: "val-dist-mix",     fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-dist-drive",   param: "distDrive",      display: "val-dist-drive",   fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-vib-depth",    param: "vibratoDepth",    display: "val-vib-depth",    fmt: function(v){return Math.round(v)+"%";},   scale:0.50 },
    { id: "fx-vib-rate",     param: "vibratoRate",     display: "val-vib-rate",     fmt: function(v){return parseFloat(v).toFixed(1);} },
    { id: "fx-attack",       param: "attack",          display: "val-attack",       fmt: function(v){return (v/1000).toFixed(2);}, scale:0.001 },
    { id: "fx-release",      param: "release",         display: "val-release",      fmt: function(v){return (v/1000).toFixed(2);}, scale:0.001 },
    { id: "fx-volume",       param: "volume",          display: "val-volume",       fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
  ];

  function renderFxAssignDropdowns() {
    // For each FX slider, insert an assignment dropdown after the slider label
    for (var i = 0; i < SLIDER_MAP.length; i++) {
      var s = SLIDER_MAP[i];
      var container = document.getElementById(s.id + "-assign");
      if (!container) continue;

      var fa = AppState.get("fxAssignments")[s.param] || { source: "none", pin: null };
      var sources = AppState.ANALOG_SOURCES;

      var html = '<select class="fx-assign-source" data-param="' + s.param + '">';
      for (var j = 0; j < sources.length; j++) {
        var src = sources[j];
        var sel = src.value === fa.source ? " selected" : "";
        html += '<option value="' + src.value + '"' + sel + '>' + src.label + '</option>';
      }
      html += '</select>';

      if (fa.source === "pot" || fa.source === "ldr") {
        html += ' <select class="fx-assign-pin" data-param="' + s.param + '">';
        var adcPins = AppState.ADC_PINS;
        for (var p = 0; p < adcPins.length; p++) {
          var psel = adcPins[p] === fa.pin ? " selected" : "";
          html += '<option value="' + adcPins[p] + '"' + psel + '>GP' + adcPins[p] + '</option>';
        }
        html += '</select>';
      }

      container.innerHTML = html;
    }
    _bindFxAssignEvents();
  }

  function _bindFxAssignEvents() {
    document.querySelectorAll(".fx-assign-source").forEach(function (el) {
      el.addEventListener("change", function () {
        var param = this.dataset.param;
        var source = this.value;
        var needsPin = false;
        for (var i = 0; i < AppState.ANALOG_SOURCES.length; i++) {
          if (AppState.ANALOG_SOURCES[i].value === source) {
            needsPin = AppState.ANALOG_SOURCES[i].needsPin;
            break;
          }
        }
        var pin = needsPin ? AppState.nextAvailableADCPin() : null;
        AppState.setFxAssignment(param, source, pin);
        renderFxAssignDropdowns();
      });
    });
    document.querySelectorAll(".fx-assign-pin").forEach(function (el) {
      el.addEventListener("change", function () {
        var param = this.dataset.param;
        var pin = parseInt(this.value);
        var fa = AppState.get("fxAssignments")[param];
        AppState.setFxAssignment(param, fa.source, pin);
      });
    });
  }

  function bindFXSliders() {
    for (var i = 0; i < SLIDER_MAP.length; i++) {
      (function(s) {
        var el = document.getElementById(s.id);
        if (!el) return;
        el.addEventListener("input", function () {
          var raw = parseFloat(el.value);
          var val = s.scale ? raw * s.scale : raw;
          SynthEngine.setParam(s.param, val);
          var disp = document.getElementById(s.display);
          if (disp) disp.textContent = s.fmt(raw);
        });
      })(SLIDER_MAP[i]);
    }
  }

  function syncSlidersFromEngine() {
    var fs = SynthEngine.fxState;
    var sliderVals = {
      "fx-filter-freq": fs.filterFreq,
      "fx-echo-mix": fs.echoMix * 100,
      "fx-echo-delay": fs.echoDelay * 1000,
      "fx-echo-decay": fs.echoDecay * 100,
      "fx-reverb-mix": fs.reverbMix * 100,
      "fx-reverb-room": (fs.reverbRoom || 0.5) * 100,
      "fx-dist-mix": fs.distMix * 100,
      "fx-dist-drive": fs.distDrive * 100,
      "fx-vib-depth": fs.vibratoDepth / 0.50 * 100,
      "fx-vib-rate": fs.vibratoRate,
      "fx-attack": fs.attack * 1000,
      "fx-release": fs.release * 1000,
      "fx-volume": fs.volume * 100,
    };

    for (var i = 0; i < SLIDER_MAP.length; i++) {
      var s = SLIDER_MAP[i];
      var el = document.getElementById(s.id);
      if (!el) continue;
      var rawVal = sliderVals[s.id];
      if (rawVal !== undefined) {
        el.value = rawVal;
        var disp = document.getElementById(s.display);
        if (disp) disp.textContent = s.fmt(rawVal);
      }
    }
  }

  // --- Scale/octave controls -----------------------------------------------

  function renderScaleOptions() {
    var sel = document.getElementById("play-scale");
    if (!sel) return;
    sel.innerHTML = "";
    var bases = SynthEngine.SCALE_BASES;
    var currentBase = AppState.get("scaleBase");
    for (var i = 0; i < bases.length; i++) {
      var opt = document.createElement("option");
      opt.value = bases[i].key;
      opt.textContent = bases[i].label;
      if (bases[i].key === currentBase) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function _updateTonalityButton() {
    var btn = document.getElementById("btn-tonality");
    if (!btn) return;
    var tonality = AppState.get("tonality");
    var baseKey = AppState.get("scaleBase");
    var hasPair = SynthEngine.scaleHasPair(baseKey);
    btn.textContent = tonality === "minor" ? "Minor" : "Major";
    btn.classList.toggle("active", tonality === "minor");
    btn.disabled = !hasPair;
    btn.classList.toggle("disabled", !hasPair);
  }

  function bindScaleOctave() {
    var scaleSel = document.getElementById("play-scale");
    if (scaleSel) {
      scaleSel.addEventListener("change", function () {
        AppState.set("scaleBase", this.value);
        _updateTonalityButton();
        SynthEngine.allNotesOff();
        renderKeyboard();
        if (SynthEngine.isArpActive()) {
          SynthEngine.stopArp();
          var octave = AppState.get("octave");
          SynthEngine.startArp(AppState.get("scale"), octave * 12 + 24);
        }
      });
    }

    var tonalityBtn = document.getElementById("btn-tonality");
    if (tonalityBtn) {
      tonalityBtn.addEventListener("click", function () {
        var current = AppState.get("tonality");
        var next = current === "major" ? "minor" : "major";
        AppState.set("tonality", next);
        _updateTonalityButton();
        SynthEngine.allNotesOff();
        renderKeyboard();
        if (SynthEngine.isArpActive()) {
          SynthEngine.stopArp();
          var octave = AppState.get("octave");
          SynthEngine.startArp(AppState.get("scale"), octave * 12 + 24);
        }
      });
      _updateTonalityButton();
    }

    var octSlider = document.getElementById("play-octave");
    var octVal = document.getElementById("play-octave-val");
    if (octSlider) {
      octSlider.addEventListener("input", function () {
        var octave = parseInt(this.value);
        AppState.set("octave", octave);
        if (octVal) octVal.textContent = octave;
        SynthEngine.allNotesOff();
        renderKeyboard();
        if (SynthEngine.isArpActive()) {
          SynthEngine.stopArp();
          SynthEngine.startArp(AppState.get("scale"), octave * 12 + 24);
        }
      });
    }
  }

  // --- Loop controls -------------------------------------------------------

  function bindLoopControls() {
    var loopBtn = document.getElementById("btn-loop");
    if (!loopBtn) return;

    loopBtn.addEventListener("click", function () {
      if (SynthEngine.isLoopRecording()) {
        SynthEngine.stopLoopRecording();
        SynthEngine.startLoopPlayback();
        loopBtn.textContent = "Stop Loop";
        loopBtn.classList.add("active");
      } else if (SynthEngine.isLoopPlaying()) {
        SynthEngine.stopLoopPlayback();
        loopBtn.textContent = "Record Loop";
        loopBtn.classList.remove("active");
      } else {
        SynthEngine.startLoopRecording();
        loopBtn.textContent = "Recording...";
        loopBtn.classList.add("recording");
        setTimeout(function() {
          if (SynthEngine.isLoopRecording()) {
            SynthEngine.stopLoopRecording();
            if (SynthEngine.hasLoop()) {
              SynthEngine.startLoopPlayback();
              loopBtn.textContent = "Stop Loop";
              loopBtn.classList.remove("recording");
              loopBtn.classList.add("active");
            } else {
              loopBtn.textContent = "Record Loop";
              loopBtn.classList.remove("recording");
            }
          }
        }, 30000);
      }
    });
  }

  // --- Arpeggiator controls -------------------------------------------------

  function bindArpControls() {
    var arpBtn = document.getElementById("btn-arp");
    if (!arpBtn) return;

    arpBtn.addEventListener("click", function () {
      if (SynthEngine.isArpActive()) {
        SynthEngine.stopArp();
        arpBtn.textContent = "Start Arp";
        arpBtn.classList.remove("active");
      } else {
        var octave = AppState.get("octave");
        var scale = AppState.get("scale");
        SynthEngine.startArp(scale, octave * 12 + 24);
        arpBtn.textContent = "Stop Arp";
        arpBtn.classList.add("active");
      }
    });

    var modeBtn = document.getElementById("btn-arp-mode");
    if (modeBtn) {
      modeBtn.addEventListener("click", function () {
        var newMode = SynthEngine.nextArpMode();
        modeBtn.textContent = "Arp: " + (SynthEngine.ARP_MODE_LABELS[newMode] || newMode);
        if (SynthEngine.isArpActive()) {
          SynthEngine.stopArp();
          var octave = AppState.get("octave");
          var scale = AppState.get("scale");
          SynthEngine.startArp(scale, octave * 12 + 24);
          var ab = document.getElementById("btn-arp");
          if (ab) { ab.textContent = "Stop Arp"; ab.classList.add("active"); }
        }
      });
    }

    var speedSlider = document.getElementById("arp-speed");
    var speedVal = document.getElementById("arp-speed-val");
    if (speedSlider) {
      speedSlider.addEventListener("input", function () {
        var v = parseFloat(this.value) / 100;
        SynthEngine.setArpSpeed(v);
        if (speedVal) speedVal.textContent = Math.round(v * 100) + "%";
      });
    }
  }

  // --- Serial controls -----------------------------------------------------

  function bindSerialControls() {
    var connectBtn = document.getElementById("btn-serial");
    var muteBtn = document.getElementById("btn-serial-mute");
    if (!connectBtn) return;

    connectBtn.addEventListener("click", function () {
      if (SerialBridge.isConnected()) {
        SerialBridge.disconnect();
      } else {
        SerialBridge.connect();
      }
    });

    if (muteBtn) {
      muteBtn.addEventListener("click", function () {
        var muted = !AppState.get("serialMuted");
        AppState.set("serialMuted", muted);
        muteBtn.textContent = muted ? "Unmute Pico" : "Mute Pico";
        muteBtn.classList.toggle("active", muted);
      });
    }

    // Update button state on serial change
    AppState.on("change:serialConnected", function (connected) {
      connectBtn.textContent = connected ? "Disconnect Pico" : "Connect Pico";
      connectBtn.classList.toggle("active", connected);
      if (muteBtn) muteBtn.style.display = connected ? "" : "none";
    });
  }

  // --- Init ----------------------------------------------------------------

  function init() {
    renderVoiceButtons();
    renderScaleOptions();
    renderKeyboard();
    bindFXSliders();
    renderFxAssignDropdowns();
    bindScaleOctave();
    bindLoopControls();
    bindArpControls();
    bindSerialControls();

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // Listen for serial param updates to sync sliders visually
    AppState.on("serial:param", function (data) {
      // Find slider for this param and update
      for (var i = 0; i < SLIDER_MAP.length; i++) {
        var s = SLIDER_MAP[i];
        if (s.param === data.param) {
          var el = document.getElementById(s.id);
          if (el) {
            // Convert param value back to slider raw value
            var raw = s.scale ? data.value / s.scale : data.value;
            // Some params need special handling
            if (s.param === "filterFreq") raw = data.value;
            el.value = raw;
            var disp = document.getElementById(s.display);
            if (disp) disp.textContent = s.fmt(raw);
          }
          break;
        }
      }
    });
  }

  return {
    init: init,
    renderVoiceButtons: renderVoiceButtons,
    renderKeyboard: renderKeyboard,
    renderFxAssignDropdowns: renderFxAssignDropdowns,
    syncSlidersFromEngine: syncSlidersFromEngine,
    selectVoice: selectVoice,
  };
})();
