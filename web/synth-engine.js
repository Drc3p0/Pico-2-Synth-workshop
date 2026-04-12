// ============================================================
// Web Audio Synth Engine
// Mirrors the Pico 2 firmware voices and FX chain in the browser.
// No dependencies.
// ============================================================

var SynthEngine = (function () {
  "use strict";

  var NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  var SCALES = {
    pentatonic: [0,2,4,7,9],
    major:      [0,2,4,5,7,9,11],
    minor:      [0,2,3,5,7,8,10],
    blues:      [0,3,5,6,7,10],
    chromatic:  [0,1,2,3,4,5,6,7,8,9,10,11],
  };

  // --- Waveform generation (PeriodicWave partials) -------------------------

  function makeSinePartials()       { return { real: [0,0], imag: [0,1] }; }
  function makeSawPartials(n)       { var r=[0],im=[0]; for(var k=1;k<=n;k++){r.push(0);im.push(1/k*(k%2?1:-1)*-1);} return{real:r,imag:im}; }
  function makeSquarePartials(n)    { var r=[0],im=[0]; for(var k=1;k<=n;k++){r.push(0);im.push(k%2?1/k:0);} return{real:r,imag:im}; }
  function makeTrianglePartials(n)  { var r=[0],im=[0]; for(var k=1;k<=n;k++){r.push(0);im.push(k%2?(8/(Math.PI*Math.PI))*(1/(k*k))*(((k-1)/2)%2?-1:1):0);} return{real:r,imag:im}; }

  function makeOuterSpacePartials() {
    // Fundamental + detuned 5th-ish + sub-octave shimmer
    var r = [0, 0, 0, 0, 0, 0, 0];
    var im= [0, 0.50, 0.15, 0.25, 0.10, 0, 0.05];
    return { real: r, imag: im };
  }

  function makePianoPartials() {
    return { real: [0,0,0,0,0,0,0], imag: [0, 1.0, 0.6, 0.35, 0.20, 0.10, 0.06] };
  }

  function makeSynthLeadPartials() {
    // Saw + square blend with extra harmonics
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

  // --- Voice definitions (match firmware patches.py) -----------------------

  var VOICES = [
    { name:"Sine",       color:"#ef4444", partials:makeSinePartials,       attack:0.08, decay:0.3,  sustain:0.8,  release:0.4,  filterFreq:3000, filterQ:0.7, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0, echoDelay:200, echoDecay:0.3, reverbMix:0.15, distMix:0, distDrive:0 },
    { name:"Saw",        color:"#22c55e", partials:makeSawPartials,        attack:0.01, decay:0.15, sustain:0.7,  release:0.2,  filterFreq:2200, filterQ:1.0, vibratoRate:0, vibratoDepth:0, detune:2, echoMix:0, echoDelay:150, echoDecay:0.25, reverbMix:0, distMix:0, distDrive:0 },
    { name:"Square",     color:"#3b82f6", partials:makeSquarePartials,     attack:0.0,  decay:0.1,  sustain:0.65, release:0.15, filterFreq:2800, filterQ:1.2, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0, echoDelay:180, echoDecay:0.3, reverbMix:0, distMix:0, distDrive:0 },
    { name:"Triangle",   color:"#eab308", partials:makeTrianglePartials,   attack:0.05, decay:0.2,  sustain:0.75, release:0.35, filterFreq:2500, filterQ:0.8, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0, echoDelay:200, echoDecay:0.3, reverbMix:0.1, distMix:0, distDrive:0 },
    { name:"Outer Space", color:"#8b5cf6", partials:makeOuterSpacePartials, attack:0.6,  decay:1.2,  sustain:0.7,  release:2.0,  filterFreq:1400, filterQ:0.6, vibratoRate:1.8, vibratoDepth:6, detune:5, echoMix:0.45, echoDelay:400, echoDecay:0.55, reverbMix:0.7, distMix:0, distDrive:0 },
    { name:"Piano",      color:"#f97316", partials:makePianoPartials,      attack:0.0,  decay:0.4,  sustain:0.0,  release:0.3,  filterFreq:4000, filterQ:0.7, vibratoRate:0, vibratoDepth:0, detune:0, echoMix:0.1, echoDelay:200, echoDecay:0.2, reverbMix:0.25, distMix:0, distDrive:0 },
    { name:"Synth Lead", color:"#06b6d4", partials:makeSynthLeadPartials,  attack:0.02, decay:0.12, sustain:0.55, release:0.18, filterFreq:3200, filterQ:1.1, vibratoRate:5.8, vibratoDepth:8, detune:6, echoMix:0.12, echoDelay:150, echoDecay:0.28, reverbMix:0.12, distMix:0.5, distDrive:0.62 },
    { name:"Pad",        color:"#ec4899", partials:makePadPartials,        attack:0.45, decay:0.9,  sustain:0.8,  release:1.4,  filterFreq:1700, filterQ:0.85, vibratoRate:3.2, vibratoDepth:3, detune:3, echoMix:0.15, echoDelay:280, echoDecay:0.35, reverbMix:0.52, distMix:0, distDrive:0 },
  ];

  // --- Engine state --------------------------------------------------------

  var ctx = null;
  var masterGain = null;
  var filterNode = null;
  var distNode = null;
  var convolverNode = null;   // reverb
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
  var activeNotes = {};  // midi -> { osc, gain, detuneOsc }

  // Current FX state
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

  // --- Init ----------------------------------------------------------------

  function ensureContext() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Build signal chain: osc -> filter -> distortion -> echo -> reverb -> master -> destination

    // Filter
    filterNode = ctx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = fxState.filterFreq;
    filterNode.Q.value = fxState.filterQ;

    // Distortion (waveshaper)
    distNode = ctx.createWaveShaper();
    distNode.oversample = "4x";
    _updateDistortion();

    // Echo (delay + feedback)
    delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.value = fxState.echoDelay;
    feedbackGain = ctx.createGain();
    feedbackGain.gain.value = fxState.echoDecay;
    echoWetGain = ctx.createGain();
    echoWetGain.gain.value = fxState.echoMix;
    echoDryGain = ctx.createGain();
    echoDryGain.gain.value = 1.0;

    // Reverb (convolver with generated impulse response)
    convolverNode = ctx.createConvolver();
    _generateImpulseResponse(fxState.reverbRoom);
    reverbGain = ctx.createGain();
    reverbGain.gain.value = fxState.reverbMix;
    dryGain = ctx.createGain();
    dryGain.gain.value = 1.0 - fxState.reverbMix;

    // Vibrato LFO
    vibratoLFO = ctx.createOscillator();
    vibratoLFO.type = "sine";
    vibratoLFO.frequency.value = fxState.vibratoRate;
    vibratoGain = ctx.createGain();
    vibratoGain.gain.value = fxState.vibratoDepth;
    vibratoLFO.connect(vibratoGain);
    vibratoLFO.start();

    // Master
    masterGain = ctx.createGain();
    masterGain.gain.value = fxState.volume;

    // Chain: filter -> distortion -> echo split
    filterNode.connect(distNode);

    // Echo: distortion -> dry path + wet (delay) path
    distNode.connect(echoDryGain);
    distNode.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delayNode.connect(echoWetGain);

    // Merge echo -> reverb split
    var echoMerge = ctx.createGain();
    echoDryGain.connect(echoMerge);
    echoWetGain.connect(echoMerge);

    // Reverb: echoMerge -> dry + wet (convolver)
    echoMerge.connect(dryGain);
    echoMerge.connect(convolverNode);
    convolverNode.connect(reverbGain);

    dryGain.connect(masterGain);
    reverbGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Build PeriodicWaves for all voices
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
    try {
      convolverNode.buffer = buffer;
    } catch(e) {
      // Some browsers don't allow replacing the buffer; create a new convolver
      var newConv = ctx.createConvolver();
      newConv.buffer = buffer;
      // Rewire (simplified -- just replace the reference)
      convolverNode = newConv;
    }
  }

  function _updateDistortion() {
    if (!distNode) return;
    var drive = fxState.distDrive;
    var mix = fxState.distMix;
    if (mix <= 0 || drive <= 0) {
      distNode.curve = null;
      return;
    }
    var k = drive * 400;
    var samples = 44100;
    var curve = new Float32Array(samples);
    for (var i = 0; i < samples; i++) {
      var x = (i * 2 / samples) - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      // Mix: blend distorted with clean
      curve[i] = x * (1 - mix) + curve[i] * mix;
    }
    distNode.curve = curve;
  }

  // --- MIDI/frequency helpers ----------------------------------------------

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

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
    if (activeNotes[midi]) return; // already playing

    var voice = VOICES[currentVoiceIndex];
    var now = ctx.currentTime;
    var freq = midiToFreq(midi);

    // Main oscillator
    var osc = ctx.createOscillator();
    osc.setPeriodicWave(periodicWaves[currentVoiceIndex]);
    osc.frequency.value = freq;
    if (voice.detune) osc.detune.value = voice.detune;

    // Connect vibrato LFO to this oscillator's detune
    vibratoGain.connect(osc.detune);

    // Envelope via gain node
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

    var now = ctx.currentTime;
    var releaseTime = Math.max(0.01, fxState.release);

    note.gain.gain.cancelScheduledValues(now);
    note.gain.gain.setValueAtTime(note.gain.gain.value, now);
    note.gain.gain.linearRampToValueAtTime(0, now + releaseTime);

    note.osc.stop(now + releaseTime + 0.05);
  }

  function allNotesOff() {
    for (var midi in activeNotes) {
      noteOff(parseInt(midi));
    }
  }

  // --- Voice switching -----------------------------------------------------

  function setVoice(index) {
    allNotesOff();
    currentVoiceIndex = index % VOICES.length;
    var voice = VOICES[currentVoiceIndex];

    // Apply voice defaults to FX state
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

  function nextVoice() {
    return setVoice(currentVoiceIndex + 1);
  }

  // --- FX parameter setters ------------------------------------------------

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
    if (name === "reverbRoom") {
      _generateImpulseResponse(value);
    }
  }

  // --- Public API ----------------------------------------------------------

  return {
    VOICES: VOICES,
    SCALES: SCALES,
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
  };
})();
