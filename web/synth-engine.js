// ============================================================
// Web Audio Synth Engine
// Mirrors the Pico 2 firmware voices and FX chain in the browser.
// No dependencies.
// ============================================================

var SynthEngine = (function () {
  "use strict";

  var NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  // Scales organized as base scales, each with optional major/minor variants.
  // The Major/Minor toggle switches between variants for scales that have pairs.
  // Scales without a pair ignore the toggle (button dims).

  var SCALES = {
    pentatonic_major:  [0,2,4,7,9],
    pentatonic_minor:  [0,3,5,7,10],
    blues_major:       [0,2,3,5,6,9],
    blues_minor:       [0,3,5,6,7,10],
    harmonic_major:    [0,2,4,5,7,9,11],
    harmonic_minor:    [0,2,3,5,7,8,11],
    hungarian_major:   [0,3,4,6,7,9,10],
    hungarian_minor:   [0,2,3,6,7,8,11],
    chromatic:         [0,1,2,3,4,5,6,7,8,9,10,11],
    dorian:            [0,2,3,5,7,9,10],
    egyptian:          [0,2,5,7,10],
    japanese:          [0,1,5,7,8],
    whole_tone:        [0,2,4,6,8,10],
  };

  // Base scale names shown in the dropdown
  var SCALE_BASES = [
    { key: "pentatonic", label: "Pentatonic", hasPair: true },
    { key: "blues",      label: "Blues",       hasPair: true },
    { key: "harmonic",   label: "Harmonic",    hasPair: true },
    { key: "hungarian",  label: "Hungarian",   hasPair: true },
    { key: "chromatic",  label: "Chromatic",   hasPair: false },
    { key: "dorian",     label: "Dorian",      hasPair: false },
    { key: "egyptian",   label: "Egyptian",    hasPair: false },
    { key: "japanese",   label: "Japanese",    hasPair: false },
    { key: "whole_tone", label: "Whole Tone",  hasPair: false },
  ];

  // Resolve a base key + tonality ("major"/"minor") to a SCALES key
  function resolveScaleKey(baseKey, tonality) {
    // For paired scales, append _major or _minor
    for (var i = 0; i < SCALE_BASES.length; i++) {
      if (SCALE_BASES[i].key === baseKey) {
        if (SCALE_BASES[i].hasPair) {
          var full = baseKey + "_" + tonality;
          if (SCALES[full]) return full;
        }
        // Unpaired: try the base key directly
        if (SCALES[baseKey]) return baseKey;
        // Fallback: try with _major
        if (SCALES[baseKey + "_major"]) return baseKey + "_major";
        return baseKey;
      }
    }
    return baseKey;
  }

  function scaleHasPair(baseKey) {
    for (var i = 0; i < SCALE_BASES.length; i++) {
      if (SCALE_BASES[i].key === baseKey) return SCALE_BASES[i].hasPair;
    }
    return false;
  }

  // --- Waveform generation (PeriodicWave partials) -------------------------

  function makeSinePartials()       { return { real: [0,0], imag: [0,1] }; }
  function makeSquarePartials(n)    { var r=[0],im=[0]; for(var k=1;k<=n;k++){r.push(0);im.push(k%2?1/k:0);} return{real:r,imag:im}; }

  function makePianoPartials() {
    return { real: [0,0,0,0,0,0,0,0], imag: [0, 1.0, 0.6, 0.35, 0.20, 0.10, 0.06, 0.03] };
  }

  function makeSynthLeadPartials() {
    var n = 16; var r = [0], im = [0];
    for (var k = 1; k <= n; k++) {
      r.push(0);
      var saw = 1/k * (k%2?1:-1) * -1;
      var sq  = k%2 ? 0.4/k : 0;
      im.push(saw * 0.55 + sq * 0.45);
    }
    return { real: r, imag: im };
  }

  function makePadPartials() {
    return { real: [0,0,0,0,0,0,0], imag: [0, 0.65, 0.20, 0, 0.10, 0, 0.05] };
  }

  function makeSuperSawPartials() {
    var n = 20; var r = [0], im = [0];
    for (var k = 1; k <= n; k++) {
      r.push(0);
      var base = 1/k * (k%2?1:-1) * -1;
      im.push(base * 1.2);
    }
    return { real: r, imag: im };
  }

  function makeReeseBassPartials() {
    var n = 20; var r = [0], im = [0];
    for (var k = 1; k <= n; k++) {
      r.push(0);
      var saw1 = 1/k * (k%2?1:-1) * -1;
      var saw2 = 1/k * (k%2?1:-1) * -1 * 0.8;
      im.push((saw1 + saw2) * 0.5);
    }
    return { real: r, imag: im };
  }

  function makeNoisePartials() {
    // Chaotic noise: dense inharmonic partials with pseudo-random phases/amps
    var r = [0], im = [0];
    for (var k = 1; k <= 47; k++) {
      r.push(Math.sin(k * 3.731 + Math.sin(k * 1.618) * 2.0) * 0.3 / Math.sqrt(k));
      im.push((0.6 / Math.sqrt(k)) * (Math.sin(k * 7.919) * 0.7 + 0.3));
    }
    return { real: r, imag: im };
  }

  // Drone: strong sub-octave and 5th undertones for bass foundation
  function makeDronePartials() {
    return { real: [0,0,0,0,0,0,0,0,0,0,0], imag: [0, 1.0, 0.85, 0.7, 0.4, 0.15, 0.55, 0.08, 0.25, 0.04, 0.12] };
  }

  function makeBitcrushPartials() {
    var r = [0], im = [0];
    for (var k = 1; k <= 24; k++) {
      r.push(0);
      im.push(k % 2 ? 0.8/k : 0.4/k);
    }
    return { real: r, imag: im };
  }

  function makeVoxPartials() {
    return { real: [0,0,0,0,0,0,0,0,0,0], imag: [0, 0.8, 0.3, 0.6, 0.9, 0.4, 0.2, 0.5, 0.1, 0.3] };
  }

  // --- Drum kit partials (one per drum type) --------------------------------

  function makeKickPartials() {
    return { real: [0,0,0,0], imag: [0, 1.0, 0.4, 0.1] };
  }

  function makeSnarePartials() {
    var r = [0], im = [0];
    for (var k = 1; k <= 24; k++) {
      r.push(0);
      var noise = Math.sin(k * 3.14159 * 0.7) * 0.3 + 0.2;
      im.push(k === 1 ? 0.5 : noise / Math.sqrt(k));
    }
    return { real: r, imag: im };
  }

  function makeHiHatPartials() {
    var r = [0], im = [0];
    for (var k = 1; k <= 32; k++) {
      r.push(0);
      im.push(k < 4 ? 0.05 : (0.3 / Math.sqrt(k)) * (Math.sin(k * 1.7) * 0.5 + 0.5));
    }
    return { real: r, imag: im };
  }

  function makeClapPartials() {
    var r = [0], im = [0];
    for (var k = 1; k <= 20; k++) {
      r.push(0);
      im.push(k < 3 ? 0.2 : (0.5 / k) * (1 + Math.sin(k * 2.3) * 0.6));
    }
    return { real: r, imag: im };
  }

  function makeTomPartials() {
    return { real: [0,0,0,0,0], imag: [0, 1.0, 0.55, 0.2, 0.05] };
  }

  function makeRimPartials() {
    var r = [0], im = [0];
    for (var k = 1; k <= 16; k++) {
      r.push(0);
      var amp = 0.4 / (k * 0.7);
      if (k % 3 === 0) amp *= 1.8;
      im.push(amp);
    }
    return { real: r, imag: im };
  }

  function makeCowbellPartials() {
    return { real: [0,0,0,0,0,0,0], imag: [0, 0.3, 0.1, 0.8, 0.05, 0.6, 0.02] };
  }

  function makeShakerPartials() {
    var r = [0], im = [0];
    for (var k = 1; k <= 32; k++) {
      r.push(0);
      im.push(k < 6 ? 0.02 : (0.25 / Math.sqrt(k)));
    }
    return { real: r, imag: im };
  }

  // Drum kit definition: each key gets a different drum
  // The Drums voice uses per-key wave/envelope overrides
  var DRUM_KIT = [
    { name: "Kick",    partials: makeKickPartials,    attack: 0.0, decay: 0.12, sustain: 0.0, release: 0.08, filterFreq: 400,  detune: 0, baseNote: 36 },
    { name: "Snare",   partials: makeSnarePartials,   attack: 0.0, decay: 0.08, sustain: 0.0, release: 0.06, filterFreq: 3500, detune: 0, baseNote: 38 },
    { name: "Hi-Hat",  partials: makeHiHatPartials,   attack: 0.0, decay: 0.04, sustain: 0.0, release: 0.03, filterFreq: 2000, detune: 0, baseNote: 42 },
    { name: "Clap",    partials: makeClapPartials,     attack: 0.0, decay: 0.10, sustain: 0.0, release: 0.08, filterFreq: 2000, detune: 0, baseNote: 39 },
    { name: "Tom",     partials: makeTomPartials,      attack: 0.0, decay: 0.15, sustain: 0.0, release: 0.10, filterFreq: 800,  detune: 0, baseNote: 45 },
    { name: "Rim",     partials: makeRimPartials,      attack: 0.0, decay: 0.05, sustain: 0.0, release: 0.04, filterFreq: 2000, detune: 0, baseNote: 37 },
    { name: "Cowbell", partials: makeCowbellPartials,  attack: 0.0, decay: 0.20, sustain: 0.0, release: 0.15, filterFreq: 2000, detune: 0, baseNote: 56 },
    { name: "Shaker",  partials: makeShakerPartials,   attack: 0.0, decay: 0.06, sustain: 0.0, release: 0.04, filterFreq: 2000, detune: 0, baseNote: 70 },
    { name: "Kick",    partials: makeKickPartials,     attack: 0.0, decay: 0.12, sustain: 0.0, release: 0.08, filterFreq: 400,  detune: 0, baseNote: 36 },
    { name: "Snare",   partials: makeSnarePartials,    attack: 0.0, decay: 0.08, sustain: 0.0, release: 0.06, filterFreq: 3500, detune: 0, baseNote: 38 },
    { name: "Hi-Hat",  partials: makeHiHatPartials,    attack: 0.0, decay: 0.04, sustain: 0.0, release: 0.03, filterFreq: 2000, detune: 0, baseNote: 42 },
    { name: "Tom",     partials: makeTomPartials,      attack: 0.0, decay: 0.15, sustain: 0.0, release: 0.10, filterFreq: 800,  detune: 0, baseNote: 50 },
  ];

  // --- Voice definitions ---------------------------------------------------
  // Master gain set low (0.3) to prevent clipping at 100% volume

  var VOICES = [
    // === Core synth ===
    { name:"Sine",         color:"#ef4444", partials:makeSinePartials,       attack:0.08, release:0.4,  filterFreq:2000, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0, echoDelay:200, echoDecay:0.3, reverbMix:0.15, distMix:0, distDrive:0 },
    { name:"Square",       color:"#3b82f6", partials:makeSquarePartials,     attack:0.0,  release:0.15, filterFreq:2000, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0, echoDelay:180, echoDecay:0.3, reverbMix:0, distMix:0, distDrive:0 },
    { name:"Piano",        color:"#f97316", partials:makePianoPartials,      attack:0.0,  release:0.3,  filterFreq:2000, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0.1, echoDelay:200, echoDecay:0.2, reverbMix:0.25, distMix:0, distDrive:0 },

    // === Synth leads/basses ===
    { name:"Synth Lead",   color:"#06b6d4", partials:makeSynthLeadPartials,  attack:0.02, release:0.18, filterFreq:2000, vibratoRate:5.8, vibratoDepth:8, detune:6, echoMix:0.12, echoDelay:150, echoDecay:0.28, reverbMix:0.12, distMix:0.5, distDrive:0.62 },
    { name:"Super Saw",    color:"#22d3ee", partials:makeSuperSawPartials,   attack:0.01, release:0.25, filterFreq:2000, vibratoRate:0.3, vibratoDepth:3, detune:12, echoMix:0.08, echoDelay:100, echoDecay:0.2, reverbMix:0.15, distMix:0, distDrive:0 },
    { name:"Reese Bass",   color:"#a855f7", partials:makeReeseBassPartials,  attack:0.005, release:0.1,  filterFreq:600,  vibratoRate:0.2, vibratoDepth:4, detune:8, echoMix:0, echoDelay:100, echoDecay:0.2, reverbMix:0.05, distMix:0.15, distDrive:0.3 },

    // === Drums (single voice, per-key sounds) ===
    { name:"Drums",        color:"#f59e0b", partials:makeKickPartials, isDrumKit:true, attack:0.0, release:0.08, filterFreq:2000, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0.08, echoDelay:100, echoDecay:0.15, reverbMix:0.15, distMix:0, distDrive:0 },

    // === Noise/experimental ===
    { name:"Bitcrush",     color:"#14b8a6", partials:makeBitcrushPartials,   attack:0.0,  release:0.12, filterFreq:2000, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0.15, echoDelay:130, echoDecay:0.35, reverbMix:0.1, distMix:0.7, distDrive:0.8 },
    { name:"Noise",        color:"#64748b", partials:makeNoisePartials,      attack:0.0,  release:0.2,  filterFreq:2000, vibratoRate:6.0, vibratoDepth:12, detune:9, echoMix:0.2, echoDelay:170, echoDecay:0.4, reverbMix:0.25, distMix:0.35, distDrive:0.5 },
    { name:"Vox",          color:"#fb7185", partials:makeVoxPartials,        attack:0.15, release:0.35, filterFreq:2000, vibratoRate:4.5, vibratoDepth:5, detune:3, echoMix:0.1, echoDelay:180, echoDecay:0.25, reverbMix:0.3, distMix:0, distDrive:0 },

    // === Drone/ambient ===
    { name:"Pad",          color:"#ec4899", partials:makePadPartials,        attack:0.45, release:1.4,  filterFreq:1700, vibratoRate:3.2, vibratoDepth:3, detune:3, echoMix:0.15, echoDelay:280, echoDecay:0.35, reverbMix:0.52, distMix:0, distDrive:0 },
    { name:"Drone",        color:"#059669", partials:makeDronePartials,      attack:0.8,  release:3.0,  filterFreq:800,  vibratoRate:0.8, vibratoDepth:4, detune:7, echoMix:0.3, echoDelay:500, echoDecay:0.6, reverbMix:0.75, distMix:0, distDrive:0 },
  ];

  // --- Engine state --------------------------------------------------------

  var ctx = null;
  var masterGain = null;
  var filterNode = null;
  var distNode = null;
  var convolverNode = null;
  var reverbGain = null;
  var dryGain = null;
  var delayNode = null;
  var feedbackGain = null;
  var echoWetGain = null;
  var echoDryGain = null;
  var vibratoLFO = null;
  var vibratoGain = null;
  var limiterNode = null;

  var currentVoiceIndex = 0;
  var periodicWaves = [];
  var drumWaves = []; // per-drum-kit PeriodicWaves
  var activeNotes = {};

  var fxState = {
    filterFreq: 2000,
    echoMix: 0,
    echoDelay: 0.25,
    echoDecay: 0.35,
    reverbMix: 0,
    reverbRoom: 0.5,
    distMix: 0,
    distDrive: 0,
    vibratoDepth: 0,
    vibratoRate: 5,
    attack: 0.01,
    release: 0.2,
    volume: 0.8,
  };

  // --- Loop recorder state -------------------------------------------------
  var loopRecording = false;
  var loopPlaying = false;
  var loopEvents = [];
  var loopStartTime = 0;
  var loopDuration = 0;
  var loopTimeoutIds = [];

  // --- Init ----------------------------------------------------------------

  // Internal gain ceiling to prevent clipping.
  // All oscillators are summed through this gain before the FX chain.
  var INTERNAL_GAIN = 0.28;

  var _audioUnlocked = false;

  // Mobile browsers require AudioContext.resume() during a user gesture.
  // This function creates the context (if needed), resumes it, and plays a
  // silent buffer to satisfy iOS Safari's stricter autoplay policy.
  // Call from any touchstart/click handler to guarantee audio works.
  function unlockAudio() {
    if (_audioUnlocked && ctx && ctx.state === "running") return;
    ensureContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    // iOS Safari needs an actual buffer played during a gesture to unlock audio
    var buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    src.stop(ctx.currentTime + 0.001);
    _audioUnlocked = true;
  }

  function ensureContext() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    filterNode = ctx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = fxState.filterFreq;
    filterNode.Q.value = 0.707; // fixed neutral Q, no resonance control

    distNode = ctx.createWaveShaper();
    distNode.oversample = "4x";
    _updateDistortion();

    delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.value = fxState.echoDelay;
    feedbackGain = ctx.createGain();
    feedbackGain.gain.value = fxState.echoDecay;
    echoWetGain = ctx.createGain();
    echoWetGain.gain.value = fxState.echoMix;
    echoDryGain = ctx.createGain();
    echoDryGain.gain.value = 1.0;

    convolverNode = ctx.createConvolver();
    _generateImpulseResponse(fxState.reverbRoom);
    reverbGain = ctx.createGain();
    reverbGain.gain.value = fxState.reverbMix;
    dryGain = ctx.createGain();
    dryGain.gain.value = 1.0 - fxState.reverbMix;

    vibratoLFO = ctx.createOscillator();
    vibratoLFO.type = "sine";
    vibratoLFO.frequency.value = fxState.vibratoRate;
    vibratoGain = ctx.createGain();
    vibratoGain.gain.value = fxState.vibratoDepth;
    vibratoLFO.connect(vibratoGain);
    vibratoLFO.start();

    masterGain = ctx.createGain();
    masterGain.gain.value = fxState.volume * INTERNAL_GAIN;

    // Limiter (DynamicsCompressor as hard limiter) to prevent any clipping
    limiterNode = ctx.createDynamicsCompressor();
    limiterNode.threshold.value = -1.5;
    limiterNode.knee.value = 0;
    limiterNode.ratio.value = 20;
    limiterNode.attack.value = 0.001;
    limiterNode.release.value = 0.01;

    filterNode.connect(distNode);
    distNode.connect(echoDryGain);
    distNode.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delayNode.connect(echoWetGain);

    var echoMerge = ctx.createGain();
    echoDryGain.connect(echoMerge);
    echoWetGain.connect(echoMerge);

    echoMerge.connect(dryGain);
    echoMerge.connect(convolverNode);
    convolverNode.connect(reverbGain);

    dryGain.connect(masterGain);
    reverbGain.connect(masterGain);
    masterGain.connect(limiterNode);
    limiterNode.connect(ctx.destination);

    // Build periodic waves for all voices
    for (var i = 0; i < VOICES.length; i++) {
      var p = VOICES[i].partials(32);
      periodicWaves.push(
        ctx.createPeriodicWave(new Float32Array(p.real), new Float32Array(p.imag))
      );
    }

    // Build drum kit waves
    for (var d = 0; d < DRUM_KIT.length; d++) {
      var dp = DRUM_KIT[d].partials(32);
      drumWaves.push(
        ctx.createPeriodicWave(new Float32Array(dp.real), new Float32Array(dp.imag))
      );
    }
  }

  function _generateImpulseResponse(roomSize) {
    if (!ctx) return;
    var len = Math.max(0.5, roomSize * 3.0);
    var sampleLen = Math.floor(ctx.sampleRate * len);
    var buffer = ctx.createBuffer(2, sampleLen, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var data = buffer.getChannelData(ch);
      for (var i = 0; i < sampleLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sampleLen, 2.0 + (1 - roomSize) * 3);
      }
    }
    try { convolverNode.buffer = buffer; } catch(e) {
      var newConv = ctx.createConvolver();
      newConv.buffer = buffer;
      convolverNode = newConv;
    }
  }

  function _updateDistortion() {
    if (!distNode) return;
    var drive = fxState.distDrive;
    var mix = fxState.distMix;
    if (mix <= 0 || drive <= 0) { distNode.curve = null; return; }
    var k = drive * 400;
    var samples = 44100;
    var curve = new Float32Array(samples);
    for (var i = 0; i < samples; i++) {
      var x = (i * 2 / samples) - 1;
      curve[i] = x * (1 - mix) + (((1 + k) * x) / (1 + k * Math.abs(x))) * mix;
    }
    distNode.curve = curve;
  }

  // --- Helpers -------------------------------------------------------------

  function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function midiToNoteName(midi) {
    if (midi < 0 || midi > 127) return "?";
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  function scaleNotes(scaleName, baseNote, count) {
    var intervals = SCALES[scaleName] || SCALES.pentatonic_major;
    var notes = [];
    for (var i = 0; i < count; i++) {
      var octaveOffset = Math.floor(i / intervals.length) * 12;
      var step = intervals[i % intervals.length];
      notes.push(baseNote + step + octaveOffset);
    }
    return notes;
  }

  // For drum voice: return drum kit labels per key instead of note names
  function getDrumKeyLabels(count) {
    var labels = [];
    for (var i = 0; i < count; i++) {
      labels.push(DRUM_KIT[i % DRUM_KIT.length].name);
    }
    return labels;
  }

  // --- Note on/off ---------------------------------------------------------

  function noteOn(midi, keyIndex) {
    unlockAudio();
    if (activeNotes[midi]) return;

    if (loopRecording) {
      loopEvents.push({ time: Date.now() - loopStartTime, type: "on", midi: midi, keyIndex: keyIndex });
    }

    var now = ctx.currentTime;
    var voice = VOICES[currentVoiceIndex];
    var osc = ctx.createOscillator();

    var noteAttack, noteRelease;

    if (voice.isDrumKit && typeof keyIndex === "number") {
      // Per-key drum sounds
      var drumIdx = keyIndex % DRUM_KIT.length;
      var drum = DRUM_KIT[drumIdx];
      osc.setPeriodicWave(drumWaves[drumIdx]);
      osc.frequency.value = midiToFreq(drum.baseNote);
      noteAttack = drum.attack;
      noteRelease = drum.release;
    } else {
      osc.setPeriodicWave(periodicWaves[currentVoiceIndex]);
      osc.frequency.value = midiToFreq(midi);
      if (voice.detune) osc.detune.value = voice.detune;
      vibratoGain.connect(osc.detune);
      noteAttack = fxState.attack;
      noteRelease = fxState.release;
    }

    // Simple AR envelope: attack ramps to 1.0, holds until noteOff
    var envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(1.0, now + Math.max(0.001, noteAttack));

    osc.connect(envGain);
    envGain.connect(filterNode);
    osc.start(now);

    activeNotes[midi] = { osc: osc, gain: envGain, release: noteRelease };
  }

  function noteOff(midi) {
    var note = activeNotes[midi];
    if (!note) return;
    delete activeNotes[midi];

    if (loopRecording) {
      loopEvents.push({ time: Date.now() - loopStartTime, type: "off", midi: midi });
    }

    // Smooth exponential taper to avoid abrupt cutoff
    var now = ctx.currentTime;
    var releaseTime = Math.max(0.02, note.release);
    note.gain.gain.cancelScheduledValues(now);
    note.gain.gain.setValueAtTime(note.gain.gain.value, now);
    // Exponential ramp to near-zero for natural fade, then silence
    note.gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
    note.gain.gain.linearRampToValueAtTime(0, now + releaseTime + 0.01);
    note.osc.stop(now + releaseTime + 0.05);
  }

  function allNotesOff() {
    for (var midi in activeNotes) { noteOff(parseInt(midi)); }
  }

  // --- Voice switching -----------------------------------------------------

  function setVoice(index) {
    allNotesOff();
    currentVoiceIndex = index % VOICES.length;
    var voice = VOICES[currentVoiceIndex];
    fxState.filterFreq = voice.filterFreq;
    fxState.attack = voice.attack;
    fxState.release = voice.release;
    fxState.vibratoRate = voice.vibratoRate;
    fxState.vibratoDepth = voice.vibratoDepth;
    fxState.echoMix = voice.echoMix;
    fxState.echoDelay = voice.echoDelay / 1000;
    fxState.echoDecay = voice.echoDecay;
    fxState.reverbMix = voice.reverbMix;
    fxState.distMix = voice.distMix;
    fxState.distDrive = voice.distDrive;
    _syncFXNodes();
    return currentVoiceIndex;
  }

  function nextVoice() { return setVoice(currentVoiceIndex + 1); }

  // --- FX ------------------------------------------------------------------

  function _syncFXNodes() {
    if (!ctx) return;
    filterNode.frequency.value = fxState.filterFreq;
    filterNode.Q.value = 0.707; // fixed neutral Q
    delayNode.delayTime.value = fxState.echoDelay;
    feedbackGain.gain.value = fxState.echoDecay;
    echoWetGain.gain.value = fxState.echoMix;
    echoDryGain.gain.value = 1.0;
    reverbGain.gain.value = fxState.reverbMix;
    dryGain.gain.value = 1.0 - fxState.reverbMix * 0.5;
    vibratoLFO.frequency.value = fxState.vibratoRate || 0.001;
    vibratoGain.gain.value = fxState.vibratoDepth;
    masterGain.gain.value = fxState.volume * INTERNAL_GAIN;
    _updateDistortion();
  }

  function setParam(name, value) {
    ensureContext();
    fxState[name] = value;
    _syncFXNodes();
    if (name === "reverbRoom") _generateImpulseResponse(value);
  }

  // --- Loop recorder -------------------------------------------------------

  function startLoopRecording() {
    stopLoopPlayback();
    loopEvents = [];
    loopStartTime = Date.now();
    loopRecording = true;
  }

  function stopLoopRecording() {
    if (!loopRecording) return;
    loopRecording = false;
    loopDuration = Date.now() - loopStartTime;
    for (var midi in activeNotes) {
      loopEvents.push({ time: loopDuration, type: "off", midi: parseInt(midi) });
    }
  }

  function startLoopPlayback() {
    if (loopEvents.length === 0) return;
    loopPlaying = true;
    _scheduleLoop();
  }

  function _scheduleLoop() {
    if (!loopPlaying) return;
    for (var i = 0; i < loopEvents.length; i++) {
      (function(ev) {
        var tid = setTimeout(function () {
          if (!loopPlaying) return;
          if (ev.type === "on") noteOn(ev.midi, ev.keyIndex);
          else noteOff(ev.midi);
        }, ev.time);
        loopTimeoutIds.push(tid);
      })(loopEvents[i]);
    }
    var repeatId = setTimeout(function () {
      if (loopPlaying) _scheduleLoop();
    }, loopDuration);
    loopTimeoutIds.push(repeatId);
  }

  function stopLoopPlayback() {
    loopPlaying = false;
    for (var i = 0; i < loopTimeoutIds.length; i++) clearTimeout(loopTimeoutIds[i]);
    loopTimeoutIds = [];
    allNotesOff();
  }

  function isLoopRecording() { return loopRecording; }
  function isLoopPlaying() { return loopPlaying; }
  function hasLoop() { return loopEvents.length > 0; }

  // --- Arpeggiator ---------------------------------------------------------

  var ARP_MODES = ["up", "down", "updown", "random"];
  var ARP_MODE_LABELS = { up: "Up", down: "Down", updown: "Up/Down", random: "Random" };

  var arpActive = false;
  var arpMode = "up";
  var arpSpeed = 0.5;       // 0=slow, 1=fast  (maps to BPM-ish interval)
  var arpNotes = [];         // MIDI notes in scale order
  var arpIndex = 0;
  var arpDirection = 1;      // 1=ascending, -1=descending (for updown)
  var arpTimeoutId = null;
  var arpCurrentNote = null;

  function setArpMode(mode) {
    if (ARP_MODES.indexOf(mode) >= 0) arpMode = mode;
    arpIndex = 0;
    arpDirection = 1;
  }
  function getArpMode() { return arpMode; }
  function nextArpMode() {
    var idx = ARP_MODES.indexOf(arpMode);
    setArpMode(ARP_MODES[(idx + 1) % ARP_MODES.length]);
    return arpMode;
  }

  function setArpSpeed(speed) { arpSpeed = Math.max(0, Math.min(1, speed)); }
  function getArpSpeed() { return arpSpeed; }

  function startArp(scaleName, baseNote) {
    unlockAudio();
    stopArp();
    arpActive = true;
    arpIndex = 0;
    arpDirection = 1;
    var intervals = SCALES[scaleName] || SCALES.pentatonic_major;
    arpNotes = [];
    // Two octaves of notes
    for (var i = 0; i < intervals.length * 2 && i < 24; i++) {
      var oct = Math.floor(i / intervals.length) * 12;
      arpNotes.push(baseNote + intervals[i % intervals.length] + oct);
    }
    _arpStep();
  }

  function _arpStep() {
    if (!arpActive || arpNotes.length === 0) return;

    // Release previous note
    if (arpCurrentNote !== null) {
      noteOff(arpCurrentNote);
      arpCurrentNote = null;
    }

    // Pick next note based on mode
    var midi;
    if (arpMode === "random") {
      midi = arpNotes[Math.floor(Math.random() * arpNotes.length)];
    } else {
      midi = arpNotes[arpIndex];
    }
    noteOn(midi);
    arpCurrentNote = midi;

    // Advance index
    if (arpMode === "up") {
      arpIndex = (arpIndex + 1) % arpNotes.length;
    } else if (arpMode === "down") {
      arpIndex = arpIndex - 1;
      if (arpIndex < 0) arpIndex = arpNotes.length - 1;
    } else if (arpMode === "updown") {
      arpIndex += arpDirection;
      if (arpIndex >= arpNotes.length - 1) { arpIndex = arpNotes.length - 1; arpDirection = -1; }
      if (arpIndex <= 0) { arpIndex = 0; arpDirection = 1; }
    }
    // random mode doesn't need index advance

    // Speed maps: 0=slow (500ms), 1=fast (80ms)
    var interval = 500 - arpSpeed * 420;
    arpTimeoutId = setTimeout(function() { _arpStep(); }, interval);
  }

  function stopArp() {
    arpActive = false;
    if (arpTimeoutId) clearTimeout(arpTimeoutId);
    arpTimeoutId = null;
    if (arpCurrentNote !== null) {
      noteOff(arpCurrentNote);
      arpCurrentNote = null;
    }
  }

  function isArpActive() { return arpActive; }

  // --- Public API ----------------------------------------------------------

  return {
    VOICES: VOICES,
    SCALES: SCALES,
    SCALE_BASES: SCALE_BASES,
    NOTE_NAMES: NOTE_NAMES,
    DRUM_KIT: DRUM_KIT,
    fxState: fxState,

    resolveScaleKey: resolveScaleKey,
    scaleHasPair: scaleHasPair,

    ensureContext: ensureContext,
    unlockAudio: unlockAudio,
    noteOn: noteOn,
    noteOff: noteOff,
    allNotesOff: allNotesOff,

    setVoice: setVoice,
    nextVoice: nextVoice,
    getVoiceIndex: function () { return currentVoiceIndex; },
    isDrumKit: function() { return VOICES[currentVoiceIndex].isDrumKit === true; },
    getDrumKeyLabels: getDrumKeyLabels,

    setParam: setParam,

    midiToFreq: midiToFreq,
    midiToNoteName: midiToNoteName,
    scaleNotes: scaleNotes,

    startLoopRecording: startLoopRecording,
    stopLoopRecording: stopLoopRecording,
    startLoopPlayback: startLoopPlayback,
    stopLoopPlayback: stopLoopPlayback,
    isLoopRecording: isLoopRecording,
    isLoopPlaying: isLoopPlaying,
    hasLoop: hasLoop,

    startArp: startArp,
    stopArp: stopArp,
    isArpActive: isArpActive,
    setArpMode: setArpMode,
    getArpMode: getArpMode,
    nextArpMode: nextArpMode,
    setArpSpeed: setArpSpeed,
    getArpSpeed: getArpSpeed,
    ARP_MODES: ARP_MODES,
    ARP_MODE_LABELS: ARP_MODE_LABELS,
  };
})();
