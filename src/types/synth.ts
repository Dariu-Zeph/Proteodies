/**
 * Proteody CV Studio - Synth & CV Types
 */

export interface JustInterval {
  name: string;
  symbol: string;
  numerator: number;
  denominator: number;
  ratio: number;
  semitones12TET: number;
  cents: number;
  description: string;
}

export interface ProteodyNote {
  id: string;
  aminoAcid?: string;
  aminoName?: string;
  molecularWeight?: number; // mass in Daltons (Da)
  quantumFrequency?: number; // de Broglie frequency in Hz (e.g. ~10^25 Hz)
  symbol: string;
  octave: number; // e.g. 2, 3, 4, 5
  interval: JustInterval;
  frequency: number; // exact Hz with C4 = 256 Hz
  targetVoltage: number; // 1V/Octave CV where C2 = 0V (or calibrated base)
  duration: number; // in beats (1 = 1/4 note)
  gate: number; // gate open fraction (0.1 to 0.95)
  velocity: number; // 0 to 1
  glide?: boolean;
  // Biological Secondary Structure & Folding Conformation
  secondaryStructure?: 'alpha_helix' | 'beta_sheet' | 'loop_coil';
  structureLabel?: string; // e.g. "α-Helix", "β-Sheet", "Loop/Coil"
  structureGateMultiplier?: number; // e.g. 0.70 for helix, 0.95 for sheet, 1.30 for loop
}

export interface ProteodyPreset {
  id: string;
  name: string;
  organism: string;
  category: 'Hormone' | 'Structural' | 'Enzyme' | 'Receptor' | 'Fluorescent' | 'Signaling';
  description: string;
  aminoSequence: string;
  defaultBpm: number;
  defaultGate: number;
  defaultOctave: number;
  algorithm: 'sternheimer_mass_5just' | 'sternheimer_mass_continuous' | 'sternheimer_canonical' | 'molecular_weight' | 'hydropathy';
}

export interface EnvelopeSettings {
  attack: number; // in seconds (0.001 to 5.0)
  decay: number; // in seconds (0.01 to 5.0)
  sustain: number; // level (0.0 to 1.0)
  release: number; // in seconds (0.01 to 5.0)
  attackCurve: number; // -1 (logarithmic) to +1 (exponential), 0 = linear
  decayCurve: number;
  releaseCurve: number;
  maxVoltage: number; // 5.0V or 8.0V
  mode: 'adsr' | 'mouse_live' | 'custom_draw';
  customPoints?: { x: number; y: number }[]; // normalized 0..1
}

export interface CalibrationProfile {
  name: string;
  vcoModel: string;
  soundCardMaxVoltage: number; // e.g. 3.0V, 5.0V, 10.0V (full scale dBu equivalent)
  slope: number; // 1V/Oct slope multiplier (e.g. 1.000)
  offset: number; // global voltage offset (-2.0V to +2.0V)
  baseNote: string; // "C2" (0V reference)
  baseFrequency: number; // 64 Hz for C2 with C4=256
  octaveCorrections: {
    c1: number; // Volts offset at C1 (16/32 Hz)
    c2: number; // 0V base
    c3: number; // +1V
    c4: number; // +2V
    c5: number; // +3V
    c6: number; // +4V
  };
  outputChannels: {
    pitchChannel: 'left' | 'right';
    envelopeChannel: 'left' | 'right' | 'none';
    invertPitch: boolean;
    invertEnvelope: boolean;
  };
  enableAudibleMonitor: boolean; // allow hearing audio through soundcard
  monitorWaveform: 'sawtooth' | 'sine' | 'triangle' | 'square';
  monitorVolume: number;
  glideTime: number; // portamento slew time in seconds
  richHarmonics: RichHarmonicsSettings;
}

export interface RichHarmonicsSettings {
  enabled: boolean;
  preset: 'warm_octaves' | 'deep_sub' | 'shimmer' | 'cathedral' | 'full_audible_spectrum' | 'sub_only' | 'cosmic_range' | 'custom';
  baseGain: number; // 0.0 to 1.0 (fundamental note)
  
  // Full Human Hearing Sub-Octave Stack (down to 16-20 Hz)
  subOctave4Gain?: number; // -4 Octaves (f * 0.0625, infrasonic sub-bass border ~16-20 Hz)
  subOctave3Gain?: number; // -3 Octaves (f * 0.125, deep sub-bass ~32 Hz)
  subOctave2Gain: number;  // -2 Octaves (f * 0.25, bass foundation ~64 Hz)
  subOctave1Gain: number;  // -1 Octave (f * 0.50, warm body ~128 Hz)
  subOctave1Waveform: 'triangle' | 'sine' | 'sawtooth' | 'square';

  // Full Human Hearing Super-Octave Stack (up to 16,000 - 20,000 Hz ceiling)
  superOctave1Gain: number; // +1 Octave (f * 2.0, presence ~512 Hz)
  superOctave1Waveform: 'triangle' | 'sine' | 'sawtooth' | 'square';
  superOctave2Gain: number; // +2 Octaves (f * 4.0, brightness & chime ~1024 Hz)
  superOctave3Gain?: number; // +3 Octaves (f * 8.0, crystal brilliance ~2048 Hz)
  superOctave4Gain?: number; // +4 Octaves (f * 16.0, sparkle & overtone top ~4096 Hz)
  superOctave5Gain?: number; // +5 Octaves (f * 32.0, air band sheen ~8192 Hz)
  superOctave6Gain?: number; // +6 Octaves (f * 64.0, hearing ceiling ~16,384 - 20,000 Hz)

  // Harmonic overtone layers
  fifthHarmonicGain: number; // 3rd Harmonic (f * 3.0, Just 12th)
  thirdHarmonicGain?: number; // 5th Harmonic (f * 5.0, Just 17th / pure 5-Just Major 3rd)

  analogDetuneCents: number; // 0 to 15 cents for lush chorus warmth
}

export interface OscilloscopeConfig {
  timebase: number; // ms per division (e.g. 20ms, 50ms, 100ms)
  voltageScale: number; // Volts per division (e.g. 1V, 2V)
  triggerMode: 'auto' | 'note' | 'pitch' | 'free';
  triggerLevel: number; // Volts
  showPitchCV: boolean;
  showEnvCV: boolean;
  showMonitorAudio: boolean;
  persistence: boolean;
  gridVisible: boolean;
}

export interface SequencerState {
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
  direction: 'forward' | 'reverse' | 'pingpong' | 'random';
  octaveShift: number; // -2 to +2
  gateLength: number; // 0.1 to 1.0
  glideTime: number; // 0 to 0.5s
  loopStart: number;
  loopEnd: number;
}

export interface MetaProteodyLayer {
  proteinId: string;
  proteinName: string;
  biologicalRole: string; // e.g. "Adenosine A2A Antagonist (Wakefulness)"
  aminoSequence: string;
  octave: number;
  gain: number; // 0.0 - 1.0 relative balance in chord
  notes: ProteodyNote[];
  currentStep: number;
  color: string;
  // Pharmacokinetic (PK/PD) Profile
  pkStage: 'fast_receptor' | 'ion_channel' | 'neuromodulator' | 'metabolic_clearance';
  pkStageName: string; // e.g. "Target Receptor Binding (Immediate)"
  pkOnsetDelayMs: number; // Onset delay offset in milliseconds (0, 45, 90, 140)
  pkHalfLifeMultiplier: number; // Tail decay & release multiplier (e.g. 1.0, 1.15, 1.35, 2.2)
  pkFilterOpenness?: number; // 0.2 - 1.0 (relative filter openness during activation)
  pan?: number; // Spatial stereo pan: -1.0 (Left) to +1.0 (Right)
}

export interface MetaProteodyConfig {
  id: string;
  name: string;
  substance: string; // e.g. "Coffee (Caffeine & Polyphenols)"
  category: 'Metabolic & Stimulant' | 'Focus & Nootropic' | 'Euphoria & Bliss' | 'Relaxant & Sleep' | 'Neurotransmitter' | 'Custom';
  description: string;
  biologicalMechanism: string; // detailed explanation of why these proteins were chosen
  layers: MetaProteodyLayer[];
  polyphonyMode: 'polyphonic_chord' | 'weighted_composite';
  // Pharmacokinetic (PK/PD) Kinetic Cascade Engine Settings
  pkMode: 'pk_cascade' | 'simultaneous_chord';
  pkTimeScale: number; // Cascade onset scaling factor (0.5x to 2.5x, default 1.0)
  pkClearanceTailMultiplier: number; // Metabolic clearance release tail multiplier (1.0x to 4.0x)
  enableSecondaryStructureArticulation: boolean; // modulate gate lengths and envelopes based on folding conformation
}

export interface LiveKeyMapping {
  id: string;
  key: string; // e.g. "O", "I", "C", "G", "R", "H", "1", "Space"
  name: string;
  presetId?: string;
  aminoSequence: string;
  algorithm: 'sternheimer_mass_5just' | 'sternheimer_mass_continuous' | 'sternheimer_canonical' | 'molecular_weight' | 'hydropathy';
  octave: number;
  color: string;
  notes: ProteodyNote[];
  currentStep: number; // current position in sequence (0-indexed)
  lastTriggerTime?: number;
  // Meta-Proteody extension
  isMeta?: boolean;
  metaConfig?: MetaProteodyConfig;
}

