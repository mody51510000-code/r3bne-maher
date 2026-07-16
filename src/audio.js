// -------------------------------------------------------------
// Web Audio API Sound Synthesizer for "رعبني يا ماهر"
// Procedural audio generation for horror atmosphere.
// -------------------------------------------------------------

class AudioManager {
  constructor() {
    this.ctx = null;
    this.ambientOsc = null;
    this.ambientGain = null;
    
    // Heartbeat properties
    this.heartbeatTimer = null;
    this.dangerFactor = 0.0; // 0 (safe) to 1 (extreme danger)
    
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.initialized = true;
      console.log("Audio Manager Initialized successfully.");
      
      // Start background ambient drone
      this.startAmbient();
      // Start heartbeat loop
      this.startHeartbeatLoop();
    } catch (e) {
      console.warn("Web Audio API not supported on this browser:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // A dark, modulating, low frequency horror drone
  startAmbient() {
    if (!this.ctx) return;

    try {
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      this.ambientGain.connect(this.ctx.destination);

      // Low frequency oscillator
      this.ambientOsc = this.ctx.createOscillator();
      this.ambientOsc.type = 'sawtooth'; // Rawer texture
      this.ambientOsc.frequency.setValueAtTime(45, this.ctx.currentTime); // Low growl (G1)
      
      // Filter out high harsh frequencies
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, this.ctx.currentTime);
      
      // Modulator to make the frequency flicker/modulate slowly
      const modulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      modulator.frequency.setValueAtTime(0.15, this.ctx.currentTime); // 0.15 Hz (very slow)
      modGain.gain.setValueAtTime(4, this.ctx.currentTime); // modulate by 4 Hz
      
      modulator.connect(modGain);
      modGain.connect(this.ambientOsc.frequency);
      
      this.ambientOsc.connect(filter);
      filter.connect(this.ambientGain);
      
      modulator.start();
      this.ambientOsc.start();
    } catch (e) {
      console.error("Failed to start ambient drone:", e);
    }
  }

  stopAmbient() {
    try {
      if (this.ambientOsc) {
        this.ambientOsc.stop();
        this.ambientOsc.disconnect();
        this.ambientOsc = null;
      }
    } catch(e) {}
  }

  // Heartbeat loop that adjusts speed based on threat level
  startHeartbeatLoop() {
    const playThump = () => {
      if (!this.ctx || this.ctx.state === 'suspended') {
        // Retry later
        this.heartbeatTimer = setTimeout(playThump, 1000);
        return;
      }

      // Dynamic intervals: 0 danger = 1200ms interval, 1 danger = 250ms interval
      const interval = 1200 - (this.dangerFactor * 950);
      
      this.playHeartbeatSound();

      // Schedule next thump
      this.heartbeatTimer = setTimeout(playThump, interval);
    };

    playThump();
  }

  playHeartbeatSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Heartbeat consists of a double thump: "lub-dub"
    const triggerThump = (timeOffset, gainMultiplier) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      // Low base pitch (55Hz), slightly higher if high danger (fear response)
      const pitch = 50 + (this.dangerFactor * 15);
      osc.frequency.setValueAtTime(pitch, now + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(10, now + timeOffset + 0.15);
      
      // Volume: louder if high danger
      const vol = (0.2 + (this.dangerFactor * 0.5)) * gainMultiplier;
      gain.gain.setValueAtTime(0.01, now + timeOffset);
      gain.gain.linearRampToValueAtTime(vol, now + timeOffset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, now + timeOffset + 0.18);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + 0.2);
    };
    
    // Double thump schedule
    triggerThump(0, 1.0);
    triggerThump(0.18, 0.75); // Second thump is slightly delayed and quieter
  }

  // Update danger level dynamically (value between 0.0 and 1.0)
  updateDangerLevel(val) {
    this.dangerFactor = Math.max(0.0, Math.min(1.0, val));
  }

  // A scary ghost scream synth when scaring humans
  playScare() {
    if (!this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    // 1. Noise Generator for breathy/screamy wind texture
    const bufferSize = this.ctx.sampleRate * 0.4; // 0.4 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, now);
    noiseFilter.Q.setValueAtTime(3.0, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    // 2. High Spooky Pitch Sweep (Oscillators)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const mainGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    osc1.frequency.linearRampToValueAtTime(100, now + 0.35);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(155, now);
    osc2.frequency.exponentialRampToValueAtTime(920, now + 0.1);
    osc2.frequency.linearRampToValueAtTime(80, now + 0.35);

    // Dynamic Filter to add ghost wail effect
    const waveFilter = this.ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.setValueAtTime(2000, now);
    waveFilter.frequency.exponentialRampToValueAtTime(500, now + 0.35);

    mainGain.gain.setValueAtTime(0.01, now);
    mainGain.gain.linearRampToValueAtTime(0.25, now + 0.05); // quick fade in
    mainGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4); // fade out

    osc1.connect(waveFilter);
    osc2.connect(waveFilter);
    waveFilter.connect(mainGain);
    mainGain.connect(this.ctx.destination);

    // Play both
    noiseNode.start(now);
    osc1.start(now);
    osc2.start(now);

    noiseNode.stop(now + 0.4);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  // Sound when caught in flashlight
  playStun() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    // Buzzing frequency modulation
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    mod.frequency.setValueAtTime(50, now); // 50 Hz buzz
    modGain.gain.setValueAtTime(150, now);
    
    mod.connect(modGain);
    modGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    mod.start(now);
    osc.start(now);
    
    mod.stop(now + 0.25);
    osc.stop(now + 0.25);
  }

  // Victory Chord
  playVictory() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C Major chord
    
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08); // Arpeggiated
      
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.05, now + i * 0.08 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 1.5);
    });
  }

  // Spooky game over synthesizer
  playGameOver() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(30, now + 1.2); // descending slide

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 1.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.5);
  }

  // Nice retro level up ping
  playLevelUp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(330, now); // E4
    osc1.frequency.setValueAtTime(440, now + 0.1); // A4
    osc1.frequency.setValueAtTime(660, now + 0.2); // E5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(333, now);
    osc2.frequency.setValueAtTime(443, now + 0.1);
    osc2.frequency.setValueAtTime(663, now + 0.2);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  }

  // Click UI
  playUIClick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Hover UI
  playUIHover() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

window.audio = new AudioManager();
