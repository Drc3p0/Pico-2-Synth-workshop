// ============================================================
// Synth UI -- Keyboard, voice selector, FX controls, loop, drone
// Depends on SynthEngine (synth-engine.js)
// ============================================================

var SynthUI = (function () {
  "use strict";

  var KEY_MAP = ["a","s","d","f","g","h","j","k","l",";","'","\\"];
  var NUM_KEYS = 12;
  var currentScale = "pentatonic";
  var currentOctave = 3;
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
    var btns = document.querySelectorAll(".voice-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", i === newIdx);
    }
    syncSlidersFromEngine();
  }

  // --- Keyboard rendering --------------------------------------------------

  function updateNotes() {
    var baseNote = currentOctave * 12 + 24;
    currentNotes = SynthEngine.scaleNotes(currentScale, baseNote, NUM_KEYS);
  }

  function renderKeyboard() {
    updateNotes();
    var container = document.getElementById("keyboard");
    if (!container) return;
    var html = "";
    for (var i = 0; i < NUM_KEYS; i++) {
      var midi = currentNotes[i];
      var noteName = SynthEngine.midiToNoteName(midi);
      var keyLabel = KEY_MAP[i] ? KEY_MAP[i].toUpperCase() : "";
      html += '<button class="key" data-index="' + i + '" data-midi="' + midi + '">'
            + '<span class="key-note">' + noteName + '</span>'
            + '<span class="key-bind">' + keyLabel + '</span>'
            + '</button>';
    }
    container.innerHTML = html;
    bindKeyboardClicks();
  }

  function bindKeyboardClicks() {
    var keys = document.querySelectorAll(".key");
    for (var i = 0; i < keys.length; i++) {
      (function(el) {
        el.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          var midi = parseInt(el.getAttribute("data-midi"));
          SynthEngine.noteOn(midi);
          el.classList.add("pressed");
        });
        el.addEventListener("pointerup", function (e) {
          e.preventDefault();
          var midi = parseInt(el.getAttribute("data-midi"));
          SynthEngine.noteOff(midi);
          el.classList.remove("pressed");
        });
        el.addEventListener("pointerleave", function (e) {
          var midi = parseInt(el.getAttribute("data-midi"));
          SynthEngine.noteOff(midi);
          el.classList.remove("pressed");
        });
      })(keys[i]);
    }
  }

  // --- Computer keyboard input ---------------------------------------------
  // FIX: Only block keyboard events for text-entry inputs, NOT sliders

  function _isTextInput(el) {
    var tag = el.tagName;
    if (tag === "TEXTAREA") return true;
    if (tag === "SELECT") return true;
    if (tag === "INPUT") {
      var type = (el.type || "").toLowerCase();
      // Allow keyboard events while interacting with range sliders
      if (type === "range") return false;
      return true; // block for text, number, etc.
    }
    return false;
  }

  function onKeyDown(e) {
    if (e.repeat) return;
    if (_isTextInput(e.target)) return;

    // Space = next voice
    if (e.code === "Space") {
      e.preventDefault();
      var newIdx = SynthEngine.nextVoice();
      var btns = document.querySelectorAll(".voice-btn");
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle("active", i === newIdx);
      }
      syncSlidersFromEngine();
      return;
    }

    var key = e.key.toLowerCase();
    var idx = KEY_MAP.indexOf(key);
    if (idx < 0 || idx >= currentNotes.length) return;
    if (keyHeld[key]) return;

    e.preventDefault();
    keyHeld[key] = true;
    var midi = currentNotes[idx];
    SynthEngine.noteOn(midi);

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

  // --- FX slider binding ---------------------------------------------------

  var SLIDER_MAP = [
    { id: "fx-filter-freq",  param: "filterFreq",  display: "val-filter-freq",  fmt: function(v){return Math.round(v);} },
    { id: "fx-filter-q",     param: "filterQ",      display: "val-filter-q",     fmt: function(v){return parseFloat(v).toFixed(1);} },
    { id: "fx-echo-mix",     param: "echoMix",      display: "val-echo-mix",     fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-echo-delay",   param: "echoDelay",    display: "val-echo-delay",   fmt: function(v){return Math.round(v);},        scale:0.001 },
    { id: "fx-echo-decay",   param: "echoDecay",    display: "val-echo-decay",   fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-reverb-mix",   param: "reverbMix",    display: "val-reverb-mix",   fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-reverb-room",  param: "reverbRoom",   display: "val-reverb-room",  fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-dist-mix",     param: "distMix",      display: "val-dist-mix",     fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-dist-drive",   param: "distDrive",    display: "val-dist-drive",   fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-vib-depth",    param: "vibratoDepth",  display: "val-vib-depth",    fmt: function(v){return Math.round(v)+"%";},   scale:0.15 },
    { id: "fx-vib-rate",     param: "vibratoRate",   display: "val-vib-rate",     fmt: function(v){return parseFloat(v).toFixed(1);} },
    { id: "fx-attack",       param: "attack",        display: "val-attack",       fmt: function(v){return (v/1000).toFixed(2);}, scale:0.001 },
    { id: "fx-decay",        param: "decay",         display: "val-decay",        fmt: function(v){return Math.round(v);},       scale:0.001 },
    { id: "fx-sustain",      param: "sustain",       display: "val-sustain",      fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
    { id: "fx-release",      param: "release",       display: "val-release",      fmt: function(v){return (v/1000).toFixed(2);}, scale:0.001 },
    { id: "fx-volume",       param: "volume",        display: "val-volume",       fmt: function(v){return Math.round(v)+"%";},   scale:0.01 },
  ];

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
      "fx-filter-q": fs.filterQ,
      "fx-echo-mix": fs.echoMix * 100,
      "fx-echo-delay": fs.echoDelay * 1000,
      "fx-echo-decay": fs.echoDecay * 100,
      "fx-reverb-mix": fs.reverbMix * 100,
      "fx-reverb-room": (fs.reverbRoom || 0.5) * 100,
      "fx-dist-mix": fs.distMix * 100,
      "fx-dist-drive": fs.distDrive * 100,
      "fx-vib-depth": fs.vibratoDepth / 0.15 * 100,
      "fx-vib-rate": fs.vibratoRate,
      "fx-attack": fs.attack * 1000,
      "fx-decay": fs.decay * 1000,
      "fx-sustain": fs.sustain * 100,
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
    var labels = SynthEngine.SCALE_LABELS;
    for (var key in labels) {
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = labels[key];
      if (key === currentScale) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function bindScaleOctave() {
    var scaleSel = document.getElementById("play-scale");
    if (scaleSel) {
      scaleSel.addEventListener("change", function () {
        currentScale = this.value;
        SynthEngine.allNotesOff();
        renderKeyboard();
        // Update drone if active
        if (SynthEngine.isDroneActive()) {
          SynthEngine.stopDrone();
          SynthEngine.startDrone(currentScale, currentOctave * 12 + 24);
        }
      });
    }

    var octSlider = document.getElementById("play-octave");
    var octVal = document.getElementById("play-octave-val");
    if (octSlider) {
      octSlider.addEventListener("input", function () {
        currentOctave = parseInt(this.value);
        if (octVal) octVal.textContent = currentOctave;
        SynthEngine.allNotesOff();
        renderKeyboard();
        if (SynthEngine.isDroneActive()) {
          SynthEngine.stopDrone();
          SynthEngine.startDrone(currentScale, currentOctave * 12 + 24);
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
        // Stop recording, start playback
        SynthEngine.stopLoopRecording();
        SynthEngine.startLoopPlayback();
        loopBtn.textContent = "Stop Loop";
        loopBtn.classList.add("active");
      } else if (SynthEngine.isLoopPlaying()) {
        // Stop playback
        SynthEngine.stopLoopPlayback();
        loopBtn.textContent = "Record Loop";
        loopBtn.classList.remove("active");
      } else {
        // Start recording
        SynthEngine.startLoopRecording();
        loopBtn.textContent = "Recording...";
        loopBtn.classList.add("recording");
        // Auto-stop after timeout for safety
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
        }, 30000); // 30 second max
      }
    });
  }

  // --- Drone controls ------------------------------------------------------

  function bindDroneControls() {
    var droneBtn = document.getElementById("btn-drone");
    if (!droneBtn) return;

    droneBtn.addEventListener("click", function () {
      if (SynthEngine.isDroneActive()) {
        SynthEngine.stopDrone();
        droneBtn.textContent = "Start Drone";
        droneBtn.classList.remove("active");
      } else {
        var baseNote = currentOctave * 12 + 24;
        SynthEngine.startDrone(currentScale, baseNote);
        droneBtn.textContent = "Stop Drone";
        droneBtn.classList.add("active");
      }
    });
  }

  // --- Init ----------------------------------------------------------------

  function init() {
    renderVoiceButtons();
    renderScaleOptions();
    renderKeyboard();
    bindFXSliders();
    bindScaleOctave();
    bindLoopControls();
    bindDroneControls();

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
  }

  return {
    init: init,
    renderVoiceButtons: renderVoiceButtons,
    renderKeyboard: renderKeyboard,
    syncSlidersFromEngine: syncSlidersFromEngine,
    selectVoice: selectVoice,
    getCurrentScale: function() { return currentScale; },
    getCurrentOctave: function() { return currentOctave; },
  };
})();
