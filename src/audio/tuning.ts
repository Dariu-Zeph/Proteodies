/**
 * 5-Limit Just Temperament & Scientific Tuning Engine
 * Base Reference: C4 = 256.0 Hz (Scientific / Verdi Pitch, C0 = 16Hz, C2 = 64Hz)
 * Eurorack 1V/Octave standard: V = log2(f / f_base_0V)
 */

import { JustInterval, ProteodyNote } from '../types/synth';

// Scientific Pitch Reference (powers of 2 for all C notes)
export const SCIENTIFIC_C4 = 256.0;
export const SCIENTIFIC_C2 = 64.0; // Standard Eurorack 0.000V base note

// 5-Limit Just Intonation Intervals (ratios of prime factors 2, 3, 5)
export const JUST_INTERVALS: Record<string, JustInterval> = {
  'C': {
    name: 'Tonic / Unison',
    symbol: 'C',
    numerator: 1,
    denominator: 1,
    ratio: 1.0,
    semitones12TET: 0,
    cents: 0.0,
    description: 'Fundamental Root (1:1)'
  },
  'Db': {
    name: 'Just Minor Second',
    symbol: 'Db',
    numerator: 16,
    denominator: 15,
    ratio: 16 / 15, // 1.066667
    semitones12TET: 1,
    cents: 111.73,
    description: 'Diatonic semitone (16:15)'
  },
  'D': {
    name: 'Just Major Second',
    symbol: 'D',
    numerator: 9,
    denominator: 8,
    ratio: 9 / 8, // 1.125
    semitones12TET: 2,
    cents: 203.91,
    description: 'Major whole tone (9:8)'
  },
  'Eb': {
    name: 'Just Minor Third',
    symbol: 'Eb',
    numerator: 6,
    denominator: 5,
    ratio: 6 / 5, // 1.2
    semitones12TET: 3,
    cents: 315.64,
    description: 'Pure minor third (6:5)'
  },
  'E': {
    name: 'Just Major Third',
    symbol: 'E',
    numerator: 5,
    denominator: 4,
    ratio: 5 / 4, // 1.25
    semitones12TET: 4,
    cents: 386.31,
    description: 'Pure 5-limit harmonic third (5:4)'
  },
  'F': {
    name: 'Just Perfect Fourth',
    symbol: 'F',
    numerator: 4,
    denominator: 3,
    ratio: 4 / 3, // 1.333333
    semitones12TET: 5,
    cents: 498.04,
    description: 'Subdominant pure fourth (4:3)'
  },
  'F#': {
    name: 'Just Tritone / Aug 4th',
    symbol: 'F#',
    numerator: 45,
    denominator: 32,
    ratio: 45 / 32, // 1.40625
    semitones12TET: 6,
    cents: 590.22,
    description: 'Diatonic tritone (45:32)'
  },
  'G': {
    name: 'Just Perfect Fifth',
    symbol: 'G',
    numerator: 3,
    denominator: 2,
    ratio: 3 / 2, // 1.5
    semitones12TET: 7,
    cents: 701.96,
    description: 'Harmonic overtone fifth (3:2)'
  },
  'Ab': {
    name: 'Just Minor Sixth',
    symbol: 'Ab',
    numerator: 8,
    denominator: 5,
    ratio: 8 / 5, // 1.6
    semitones12TET: 8,
    cents: 813.69,
    description: 'Pure minor sixth (8:5)'
  },
  'A': {
    name: 'Just Major Sixth',
    symbol: 'A',
    numerator: 5,
    denominator: 3,
    ratio: 5 / 3, // 1.666667
    semitones12TET: 9,
    cents: 884.36,
    description: 'Pure 5-limit major sixth (5:3)'
  },
  'Bb': {
    name: 'Just Minor Seventh',
    symbol: 'Bb',
    numerator: 9,
    denominator: 5,
    ratio: 9 / 5, // 1.8
    semitones12TET: 10,
    cents: 1017.60,
    description: 'Harmonic minor seventh (9:5)'
  },
  'B': {
    name: 'Just Major Seventh',
    symbol: 'B',
    numerator: 15,
    denominator: 8,
    ratio: 15 / 8, // 1.875
    semitones12TET: 11,
    cents: 1088.27,
    description: 'Leading tone seventh (15:8)'
  }
};

export const ORDERED_INTERVAL_KEYS = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'
];

/**
 * Calculate the exact frequency for a note in 5-Limit Just Temperament
 * relative to C4 = 256.0 Hz.
 * @param noteSymbol Note name ('C', 'E', 'G', etc.)
 * @param octave Octave number (e.g. 2, 3, 4, 5)
 */
export function calculateJustFrequency(noteSymbol: string, octave: number = 4): number {
  const interval = JUST_INTERVALS[noteSymbol] || JUST_INTERVALS['C'];
  // C4 = 256 Hz. If octave is 4, base C is 256. If octave is 3, base C is 128.
  const octaveMultiplier = Math.pow(2, octave - 4);
  const baseCOfOctave = SCIENTIFIC_C4 * octaveMultiplier;
  return baseCOfOctave * interval.ratio;
}

/**
 * Calculate the Eurorack 1V/Octave control voltage for a given frequency.
 * Standard Eurorack reference: 0.000V = C2 (64.0 Hz).
 * C2 = 0V, C3 = 1V, C4 = 2V, C5 = 3V, C6 = 4V.
 * @param frequency Target frequency in Hz
 * @param baseFrequency 0V reference frequency (default 64.0 Hz for C2)
 */
export function frequencyToPitchCV(frequency: number, baseFrequency: number = SCIENTIFIC_C2): number {
  if (frequency <= 0) return 0;
  return Math.log2(frequency / baseFrequency);
}

/**
 * Convert Eurorack 1V/Oct CV back to exact frequency
 * @param voltage Control voltage (e.g. 2.322V)
 * @param baseFrequency 0V reference frequency (default 64.0 Hz)
 */
export function pitchCVToFrequency(voltage: number, baseFrequency: number = SCIENTIFIC_C2): number {
  return baseFrequency * Math.pow(2, voltage);
}

/**
 * Convert Note symbol and Octave directly to Eurorack 1V/Oct target voltage
 * @param noteSymbol e.g. 'E'
 * @param octave e.g. 4
 * @param baseOctave reference octave that is 0V (default 2 -> C2=0V)
 */
export function noteToPitchCV(noteSymbol: string, octave: number = 4, baseOctave: number = 2): number {
  const interval = JUST_INTERVALS[noteSymbol] || JUST_INTERVALS['C'];
  const octaveVolts = octave - baseOctave;
  const intervalVolts = Math.log2(interval.ratio);
  return octaveVolts + intervalVolts;
}

/**
 * Format voltage for clean Eurorack display
 */
export function formatVolts(volts: number, decimals: number = 3): string {
  const sign = volts >= 0 ? '+' : '';
  return `${sign}${volts.toFixed(decimals)} V`;
}

/**
 * Format frequency with high precision
 */
export function formatHz(hz: number): string {
  return `${hz.toFixed(2)} Hz`;
}
