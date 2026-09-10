/**
 * Eurorack Sound Card CV Engine
 * 
 * Generates sample-accurate 1V/Octave Pitch CV and Envelope CV via Web Audio API.
 * Left Channel: Pitch CV (calibrated DC offset stream)
 * Right Channel: Envelope CV (ADSR & dynamic mouse-gesture modulation)
 * + Built-in 5-Just Reference Audio Monitor Synthesizer with Rich Multi-Octave Voice Layering
 */

import { CalibrationProfile, EnvelopeSettings, ProteodyNote, RichHarmonicsSettings } from '../types/synth';
import { calculateJustFrequency } from './tuning';

export interface MetaCascadeLayerInput {
  layerName: string;
  note: ProteodyNote;
  pkStage?: 'fast_receptor' | 'ion_channel' | 'neuromodulator' | 'metabolic_clearance';
  pkOnsetDelayMs?: number;
  pkHalfLifeMultiplier?: number;
  gain?: number;
  color?: string;
  pan?: number; // Spatial stereo pan: -1.0 (Left) to +1.0 (Right)
}

export const DEFAULT_RICH_HARMONICS: RichHarmonicsSettings = {
  enabled: true,
  preset: 'warm_octaves',
  baseGain: 0.88, // Fundamental (0 Octave)
  subOctave4Gain: 0.0, // -4 Octaves (f * 0.0625, ~16-20 Hz sub floor)
  subOctave3Gain: 0.08, // -3 Octaves (f * 0.125, ~32 Hz deep sub)
  subOctave2Gain: 0.18, // -2 Octaves (f * 0.25, ~64 Hz bass foundation)
  subOctave1Gain: 0.35, // -1 Octave (f * 0.5) warm body
  subOctave1Waveform: 'triangle',
  superOctave1Gain: 0.28, // +1 Octave (f * 2.0) presence & shimmer
  superOctave1Waveform: 'sine',
  superOctave2Gain: 0.16, // +2 Octaves (f * 4.0) brightness & chime
  superOctave3Gain: 0.12, // +3 Octaves (f * 8.0) crystal brilliance (~2 kHz)
  superOctave4Gain: 0.08, // +4 Octaves (f * 16.0) sparkle (~4 kHz)
  superOctave5Gain: 0.05, // +5 Octaves (f * 32.0) air band sheen (~8 kHz)
  superOctave6Gain: 0.04, // +6 Octaves (f * 64.0, ~16.4 kHz ceiling)
  fifthHarmonicGain: 0.10, // +1 Oct + Just 5th (f * 3.0) 3rd harmonic overtone
  thirdHarmonicGain: 0.08, // +2 Oct + Just 3rd (f * 5.0) 5th harmonic overtone
  analogDetuneCents: 4.0 // subtle chorus/unison warmth
};

export const RICH_HARMONICS_PRESETS: Record<string, { label: string; desc: string; values: Partial<RichHarmonicsSettings> }> = {
  full_audible_spectrum: {
    label: 'Full Audible Spectrum (20 Hz - 20 kHz)',
    desc: 'Complete 10-octave human hearing span: tectonic sub-rumble (-4 to -1) balanced with crystal shimmer and air (+1 to +6)',
    values: {
      preset: 'full_audible_spectrum',
      baseGain: 0.85,
      subOctave4Gain: 0.12,
      subOctave3Gain: 0.20,
      subOctave2Gain: 0.28,
      subOctave1Gain: 0.38,
      subOctave1Waveform: 'triangle',
      superOctave1Gain: 0.32,
      superOctave1Waveform: 'sine',
      superOctave2Gain: 0.22,
      superOctave3Gain: 0.18,
      superOctave4Gain: 0.14,
      superOctave5Gain: 0.10,
      superOctave6Gain: 0.08,
      fifthHarmonicGain: 0.12,
      thirdHarmonicGain: 0.10,
      analogDetuneCents: 5.0
    }
  },
  warm_octaves: {
    label: 'Warm Sub & Super (-1 & +1 Oct)',
    desc: 'Lush musical balance of warm sub-bass (-1 Oct @ 35%) and airy super-octaves (+1 to +3 Oct)',
    values: {
      preset: 'warm_octaves',
      baseGain: 0.88,
      subOctave4Gain: 0.0,
      subOctave3Gain: 0.08,
      subOctave2Gain: 0.18,
      subOctave1Gain: 0.35,
      subOctave1Waveform: 'triangle',
      superOctave1Gain: 0.28,
      superOctave1Waveform: 'sine',
      superOctave2Gain: 0.16,
      superOctave3Gain: 0.12,
      superOctave4Gain: 0.08,
      superOctave5Gain: 0.04,
      superOctave6Gain: 0.02,
      fifthHarmonicGain: 0.10,
      thirdHarmonicGain: 0.08,
      analogDetuneCents: 4.0
    }
  },
  deep_sub: {
    label: 'Deep Tectonic Sub (-4 to -1 Oct)',
    desc: 'Heavy physical low-end stack spanning 16 Hz - 130 Hz sub-audible foundation',
    values: {
      preset: 'deep_sub',
      baseGain: 0.85,
      subOctave4Gain: 0.25,
      subOctave3Gain: 0.40,
      subOctave2Gain: 0.45,
      subOctave1Gain: 0.50,
      subOctave1Waveform: 'triangle',
      superOctave1Gain: 0.12,
      superOctave1Waveform: 'sine',
      superOctave2Gain: 0.04,
      superOctave3Gain: 0.0,
      superOctave4Gain: 0.0,
      superOctave5Gain: 0.0,
      superOctave6Gain: 0.0,
      fifthHarmonicGain: 0.06,
      thirdHarmonicGain: 0.04,
      analogDetuneCents: 2.5
    }
  },
  cosmic_range: {
    label: 'Cosmic Shimmer (+1 to +6 Oct Air)',
    desc: 'Cascading upper harmonics from presence (+1 Oct) through crystal sparkle (+4) to auditory ceiling (+6, 16-20 kHz)',
    values: {
      preset: 'cosmic_range',
      baseGain: 0.78,
      subOctave4Gain: 0.0,
      subOctave3Gain: 0.0,
      subOctave2Gain: 0.08,
      subOctave1Gain: 0.20,
      subOctave1Waveform: 'sine',
      superOctave1Gain: 0.38,
      superOctave1Waveform: 'sawtooth',
      superOctave2Gain: 0.30,
      superOctave3Gain: 0.25,
      superOctave4Gain: 0.20,
      superOctave5Gain: 0.16,
      superOctave6Gain: 0.12,
      fifthHarmonicGain: 0.15,
      thirdHarmonicGain: 0.12,
      analogDetuneCents: 7.0
    }
  },
  cathedral: {
    label: 'Cathedral Organ (Grand Multi-Register)',
    desc: 'Massive 10-octave pipe organ registration covering from 32 Hz sub pipes to 16 kHz harmonic mixtures',
    values: {
      preset: 'cathedral',
      baseGain: 0.82,
      subOctave4Gain: 0.10,
      subOctave3Gain: 0.25,
      subOctave2Gain: 0.32,
      subOctave1Gain: 0.40,
      subOctave1Waveform: 'triangle',
      superOctave1Gain: 0.34,
      superOctave1Waveform: 'triangle',
      superOctave2Gain: 0.24,
      superOctave3Gain: 0.18,
      superOctave4Gain: 0.14,
      superOctave5Gain: 0.09,
      superOctave6Gain: 0.06,
      fifthHarmonicGain: 0.16,
      thirdHarmonicGain: 0.12,
      analogDetuneCents: 6.5
    }
  },
  sub_only: {
    label: 'Classic Sub Bass (-1 Oct Only)',
    desc: 'Subtle -1 octave triangle wave reinforcement at lower volume',
    values: {
      preset: 'sub_only',
      baseGain: 1.0,
      subOctave4Gain: 0.0,
      subOctave3Gain: 0.0,
      subOctave2Gain: 0.0,
      subOctave1Gain: 0.40,
      subOctave1Waveform: 'triangle',
      superOctave1Gain: 0.0,
      superOctave2Gain: 0.0,
      superOctave3Gain: 0.0,
      superOctave4Gain: 0.0,
      superOctave5Gain: 0.0,
      superOctave6Gain: 0.0,
      fifthHarmonicGain: 0.0,
      thirdHarmonicGain: 0.0,
      analogDetuneCents: 0.0
    }
  }
};

export class SoundCardCVEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;

  // Web Audio Nodes
  private merger: ChannelMergerNode | null = null;
  private pitchConstantNode: ConstantSourceNode | null = null;
  private pitchGainNode: GainNode | null = null;
  private envConstantNode: ConstantSourceNode | null = null;
  private envGainNode: GainNode | null = null;

  // Audible Monitor & Full-Range Multi-Octave Voice Layering Nodes (20 Hz - 20,000 Hz)
  private monitorOsc: OscillatorNode | null = null;
  private monitorDetuneOsc: OscillatorNode | null = null;
  
  // Sub-Octaves covering down to human tactile low-frequency limit (16 Hz - 20 Hz)
  private monitorSub4Osc: OscillatorNode | null = null; // -4 Octaves (f * 0.0625, ~16-20 Hz)
  private monitorSub3Osc: OscillatorNode | null = null; // -3 Octaves (f * 0.125, ~32 Hz)
  private monitorSub2Osc: OscillatorNode | null = null; // -2 Octaves (f * 0.25, ~64 Hz)
  private monitorSub1Osc: OscillatorNode | null = null; // -1 Octave (f * 0.50, ~128 Hz)

  // Super-Octaves covering up to human hearing ceiling (16,000 Hz - 20,000 Hz)
  private monitorSuper1Osc: OscillatorNode | null = null; // +1 Octave (f * 2.0, ~512 Hz)
  private monitorSuper2Osc: OscillatorNode | null = null; // +2 Octaves (f * 4.0, ~1024 Hz)
  private monitorSuper3Osc: OscillatorNode | null = null; // +3 Octaves (f * 8.0, ~2048 Hz)
  private monitorSuper4Osc: OscillatorNode | null = null; // +4 Octaves (f * 16.0, ~4096 Hz)
  private monitorSuper5Osc: OscillatorNode | null = null; // +5 Octaves (f * 32.0, ~8192 Hz)
  private monitorSuper6Osc: OscillatorNode | null = null; // +6 Octaves (f * 64.0, ~16384 - 20,000 Hz)

  // Natural Overtones
  private monitorFifthOsc: OscillatorNode | null = null; // 3rd Harmonic (f * 3.0, Just 12th)
  private monitorThirdOsc: OscillatorNode | null = null; // 5th Harmonic (f * 5.0, Just 17th)

  // Individual Voice Gain Attenuators
  private gainBase: GainNode | null = null;
  private gainDetune: GainNode | null = null;
  private gainSub4: GainNode | null = null;
  private gainSub3: GainNode | null = null;
  private gainSub2: GainNode | null = null;
  private gainSub1: GainNode | null = null;
  private gainSuper1: GainNode | null = null;
  private gainSuper2: GainNode | null = null;
  private gainSuper3: GainNode | null = null;
  private gainSuper4: GainNode | null = null;
  private gainSuper5: GainNode | null = null;
  private gainSuper6: GainNode | null = null;
  private gainFifth: GainNode | null = null;
  private gainThird: GainNode | null = null;
  private monitorHarmonicMixer: GainNode | null = null;

  // Spatial Stereo Panner Nodes for discrete 4-Voice Meta-Proteody Staging
  private pannerVoice0: StereoPannerNode | null = null;
  private pannerVoice1: StereoPannerNode | null = null;
  private pannerVoice2: StereoPannerNode | null = null;
  private pannerVoice3: StereoPannerNode | null = null;

  private monitorFilter: BiquadFilterNode | null = null;
  private monitorVca: GainNode | null = null;
  private monitorMasterGain: GainNode | null = null;

  // Oscilloscope ring buffers for visualization
  private readonly bufferSize = 2048;
  public pitchBuffer: Float32Array = new Float32Array(2048);
  public envBuffer: Float32Array = new Float32Array(2048);
  public audioBuffer: Float32Array = new Float32Array(2048);
  private writeIdx: number = 0;

  // Current instantaneous values
  public currentPitchVolts: number = 0;
  public currentEnvVolts: number = 0;
  public currentFrequency: number = 256.0;
  public currentChordFrequencies: number[] = [];
  public isGateActive: boolean = false;

  // Calibration and settings
  private profile: CalibrationProfile;
  private envelopeSettings: EnvelopeSettings;
  private lastNoteTime: number = 0;

  constructor(profile: CalibrationProfile, envelopeSettings: EnvelopeSettings) {
    this.profile = {
      ...profile,
      richHarmonics: profile.richHarmonics || { ...DEFAULT_RICH_HARMONICS }
    };
    this.envelopeSettings = envelopeSettings;
  }

  public async init() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.setupNodes();
    this.isRunning = true;
    this.startOscilloscopeFeeder();
  }

  private setupNodes() {
    if (!this.ctx) return;

    // 2-Channel Stereo Output for Sound Card (Left=Pitch CV, Right=Env CV)
    this.merger = this.ctx.createChannelMerger(2);

    // 1. Pitch CV Path
    this.pitchConstantNode = this.ctx.createConstantSource();
    this.pitchConstantNode.offset.setValueAtTime(0, this.ctx.currentTime);
    this.pitchGainNode = this.ctx.createGain();
    this.pitchGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.pitchConstantNode.connect(this.pitchGainNode);
    // Connect to Left channel (index 0) or right based on config
    const pitchChannelIdx = this.profile.outputChannels.pitchChannel === 'left' ? 0 : 1;
    this.pitchGainNode.connect(this.merger, 0, pitchChannelIdx);
    this.pitchConstantNode.start();

    // 2. Envelope CV Path
    this.envConstantNode = this.ctx.createConstantSource();
    this.envConstantNode.offset.setValueAtTime(0, this.ctx.currentTime);
    this.envGainNode = this.ctx.createGain();
    this.envGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.envConstantNode.connect(this.envGainNode);
    const envChannelIdx = this.profile.outputChannels.envelopeChannel === 'left' ? 0 : 1;
    if (this.profile.outputChannels.envelopeChannel !== 'none') {
      this.envGainNode.connect(this.merger, 0, envChannelIdx);
    }
    this.envConstantNode.start();

    // 3. Audible Reference Synth Monitor with Rich Multi-Octave Voice Layering
    const rh = this.profile.richHarmonics || { ...DEFAULT_RICH_HARMONICS };

    this.monitorHarmonicMixer = this.ctx.createGain();
    this.monitorHarmonicMixer.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // Fundamental (0 Octave)
    this.monitorOsc = this.ctx.createOscillator();
    this.monitorOsc.type = this.profile.monitorWaveform;
    this.monitorOsc.frequency.setValueAtTime(256.0, this.ctx.currentTime);
    this.gainBase = this.ctx.createGain();
    this.gainBase.gain.setValueAtTime(rh.enabled ? rh.baseGain : 1.0, this.ctx.currentTime);
    this.monitorOsc.connect(this.gainBase);

    // Setup Stereo Panner nodes if supported in Web Audio API
    if (typeof this.ctx.createStereoPanner === 'function') {
      this.pannerVoice0 = this.ctx.createStereoPanner();
      this.pannerVoice0.pan.setValueAtTime(0.0, this.ctx.currentTime); // Center (Target Receptor)
      this.gainBase.connect(this.pannerVoice0);
      this.pannerVoice0.connect(this.monitorHarmonicMixer);
    } else {
      this.gainBase.connect(this.monitorHarmonicMixer);
    }

    // Detuned Unison
    this.monitorDetuneOsc = this.ctx.createOscillator();
    this.monitorDetuneOsc.type = this.profile.monitorWaveform;
    this.monitorDetuneOsc.frequency.setValueAtTime(256.0 * 1.0023, this.ctx.currentTime);
    this.gainDetune = this.ctx.createGain();
    this.gainDetune.gain.setValueAtTime(rh.enabled && rh.analogDetuneCents > 0 ? 0.22 : 0.0, this.ctx.currentTime);
    this.monitorDetuneOsc.connect(this.gainDetune);
    this.gainDetune.connect(this.monitorHarmonicMixer);

    // Sub-Octave 4 (-4 Octaves, f * 0.0625, ~16-20 Hz tactile sub floor)
    this.monitorSub4Osc = this.ctx.createOscillator();
    this.monitorSub4Osc.type = 'sine';
    this.monitorSub4Osc.frequency.setValueAtTime(16.0, this.ctx.currentTime);
    this.gainSub4 = this.ctx.createGain();
    this.gainSub4.gain.setValueAtTime(rh.enabled ? (rh.subOctave4Gain || 0.0) : 0.0, this.ctx.currentTime);
    this.monitorSub4Osc.connect(this.gainSub4);
    this.gainSub4.connect(this.monitorHarmonicMixer);

    // Sub-Octave 3 (-3 Octaves, f * 0.125, ~32 Hz deep sub)
    this.monitorSub3Osc = this.ctx.createOscillator();
    this.monitorSub3Osc.type = 'sine';
    this.monitorSub3Osc.frequency.setValueAtTime(32.0, this.ctx.currentTime);
    this.gainSub3 = this.ctx.createGain();
    this.gainSub3.gain.setValueAtTime(rh.enabled ? (rh.subOctave3Gain || 0.0) : 0.0, this.ctx.currentTime);
    this.monitorSub3Osc.connect(this.gainSub3);
    this.gainSub3.connect(this.monitorHarmonicMixer);

    // Sub-Octave 2 (-2 Octaves, f * 0.25, ~64 Hz bass foundation)
    this.monitorSub2Osc = this.ctx.createOscillator();
    this.monitorSub2Osc.type = 'sine';
    this.monitorSub2Osc.frequency.setValueAtTime(64.0, this.ctx.currentTime);
    this.gainSub2 = this.ctx.createGain();
    this.gainSub2.gain.setValueAtTime(rh.enabled ? rh.subOctave2Gain : 0.0, this.ctx.currentTime);
    this.monitorSub2Osc.connect(this.gainSub2);
    this.gainSub2.connect(this.monitorHarmonicMixer);

    // Sub-Octave 1 (-1 Octave, f * 0.50, ~128 Hz warm body)
    this.monitorSub1Osc = this.ctx.createOscillator();
    this.monitorSub1Osc.type = rh.subOctave1Waveform || 'triangle';
    this.monitorSub1Osc.frequency.setValueAtTime(128.0, this.ctx.currentTime);
    this.gainSub1 = this.ctx.createGain();
    this.gainSub1.gain.setValueAtTime(rh.enabled ? rh.subOctave1Gain : 0.35, this.ctx.currentTime);
    this.monitorSub1Osc.connect(this.gainSub1);
    if (typeof this.ctx.createStereoPanner === 'function') {
      this.pannerVoice1 = this.ctx.createStereoPanner();
      this.pannerVoice1.pan.setValueAtTime(-0.45, this.ctx.currentTime); // Left-leaning (Ion Channel / Bass)
      this.gainSub1.connect(this.pannerVoice1);
      this.pannerVoice1.connect(this.monitorHarmonicMixer);
    } else {
      this.gainSub1.connect(this.monitorHarmonicMixer);
    }

    // Super-Octave 1 (+1 Octave, f * 2.0, ~512 Hz presence)
    this.monitorSuper1Osc = this.ctx.createOscillator();
    this.monitorSuper1Osc.type = rh.superOctave1Waveform || 'sine';
    this.monitorSuper1Osc.frequency.setValueAtTime(512.0, this.ctx.currentTime);
    this.gainSuper1 = this.ctx.createGain();
    this.gainSuper1.gain.setValueAtTime(rh.enabled ? rh.superOctave1Gain : 0.0, this.ctx.currentTime);
    this.monitorSuper1Osc.connect(this.gainSuper1);
    if (typeof this.ctx.createStereoPanner === 'function') {
      this.pannerVoice2 = this.ctx.createStereoPanner();
      this.pannerVoice2.pan.setValueAtTime(+0.55, this.ctx.currentTime); // Right-leaning (Neuromodulator / Shimmer)
      this.gainSuper1.connect(this.pannerVoice2);
      this.pannerVoice2.connect(this.monitorHarmonicMixer);
    } else {
      this.gainSuper1.connect(this.monitorHarmonicMixer);
    }

    // Super-Octave 2 (+2 Octaves, f * 4.0, ~1024 Hz brightness & chime)
    this.monitorSuper2Osc = this.ctx.createOscillator();
    this.monitorSuper2Osc.type = 'sine';
    this.monitorSuper2Osc.frequency.setValueAtTime(1024.0, this.ctx.currentTime);
    this.gainSuper2 = this.ctx.createGain();
    this.gainSuper2.gain.setValueAtTime(rh.enabled ? rh.superOctave2Gain : 0.0, this.ctx.currentTime);
    this.monitorSuper2Osc.connect(this.gainSuper2);
    this.gainSuper2.connect(this.monitorHarmonicMixer);

    // Super-Octave 3 (+3 Octaves, f * 8.0, ~2048 Hz crystal brilliance)
    this.monitorSuper3Osc = this.ctx.createOscillator();
    this.monitorSuper3Osc.type = 'sine';
    this.monitorSuper3Osc.frequency.setValueAtTime(2048.0, this.ctx.currentTime);
    this.gainSuper3 = this.ctx.createGain();
    this.gainSuper3.gain.setValueAtTime(rh.enabled ? (rh.superOctave3Gain || 0.0) : 0.0, this.ctx.currentTime);
    this.monitorSuper3Osc.connect(this.gainSuper3);
    this.gainSuper3.connect(this.monitorHarmonicMixer);

    // Super-Octave 4 (+4 Octaves, f * 16.0, ~4096 Hz sparkle top)
    this.monitorSuper4Osc = this.ctx.createOscillator();
    this.monitorSuper4Osc.type = 'sine';
    this.monitorSuper4Osc.frequency.setValueAtTime(4096.0, this.ctx.currentTime);
    this.gainSuper4 = this.ctx.createGain();
    this.gainSuper4.gain.setValueAtTime(rh.enabled ? (rh.superOctave4Gain || 0.0) : 0.0, this.ctx.currentTime);
    this.monitorSuper4Osc.connect(this.gainSuper4);
    this.gainSuper4.connect(this.monitorHarmonicMixer);

    // Super-Octave 5 (+5 Octaves, f * 32.0, ~8192 Hz air band sheen)
    this.monitorSuper5Osc = this.ctx.createOscillator();
    this.monitorSuper5Osc.type = 'sine';
    this.monitorSuper5Osc.frequency.setValueAtTime(8192.0, this.ctx.currentTime);
    this.gainSuper5 = this.ctx.createGain();
    this.gainSuper5.gain.setValueAtTime(rh.enabled ? (rh.superOctave5Gain || 0.0) : 0.0, this.ctx.currentTime);
    this.monitorSuper5Osc.connect(this.gainSuper5);
    this.gainSuper5.connect(this.monitorHarmonicMixer);

    // Super-Octave 6 (+6 Octaves, f * 64.0, ~16384 - 20,000 Hz human auditory ceiling)
    this.monitorSuper6Osc = this.ctx.createOscillator();
    this.monitorSuper6Osc.type = 'sine';
    this.monitorSuper6Osc.frequency.setValueAtTime(16384.0, this.ctx.currentTime);
    this.gainSuper6 = this.ctx.createGain();
    this.gainSuper6.gain.setValueAtTime(rh.enabled ? (rh.superOctave6Gain || 0.0) : 0.0, this.ctx.currentTime);
    this.monitorSuper6Osc.connect(this.gainSuper6);
    this.gainSuper6.connect(this.monitorHarmonicMixer);

    // Fifth Harmonic (+1 Oct + 5th, f * 3.0, Just 12th)
    this.monitorFifthOsc = this.ctx.createOscillator();
    this.monitorFifthOsc.type = 'sine';
    this.monitorFifthOsc.frequency.setValueAtTime(768.0, this.ctx.currentTime);
    this.gainFifth = this.ctx.createGain();
    this.gainFifth.gain.setValueAtTime(rh.enabled ? rh.fifthHarmonicGain : 0.0, this.ctx.currentTime);
    this.monitorFifthOsc.connect(this.gainFifth);
    if (typeof this.ctx.createStereoPanner === 'function') {
      this.pannerVoice3 = this.ctx.createStereoPanner();
      this.pannerVoice3.pan.setValueAtTime(+0.15, this.ctx.currentTime); // Center-Right (Metabolic Clearance)
      this.gainFifth.connect(this.pannerVoice3);
      this.pannerVoice3.connect(this.monitorHarmonicMixer);
    } else {
      this.gainFifth.connect(this.monitorHarmonicMixer);
    }

    // Third Harmonic (+2 Oct + 3rd, f * 5.0, Just 17th)
    this.monitorThirdOsc = this.ctx.createOscillator();
    this.monitorThirdOsc.type = 'sine';
    this.monitorThirdOsc.frequency.setValueAtTime(1280.0, this.ctx.currentTime);
    this.gainThird = this.ctx.createGain();
    this.gainThird.gain.setValueAtTime(rh.enabled ? (rh.thirdHarmonicGain || 0.0) : 0.0, this.ctx.currentTime);
    this.monitorThirdOsc.connect(this.gainThird);
    this.gainThird.connect(this.monitorHarmonicMixer);

    // Filter & VCA (Filter set to transparent 18,000 Hz to retain full audible spectrum)
    this.monitorFilter = this.ctx.createBiquadFilter();
    this.monitorFilter.type = 'lowpass';
    this.monitorFilter.frequency.setValueAtTime(18000, this.ctx.currentTime);
    this.monitorFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    this.monitorVca = this.ctx.createGain();
    this.monitorVca.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.monitorMasterGain = this.ctx.createGain();
    this.monitorMasterGain.gain.setValueAtTime(
      this.profile.enableAudibleMonitor ? this.profile.monitorVolume : 0.0,
      this.ctx.currentTime
    );

    this.monitorHarmonicMixer.connect(this.monitorFilter);
    this.monitorFilter.connect(this.monitorVca);
    this.monitorVca.connect(this.monitorMasterGain);

    // Connect monitor to audio destination (both stereo channels)
    this.monitorMasterGain.connect(this.ctx.destination);

    this.monitorOsc.start();
    this.monitorDetuneOsc.start();
    this.monitorSub4Osc.start();
    this.monitorSub3Osc.start();
    this.monitorSub2Osc.start();
    this.monitorSub1Osc.start();
    this.monitorSuper1Osc.start();
    this.monitorSuper2Osc.start();
    this.monitorSuper3Osc.start();
    this.monitorSuper4Osc.start();
    this.monitorSuper5Osc.start();
    this.monitorSuper6Osc.start();
    this.monitorFifthOsc.start();
    this.monitorThirdOsc.start();

    // Connect CV merger to physical sound card outputs
    this.merger.connect(this.ctx.destination);
  }

  /**
   * Apply VCO Calibration formula to target Eurorack voltage
   * V_calibrated = (V_target * slope + offset) + OctaveCorrection(k)
   * Normalized DAC = V_calibrated / soundCardMaxVoltage
   */
  public calibrateVoltage(targetVolts: number): number {
    let calibrated = targetVolts * this.profile.slope + this.profile.offset;

    // Apply piecewise octave corrections
    const oct = Math.floor(targetVolts);
    const frac = targetVolts - oct;
    const corrections = this.profile.octaveCorrections;

    let corrA = 0;
    let corrB = 0;
    if (oct <= 0) {
      corrA = corrections.c1;
      corrB = corrections.c2;
    } else if (oct === 1) {
      corrA = corrections.c2;
      corrB = corrections.c3;
    } else if (oct === 2) {
      corrA = corrections.c3;
      corrB = corrections.c4;
    } else if (oct === 3) {
      corrA = corrections.c4;
      corrB = corrections.c5;
    } else {
      corrA = corrections.c5;
      corrB = corrections.c6;
    }

    const interpolatedOffset = corrA + frac * (corrB - corrA);
    calibrated += interpolatedOffset;

    if (this.profile.outputChannels.invertPitch) {
      calibrated = -calibrated;
    }

    // Normalized DAC value between -1.0 and +1.0
    const maxV = Math.max(1.0, this.profile.soundCardMaxVoltage);
    const dacValue = Math.max(-1.0, Math.min(1.0, calibrated / maxV));
    return dacValue;
  }

  /**
   * Trigger a 5-Just Proteody Note with Multi-Octave Voice Layering
   */
  public triggerNote(note: ProteodyNote, durationSeconds: number, gateFraction: number = 0.75) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const glide = this.profile.glideTime || 0.005;

    this.currentFrequency = note.frequency;
    this.currentPitchVolts = note.targetVoltage;
    this.isGateActive = true;

    // 1. Update Pitch CV on Sound Card (Left Channel)
    const dacPitch = this.calibrateVoltage(note.targetVoltage);
    if (this.pitchConstantNode) {
      this.pitchConstantNode.offset.cancelScheduledValues(now);
      this.pitchConstantNode.offset.setValueAtTime(this.pitchConstantNode.offset.value, now);
      this.pitchConstantNode.offset.linearRampToValueAtTime(dacPitch, now + glide);
    }

    // 2. Update Audible Reference Synth & All Multi-Octave Harmonic Oscillators
    const f = Math.max(10, note.frequency);
    const rh = this.profile.richHarmonics || DEFAULT_RICH_HARMONICS;
    const detuneRatio = Math.pow(2, (rh.analogDetuneCents || 4.0) / 1200);

    if (this.monitorOsc) {
      this.monitorOsc.frequency.cancelScheduledValues(now);
      this.monitorOsc.frequency.setValueAtTime(this.monitorOsc.frequency.value, now);
      this.monitorOsc.frequency.exponentialRampToValueAtTime(f, now + glide);
    }

    if (this.monitorDetuneOsc) {
      this.monitorDetuneOsc.frequency.cancelScheduledValues(now);
      this.monitorDetuneOsc.frequency.setValueAtTime(this.monitorDetuneOsc.frequency.value, now);
      this.monitorDetuneOsc.frequency.exponentialRampToValueAtTime(f * detuneRatio, now + glide);
    }

    // Sub-Octaves (clamped to audible physical floor > 10 Hz)
    if (this.monitorSub4Osc) {
      this.monitorSub4Osc.frequency.cancelScheduledValues(now);
      this.monitorSub4Osc.frequency.setValueAtTime(this.monitorSub4Osc.frequency.value, now);
      this.monitorSub4Osc.frequency.exponentialRampToValueAtTime(Math.max(12, f * 0.0625), now + glide);
    }

    if (this.monitorSub3Osc) {
      this.monitorSub3Osc.frequency.cancelScheduledValues(now);
      this.monitorSub3Osc.frequency.setValueAtTime(this.monitorSub3Osc.frequency.value, now);
      this.monitorSub3Osc.frequency.exponentialRampToValueAtTime(Math.max(14, f * 0.125), now + glide);
    }

    if (this.monitorSub2Osc) {
      this.monitorSub2Osc.frequency.cancelScheduledValues(now);
      this.monitorSub2Osc.frequency.setValueAtTime(this.monitorSub2Osc.frequency.value, now);
      this.monitorSub2Osc.frequency.exponentialRampToValueAtTime(Math.max(16, f * 0.25), now + glide);
    }

    if (this.monitorSub1Osc) {
      this.monitorSub1Osc.frequency.cancelScheduledValues(now);
      this.monitorSub1Osc.frequency.setValueAtTime(this.monitorSub1Osc.frequency.value, now);
      this.monitorSub1Osc.frequency.exponentialRampToValueAtTime(Math.max(18, f * 0.50), now + glide);
    }

    // Super-Octaves (scaled up to human hearing ceiling 20,000 Hz)
    if (this.monitorSuper1Osc) {
      this.monitorSuper1Osc.frequency.cancelScheduledValues(now);
      this.monitorSuper1Osc.frequency.setValueAtTime(this.monitorSuper1Osc.frequency.value, now);
      this.monitorSuper1Osc.frequency.exponentialRampToValueAtTime(Math.min(20000, f * 2.0), now + glide);
    }

    if (this.monitorSuper2Osc) {
      this.monitorSuper2Osc.frequency.cancelScheduledValues(now);
      this.monitorSuper2Osc.frequency.setValueAtTime(this.monitorSuper2Osc.frequency.value, now);
      this.monitorSuper2Osc.frequency.exponentialRampToValueAtTime(Math.min(20000, f * 4.0), now + glide);
    }

    if (this.monitorSuper3Osc) {
      this.monitorSuper3Osc.frequency.cancelScheduledValues(now);
      this.monitorSuper3Osc.frequency.setValueAtTime(this.monitorSuper3Osc.frequency.value, now);
      this.monitorSuper3Osc.frequency.exponentialRampToValueAtTime(Math.min(20000, f * 8.0), now + glide);
    }

    if (this.monitorSuper4Osc) {
      this.monitorSuper4Osc.frequency.cancelScheduledValues(now);
      this.monitorSuper4Osc.frequency.setValueAtTime(this.monitorSuper4Osc.frequency.value, now);
      this.monitorSuper4Osc.frequency.exponentialRampToValueAtTime(Math.min(20000, f * 16.0), now + glide);
    }

    if (this.monitorSuper5Osc) {
      this.monitorSuper5Osc.frequency.cancelScheduledValues(now);
      this.monitorSuper5Osc.frequency.setValueAtTime(this.monitorSuper5Osc.frequency.value, now);
      this.monitorSuper5Osc.frequency.exponentialRampToValueAtTime(Math.min(20000, f * 32.0), now + glide);
    }

    if (this.monitorSuper6Osc) {
      this.monitorSuper6Osc.frequency.cancelScheduledValues(now);
      this.monitorSuper6Osc.frequency.setValueAtTime(this.monitorSuper6Osc.frequency.value, now);
      this.monitorSuper6Osc.frequency.exponentialRampToValueAtTime(Math.min(20000, f * 64.0), now + glide);
    }

    // Overtones
    if (this.monitorFifthOsc) {
      this.monitorFifthOsc.frequency.cancelScheduledValues(now);
      this.monitorFifthOsc.frequency.setValueAtTime(this.monitorFifthOsc.frequency.value, now);
      this.monitorFifthOsc.frequency.exponentialRampToValueAtTime(Math.min(20000, f * 3.0), now + glide);
    }

    if (this.monitorThirdOsc) {
      this.monitorThirdOsc.frequency.cancelScheduledValues(now);
      this.monitorThirdOsc.frequency.setValueAtTime(this.monitorThirdOsc.frequency.value, now);
      this.monitorThirdOsc.frequency.exponentialRampToValueAtTime(Math.min(20000, f * 5.0), now + glide);
    }

    // 3. Shape Envelope CV on Sound Card (Right Channel) & Monitor VCA
    const gateTime = Math.max(0.02, durationSeconds * gateFraction);
    const env = this.envelopeSettings;
    const maxEnvV = env.maxVoltage || 5.0;
    const maxSoundcardV = Math.max(1.0, this.profile.soundCardMaxVoltage);
    const dacMaxEnv = Math.min(1.0, maxEnvV / maxSoundcardV);

    const attackTime = Math.min(gateTime * 0.45, Math.max(0.002, env.attack));
    const decayTime = Math.max(0.01, env.decay);
    const sustainLevel = Math.max(0.0, Math.min(1.0, env.sustain));
    const releaseTime = Math.max(0.01, env.release);

    if (this.envConstantNode) {
      this.envConstantNode.offset.cancelScheduledValues(now);
      this.envConstantNode.offset.setValueAtTime(0.0, now);
      // Attack peak
      this.envConstantNode.offset.linearRampToValueAtTime(dacMaxEnv, now + attackTime);
      // Decay to Sustain
      this.envConstantNode.offset.linearRampToValueAtTime(dacMaxEnv * sustainLevel, now + attackTime + decayTime);
      // Gate Hold until gateTime
      if (gateTime > attackTime + decayTime) {
        this.envConstantNode.offset.setValueAtTime(dacMaxEnv * sustainLevel, now + gateTime);
      }
      // Release to 0
      this.envConstantNode.offset.linearRampToValueAtTime(0.0, now + gateTime + releaseTime);
    }

    // Monitor VCA Envelope
    if (this.monitorVca && this.monitorFilter) {
      this.monitorVca.gain.cancelScheduledValues(now);
      this.monitorVca.gain.setValueAtTime(0.0, now);
      this.monitorVca.gain.linearRampToValueAtTime(note.velocity * 0.8, now + attackTime);
      this.monitorVca.gain.linearRampToValueAtTime(note.velocity * 0.8 * sustainLevel, now + attackTime + decayTime);
      if (gateTime > attackTime + decayTime) {
        this.monitorVca.gain.setValueAtTime(note.velocity * 0.8 * sustainLevel, now + gateTime);
      }
      this.monitorVca.gain.linearRampToValueAtTime(0.0, now + gateTime + releaseTime);

      // Dynamic Filter Follower - opens higher when super-octaves are active for rich brilliance
      this.monitorFilter.frequency.cancelScheduledValues(now);
      const superActive = rh.enabled && (
        (rh.superOctave1Gain || 0) > 0.05 ||
        (rh.superOctave2Gain || 0) > 0.05 ||
        (rh.superOctave3Gain || 0) > 0.05 ||
        (rh.superOctave4Gain || 0) > 0.05 ||
        (rh.superOctave5Gain || 0) > 0.05 ||
        (rh.superOctave6Gain || 0) > 0.05
      );
      const baseFilterHz = note.frequency * (superActive ? 4.0 : 2.5);
      this.monitorFilter.frequency.setValueAtTime(Math.max(200, Math.min(20000, baseFilterHz)), now);
      this.monitorFilter.frequency.exponentialRampToValueAtTime(
        Math.min(20000, baseFilterHz + (superActive ? 12000 : 4000) * sustainLevel),
        now + attackTime
      );
    }

    this.lastNoteTime = now;
  }

  /**
   * Trigger a Meta-Proteody with authentic Pharmacokinetic (PK/PD) cascades and secondary structure folding articulation.
   * - In PK/PD cascade mode: Voices enter with realistic biological delays:
   *   1. Target Receptor Binding (e.g. ADORA2A) at t = 0ms
   *   2. Ion Channel Ca2+ Flux (e.g. RYR1) at t = +45ms
   *   3. Post-synaptic Neuromodulation (e.g. DRD2) at t = +90ms
   *   4. Hepatic Clearance (e.g. CYP1A2) at t = +140ms with elongated clearance half-life tail
   * - In Secondary Structure mode:
   *   α-Helix (tight hydrogen bonds): staccato, punchy transient, 0.70x gate length
   *   β-Sheet (pleated strands): balanced body, 0.95x gate length
   *   Loop/Coil (active dynamic loops): fluid legato sustain, 1.30x gate length
   * - Outputs authentic PK plasma concentration curve on Eurorack Right Channel Envelope CV.
   */
  public triggerMetaCascade(
    layers: MetaCascadeLayerInput[],
    durationSeconds: number,
    gateFraction: number = 0.75,
    pkMode: 'pk_cascade' | 'simultaneous_chord' = 'pk_cascade',
    pkTimeScale: number = 1.0,
    enableSecondaryStructure: boolean = true,
    pkClearanceTailMultiplier: number = 2.2
  ) {
    if (!this.ctx || layers.length === 0) return;
    const now = this.ctx.currentTime;
    const glide = this.profile.glideTime || 0.005;

    // Extract notes
    const notes = layers.map(l => l.note);
    this.currentChordFrequencies = notes.map(n => n.frequency);

    const primaryNote = notes[0];
    this.currentFrequency = primaryNote.frequency;
    this.currentPitchVolts = primaryNote.targetVoltage;
    this.isGateActive = true;

    // 1. Eurorack Left Channel: Primary / Root Pitch CV (clean 1V/Oct tracking)
    const dacPitch = this.calibrateVoltage(primaryNote.targetVoltage);
    if (this.pitchConstantNode) {
      this.pitchConstantNode.offset.cancelScheduledValues(now);
      this.pitchConstantNode.offset.setValueAtTime(this.pitchConstantNode.offset.value, now);
      this.pitchConstantNode.offset.linearRampToValueAtTime(dacPitch, now + glide);
    }

    // 2. Audible Reference Synth: Pitch allocation across oscillator bank
    const f0 = notes[0] ? notes[0].frequency : 256.0;
    const f1 = notes[1] ? notes[1].frequency : f0 * 0.5;
    const f2 = notes[2] ? notes[2].frequency : f0 * 2.0;
    const f3 = notes[3] ? notes[3].frequency : f0 * 1.5;

    // Apply spatial stereo staging per protein voice
    if (this.pannerVoice0) {
      const pan0 = layers[0]?.pan !== undefined ? layers[0].pan : 0.0;
      this.pannerVoice0.pan.cancelScheduledValues(now);
      this.pannerVoice0.pan.linearRampToValueAtTime(pan0, now + 0.02);
    }
    if (this.pannerVoice1) {
      const pan1 = layers[1]?.pan !== undefined ? layers[1].pan : -0.45;
      this.pannerVoice1.pan.cancelScheduledValues(now);
      this.pannerVoice1.pan.linearRampToValueAtTime(pan1, now + 0.02);
    }
    if (this.pannerVoice2) {
      const pan2 = layers[2]?.pan !== undefined ? layers[2].pan : +0.55;
      this.pannerVoice2.pan.cancelScheduledValues(now);
      this.pannerVoice2.pan.linearRampToValueAtTime(pan2, now + 0.02);
    }
    if (this.pannerVoice3) {
      const pan3 = layers[3]?.pan !== undefined ? layers[3].pan : +0.15;
      this.pannerVoice3.pan.cancelScheduledValues(now);
      this.pannerVoice3.pan.linearRampToValueAtTime(pan3, now + 0.02);
    }

    if (this.monitorOsc) {
      this.monitorOsc.frequency.cancelScheduledValues(now);
      this.monitorOsc.frequency.setValueAtTime(this.monitorOsc.frequency.value, now);
      this.monitorOsc.frequency.exponentialRampToValueAtTime(f0, now + glide);
    }

    if (this.monitorDetuneOsc) {
      this.monitorDetuneOsc.frequency.cancelScheduledValues(now);
      this.monitorDetuneOsc.frequency.setValueAtTime(this.monitorDetuneOsc.frequency.value, now);
      this.monitorDetuneOsc.frequency.exponentialRampToValueAtTime(f0 * 1.002, now + glide);
    }

    if (this.monitorSub1Osc) {
      this.monitorSub1Osc.frequency.cancelScheduledValues(now);
      this.monitorSub1Osc.frequency.setValueAtTime(this.monitorSub1Osc.frequency.value, now);
      this.monitorSub1Osc.frequency.exponentialRampToValueAtTime(Math.max(5, f1), now + glide);
    }

    if (this.monitorSuper1Osc) {
      this.monitorSuper1Osc.frequency.cancelScheduledValues(now);
      this.monitorSuper1Osc.frequency.setValueAtTime(this.monitorSuper1Osc.frequency.value, now);
      this.monitorSuper1Osc.frequency.exponentialRampToValueAtTime(Math.min(18000, f2), now + glide);
    }

    if (this.monitorFifthOsc) {
      this.monitorFifthOsc.frequency.cancelScheduledValues(now);
      this.monitorFifthOsc.frequency.setValueAtTime(this.monitorFifthOsc.frequency.value, now);
      this.monitorFifthOsc.frequency.exponentialRampToValueAtTime(Math.min(19000, f3), now + glide);
    }

    // 3. Pharmacokinetic Cascade Timing & Articulation Calculations
    const isCascade = pkMode === 'pk_cascade';
    const onset0 = isCascade ? ((layers[0]?.pkOnsetDelayMs ?? 0) / 1000) * pkTimeScale : 0;
    const onset1 = isCascade ? ((layers[1]?.pkOnsetDelayMs ?? 45) / 1000) * pkTimeScale : 0;
    const onset2 = isCascade ? ((layers[2]?.pkOnsetDelayMs ?? 90) / 1000) * pkTimeScale : 0;
    const onset3 = isCascade ? ((layers[3]?.pkOnsetDelayMs ?? 140) / 1000) * pkTimeScale : 0;

    const baseGateSec = Math.max(0.04, durationSeconds * gateFraction);
    const gate0 = baseGateSec * (enableSecondaryStructure ? (layers[0]?.note.structureGateMultiplier ?? 1.0) : 1.0);
    const gate1 = baseGateSec * (enableSecondaryStructure ? (layers[1]?.note.structureGateMultiplier ?? 1.0) : 1.0);
    const gate2 = baseGateSec * (enableSecondaryStructure ? (layers[2]?.note.structureGateMultiplier ?? 1.0) : 1.0);
    const gate3 = baseGateSec * (enableSecondaryStructure ? (layers[3]?.note.structureGateMultiplier ?? 1.0) : 1.0);

    const env = this.envelopeSettings;
    const baseRelease = Math.max(0.02, env.release);
    const rel0 = baseRelease * (layers[0]?.pkHalfLifeMultiplier ?? 1.0);
    const rel1 = baseRelease * (layers[1]?.pkHalfLifeMultiplier ?? 1.15);
    const rel2 = baseRelease * (layers[2]?.pkHalfLifeMultiplier ?? 1.35);
    const rel3 = baseRelease * (layers[3]?.pkHalfLifeMultiplier ?? 2.2) * (pkClearanceTailMultiplier / 2.2);

    const end0 = now + onset0 + gate0 + rel0;
    const end1 = now + onset1 + gate1 + rel1;
    const end2 = now + onset2 + gate2 + rel2;
    const end3 = now + onset3 + gate3 + rel3;
    const maxFinishTime = Math.max(end0, end1, end2, end3);

    const att0 = Math.min(gate0 * 0.35, Math.max(0.003, env.attack * 0.7));
    const att1 = Math.min(gate1 * 0.40, Math.max(0.015, env.attack * 1.2));
    const att2 = Math.min(gate2 * 0.35, Math.max(0.008, env.attack * 0.9));
    const att3 = Math.min(gate3 * 0.40, Math.max(0.020, env.attack * 1.1));

    const dec = Math.max(0.015, env.decay);
    const sust = Math.max(0.1, Math.min(1.0, env.sustain));

    const g0 = (layers[0]?.gain ?? 0.85) * 0.90;
    const g1 = (layers[1]?.gain ?? 0.80) * 0.85;
    const g2 = (layers[2]?.gain ?? 0.70) * 0.75;
    const g3 = (layers[3]?.gain ?? 0.75) * 0.80;

    // Helper to schedule individual layer gain envelope
    const scheduleGain = (
      node: GainNode | null,
      onset: number,
      attack: number,
      gate: number,
      release: number,
      targetGain: number,
      sustainMult: number
    ) => {
      if (!node) return;
      const tStart = now + onset;
      node.gain.cancelScheduledValues(now);
      node.gain.setValueAtTime(0.0, now);
      if (onset > 0) {
        node.gain.setValueAtTime(0.0, tStart);
      }
      // Attack
      node.gain.linearRampToValueAtTime(targetGain, tStart + attack);
      // Decay
      node.gain.linearRampToValueAtTime(targetGain * sust * sustainMult, tStart + attack + dec);
      // Sustain hold
      if (gate > attack + dec) {
        node.gain.setValueAtTime(targetGain * sust * sustainMult, tStart + gate);
      }
      // Biological Release
      node.gain.linearRampToValueAtTime(0.0, tStart + gate + release);
    };

    scheduleGain(this.gainBase, onset0, att0, gate0, rel0, g0, 0.75);
    scheduleGain(this.gainSub1, onset1, att1, gate1, rel1, g1, 0.90);
    scheduleGain(this.gainSuper1, onset2, att2, gate2, rel2, g2, 0.70);
    scheduleGain(this.gainFifth, onset3, att3, gate3, rel3, g3, 0.95);

    // 4. Master Monitor VCA & Dynamic Filter Follower
    if (this.monitorVca && this.monitorFilter) {
      this.monitorVca.gain.cancelScheduledValues(now);
      this.monitorVca.gain.setValueAtTime(1.0, now);
      this.monitorVca.gain.setValueAtTime(1.0, maxFinishTime);
      this.monitorVca.gain.linearRampToValueAtTime(0.0, maxFinishTime + 0.05);

      this.monitorFilter.frequency.cancelScheduledValues(now);
      this.monitorFilter.frequency.setValueAtTime(Math.max(300, f0 * 2.5), now);
      // When DRD2 dopamine enters, expand filter to bright shimmer
      if (isCascade && onset2 > 0) {
        this.monitorFilter.frequency.setValueAtTime(f0 * 2.5, now + onset2);
        this.monitorFilter.frequency.exponentialRampToValueAtTime(
          Math.min(18000, f0 * 4.0 + 7500),
          now + onset2 + att2
        );
      } else {
        this.monitorFilter.frequency.exponentialRampToValueAtTime(
          Math.min(16000, f0 * 3.5 + 4000 * sust),
          now + att0
        );
      }
      this.monitorFilter.frequency.exponentialRampToValueAtTime(400, maxFinishTime + 0.05);
    }

    // 5. Eurorack Right Channel: Pharmacokinetic Plasma Concentration Envelope CV
    const maxEnvV = env.maxVoltage || 5.0;
    const maxSoundcardV = Math.max(1.0, this.profile.soundCardMaxVoltage);
    const dacMaxEnv = Math.min(1.0, maxEnvV / maxSoundcardV);

    if (this.envConstantNode) {
      this.envConstantNode.offset.cancelScheduledValues(now);
      this.envConstantNode.offset.setValueAtTime(0.0, now);

      if (isCascade) {
        // True PK/PD 3-phase plasma concentration curve:
        // Phase 1: Rapid receptor binding spike
        this.envConstantNode.offset.linearRampToValueAtTime(dacMaxEnv * 0.82, now + onset0 + att0);
        // Phase 2: Physiological peak (muscular Ca2+ and striatal dopamine activation)
        if (onset1 > 0) {
          this.envConstantNode.offset.linearRampToValueAtTime(dacMaxEnv * 0.78, now + onset1);
        }
        this.envConstantNode.offset.linearRampToValueAtTime(dacMaxEnv, now + onset2 + att2);
        // Plateau hold through gates
        const maxGate = Math.max(onset0 + gate0, onset1 + gate1, onset2 + gate2);
        this.envConstantNode.offset.setValueAtTime(dacMaxEnv * sust, now + maxGate);
        // Phase 3: Prolonged hepatic clearance half-life release tail
        this.envConstantNode.offset.linearRampToValueAtTime(0.0, maxFinishTime);
      } else {
        // Simultaneous Chord ADSR
        this.envConstantNode.offset.linearRampToValueAtTime(dacMaxEnv, now + att0);
        this.envConstantNode.offset.linearRampToValueAtTime(dacMaxEnv * sust, now + att0 + dec);
        if (gate0 > att0 + dec) {
          this.envConstantNode.offset.setValueAtTime(dacMaxEnv * sust, now + gate0);
        }
        this.envConstantNode.offset.linearRampToValueAtTime(0.0, now + gate0 + rel0);
      }
    }

    this.lastNoteTime = now;
  }

  /**
   * Trigger a Meta-Proteody polyphonic chord (multi-protein mixture played simultaneously)
   * Backwards compatible wrapper for triggerMetaCascade
   */
  public triggerChord(notes: ProteodyNote[], durationSeconds: number, gateFraction: number = 0.75) {
    const layers: MetaCascadeLayerInput[] = notes.map((n, i) => ({
      layerName: `Voice ${i + 1}`,
      note: n,
      gain: 0.85 - i * 0.05
    }));
    this.triggerMetaCascade(layers, durationSeconds, gateFraction, 'simultaneous_chord', 1.0, false);
  }

  /**
   * Real-time Multi-Octave Harmonics Updater
   */
  public updateRichHarmonics(rh: RichHarmonicsSettings) {
    this.profile.richHarmonics = rh;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const isEn = rh.enabled;

    const setGain = (gNode: GainNode | null, targetVal: number) => {
      if (!gNode) return;
      gNode.gain.cancelScheduledValues(now);
      gNode.gain.linearRampToValueAtTime(Math.max(0, Math.min(1.0, targetVal)), now + 0.02);
    };

    setGain(this.gainBase, isEn ? rh.baseGain : 1.0);
    setGain(this.gainDetune, isEn && rh.analogDetuneCents > 0 ? 0.22 : 0.0);
    setGain(this.gainSub4, isEn ? (rh.subOctave4Gain || 0.0) : 0.0);
    setGain(this.gainSub3, isEn ? (rh.subOctave3Gain || 0.0) : 0.0);
    setGain(this.gainSub2, isEn ? rh.subOctave2Gain : 0.0);
    setGain(this.gainSub1, isEn ? rh.subOctave1Gain : 0.0);
    setGain(this.gainSuper1, isEn ? rh.superOctave1Gain : 0.0);
    setGain(this.gainSuper2, isEn ? rh.superOctave2Gain : 0.0);
    setGain(this.gainSuper3, isEn ? (rh.superOctave3Gain || 0.0) : 0.0);
    setGain(this.gainSuper4, isEn ? (rh.superOctave4Gain || 0.0) : 0.0);
    setGain(this.gainSuper5, isEn ? (rh.superOctave5Gain || 0.0) : 0.0);
    setGain(this.gainSuper6, isEn ? (rh.superOctave6Gain || 0.0) : 0.0);
    setGain(this.gainFifth, isEn ? rh.fifthHarmonicGain : 0.0);
    setGain(this.gainThird, isEn ? (rh.thirdHarmonicGain || 0.0) : 0.0);

    if (this.monitorSub1Osc && rh.subOctave1Waveform) {
      this.monitorSub1Osc.type = rh.subOctave1Waveform;
    }
    if (this.monitorSuper1Osc && rh.superOctave1Waveform) {
      this.monitorSuper1Osc.type = rh.superOctave1Waveform;
    }
  }

  /**
   * Output constant direct Test Voltage for VCO zeroing & calibration multimeter test
   */
  public outputDirectCalibrationVoltage(volts: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.currentPitchVolts = volts;
    const dacPitch = this.calibrateVoltage(volts);

    if (this.pitchConstantNode) {
      this.pitchConstantNode.offset.cancelScheduledValues(now);
      this.pitchConstantNode.offset.setValueAtTime(dacPitch, now);
    }
  }

  /**
   * Live mouse modulation updater (real-time dynamic envelope shaping)
   */
  public updateMouseModulation(x: number, y: number, isMouseDown: boolean) {
    const attack = 0.005 + x * 0.8;
    const decay = 0.05 + (1 - x) * 0.9;
    const sustain = Math.max(0.05, Math.min(1.0, 1 - y));
    const release = 0.02 + y * 1.2;

    this.envelopeSettings = {
      ...this.envelopeSettings,
      attack,
      decay,
      sustain,
      release
    };

    if (isMouseDown && this.envConstantNode && this.ctx) {
      const now = this.ctx.currentTime;
      const liveDac = (1 - y) * (this.envelopeSettings.maxVoltage / this.profile.soundCardMaxVoltage);
      this.envConstantNode.offset.cancelScheduledValues(now);
      this.envConstantNode.offset.linearRampToValueAtTime(Math.min(1.0, liveDac), now + 0.02);

      if (this.monitorVca) {
        this.monitorVca.gain.cancelScheduledValues(now);
        this.monitorVca.gain.linearRampToValueAtTime(sustain * 0.7, now + 0.02);
      }
    }
  }

  public updateProfile(newProfile: CalibrationProfile) {
    this.profile = newProfile;
    if (this.monitorMasterGain && this.ctx) {
      this.monitorMasterGain.gain.setValueAtTime(
        this.profile.enableAudibleMonitor ? this.profile.monitorVolume : 0.0,
        this.ctx.currentTime
      );
    }
    if (this.monitorOsc) {
      this.monitorOsc.type = this.profile.monitorWaveform;
    }
    if (newProfile.richHarmonics) {
      this.updateRichHarmonics(newProfile.richHarmonics);
    }
  }

  public updateEnvelopeSettings(newSettings: EnvelopeSettings) {
    this.envelopeSettings = newSettings;
  }

  /**
   * Feeds the ring buffer for the 60fps CRT Oscilloscope
   * Generates true composite harmonic waveform showing the multi-octave acoustic blend!
   */
  private startOscilloscopeFeeder() {
    const feed = () => {
      if (!this.isRunning) return;

      const pitchVal = this.currentPitchVolts;
      let envVal = 0;
      if (this.envConstantNode) {
        envVal = this.envConstantNode.offset.value * this.profile.soundCardMaxVoltage;
      }
      this.currentEnvVolts = envVal;

      const rh = this.profile.richHarmonics;
      const sr = this.ctx?.sampleRate || 44100;
      const f = this.currentFrequency;

      // Fill a small chunk into the circular buffer
      for (let i = 0; i < 32; i++) {
        this.pitchBuffer[this.writeIdx] = pitchVal;
        this.envBuffer[this.writeIdx] = envVal;

        // Composite harmonic waveform showing fundamental + sub-octaves + super-octaves OR chord polyphony
        let wave = 0;
        if (this.currentChordFrequencies.length > 1) {
          // Polyphonic chord composite waveform
          for (let c = 0; c < this.currentChordFrequencies.length; c++) {
            const cf = this.currentChordFrequencies[c];
            const cp = (this.writeIdx * cf * 2 * Math.PI) / sr;
            wave += Math.sin(cp) * (0.8 / this.currentChordFrequencies.length);
          }
        } else {
          // Monophonic note + multi-octave rich harmonics
          const p = (this.writeIdx * f * 2 * Math.PI) / sr;
          wave = Math.sin(p);

          if (rh?.enabled) {
            wave = (wave * rh.baseGain)
              + (Math.sin(p * 0.0625) * (rh.subOctave4Gain || 0))
              + (Math.sin(p * 0.125) * (rh.subOctave3Gain || 0))
              + (Math.sin(p * 0.25) * rh.subOctave2Gain)
              + (Math.sin(p * 0.50) * rh.subOctave1Gain)
              + (Math.sin(p * 2.0) * rh.superOctave1Gain)
              + (Math.sin(p * 4.0) * rh.superOctave2Gain)
              + (Math.sin(p * 8.0) * (rh.superOctave3Gain || 0))
              + (Math.sin(p * 16.0) * (rh.superOctave4Gain || 0))
              + (Math.sin(p * 32.0) * (rh.superOctave5Gain || 0))
              + (Math.sin(p * 64.0) * (rh.superOctave6Gain || 0))
              + (Math.sin(p * 3.0) * rh.fifthHarmonicGain)
              + (Math.sin(p * 5.0) * (rh.thirdHarmonicGain || 0));
          }
        }

        const envNormalized = envVal / (this.envelopeSettings.maxVoltage || 5.0);
        this.audioBuffer[this.writeIdx] = wave * 0.45 * Math.min(1.0, envNormalized);

        this.writeIdx = (this.writeIdx + 1) % this.bufferSize;
      }

      requestAnimationFrame(feed);
    };

    requestAnimationFrame(feed);
  }

  public stop() {
    if (this.pitchConstantNode && this.ctx) {
      this.pitchConstantNode.offset.setValueAtTime(0, this.ctx.currentTime);
    }
    if (this.envConstantNode && this.ctx) {
      this.envConstantNode.offset.setValueAtTime(0, this.ctx.currentTime);
    }
    if (this.monitorVca && this.ctx) {
      this.monitorVca.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.isGateActive = false;
  }

  public dispose() {
    this.isRunning = false;
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
