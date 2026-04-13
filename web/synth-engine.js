// ============================================================
// Web Audio Synth Engine
// Mirrors the Pico 2 firmware voices and FX chain in the browser.
// No dependencies.
// ============================================================

var SynthEngine = (function () {
  "use strict";

  var NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  var SCALES = {
    pentatonic:       [0,2,4,7,9],
    pentatonic_minor: [0,3,5,7,10],
    major:            [0,2,4,5,7,9,11],
    minor:            [0,2,3,5,7,8,10],
    blues:            [0,3,5,6,7,10],
    blues_major:      [0,2,3,4,7,9],
    chromatic:        [0,1,2,3,4,5,6,7,8,9,10,11],
    dorian:           [0,2,3,5,7,9,10],
    phrygian:         [0,1,3,5,7,8,10],
    lydian:           [0,2,4,6,7,9,11],
    mixolydian:       [0,2,4,5,7,9,10],
    locrian:          [0,1,3,5,6,8,10],
    harmonic_minor:   [0,2,3,5,7,8,11],
    melodic_minor:    [0,2,3,5,7,9,11],
    hungarian_minor:  [0,2,3,6,7,8,11],
    egyptian:         [0,2,5,7,10],
    japanese:         [0,1,5,7,8],
    whole_tone:       [0,2,4,6,8,10],
    diminished:       [0,2,3,5,6,8,9,11],
    augmented:        [0,3,4,7,8,11],
    bebop:            [0,2,4,5,7,9,10,11],
    just_intonation:  [0,2,4,5,7,9,11], // same steps, tuned differently in firmware
  };

  var SCALE_LABELS = {
    pentatonic: "Pentatonic Major",
    pentatonic_minor: "Pentatonic Minor",
    major: "Major (Ionian)",
    minor: "Minor (Aeolian)",
    blues: "Blues",
    blues_major: "Blues Major",
    chromatic: "Chromatic",
    dorian: "Dorian",
    phrygian: "Phrygian",
    lydian: "Lydian",
    mixolydian: "Mixolydian",
    locrian: "Locrian",
    harmonic_minor: "Harmonic Minor",
    melodic_minor: "Melodic Minor",
    hungarian_minor: "Hungarian Minor",
    egyptian: "Egyptian",
    japanese: "Japanese (In)",
    whole_tone: "Whole Tone",
    diminished: "Diminished",
    augmented: "Augmented",
    bebop: "Bebop",
    just_intonation: "Just Intonation",
  };

  // --- Waveform generation (PeriodicWave partials) -------------------------

  function makeSinePartials()       { return { real: [0,0], imag: [0,1] }; }
  function makeSquarePartials(n)    { var r=[0],im=[0]; for(var k=1;k<=n;k++){r.push(0);im.push(k%2?1/k:0);} return{real:r,imag:im}; }

  function makeOuterSpacePartials() {
    var r = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var im= [0, 0.50, 0.15, 0.25, 0.10, 0.03, 0.05, 0.02, 0.04];
    return { real: r, imag: im };
  }

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

  // New voices:

  function makeKickPartials() {
    // Heavy fundamental with fast decay harmonics
    return { real: [0,0,0,0], imag: [0, 1.0, 0.4, 0.1] };
  }

  function makeHiHatPartials() {
    // Inharmonic metallic -- lots of upper partials, weak fundamental
    var r = [0], im = [0];
    for (var k = 1; k <= 32; k++) {
      r.push(0);
      im.push(k < 4 ? 0.05 : (0.3 / Math.sqrt(k)) * (Math.sin(k * 1.7) * 0.5 + 0.5));
    }
    return { real: r, imag: im };
  }

  function makeSnarePartials() {
    // Noisy mid-range with some fundamental
    var r = [0], im = [0];
    for (var k = 1; k <= 24; k++) {
      r.push(0);
      var noise = Math.sin(k * 3.14159 * 0.7) * 0.3 + 0.2;
      im.push(k === 1 ? 0.5 : noise / Math.sqrt(k));
    }
    return { real: r, imag: im };
  }

  function makeReeseBassPartials() {
    // Two detuned saws -- heavy sub bass
    var n = 20; var r = [0], im = [0];
    for (var k = 1; k <= n; k++) {
      r.push(0);
      var saw1 = 1/k * (k%2?1:-1) * -1;
      var saw2 = 1/k * (k%2?1:-1) * -1 * 0.8;
      im.push((saw1 + saw2) * 0.5);
    }
    return { real: r, imag: im };
  }

  function makeSuperSawPartials() {
    // Multiple detuned saws layered -- thick and wide
    var n = 20; var r = [0], im = [0];
    for (var k = 1; k <= n; k++) {
      r.push(0);
      var base = 1/k * (k%2?1:-1) * -1;
      im.push(base * 1.2);
    }
    return { real: r, imag: im };
  }

  function makeAcidPartials() {
    // Saw-like with emphasized resonant peak -- TB-303 character
    var n = 24; var r = [0], im = [0];
    for (var k = 1; k <= n; k++) {
      r.push(0);
      var saw = 1/k * (k%2?1:-1) * -1;
      var boost = (k >= 3 && k <= 6) ? 1.5 : 1.0;
      im.push(saw * boost);
    }
    return { real: r, imag: im };
  }

  function makeNoiseWashPartials() {
    // Dense harmonic wash -- all partials with random-ish amplitudes
    var r = [0], im = [0];
    for (var k = 1; k <= 32; k++) {
      r.push(0);
      im.push((0.5 / k) * (1 + Math.sin(k * 2.718) * 0.5));
    }
    return { real: r, imag: im };
  }

  function makeDronePartials() {
    // Perfect 5ths and octaves -- rich, organ-like drone
    return { real: [0,0,0,0,0,0,0,0,0], imag: [0, 1.0, 0.5, 0.7, 0.25, 0.15, 0.6, 0.1, 0.3] };
  }

  function makeMetalPartials() {
    // Bell/metallic inharmonic spectrum
    var r = [0], im = [0];
    for (var k = 1; k <= 16; k++) {
      r.push(0);
      // Inharmonic: use irrational-ish scaling
      var amp = 0.4 / (k * 0.7);
      if (k % 3 === 0) amp *= 1.8;
      im.push(amp);
    }
    return { real: r, imag: im };
  }

  function makeBitcrushPartials() {
    // Harsh digital staircase -- strong odd harmonics with sharp edges
    var r = [0], im = [0];
    for (var k = 1; k <= 24; k++) {
      r.push(0);
      im.push(k % 2 ? 0.8/k : 0.4/k);
    }
    return { real: r, imag: im };
  }

  function makeVoxPartials() {
    // Vocal formant approximation -- emphasize partials near formant freqs
    return { real: [0,0,0,0,0,0,0,0,0,0], imag: [0, 0.8, 0.3, 0.6, 0.9, 0.4, 0.2, 0.5, 0.1, 0.3] };
  }

  // --- Voice definitions ---------------------------------------------------

  var VOICES = [
    // === Core synth ===
    { name:"Sine",         color:"#ef4444", partials:makeSinePartials,       attack:0.08, decay:0.3,  sustain:0.8,  release:0.4,  filterFreq:3000, filterQ:0.7, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0, echoDelay:200, echoDecay:0.3, reverbMix:0.15, distMix:0, distDrive:0 },
    { name:"Square",       color:"#3b82f6", partials:makeSquarePartials,     attack:0.0,  decay:0.1,  sustain:0.65, release:0.15, filterFreq:2800, filterQ:1.2, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0, echoDelay:180, echoDecay:0.3, reverbMix:0, distMix:0, distDrive:0 },
    { name:"Piano",        color:"#f97316", partials:makePianoPartials,      attack:0.0,  decay:0.4,  sustain:0.0,  release:0.3,  filterFreq:4000, filterQ:0.7, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0.1, echoDelay:200, echoDecay:0.2, reverbMix:0.25, distMix:0, distDrive:0 },

    // === Synth leads/basses ===
    { name:"Synth Lead",   color:"#06b6d4", partials:makeSynthLeadPartials,  attack:0.02, decay:0.12, sustain:0.55, release:0.18, filterFreq:3200, filterQ:1.1, vibratoRate:5.8, vibratoDepth:8, detune:6, echoMix:0.12, echoDelay:150, echoDecay:0.28, reverbMix:0.12, distMix:0.5, distDrive:0.62 },
    { name:"Acid",         color:"#84cc16", partials:makeAcidPartials,       attack:0.0,  decay:0.15, sustain:0.3,  release:0.08, filterFreq:1200, filterQ:3.5, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0.2, echoDelay:120, echoDecay:0.4, reverbMix:0, distMix:0.3, distDrive:0.4 },
    { name:"Super Saw",    color:"#22d3ee", partials:makeSuperSawPartials,   attack:0.01, decay:0.2,  sustain:0.75, release:0.25, filterFreq:3500, filterQ:0.8, vibratoRate:0.3, vibratoDepth:3, detune:12, echoMix:0.08, echoDelay:100, echoDecay:0.2, reverbMix:0.15, distMix:0, distDrive:0 },
    { name:"Reese Bass",   color:"#a855f7", partials:makeReeseBassPartials,  attack:0.005, decay:0.15, sustain:0.7, release:0.1,  filterFreq:600,  filterQ:1.5, vibratoRate:0.2, vibratoDepth:4, detune:8, echoMix:0, echoDelay:100, echoDecay:0.2, reverbMix:0.05, distMix:0.15, distDrive:0.3 },

    // === Drums/percussion ===
    { name:"Kick",         color:"#dc2626", partials:makeKickPartials,       attack:0.0,  decay:0.12, sustain:0.0,  release:0.08, filterFreq:500,  filterQ:0.5, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0, echoDelay:100, echoDecay:0.1, reverbMix:0.05, distMix:0.2, distDrive:0.3 },
    { name:"Snare",        color:"#f59e0b", partials:makeSnarePartials,      attack:0.0,  decay:0.08, sustain:0.0,  release:0.06, filterFreq:3500, filterQ:0.6, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0.1, echoDelay:80, echoDecay:0.15, reverbMix:0.2, distMix:0.15, distDrive:0.2 },
    { name:"Hi-Hat",       color:"#fbbf24", partials:makeHiHatPartials,      attack:0.0,  decay:0.04, sustain:0.0,  release:0.03, filterFreq:6000, filterQ:0.4, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0.05, echoDelay:60, echoDecay:0.1, reverbMix:0.15, distMix:0, distDrive:0 },
    { name:"Metal Perc",   color:"#e879f9", partials:makeMetalPartials,      attack:0.0,  decay:0.3,  sustain:0.0,  release:0.4,  filterFreq:5000, filterQ:1.0, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0.25, echoDelay:200, echoDecay:0.3, reverbMix:0.35, distMix:0, distDrive:0 },

    // === Noise/experimental ===
    { name:"Bitcrush",     color:"#14b8a6", partials:makeBitcrushPartials,   attack:0.0,  decay:0.1,  sustain:0.6,  release:0.12, filterFreq:2000, filterQ:2.0, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0.15, echoDelay:130, echoDecay:0.35, reverbMix:0.1, distMix:0.7, distDrive:0.8 },
    { name:"Noise Wash",   color:"#64748b", partials:makeNoiseWashPartials,  attack:0.3,  decay:0.8,  sustain:0.5,  release:1.0,  filterFreq:1800, filterQ:0.5, vibratoRate:1.5, vibratoDepth:5, detune:4, echoMix:0.35, echoDelay:350, echoDecay:0.5, reverbMix:0.6, distMix:0.1, distDrive:0.15 },
    { name:"Vox",          color:"#fb7185", partials:makeVoxPartials,        attack:0.15, decay:0.3,  sustain:0.6,  release:0.35, filterFreq:2200, filterQ:1.8, vibratoRate:4.5, vibratoDepth:5, detune:3, echoMix:0.1, echoDelay:180, echoDecay:0.25, reverbMix:0.3, distMix:0, distDrive:0 },

    // === Drone/ambient ===
    { name:"Outer Space",  color:"#8b5cf6", partials:makeOuterSpacePartials, attack:0.6,  decay:1.2,  sustain:0.7,  release:2.0,  filterFreq:1400, filterQ:0.6, vibratoRate:1.8, vibratoDepth:6, detune:5, echoMix:0.45, echoDelay:400, echoDecay:0.55, reverbMix:0.7, distMix:0, distDrive:0 },
    { name:"Pad",          color:"#ec4899", partials:makePadPartials,        attack:0.45, decay:0.9,  sustain:0.8,  release:1.4,  filterFreq:1700, filterQ:0.85, vibratoRate:3.2, vibratoDepth:3, detune:3, echoMix:0.15, echoDelay:280, echoDecay:0.35, reverbMix:0.52, distMix:0, distDrive:0 },
    { name:"Drone",        color:"#059669", partials:makeDronePartials,      attack:0.8,  decay:2.0,  sustain:0.9,  release:3.0,  filterFreq:1200, filterQ:0.5, vibratoRate:0.8, vibratoDepth:4, detune:7, echoMix:0.3, echoDelay:500, echoDecay:0.6, reverbMix:0.75, distMix:0, distDrive:0 },
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

  var currentVoiceIndex = 0;
  var periodicWaves = [];
  var activeNotes = {};

  var fxState = {
    filterFreq: 2000,
    filterQ: 1.0,
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
    decay: 0.2,
    sustain: 0.7,
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

  // --- Drone state ---------------------------------------------------------
  var droneActive = false;
  var droneTimeoutId = null;
  var droneNotes = [];

  // --- Init ----------------------------------------------------------------

  function ensureContext() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    filterNode = ctx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = fxState.filterFreq;
    filterNode.Q.value = fxState.filterQ;

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
    masterGain.gain.value = fxState.volume;

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
    masterGain.connect(ctx.destination);

    for (var i = 0; i < VOICES.length; i++) {
      var p = VOICES[i].partials(32);
      periodicWaves.push(
        ctx.createPeriodicWave(new Float32Array(p.real), new Float32Array(p.imag))
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
    var intervals = SCALES[scaleName] || SCALES.pentatonic;
    var notes = [];
    for (var i = 0; i < count; i++) {
      var octaveOffset = Math.floor(i / intervals.length) * 12;
      var step = intervals[i % intervals.length];
      notes.push(baseNote + step + octaveOffset);
    }
    return notes;
  }

  // --- Note on/off ---------------------------------------------------------

  function noteOn(midi) {
    ensureContext();
    if (ctx.state === "suspended") ctx.resume();
    if (activeNotes[midi]) return;

    if (loopRecording) {
      loopEvents.push({ time: Date.now() - loopStartTime, type: "on", midi: midi });
    }

    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.setPeriodicWave(periodicWaves[currentVoiceIndex]);
    osc.frequency.value = midiToFreq(midi);
    var voice = VOICES[currentVoiceIndex];
    if (voice.detune) osc.detune.value = voice.detune;
    vibratoGain.connect(osc.detune);

    var envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0, now);
    envGain.gain.linearRampToValueAtTime(1.0, now + Math.max(0.001, fxState.attack));
    envGain.gain.linearRampToValueAtTime(
      fxState.sustain,
      now + Math.max(0.001, fxState.attack) + Math.max(0.001, fxState.decay)
    );

    osc.connect(envGain);
    envGain.connect(filterNode);
    osc.start(now);

    activeNotes[midi] = { osc: osc, gain: envGain };
  }

  function noteOff(midi) {
    var note = activeNotes[midi];
    if (!note) return;
    delete activeNotes[midi];

    if (loopRecording) {
      loopEvents.push({ time: Date.now() - loopStartTime, type: "off", midi: midi });
    }

    var now = ctx.currentTime;
    var releaseTime = Math.max(0.01, fxState.release);
    note.gain.gain.cancelScheduledValues(now);
    note.gain.gain.setValueAtTime(note.gain.gain.value, now);
    note.gain.gain.linearRampToValueAtTime(0, now + releaseTime);
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
    fxState.filterQ = voice.filterQ;
    fxState.attack = voice.attack;
    fxState.decay = voice.decay;
    fxState.sustain = voice.sustain;
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
    filterNode.Q.value = fxState.filterQ;
    delayNode.delayTime.value = fxState.echoDelay;
    feedbackGain.gain.value = fxState.echoDecay;
    echoWetGain.gain.value = fxState.echoMix;
    echoDryGain.gain.value = 1.0;
    reverbGain.gain.value = fxState.reverbMix;
    dryGain.gain.value = 1.0 - fxState.reverbMix * 0.5;
    vibratoLFO.frequency.value = fxState.vibratoRate || 0.001;
    vibratoGain.gain.value = fxState.vibratoDepth;
    masterGain.gain.value = fxState.volume;
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
    // Auto-add noteOffs for any still-held notes
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
          if (ev.type === "on") noteOn(ev.midi);
          else noteOff(ev.midi);
        }, ev.time);
        loopTimeoutIds.push(tid);
      })(loopEvents[i]);
    }
    // Schedule the next loop iteration
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

  // --- Drone mode ----------------------------------------------------------

  function startDrone(scaleName, baseNote) {
    ensureContext();
    if (ctx.state === "suspended") ctx.resume();
    droneActive = true;
    var intervals = SCALES[scaleName] || SCALES.pentatonic;
    droneNotes = [];
    // Build 1-2 octaves of notes
    for (var i = 0; i < intervals.length * 2 && i < 14; i++) {
      var oct = Math.floor(i / intervals.length) * 12;
      droneNotes.push(baseNote + intervals[i % intervals.length] + oct);
    }
    _droneStep();
  }

  function _droneStep() {
    if (!droneActive || droneNotes.length === 0) return;
    // Pick 1-3 random notes from the scale
    var count = 1 + Math.floor(Math.random() * 2);
    var chosen = [];
    for (var i = 0; i < count; i++) {
      var n = droneNotes[Math.floor(Math.random() * droneNotes.length)];
      if (chosen.indexOf(n) < 0) chosen.push(n);
    }
    // Play them
    for (var j = 0; j < chosen.length; j++) noteOn(chosen[j]);
    // Hold for a random duration based on envelope
    var holdTime = 400 + Math.random() * 1200;
    setTimeout(function() {
      for (var k = 0; k < chosen.length; k++) noteOff(chosen[k]);
    }, holdTime);
    // Schedule next step
    var gap = holdTime * 0.6 + Math.random() * 600;
    droneTimeoutId = setTimeout(function() { _droneStep(); }, gap);
  }

  function stopDrone() {
    droneActive = false;
    if (droneTimeoutId) clearTimeout(droneTimeoutId);
    droneTimeoutId = null;
    allNotesOff();
  }

  function isDroneActive() { return droneActive; }

  // --- Public API ----------------------------------------------------------

  return {
    VOICES: VOICES,
    SCALES: SCALES,
    SCALE_LABELS: SCALE_LABELS,
    NOTE_NAMES: NOTE_NAMES,
    fxState: fxState,

    ensureContext: ensureContext,
    noteOn: noteOn,
    noteOff: noteOff,
    allNotesOff: allNotesOff,

    setVoice: setVoice,
    nextVoice: nextVoice,
    getVoiceIndex: function () { return currentVoiceIndex; },

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

    startDrone: startDrone,
    stopDrone: stopDrone,
    isDroneActive: isDroneActive,
  };
})();
