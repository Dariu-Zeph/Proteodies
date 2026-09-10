/**
 * Proteody Biological Melody Library & Protein Translation Engine
 * 
 * Implements Joel Sternheimer's Quantum Proteodies Theory:
 * 1. Amino acid molecular mass M (in Daltons / Da)
 * 2. Louis de Broglie wave frequency: nu = m * c^2 / h (~10^25 Hz)
 * 3. Musical octave reduction: f_audible = nu / 2^76 (~100 to 700 Hz)
 * 4. 5-Limit Just Temperament mapping relative to Scientific C4 = 256 Hz
 */

import { ProteodyNote, ProteodyPreset, JustInterval, MetaProteodyConfig, MetaProteodyLayer } from '../types/synth';
import { calculateJustFrequency, noteToPitchCV, JUST_INTERVALS, ORDERED_INTERVAL_KEYS } from '../audio/tuning';

// Fundamental Physical Constants
export const SPEED_OF_LIGHT = 299792458; // m/s (c)
export const PLANCK_CONSTANT = 6.62607015e-34; // J*s (h)
export const ATOMIC_MASS_UNIT = 1.6605390666e-27; // kg (1 Dalton / Da)

// Sternheimer de Broglie Quantum Constant: (u * c^2) / h = 2.252342718e23 Hz / Da
export const STERNHEIMER_QUANTUM_FACTOR = (ATOMIC_MASS_UNIT * Math.pow(SPEED_OF_LIGHT, 2)) / PLANCK_CONSTANT;

// Octave reduction factor (2^76 = 7.555786372591432e22)
export const STERNHEIMER_OCTAVE_DIVISOR_EXP = 76;
export const STERNHEIMER_OCTAVE_DIVISOR = Math.pow(2, STERNHEIMER_OCTAVE_DIVISOR_EXP);

// Audible scale factor: K_quantum / 2^76 = 2.981084 Hz / Da
export const STERNHEIMER_AUDIBLE_FACTOR = STERNHEIMER_QUANTUM_FACTOR / STERNHEIMER_OCTAVE_DIVISOR;

export interface AminoAcidInfo {
  code1: string;
  code3: string;
  name: string;
  molecularWeight: number; // Daltons (Da)
  deBroglieQuantumHz: number; // ~10^25 Hz
  sternheimerAudibleHz: number; // ~200 - 650 Hz
  hydropathy: number; // Kyte-Doolittle scale (-4.5 to +4.5)
  defaultNote: string;
  defaultOctave: number;
  description: string;
}

/**
 * Calculate exact de Broglie quantum frequency from molecular mass
 */
export function massToDeBroglieFrequency(massDa: number): number {
  return massDa * STERNHEIMER_QUANTUM_FACTOR;
}

/**
 * Convert molecular mass in Daltons to Sternheimer audible frequency via 2^76 octave reduction
 */
export function massToSternheimerAudibleHz(massDa: number): number {
  return massDa * STERNHEIMER_AUDIBLE_FACTOR;
}

/**
 * Find the closest 5-Limit Just interval and octave for any arbitrary frequency relative to C4=256Hz
 */
export function findClosest5JustInterval(targetFreq: number): {
  interval: JustInterval;
  octave: number;
  exact5JustFreq: number;
  centsDeviation: number;
} {
  // Normalize into octave [256.0, 512.0)
  let octave = 4;
  let normalized = targetFreq;
  while (normalized >= 512.0) {
    normalized /= 2.0;
    octave++;
  }
  while (normalized < 256.0) {
    normalized *= 2.0;
    octave--;
  }

  const ratio = normalized / 256.0;

  // Search nearest 5-Just interval
  let bestKey = 'C';
  let minDiff = Infinity;

  for (const key of ORDERED_INTERVAL_KEYS) {
    const intv = JUST_INTERVALS[key];
    const diff = Math.abs(intv.ratio - ratio);
    if (diff < minDiff) {
      minDiff = diff;
      bestKey = key;
    }
  }

  const bestInterval = JUST_INTERVALS[bestKey];
  const exact5JustFreq = 256.0 * Math.pow(2, octave - 4) * bestInterval.ratio;
  const centsDeviation = 1200 * Math.log2(targetFreq / exact5JustFreq);

  return {
    interval: bestInterval,
    octave,
    exact5JustFreq,
    centsDeviation
  };
}

export const AMINO_ACIDS: Record<string, AminoAcidInfo> = {
  'G': {
    code1: 'G', code3: 'Gly', name: 'Glycine',
    molecularWeight: 75.07,
    deBroglieQuantumHz: 75.07 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 75.07 * STERNHEIMER_AUDIBLE_FACTOR, // 223.79 Hz (~A3/Bb3)
    hydropathy: -0.4,
    defaultNote: 'C', defaultOctave: 3,
    description: 'Smallest residue, flexible hinge (75.07 Da)'
  },
  'A': {
    code1: 'A', code3: 'Ala', name: 'Alanine',
    molecularWeight: 89.09,
    deBroglieQuantumHz: 89.09 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 89.09 * STERNHEIMER_AUDIBLE_FACTOR, // 265.58 Hz (~C#4/Db4)
    hydropathy: 1.8,
    defaultNote: 'D', defaultOctave: 3,
    description: 'Hydrophobic alpha-helix former (89.09 Da)'
  },
  'S': {
    code1: 'S', code3: 'Ser', name: 'Serine',
    molecularWeight: 105.09,
    deBroglieQuantumHz: 105.09 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 105.09 * STERNHEIMER_AUDIBLE_FACTOR, // 313.28 Hz (~Eb4/E4)
    hydropathy: -0.8,
    defaultNote: 'E', defaultOctave: 3,
    description: 'Polar hydroxyl group, kinase phosphorylation (105.09 Da)'
  },
  'P': {
    code1: 'P', code3: 'Pro', name: 'Proline',
    molecularWeight: 115.13,
    deBroglieQuantumHz: 115.13 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 115.13 * STERNHEIMER_AUDIBLE_FACTOR, // 343.21 Hz (~F4)
    hydropathy: -1.6,
    defaultNote: 'F', defaultOctave: 3,
    description: 'Cyclic ring structure, helix breaker (115.13 Da)'
  },
  'V': {
    code1: 'V', code3: 'Val', name: 'Valine',
    molecularWeight: 117.15,
    deBroglieQuantumHz: 117.15 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 117.15 * STERNHEIMER_AUDIBLE_FACTOR, // 349.23 Hz (~F4/F#4)
    hydropathy: 4.2,
    defaultNote: 'G', defaultOctave: 3,
    description: 'Branched-chain hydrophobic stabilizer (117.15 Da)'
  },
  'T': {
    code1: 'T', code3: 'Thr', name: 'Threonine',
    molecularWeight: 119.12,
    deBroglieQuantumHz: 119.12 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 119.12 * STERNHEIMER_AUDIBLE_FACTOR, // 355.11 Hz (~F#4)
    hydropathy: -0.7,
    defaultNote: 'A', defaultOctave: 3,
    description: 'Hydroxyl functional site (119.12 Da)'
  },
  'C': {
    code1: 'C', code3: 'Cys', name: 'Cysteine',
    molecularWeight: 121.16,
    deBroglieQuantumHz: 121.16 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 121.16 * STERNHEIMER_AUDIBLE_FACTOR, // 361.19 Hz (~F#4)
    hydropathy: 2.5,
    defaultNote: 'B', defaultOctave: 3,
    description: 'Forms covalent disulfide bridges (121.16 Da)'
  },
  'I': {
    code1: 'I', code3: 'Ile', name: 'Isoleucine',
    molecularWeight: 131.18,
    deBroglieQuantumHz: 131.18 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 131.18 * STERNHEIMER_AUDIBLE_FACTOR, // 391.06 Hz (~G4)
    hydropathy: 4.5,
    defaultNote: 'C', defaultOctave: 4,
    description: 'Hydrophobic core building block (131.18 Da)'
  },
  'L': {
    code1: 'L', code3: 'Leu', name: 'Leucine',
    molecularWeight: 131.18,
    deBroglieQuantumHz: 131.18 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 131.18 * STERNHEIMER_AUDIBLE_FACTOR, // 391.06 Hz (~G4)
    hydropathy: 3.8,
    defaultNote: 'D', defaultOctave: 4,
    description: 'Leucine zipper motif, hydrophobic (131.18 Da)'
  },
  'N': {
    code1: 'N', code3: 'Asn', name: 'Asparagine',
    molecularWeight: 132.12,
    deBroglieQuantumHz: 132.12 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 132.12 * STERNHEIMER_AUDIBLE_FACTOR, // 393.86 Hz (~G4)
    hydropathy: -3.5,
    defaultNote: 'Eb', defaultOctave: 4,
    description: 'Amide donor, N-glycosylation (132.12 Da)'
  },
  'D': {
    code1: 'D', code3: 'Asp', name: 'Aspartate',
    molecularWeight: 133.10,
    deBroglieQuantumHz: 133.10 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 133.10 * STERNHEIMER_AUDIBLE_FACTOR, // 396.78 Hz (~G4)
    hydropathy: -3.5,
    defaultNote: 'E', defaultOctave: 4,
    description: 'Negatively charged acidic residue (133.10 Da)'
  },
  'Q': {
    code1: 'Q', code3: 'Gln', name: 'Glutamine',
    molecularWeight: 146.15,
    deBroglieQuantumHz: 146.15 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 146.15 * STERNHEIMER_AUDIBLE_FACTOR, // 435.69 Hz (~A4)
    hydropathy: -3.5,
    defaultNote: 'F', defaultOctave: 4,
    description: 'Polar amide, hydrogen bonding (146.15 Da)'
  },
  'K': {
    code1: 'K', code3: 'Lys', name: 'Lysine',
    molecularWeight: 146.19,
    deBroglieQuantumHz: 146.19 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 146.19 * STERNHEIMER_AUDIBLE_FACTOR, // 435.80 Hz (~A4)
    hydropathy: -3.9,
    defaultNote: 'F#', defaultOctave: 4,
    description: 'Positively charged basic tail (146.19 Da)'
  },
  'E': {
    code1: 'E', code3: 'Glu', name: 'Glutamate',
    molecularWeight: 147.13,
    deBroglieQuantumHz: 147.13 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 147.13 * STERNHEIMER_AUDIBLE_FACTOR, // 438.61 Hz (~A4)
    hydropathy: -3.5,
    defaultNote: 'G', defaultOctave: 4,
    description: 'Excitatory neurotransmitter & acidic triad (147.13 Da)'
  },
  'M': {
    code1: 'M', code3: 'Met', name: 'Methionine',
    molecularWeight: 149.21,
    deBroglieQuantumHz: 149.21 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 149.21 * STERNHEIMER_AUDIBLE_FACTOR, // 444.81 Hz (~A4/Bb4)
    hydropathy: 1.9,
    defaultNote: 'Ab', defaultOctave: 4,
    description: 'Universal AUG translation initiator (149.21 Da)'
  },
  'H': {
    code1: 'H', code3: 'His', name: 'Histidine',
    molecularWeight: 155.16,
    deBroglieQuantumHz: 155.16 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 155.16 * STERNHEIMER_AUDIBLE_FACTOR, // 462.54 Hz (~Bb4)
    hydropathy: -3.2,
    defaultNote: 'A', defaultOctave: 4,
    description: 'Imidazole ring, pH-responsive buffer (155.16 Da)'
  },
  'F': {
    code1: 'F', code3: 'Phe', name: 'Phenylalanine',
    molecularWeight: 165.19,
    deBroglieQuantumHz: 165.19 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 165.19 * STERNHEIMER_AUDIBLE_FACTOR, // 492.44 Hz (~B4)
    hydropathy: 2.8,
    defaultNote: 'Bb', defaultOctave: 4,
    description: 'Aromatic benzene ring (165.19 Da)'
  },
  'R': {
    code1: 'R', code3: 'Arg', name: 'Arginine',
    molecularWeight: 174.20,
    deBroglieQuantumHz: 174.20 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 174.20 * STERNHEIMER_AUDIBLE_FACTOR, // 519.31 Hz (~C5)
    hydropathy: -4.5,
    defaultNote: 'B', defaultOctave: 4,
    description: 'Basic guanidinium group (174.20 Da)'
  },
  'Y': {
    code1: 'Y', code3: 'Tyr', name: 'Tyrosine',
    molecularWeight: 181.19,
    deBroglieQuantumHz: 181.19 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 181.19 * STERNHEIMER_AUDIBLE_FACTOR, // 540.14 Hz (~Db5)
    hydropathy: -1.3,
    defaultNote: 'C', defaultOctave: 5,
    description: 'Phenolic hydroxyl, kinase signaling (181.19 Da)'
  },
  'W': {
    code1: 'W', code3: 'Trp', name: 'Tryptophan',
    molecularWeight: 204.23,
    deBroglieQuantumHz: 204.23 * STERNHEIMER_QUANTUM_FACTOR,
    sternheimerAudibleHz: 204.23 * STERNHEIMER_AUDIBLE_FACTOR, // 608.83 Hz (~D5/Eb5)
    hydropathy: -0.9,
    defaultNote: 'E', defaultOctave: 5,
    description: 'Largest aromatic indole residue (204.23 Da)'
  }
};

// Curated Biological Proteody Presets
export const PROTEODY_PRESETS: ProteodyPreset[] = [
  {
    id: 'oxytocin',
    name: 'Oxytocin Bonding Neuropeptide',
    organism: 'Mammalia',
    category: 'Hormone',
    description: 'Nonapeptide neurohormone (CYIQNCPLG) governing social bonding and maternal attachment.',
    aminoSequence: 'CYIQNCPLG',
    defaultBpm: 96,
    defaultGate: 0.85,
    defaultOctave: 4,
    algorithm: 'sternheimer_mass_5just'
  },
  {
    id: 'insulin-a',
    name: 'Insulin (Human Chain A & B)',
    organism: 'Homo sapiens',
    category: 'Hormone',
    description: 'Vital peptide hormone regulating cellular glucose metabolism, cellular growth, and storage of glycogen.',
    aminoSequence: 'GIVEQCCTSICSLYQLENYCNFVNQHLCGSHLVEALYLVCGERGFFYTPKT',
    defaultBpm: 124,
    defaultGate: 0.75,
    defaultOctave: 4,
    algorithm: 'sternheimer_mass_5just'
  },
  {
    id: 'collagen-1',
    name: 'Collagen Triple Helix',
    organism: 'Mammalia',
    category: 'Structural',
    description: 'The primary structural protein in connective tissues, featuring the rhythmic Gly-Pro-Hyp triad motif.',
    aminoSequence: 'GPAGPAGPKGANGDPGRPGEPGLPGARGITGARGLAGPPGMPGPRG',
    defaultBpm: 138,
    defaultGate: 0.60,
    defaultOctave: 3,
    algorithm: 'sternheimer_mass_5just'
  },
  {
    id: 'gfp',
    name: 'Green Fluorescent Protein (GFP)',
    organism: 'Aequorea victoria (Jellyfish)',
    category: 'Fluorescent',
    description: 'Bioluminescent jellyfish protein with Ser65-Tyr66-Gly67 chromophore emitting radiant green photons under UV.',
    aminoSequence: 'MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTT',
    defaultBpm: 132,
    defaultGate: 0.70,
    defaultOctave: 4,
    algorithm: 'sternheimer_mass_5just'
  },
  {
    id: 'rhodopsin',
    name: 'Rhodopsin Visual Photoreceptor',
    organism: 'Bos taurus / Human',
    category: 'Receptor',
    description: 'G-protein coupled 7-transmembrane receptor initiating phototransduction cascades in retinal rod cells.',
    aminoSequence: 'MNGTEGPNFYVPFSNKTGVVRSPFEAPQYYLAEPWQFSMLAAYMFLLIVL',
    defaultBpm: 110,
    defaultGate: 0.85,
    defaultOctave: 4,
    algorithm: 'sternheimer_mass_5just'
  },
  {
    id: 'cytochrome-c',
    name: 'Cytochrome C Electron Transport',
    organism: 'Eukaryota',
    category: 'Enzyme',
    description: 'Ancient mitochondrial hemeprotein shuttling electrons along the respiratory chain to generate cellular ATP.',
    aminoSequence: 'MGDVEKGKKIFVQKCAQCHTVEKGGKHKTGPNLHGLFGRKTGQAPGYSYT',
    defaultBpm: 128,
    defaultGate: 0.65,
    defaultOctave: 4,
    algorithm: 'sternheimer_mass_5just'
  },
  {
    id: 'hemoglobin-beta',
    name: 'Hemoglobin Subunit Beta',
    organism: 'Homo sapiens',
    category: 'Structural',
    description: 'Iron-containing oxygen transport metalloprotein carrying vital O2 from lungs to peripheral tissues.',
    aminoSequence: 'VHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLST',
    defaultBpm: 118,
    defaultGate: 0.70,
    defaultOctave: 4,
    algorithm: 'sternheimer_mass_5just'
  },
  {
    id: 'spider-silk',
    name: 'Spider Dragline Silk (Spidroin)',
    organism: 'Nephila clavipes',
    category: 'Structural',
    description: 'Extraordinary tensile biomaterial with repetitive poly-alanine crystalline blocks and glycine-rich amorphous spirals.',
    aminoSequence: 'GAGAAAAAAAAAGQGGYGGLGSQGAGRGGLGGQGAGAAAAAAAAAG',
    defaultBpm: 145,
    defaultGate: 0.50,
    defaultOctave: 3,
    algorithm: 'sternheimer_mass_5just'
  }
];

/**
 * Predicts secondary structure and rhythmic articulation propensity for an amino acid residue
 * based on Chou-Fasman / Deleage-Roux conformational parameters:
 * - α-Helix (H): Rigid hydrogen-bonded spiral cylinder -> punchy, staccato articulation (0.70x gate)
 * - β-Sheet (E): Pleated structural sheet strand -> balanced structural body (0.95x gate)
 * - Loops/Turns/Coils (C): Dynamic disordered active-site hinge -> fluid legato sustain (1.30x gate)
 */
export function getSecondaryStructure(aa: string): {
  type: 'alpha_helix' | 'beta_sheet' | 'loop_coil';
  label: string;
  symbol: string;
  gateMultiplier: number;
  description: string;
} {
  const code = (aa || '').toUpperCase();
  // Strong Alpha-Helix formers (alanine, leucine, methionine, glutamate, lysine, glutamine, histidine)
  if (['A', 'L', 'M', 'E', 'K', 'Q', 'H'].includes(code)) {
    return {
      type: 'alpha_helix',
      label: 'α-Helix',
      symbol: 'α',
      gateMultiplier: 0.70,
      description: 'Rigid hydrogen-bonded spiral cylinder: punchy, staccato articulation'
    };
  }
  // Strong Beta-Sheet formers (valine, isoleucine, tyrosine, cysteine, tryptophan, phenylalanine, threonine)
  if (['V', 'I', 'Y', 'C', 'W', 'F', 'T'].includes(code)) {
    return {
      type: 'beta_sheet',
      label: 'β-Sheet',
      symbol: 'β',
      gateMultiplier: 0.95,
      description: 'Pleated extended sheet strand: medium attack, balanced structural body'
    };
  }
  // Dynamic Turns, Loops, and Coils (glycine, proline, serine, aspartate, asparagine, arginine)
  return {
    type: 'loop_coil',
    label: 'Loop/Coil',
    symbol: 'Ω',
    gateMultiplier: 1.30,
    description: 'Flexible disordered loop/active site: long legato sustain with fluid sweep'
  };
}

/**
 * Convert a protein sequence string (e.g. "CYIQNCPLG") into 5-Just tuned ProteodyNotes
 * using Joel Sternheimer's de Broglie Mass-to-Sound conversion
 */
export function translateSequenceToProteody(
  sequence: string,
  baseOctave: number = 4,
  defaultGate: number = 0.75,
  algorithm: 'sternheimer_mass_5just' | 'sternheimer_mass_continuous' | 'sternheimer_canonical' | 'molecular_weight' | 'hydropathy' = 'sternheimer_mass_5just'
): ProteodyNote[] {
  const cleanSeq = sequence.toUpperCase().replace(/[^A-Z]/g, '');
  const notes: ProteodyNote[] = [];

  for (let i = 0; i < cleanSeq.length; i++) {
    const char = cleanSeq[i];
    const aaInfo = AMINO_ACIDS[char] || {
      code1: char,
      code3: char,
      name: `Residue ${char}`,
      molecularWeight: 120.0,
      deBroglieQuantumHz: 120.0 * STERNHEIMER_QUANTUM_FACTOR,
      sternheimerAudibleHz: 120.0 * STERNHEIMER_AUDIBLE_FACTOR,
      hydropathy: 0,
      defaultNote: 'C',
      defaultOctave: baseOctave,
      description: 'Custom Residue'
    };

    let frequency = 256.0;
    let targetVoltage = 2.0;
    let noteSymbol = 'C';
    let noteOctave = baseOctave;
    let interval = JUST_INTERVALS['C'];

    if (algorithm === 'sternheimer_mass_5just') {
      // 1. Convert molecular mass to de Broglie scaled audible frequency
      const audibleHz = massToSternheimerAudibleHz(aaInfo.molecularWeight);
      // 2. Quantize to closest 5-Limit Just interval with C4 = 256 Hz
      const match = findClosest5JustInterval(audibleHz);
      const octaveShift = baseOctave - 4;
      noteOctave = match.octave + octaveShift;
      noteSymbol = match.interval.symbol;
      interval = match.interval;
      frequency = calculateJustFrequency(noteSymbol, noteOctave);
      targetVoltage = noteToPitchCV(noteSymbol, noteOctave, 2);
    } else if (algorithm === 'sternheimer_mass_continuous') {
      // Direct unquantized de Broglie quantum mass microtonal frequency
      const octaveMultiplier = Math.pow(2, baseOctave - 4);
      frequency = massToSternheimerAudibleHz(aaInfo.molecularWeight) * octaveMultiplier;
      targetVoltage = Math.log2(frequency / 64.0); // Eurorack 1V/Oct CV
      // Nearest interval symbol for display
      const match = findClosest5JustInterval(frequency / octaveMultiplier);
      noteSymbol = match.interval.symbol;
      noteOctave = baseOctave;
      interval = match.interval;
    } else if (algorithm === 'sternheimer_canonical') {
      // Canonical Sternheimer Proteodies Codon Scale
      noteSymbol = aaInfo.defaultNote;
      noteOctave = aaInfo.defaultOctave + (baseOctave - 4);
      interval = JUST_INTERVALS[noteSymbol] || JUST_INTERVALS['C'];
      frequency = calculateJustFrequency(noteSymbol, noteOctave);
      targetVoltage = noteToPitchCV(noteSymbol, noteOctave, 2);
    } else if (algorithm === 'molecular_weight') {
      // Direct chromatic distribution by mass
      const intervals = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
      const normalizedMW = Math.max(0, Math.min(1, (aaInfo.molecularWeight - 75) / (205 - 75)));
      const idx = Math.floor(normalizedMW * 12);
      noteSymbol = intervals[Math.min(idx, 11)];
      noteOctave = baseOctave + (aaInfo.molecularWeight > 150 ? 1 : 0);
      interval = JUST_INTERVALS[noteSymbol] || JUST_INTERVALS['C'];
      frequency = calculateJustFrequency(noteSymbol, noteOctave);
      targetVoltage = noteToPitchCV(noteSymbol, noteOctave, 2);
    } else if (algorithm === 'hydropathy') {
      const intervals = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const normHydropathy = (aaInfo.hydropathy + 4.5) / 9.0;
      const idx = Math.floor(normHydropathy * intervals.length);
      noteSymbol = intervals[Math.min(idx, intervals.length - 1)];
      noteOctave = baseOctave + (aaInfo.hydropathy > 0 ? 0 : -1);
      interval = JUST_INTERVALS[noteSymbol] || JUST_INTERVALS['C'];
      frequency = calculateJustFrequency(noteSymbol, noteOctave);
      targetVoltage = noteToPitchCV(noteSymbol, noteOctave, 2);
    }

    const secStruct = getSecondaryStructure(char);

    notes.push({
      id: `note-${i}-${char}`,
      aminoAcid: char,
      aminoName: aaInfo.code3,
      molecularWeight: aaInfo.molecularWeight,
      quantumFrequency: aaInfo.deBroglieQuantumHz,
      symbol: noteSymbol,
      octave: noteOctave,
      interval,
      frequency,
      targetVoltage,
      duration: 1.0,
      gate: defaultGate,
      velocity: 0.8 + (Math.abs(aaInfo.hydropathy) / 10) * 0.2,
      secondaryStructure: secStruct.type,
      structureLabel: secStruct.label,
      structureGateMultiplier: secStruct.gateMultiplier
    });
  }

  return notes;
}

/**
 * Curated Meta-Proteodies: Complex multi-protein mixtures played simultaneously to recreate 
 * the pharmacological and metabolic signature of substances.
 */

// Coffee (Coffea arabica / Caffeine Pharmacodynamic Cascade)
// 1. ADORA2A (Adenosine A2A Receptor) - Caffeine antagonist, blocks drowsiness signals
// 2. RYR1 (Ryanodine Receptor 1) - Releases intracellular Ca2+, drives muscular & cardiac vigor
// 3. DRD2 (Dopamine D2 Receptor) - Heteromer with A2A, disinhibits dopamine for motivation & euphoria
// 4. CYP1A2 (Cytochrome P450 1A2) - Primary liver metabolic enzyme responsible for caffeine clearance
export const COFFEE_PROTEIN_DATA = {
  // Human Adenosine A2A Receptor (Transmembrane domain & ligand binding pocket)
  adora2a: {
    id: 'adora2a',
    name: 'Adenosine A2A Receptor (ADORA2A)',
    role: 'Awakening & Vigilance: Competitive caffeine binding blocks adenosine fatigue signaling',
    sequence: 'IMGSSVYITVELAIAVLAILGNVLVCWAVWLNSNLQNVTNYFVVSLAAADIAVGVLAIPFAITISTGFCA',
    octave: 4,
    gain: 0.85,
    color: 'amber',
    pkStage: 'fast_receptor' as const,
    pkStageName: 'Target Receptor Binding (Immediate Onset)',
    pkOnsetDelayMs: 0,
    pkHalfLifeMultiplier: 1.0,
    pkFilterOpenness: 0.90
  },
  // Ryanodine Receptor 1 (Caffeine-sensitive calcium release channel pore region)
  ryr1: {
    id: 'ryr1',
    name: 'Ryanodine Receptor 1 (RYR1)',
    role: 'Physical Energy & Fire: Caffeine sensitizes channel to trigger sarcoplasmic Ca2+ sparks',
    sequence: 'MVYFGLAVMGQAEVTGPMVDVPEPQEQISVDLGISGGEEKEEPKEVEKTDKSGEDGKAPLPP',
    octave: 2,
    gain: 0.80,
    color: 'rose',
    pkStage: 'ion_channel' as const,
    pkStageName: 'Ion Channel Ca2+ Flux (+45ms Offset)',
    pkOnsetDelayMs: 45,
    pkHalfLifeMultiplier: 1.15,
    pkFilterOpenness: 0.75
  },
  // Dopamine D2 Receptor (Post-synaptic signaling core)
  drd2: {
    id: 'drd2',
    name: 'Dopamine D2 Receptor (DRD2)',
    role: 'Focus & Euphoria: A2A-D2 heteromers disinhibit dopamine transmission in striatum',
    sequence: 'MDPLNLSWYDDDLERQNWSRPFNGSDGKADRPHYNYYATLLTLLIAVIVFGNVLVCMAVSREKALQTTTNYL',
    octave: 5,
    gain: 0.70,
    color: 'cyan',
    pkStage: 'neuromodulator' as const,
    pkStageName: 'Striatal Dopaminergic Shimmer (+90ms Offset)',
    pkOnsetDelayMs: 90,
    pkHalfLifeMultiplier: 1.35,
    pkFilterOpenness: 0.95
  },
  // Cytochrome P450 1A2 (Catalytic active site metabolizing caffeine into paraxanthine)
  cyp1a2: {
    id: 'cyp1a2',
    name: 'Cytochrome P450 1A2 (CYP1A2)',
    role: 'Metabolic Clearance & Flow: Primary hepatic hemeprotein driving caffeine turnover',
    sequence: 'MAFSQSFLLALLFLAFLCLPQTLASPEKPEAWVALLLLLTLFLGLAWYVYRHPPRLPPGPRGFLPF',
    octave: 3,
    gain: 0.75,
    color: 'emerald',
    pkStage: 'metabolic_clearance' as const,
    pkStageName: 'Hepatic Clearance Enzyme (+140ms Offset, 2.2x Tail)',
    pkOnsetDelayMs: 140,
    pkHalfLifeMultiplier: 2.20,
    pkFilterOpenness: 0.65
  }
};

/**
 * Creates an initialized Coffee Meta-Proteody configuration with pre-translated notes
 */
export function createCoffeeMetaProteody(): MetaProteodyConfig {
  const adora2aNotes = translateSequenceToProteody(COFFEE_PROTEIN_DATA.adora2a.sequence, COFFEE_PROTEIN_DATA.adora2a.octave, 0.80, 'sternheimer_mass_5just');
  const ryr1Notes = translateSequenceToProteody(COFFEE_PROTEIN_DATA.ryr1.sequence, COFFEE_PROTEIN_DATA.ryr1.octave, 0.85, 'sternheimer_mass_5just');
  const drd2Notes = translateSequenceToProteody(COFFEE_PROTEIN_DATA.drd2.sequence, COFFEE_PROTEIN_DATA.drd2.octave, 0.75, 'sternheimer_mass_5just');
  const cyp1a2Notes = translateSequenceToProteody(COFFEE_PROTEIN_DATA.cyp1a2.sequence, COFFEE_PROTEIN_DATA.cyp1a2.octave, 0.80, 'sternheimer_mass_5just');

  const layers: MetaProteodyLayer[] = [
    {
      proteinId: COFFEE_PROTEIN_DATA.adora2a.id,
      proteinName: COFFEE_PROTEIN_DATA.adora2a.name,
      biologicalRole: COFFEE_PROTEIN_DATA.adora2a.role,
      aminoSequence: COFFEE_PROTEIN_DATA.adora2a.sequence,
      octave: COFFEE_PROTEIN_DATA.adora2a.octave,
      gain: COFFEE_PROTEIN_DATA.adora2a.gain,
      notes: adora2aNotes,
      currentStep: 0,
      color: COFFEE_PROTEIN_DATA.adora2a.color,
      pkStage: COFFEE_PROTEIN_DATA.adora2a.pkStage,
      pkStageName: COFFEE_PROTEIN_DATA.adora2a.pkStageName,
      pkOnsetDelayMs: COFFEE_PROTEIN_DATA.adora2a.pkOnsetDelayMs,
      pkHalfLifeMultiplier: COFFEE_PROTEIN_DATA.adora2a.pkHalfLifeMultiplier,
      pkFilterOpenness: COFFEE_PROTEIN_DATA.adora2a.pkFilterOpenness
    },
    {
      proteinId: COFFEE_PROTEIN_DATA.ryr1.id,
      proteinName: COFFEE_PROTEIN_DATA.ryr1.name,
      biologicalRole: COFFEE_PROTEIN_DATA.ryr1.role,
      aminoSequence: COFFEE_PROTEIN_DATA.ryr1.sequence,
      octave: COFFEE_PROTEIN_DATA.ryr1.octave,
      gain: COFFEE_PROTEIN_DATA.ryr1.gain,
      notes: ryr1Notes,
      currentStep: 0,
      color: COFFEE_PROTEIN_DATA.ryr1.color,
      pkStage: COFFEE_PROTEIN_DATA.ryr1.pkStage,
      pkStageName: COFFEE_PROTEIN_DATA.ryr1.pkStageName,
      pkOnsetDelayMs: COFFEE_PROTEIN_DATA.ryr1.pkOnsetDelayMs,
      pkHalfLifeMultiplier: COFFEE_PROTEIN_DATA.ryr1.pkHalfLifeMultiplier,
      pkFilterOpenness: COFFEE_PROTEIN_DATA.ryr1.pkFilterOpenness
    },
    {
      proteinId: COFFEE_PROTEIN_DATA.drd2.id,
      proteinName: COFFEE_PROTEIN_DATA.drd2.name,
      biologicalRole: COFFEE_PROTEIN_DATA.drd2.role,
      aminoSequence: COFFEE_PROTEIN_DATA.drd2.sequence,
      octave: COFFEE_PROTEIN_DATA.drd2.octave,
      gain: COFFEE_PROTEIN_DATA.drd2.gain,
      notes: drd2Notes,
      currentStep: 0,
      color: COFFEE_PROTEIN_DATA.drd2.color,
      pkStage: COFFEE_PROTEIN_DATA.drd2.pkStage,
      pkStageName: COFFEE_PROTEIN_DATA.drd2.pkStageName,
      pkOnsetDelayMs: COFFEE_PROTEIN_DATA.drd2.pkOnsetDelayMs,
      pkHalfLifeMultiplier: COFFEE_PROTEIN_DATA.drd2.pkHalfLifeMultiplier,
      pkFilterOpenness: COFFEE_PROTEIN_DATA.drd2.pkFilterOpenness
    },
    {
      proteinId: COFFEE_PROTEIN_DATA.cyp1a2.id,
      proteinName: COFFEE_PROTEIN_DATA.cyp1a2.name,
      biologicalRole: COFFEE_PROTEIN_DATA.cyp1a2.role,
      aminoSequence: COFFEE_PROTEIN_DATA.cyp1a2.sequence,
      octave: COFFEE_PROTEIN_DATA.cyp1a2.octave,
      gain: COFFEE_PROTEIN_DATA.cyp1a2.gain,
      notes: cyp1a2Notes,
      currentStep: 0,
      color: COFFEE_PROTEIN_DATA.cyp1a2.color,
      pkStage: COFFEE_PROTEIN_DATA.cyp1a2.pkStage,
      pkStageName: COFFEE_PROTEIN_DATA.cyp1a2.pkStageName,
      pkOnsetDelayMs: COFFEE_PROTEIN_DATA.cyp1a2.pkOnsetDelayMs,
      pkHalfLifeMultiplier: COFFEE_PROTEIN_DATA.cyp1a2.pkHalfLifeMultiplier,
      pkFilterOpenness: COFFEE_PROTEIN_DATA.cyp1a2.pkFilterOpenness
    }
  ];

  return {
    id: 'meta-coffee',
    name: 'Coffee Meta-Proteody (Caffeine Cascade)',
    substance: 'Coffee (Coffea arabica)',
    category: 'Metabolic & Stimulant',
    description: 'A 4-voice biological chord counterpoint mapping the full neurochemical cascade of coffee into parallel 5-Just musical layers.',
    biologicalMechanism: 'Ingested caffeine blocks Adenosine A2A receptors to prevent drowsiness, sensitizes Ryanodine (RYR1) channels to release calcium for physical vigor, enhances Dopamine D2 receptor transmission via A2A-D2 heteromers for motivational drive, and is steadily transformed by hepatic Cytochrome P450 1A2 (CYP1A2).',
    layers,
    polyphonyMode: 'polyphonic_chord',
    pkMode: 'pk_cascade',
    pkTimeScale: 1.0,
    pkClearanceTailMultiplier: 2.2,
    enableSecondaryStructureArticulation: true
  };
}

export const GREEN_TEA_PROTEIN_DATA = {
  gria1: {
    id: 'gria1-ampa',
    name: 'Glutamate AMPA Receptor 1 (GRIA1)',
    role: 'Target Receptor: L-Theanine competitive antagonist, dampening neuro-excitation and stimulating alpha brainwaves (8-12 Hz)',
    sequence: 'MQKIMHISVLLSPVLWGLIFGVSSNSIQIGGLFPRGADQEYSAFRVGMVQFSTSEFRLTPHIDNLEVANSFAVTNAFCSQFSRGVYAIFGFYDKKSVNTITSFCGTLHVSFITPSFPTDGTHPFVIQMRPDLKGALLSLIEYYQWDKFAYLYDSDRGLSTLQAVLDSAAEKKWQVTAINVGNINNDKKDETYRSLFQDLELKKERRVILDCERDKVNDIVDQVITIGKHVKGYHYIIANLGFTDGDLLKIQ',
    octave: 4,
    gain: 0.85,
    color: 'emerald',
    pkStage: 'fast_receptor' as const,
    pkStageName: 'AMPA Binding / Alpha Wave (+0ms Offset, 1.0x Tail)',
    pkOnsetDelayMs: 0,
    pkHalfLifeMultiplier: 1.0,
    pkFilterOpenness: 0.90,
    pan: -0.20
  },
  gabra1: {
    id: 'gabra1',
    name: 'GABA-A Receptor Alpha 1 (GABRA1)',
    role: 'Ion Channel: GABAergic central inhibition, soothing autonomic jitter and relaxing muscular tension',
    sequence: 'MRKRMGLCVLLLLFLSVVLGTSQTENSSKNDEDDYEDTVSNKTWDVLPRKSRLVPQEEAKEDVDDVAYTLAKFVRSRFKPVVYSFLVMSLVILLLTVFSFVLYRKVLPRKGSKKTKK',
    octave: 3,
    gain: 0.80,
    color: 'teal',
    pkStage: 'ion_channel' as const,
    pkStageName: 'GABA-A Chloride Channel (+40ms Offset, 1.2x Tail)',
    pkOnsetDelayMs: 40,
    pkHalfLifeMultiplier: 1.20,
    pkFilterOpenness: 0.70,
    pan: -0.55
  },
  comt: {
    id: 'comt',
    name: 'Catechol-O-methyltransferase (COMT)',
    role: 'Neuromodulation: Cortical dopamine and norepinephrine regulation, fostering sustained mental stamina and clarity',
    sequence: 'MGDTKEQRILNHVLQHAEPGNAQSVLEAIDTYCEQKEWAMNVGDKKGKIVDAVIQEHQPSVLLELGAYCGYSAVRMARLLSPGARLITIEINPDCAAITQRMVDFAGVKDKVTLVVGASQDIIPQLKKKYDVDTLDMVFLDHWKDRYLPDTLLLEECGLLRKGTVLLADNVICPGAPDFLAHVRGSSCFECTHYQSFLEYREVVDGLEKAIYKGPGSEAGP',
    octave: 5,
    gain: 0.75,
    color: 'lime',
    pkStage: 'neuromodulator' as const,
    pkStageName: 'Dopamine Stabilization (+85ms Offset, 1.4x Tail)',
    pkOnsetDelayMs: 85,
    pkHalfLifeMultiplier: 1.40,
    pkFilterOpenness: 0.85,
    pan: +0.45
  },
  rpsa: {
    id: 'rpsa',
    name: '67kDa Laminin Receptor (RPSA / EGCG Target)',
    role: 'Metabolic & Neuroprotection: Direct high-affinity cell surface docking target for EGCG antioxidant cascade',
    sequence: 'MSGALDVLQMKEEDVLKFLAAGTHLGGTNLDFQMEQYIYKRKSDGIYIINLKRTWEKLLLAARAIVAIENPADVSVISSRNTGQRAVLKFAAATGATPIAGRFTPGTFTNQIQAAFREPRLLVVTDPRADHQPLTEASYVNLPTIALCNTDSPLRYVDIAIPCNNKGAHSVGLMWWMLAREVLRMRGTISREHPWEVMPDLYFYRDPEEIEKEEQAAAEKAVTKEEFQGEWTAPAPEFTATQPEVADWSEGVQVPSVPIQQFPTEDWSAQPATEDWSAAPTAQATEWVGATTDWS',
    octave: 4,
    gain: 0.78,
    color: 'green',
    pkStage: 'metabolic_clearance' as const,
    pkStageName: 'EGCG Neuroprotection Target (+135ms Offset, 2.4x Tail)',
    pkOnsetDelayMs: 135,
    pkHalfLifeMultiplier: 2.40,
    pkFilterOpenness: 0.60,
    pan: +0.15
  }
};

export function createGreenTeaMetaProteody(): MetaProteodyConfig {
  const gria1Notes = translateSequenceToProteody(GREEN_TEA_PROTEIN_DATA.gria1.sequence, GREEN_TEA_PROTEIN_DATA.gria1.octave, 0.85, 'sternheimer_mass_5just');
  const gabra1Notes = translateSequenceToProteody(GREEN_TEA_PROTEIN_DATA.gabra1.sequence, GREEN_TEA_PROTEIN_DATA.gabra1.octave, 0.80, 'sternheimer_mass_5just');
  const comtNotes = translateSequenceToProteody(GREEN_TEA_PROTEIN_DATA.comt.sequence, GREEN_TEA_PROTEIN_DATA.comt.octave, 0.75, 'sternheimer_mass_5just');
  const rpsaNotes = translateSequenceToProteody(GREEN_TEA_PROTEIN_DATA.rpsa.sequence, GREEN_TEA_PROTEIN_DATA.rpsa.octave, 0.78, 'sternheimer_mass_5just');

  const layers: MetaProteodyLayer[] = [
    {
      proteinId: GREEN_TEA_PROTEIN_DATA.gria1.id,
      proteinName: GREEN_TEA_PROTEIN_DATA.gria1.name,
      biologicalRole: GREEN_TEA_PROTEIN_DATA.gria1.role,
      aminoSequence: GREEN_TEA_PROTEIN_DATA.gria1.sequence,
      octave: GREEN_TEA_PROTEIN_DATA.gria1.octave,
      gain: GREEN_TEA_PROTEIN_DATA.gria1.gain,
      notes: gria1Notes,
      currentStep: 0,
      color: GREEN_TEA_PROTEIN_DATA.gria1.color,
      pkStage: GREEN_TEA_PROTEIN_DATA.gria1.pkStage,
      pkStageName: GREEN_TEA_PROTEIN_DATA.gria1.pkStageName,
      pkOnsetDelayMs: GREEN_TEA_PROTEIN_DATA.gria1.pkOnsetDelayMs,
      pkHalfLifeMultiplier: GREEN_TEA_PROTEIN_DATA.gria1.pkHalfLifeMultiplier,
      pkFilterOpenness: GREEN_TEA_PROTEIN_DATA.gria1.pkFilterOpenness,
      pan: GREEN_TEA_PROTEIN_DATA.gria1.pan
    },
    {
      proteinId: GREEN_TEA_PROTEIN_DATA.gabra1.id,
      proteinName: GREEN_TEA_PROTEIN_DATA.gabra1.name,
      biologicalRole: GREEN_TEA_PROTEIN_DATA.gabra1.role,
      aminoSequence: GREEN_TEA_PROTEIN_DATA.gabra1.sequence,
      octave: GREEN_TEA_PROTEIN_DATA.gabra1.octave,
      gain: GREEN_TEA_PROTEIN_DATA.gabra1.gain,
      notes: gabra1Notes,
      currentStep: 0,
      color: GREEN_TEA_PROTEIN_DATA.gabra1.color,
      pkStage: GREEN_TEA_PROTEIN_DATA.gabra1.pkStage,
      pkStageName: GREEN_TEA_PROTEIN_DATA.gabra1.pkStageName,
      pkOnsetDelayMs: GREEN_TEA_PROTEIN_DATA.gabra1.pkOnsetDelayMs,
      pkHalfLifeMultiplier: GREEN_TEA_PROTEIN_DATA.gabra1.pkHalfLifeMultiplier,
      pkFilterOpenness: GREEN_TEA_PROTEIN_DATA.gabra1.pkFilterOpenness,
      pan: GREEN_TEA_PROTEIN_DATA.gabra1.pan
    },
    {
      proteinId: GREEN_TEA_PROTEIN_DATA.comt.id,
      proteinName: GREEN_TEA_PROTEIN_DATA.comt.name,
      biologicalRole: GREEN_TEA_PROTEIN_DATA.comt.role,
      aminoSequence: GREEN_TEA_PROTEIN_DATA.comt.sequence,
      octave: GREEN_TEA_PROTEIN_DATA.comt.octave,
      gain: GREEN_TEA_PROTEIN_DATA.comt.gain,
      notes: comtNotes,
      currentStep: 0,
      color: GREEN_TEA_PROTEIN_DATA.comt.color,
      pkStage: GREEN_TEA_PROTEIN_DATA.comt.pkStage,
      pkStageName: GREEN_TEA_PROTEIN_DATA.comt.pkStageName,
      pkOnsetDelayMs: GREEN_TEA_PROTEIN_DATA.comt.pkOnsetDelayMs,
      pkHalfLifeMultiplier: GREEN_TEA_PROTEIN_DATA.comt.pkHalfLifeMultiplier,
      pkFilterOpenness: GREEN_TEA_PROTEIN_DATA.comt.pkFilterOpenness,
      pan: GREEN_TEA_PROTEIN_DATA.comt.pan
    },
    {
      proteinId: GREEN_TEA_PROTEIN_DATA.rpsa.id,
      proteinName: GREEN_TEA_PROTEIN_DATA.rpsa.name,
      biologicalRole: GREEN_TEA_PROTEIN_DATA.rpsa.role,
      aminoSequence: GREEN_TEA_PROTEIN_DATA.rpsa.sequence,
      octave: GREEN_TEA_PROTEIN_DATA.rpsa.octave,
      gain: GREEN_TEA_PROTEIN_DATA.rpsa.gain,
      notes: rpsaNotes,
      currentStep: 0,
      color: GREEN_TEA_PROTEIN_DATA.rpsa.color,
      pkStage: GREEN_TEA_PROTEIN_DATA.rpsa.pkStage,
      pkStageName: GREEN_TEA_PROTEIN_DATA.rpsa.pkStageName,
      pkOnsetDelayMs: GREEN_TEA_PROTEIN_DATA.rpsa.pkOnsetDelayMs,
      pkHalfLifeMultiplier: GREEN_TEA_PROTEIN_DATA.rpsa.pkHalfLifeMultiplier,
      pkFilterOpenness: GREEN_TEA_PROTEIN_DATA.rpsa.pkFilterOpenness,
      pan: GREEN_TEA_PROTEIN_DATA.rpsa.pan
    }
  ];

  return {
    id: 'meta-green-tea',
    name: 'Green Tea & Matcha (L-Theanine Zen Cascade)',
    substance: 'Green Tea / Matcha (Camellia sinensis)',
    category: 'Focus & Nootropic',
    description: 'A 4-voice calm-alertness cascade combining L-Theanine alpha wave induction, GABAergic autonomic soothing, cortical dopamine stabilization, and EGCG neuroprotection.',
    biologicalMechanism: 'L-Theanine dampens Glutamate AMPA excitation (GRIA1) promoting calm alpha brain waves, GABA-A Alpha 1 (GABRA1) activation prevents sympathetic over-arousal, COMT stabilizes prefrontal dopamine for steady flow-state concentration, and EGCG docks to the 67kDa Laminin Receptor (RPSA) for deep cellular protection.',
    layers,
    polyphonyMode: 'polyphonic_chord',
    pkMode: 'pk_cascade',
    pkTimeScale: 1.0,
    pkClearanceTailMultiplier: 2.4,
    enableSecondaryStructureArticulation: true
  };
}

export const CACAO_PROTEIN_DATA = {
  adora1: {
    id: 'adora1',
    name: 'Adenosine A1 Receptor (ADORA1)',
    role: 'Target Receptor: Theobromine cardiovascular vasodilation, increasing cerebral capillary flow and pulse relaxation',
    sequence: 'MPPSISAFQAAYIGIEVLIALVSVPGNVLVIWAVKVNQALRDATFCFIVSLAVADVAVGALVIPLAILINIGPQTYFHTCLMVACPVLILTQSSILALLAIAVDRYLRVKIPLRYKMVVTPRRAAVAIAGCWILSFVVGLTPMFGWNNLSAVERAWAA',
    octave: 3,
    gain: 0.85,
    color: 'amber',
    pkStage: 'fast_receptor' as const,
    pkStageName: 'Cardiovascular Vasodilation (+0ms Offset, 1.0x Tail)',
    pkOnsetDelayMs: 0,
    pkHalfLifeMultiplier: 1.0,
    pkFilterOpenness: 0.85,
    pan: -0.35
  },
  cnr1: {
    id: 'cnr1',
    name: 'Cannabinoid CB1 Receptor (CNR1)',
    role: 'Ion Channel / Membrane: Anandamide ("bliss molecule") endocannabinoid receptor activation, elevating sensory warmth and perceptual depth',
    sequence: 'MKSILDGLADTTFRTITTDLLYVGSNDIQYEDIKGDMASKLGYFPQKFPLTSFRGSPFQEKMTAGDNPQLVPADQVNITEFYNKSLSSFKENEENIQCGENFMDIECFMVLNPSQQLAIAVLSLTLGTFTVLENLLVLCVILHSRSLRCRPSYHFIGSLAVADLLGSVIFVYSFIDFHVFHRKDSRNVFLFKLGGVTASFTASVGSLFLTAIDRYISIHRPLAYKRIVTRPKAVVAFCLMWTIAIVIAVLPLLGWNCEKLQSVCSDIFPHIDETYLMFWIGVTSVLLLFIVYAYMYILW',
    octave: 4,
    gain: 0.82,
    color: 'orange',
    pkStage: 'ion_channel' as const,
    pkStageName: 'Endocannabinoid CB1 Bliss (+50ms Offset, 1.3x Tail)',
    pkOnsetDelayMs: 50,
    pkHalfLifeMultiplier: 1.30,
    pkFilterOpenness: 0.80,
    pan: +0.50
  },
  htr1a: {
    id: 'htr1a',
    name: 'Serotonin 5-HT1A Receptor (HTR1A)',
    role: 'Neuromodulation: Serotonergic emotional ease, affective warmth, and gentle heart opening',
    sequence: 'MDVLSPGQGNNTTSPPAPFETGGNTTGISDVTVSYQVITSLLLGTLIFCAVLGNACVVAAIALERSLQNVANYLIGSLAVTDLMVSVLVLPMAALYQVLNKWTLGQVTCDLFIALDVLCCTSSILHLCAIALDRYWAITDPIDYVNKRTPRRAAALISLTWLIGFLISIPPMLGWRTPEDRSDPDACTISKDHGYTIYSTFGAFYIPLLLMLVLYGRIFRAARFRIRKTVKKVEKTGADTRHGASPAPQPKKSVNGESGSRNWRLGVESKAGGALC',
    octave: 5,
    gain: 0.76,
    color: 'rose',
    pkStage: 'neuromodulator' as const,
    pkStageName: 'Serotonergic Heart Uplift (+95ms Offset, 1.45x Tail)',
    pkOnsetDelayMs: 95,
    pkHalfLifeMultiplier: 1.45,
    pkFilterOpenness: 0.90,
    pan: -0.40
  },
  faah: {
    id: 'faah',
    name: 'Fatty Acid Amide Hydrolase (FAAH)',
    role: 'Metabolic Clearance: Enzymatic preservation of anandamide, producing the classic lingering cacao afterglow',
    sequence: 'MVQYELWAYVSRGGSWPRGATLLLCAALLAALLGAASLWYLRHGRGGPAPGRGGAGGAAGAGRSRSPPAPAPGSRGGPGRGGRGGARGALPPGPGGRGPRGPGPGRGRPLGAPGAGPGRPRGARPGPGAPGPGRPRGARPGLRG',
    octave: 4,
    gain: 0.74,
    color: 'yellow',
    pkStage: 'metabolic_clearance' as const,
    pkStageName: 'Anandamide Clearance Tail (+150ms Offset, 2.5x Tail)',
    pkOnsetDelayMs: 150,
    pkHalfLifeMultiplier: 2.50,
    pkFilterOpenness: 0.65,
    pan: +0.25
  }
};

export function createCacaoMetaProteody(): MetaProteodyConfig {
  const adora1Notes = translateSequenceToProteody(CACAO_PROTEIN_DATA.adora1.sequence, CACAO_PROTEIN_DATA.adora1.octave, 0.85, 'sternheimer_mass_5just');
  const cnr1Notes = translateSequenceToProteody(CACAO_PROTEIN_DATA.cnr1.sequence, CACAO_PROTEIN_DATA.cnr1.octave, 0.82, 'sternheimer_mass_5just');
  const htr1aNotes = translateSequenceToProteody(CACAO_PROTEIN_DATA.htr1a.sequence, CACAO_PROTEIN_DATA.htr1a.octave, 0.76, 'sternheimer_mass_5just');
  const faahNotes = translateSequenceToProteody(CACAO_PROTEIN_DATA.faah.sequence, CACAO_PROTEIN_DATA.faah.octave, 0.74, 'sternheimer_mass_5just');

  const layers: MetaProteodyLayer[] = [
    {
      proteinId: CACAO_PROTEIN_DATA.adora1.id,
      proteinName: CACAO_PROTEIN_DATA.adora1.name,
      biologicalRole: CACAO_PROTEIN_DATA.adora1.role,
      aminoSequence: CACAO_PROTEIN_DATA.adora1.sequence,
      octave: CACAO_PROTEIN_DATA.adora1.octave,
      gain: CACAO_PROTEIN_DATA.adora1.gain,
      notes: adora1Notes,
      currentStep: 0,
      color: CACAO_PROTEIN_DATA.adora1.color,
      pkStage: CACAO_PROTEIN_DATA.adora1.pkStage,
      pkStageName: CACAO_PROTEIN_DATA.adora1.pkStageName,
      pkOnsetDelayMs: CACAO_PROTEIN_DATA.adora1.pkOnsetDelayMs,
      pkHalfLifeMultiplier: CACAO_PROTEIN_DATA.adora1.pkHalfLifeMultiplier,
      pkFilterOpenness: CACAO_PROTEIN_DATA.adora1.pkFilterOpenness,
      pan: CACAO_PROTEIN_DATA.adora1.pan
    },
    {
      proteinId: CACAO_PROTEIN_DATA.cnr1.id,
      proteinName: CACAO_PROTEIN_DATA.cnr1.name,
      biologicalRole: CACAO_PROTEIN_DATA.cnr1.role,
      aminoSequence: CACAO_PROTEIN_DATA.cnr1.sequence,
      octave: CACAO_PROTEIN_DATA.cnr1.octave,
      gain: CACAO_PROTEIN_DATA.cnr1.gain,
      notes: cnr1Notes,
      currentStep: 0,
      color: CACAO_PROTEIN_DATA.cnr1.color,
      pkStage: CACAO_PROTEIN_DATA.cnr1.pkStage,
      pkStageName: CACAO_PROTEIN_DATA.cnr1.pkStageName,
      pkOnsetDelayMs: CACAO_PROTEIN_DATA.cnr1.pkOnsetDelayMs,
      pkHalfLifeMultiplier: CACAO_PROTEIN_DATA.cnr1.pkHalfLifeMultiplier,
      pkFilterOpenness: CACAO_PROTEIN_DATA.cnr1.pkFilterOpenness,
      pan: CACAO_PROTEIN_DATA.cnr1.pan
    },
    {
      proteinId: CACAO_PROTEIN_DATA.htr1a.id,
      proteinName: CACAO_PROTEIN_DATA.htr1a.name,
      biologicalRole: CACAO_PROTEIN_DATA.htr1a.role,
      aminoSequence: CACAO_PROTEIN_DATA.htr1a.sequence,
      octave: CACAO_PROTEIN_DATA.htr1a.octave,
      gain: CACAO_PROTEIN_DATA.htr1a.gain,
      notes: htr1aNotes,
      currentStep: 0,
      color: CACAO_PROTEIN_DATA.htr1a.color,
      pkStage: CACAO_PROTEIN_DATA.htr1a.pkStage,
      pkStageName: CACAO_PROTEIN_DATA.htr1a.pkStageName,
      pkOnsetDelayMs: CACAO_PROTEIN_DATA.htr1a.pkOnsetDelayMs,
      pkHalfLifeMultiplier: CACAO_PROTEIN_DATA.htr1a.pkHalfLifeMultiplier,
      pkFilterOpenness: CACAO_PROTEIN_DATA.htr1a.pkFilterOpenness,
      pan: CACAO_PROTEIN_DATA.htr1a.pan
    },
    {
      proteinId: CACAO_PROTEIN_DATA.faah.id,
      proteinName: CACAO_PROTEIN_DATA.faah.name,
      biologicalRole: CACAO_PROTEIN_DATA.faah.role,
      aminoSequence: CACAO_PROTEIN_DATA.faah.sequence,
      octave: CACAO_PROTEIN_DATA.faah.octave,
      gain: CACAO_PROTEIN_DATA.faah.gain,
      notes: faahNotes,
      currentStep: 0,
      color: CACAO_PROTEIN_DATA.faah.color,
      pkStage: CACAO_PROTEIN_DATA.faah.pkStage,
      pkStageName: CACAO_PROTEIN_DATA.faah.pkStageName,
      pkOnsetDelayMs: CACAO_PROTEIN_DATA.faah.pkOnsetDelayMs,
      pkHalfLifeMultiplier: CACAO_PROTEIN_DATA.faah.pkHalfLifeMultiplier,
      pkFilterOpenness: CACAO_PROTEIN_DATA.faah.pkFilterOpenness,
      pan: CACAO_PROTEIN_DATA.faah.pan
    }
  ];

  return {
    id: 'meta-cacao',
    name: 'Raw Cacao & Chocolate (Theobromine & Bliss Cascade)',
    substance: 'Raw Cacao (Theobroma cacao)',
    category: 'Euphoria & Bliss',
    description: 'A 4-voice heart-opening chord mapping the cardiovascular ease of theobromine, cannabinoid CB1 bliss, 5-HT1A mood lift, and anandamide preservation.',
    biologicalMechanism: 'Theobromine gently dilates cerebral and peripheral vessels via Adenosine A1 (ADORA1), Anandamide stimulates Cannabinoid CB1 receptors (CNR1) generating affective warmth, Serotonin 5-HT1A (HTR1A) provides emotional optimism, and FAAH inhibition preserves anandamide for an extended euphoric afterglow.',
    layers,
    polyphonyMode: 'polyphonic_chord',
    pkMode: 'pk_cascade',
    pkTimeScale: 1.0,
    pkClearanceTailMultiplier: 2.5,
    enableSecondaryStructureArticulation: true
  };
}

export const CHAMOMILE_PROTEIN_DATA = {
  gabra2: {
    id: 'gabra2',
    name: 'GABA-A Receptor Alpha 2 (GABRA2)',
    role: 'Target Receptor: Apigenin flavonoid allosteric modulation of benzodiazepine site, inducing quiet mental stillness without ataxia',
    sequence: 'MKTFLLFLGLLLLLSVTVGTSETENSSKNDEDDYEDTVSNKTWDVLPRKSRLVPQEEAKEDVDDVAYTLAKFVRSRFKPVVYSFLVMSLVILLLTVFSFVLYRKVLPRKGSKKTKK',
    octave: 3,
    gain: 0.85,
    color: 'indigo',
    pkStage: 'fast_receptor' as const,
    pkStageName: 'Benzodiazepine Site Calm (+0ms Offset, 1.1x Tail)',
    pkOnsetDelayMs: 0,
    pkHalfLifeMultiplier: 1.10,
    pkFilterOpenness: 0.80,
    pan: -0.40
  },
  mtnr1a: {
    id: 'mtnr1a',
    name: 'Melatonin Receptor 1A (MTNR1A)',
    role: 'Ion Channel / GPCR: Suprachiasmatic circadian phase synchronization and metabolic core temperature cooling',
    sequence: 'MQGNFTVPPSTPLVPRGPPQGAPGCSAPLLLPGAALAAILVALLGAWVLWAGRARARRRPRRGGGAR',
    octave: 4,
    gain: 0.80,
    color: 'blue',
    pkStage: 'ion_channel' as const,
    pkStageName: 'Circadian Sleep-Gate Opening (+45ms Offset, 1.3x Tail)',
    pkOnsetDelayMs: 45,
    pkHalfLifeMultiplier: 1.30,
    pkFilterOpenness: 0.75,
    pan: +0.40
  },
  glra1: {
    id: 'glra1',
    name: 'Glycine Receptor Alpha 1 (GLRA1)',
    role: 'Neuromodulation: Spinal motor interneuron inhibition, inducing complete somatic neuromuscular relaxation',
    sequence: 'MYSFNTLRLYLWETIVFFSLAASKEAEAARSAPKPMSPSDFLDKLMGRTSGYDARIRPNFKGPPVNVSCNIFINSFGSIAETTMDYRVNIFLRQQWNDPRLAYNEYPDDSLDLDPSMLDSIWKPDLFFANEKGAHFHEITTDNKLLRISRNGNVLYSIRITLTLACPMDLKNFPMDVQTCIMQLESFGYTMNDLIFEWQEQGAVQVADGLTLPQFILKEEKDLRYCTKHYNTGKFTCIEARFHLERQMGYYLIQMYIPSLLIVILSWISFWINMDAAPARVALGITTVLTMTTQSSGSRASLPKVSYVKAIDIWMAVCLLFVFSALLEYAAVNFVSRQHKELLRFRRKRRHHKDDEG',
    octave: 3,
    gain: 0.78,
    color: 'purple',
    pkStage: 'neuromodulator' as const,
    pkStageName: 'Spinal Motor Relaxation (+90ms Offset, 1.5x Tail)',
    pkOnsetDelayMs: 90,
    pkHalfLifeMultiplier: 1.50,
    pkFilterOpenness: 0.85,
    pan: -0.25
  },
  ugt1a9: {
    id: 'ugt1a9',
    name: 'UDP-Glucuronosyltransferase 1A9 (UGT1A9)',
    role: 'Metabolic Clearance: Gradual overnight Phase II hepatic glucuronidation, providing smooth restorative nocturnal sustained release',
    sequence: 'MARVRWTTLLLVVALSLCPAVLGEEGLVLVWPTEGSHWLNVRDILEELARRGHQTVVLLAPEAISLKEESKAFYTYQVPKSLLELHEFQEQAFDLLISDYFLNCSKLLLNKKLEEYLQESEFDAILVEPFDVICAGALTLNPSLKAFMEKGFAFAHVGTPWDLMGLPTNLLPYVPGMAEMTDLLMSRLQKWLFQPPRNLLTIQEFCSAQNLFMEFFLRSRLQEGFLLTLNILPFLKGFPVTVCLFFLGFPLVLFCRLRGVRRGLPR',
    octave: 4,
    gain: 0.72,
    color: 'violet',
    pkStage: 'metabolic_clearance' as const,
    pkStageName: 'Nocturnal Glucuronidation Tail (+160ms Offset, 2.8x Tail)',
    pkOnsetDelayMs: 160,
    pkHalfLifeMultiplier: 2.80,
    pkFilterOpenness: 0.60,
    pan: +0.10
  }
};

export function createChamomileMetaProteody(): MetaProteodyConfig {
  const gabra2Notes = translateSequenceToProteody(CHAMOMILE_PROTEIN_DATA.gabra2.sequence, CHAMOMILE_PROTEIN_DATA.gabra2.octave, 0.85, 'sternheimer_mass_5just');
  const mtnr1aNotes = translateSequenceToProteody(CHAMOMILE_PROTEIN_DATA.mtnr1a.sequence, CHAMOMILE_PROTEIN_DATA.mtnr1a.octave, 0.80, 'sternheimer_mass_5just');
  const glra1Notes = translateSequenceToProteody(CHAMOMILE_PROTEIN_DATA.glra1.sequence, CHAMOMILE_PROTEIN_DATA.glra1.octave, 0.78, 'sternheimer_mass_5just');
  const ugt1a9Notes = translateSequenceToProteody(CHAMOMILE_PROTEIN_DATA.ugt1a9.sequence, CHAMOMILE_PROTEIN_DATA.ugt1a9.octave, 0.72, 'sternheimer_mass_5just');

  const layers: MetaProteodyLayer[] = [
    {
      proteinId: CHAMOMILE_PROTEIN_DATA.gabra2.id,
      proteinName: CHAMOMILE_PROTEIN_DATA.gabra2.name,
      biologicalRole: CHAMOMILE_PROTEIN_DATA.gabra2.role,
      aminoSequence: CHAMOMILE_PROTEIN_DATA.gabra2.sequence,
      octave: CHAMOMILE_PROTEIN_DATA.gabra2.octave,
      gain: CHAMOMILE_PROTEIN_DATA.gabra2.gain,
      notes: gabra2Notes,
      currentStep: 0,
      color: CHAMOMILE_PROTEIN_DATA.gabra2.color,
      pkStage: CHAMOMILE_PROTEIN_DATA.gabra2.pkStage,
      pkStageName: CHAMOMILE_PROTEIN_DATA.gabra2.pkStageName,
      pkOnsetDelayMs: CHAMOMILE_PROTEIN_DATA.gabra2.pkOnsetDelayMs,
      pkHalfLifeMultiplier: CHAMOMILE_PROTEIN_DATA.gabra2.pkHalfLifeMultiplier,
      pkFilterOpenness: CHAMOMILE_PROTEIN_DATA.gabra2.pkFilterOpenness,
      pan: CHAMOMILE_PROTEIN_DATA.gabra2.pan
    },
    {
      proteinId: CHAMOMILE_PROTEIN_DATA.mtnr1a.id,
      proteinName: CHAMOMILE_PROTEIN_DATA.mtnr1a.name,
      biologicalRole: CHAMOMILE_PROTEIN_DATA.mtnr1a.role,
      aminoSequence: CHAMOMILE_PROTEIN_DATA.mtnr1a.sequence,
      octave: CHAMOMILE_PROTEIN_DATA.mtnr1a.octave,
      gain: CHAMOMILE_PROTEIN_DATA.mtnr1a.gain,
      notes: mtnr1aNotes,
      currentStep: 0,
      color: CHAMOMILE_PROTEIN_DATA.mtnr1a.color,
      pkStage: CHAMOMILE_PROTEIN_DATA.mtnr1a.pkStage,
      pkStageName: CHAMOMILE_PROTEIN_DATA.mtnr1a.pkStageName,
      pkOnsetDelayMs: CHAMOMILE_PROTEIN_DATA.mtnr1a.pkOnsetDelayMs,
      pkHalfLifeMultiplier: CHAMOMILE_PROTEIN_DATA.mtnr1a.pkHalfLifeMultiplier,
      pkFilterOpenness: CHAMOMILE_PROTEIN_DATA.mtnr1a.pkFilterOpenness,
      pan: CHAMOMILE_PROTEIN_DATA.mtnr1a.pan
    },
    {
      proteinId: CHAMOMILE_PROTEIN_DATA.glra1.id,
      proteinName: CHAMOMILE_PROTEIN_DATA.glra1.name,
      biologicalRole: CHAMOMILE_PROTEIN_DATA.glra1.role,
      aminoSequence: CHAMOMILE_PROTEIN_DATA.glra1.sequence,
      octave: CHAMOMILE_PROTEIN_DATA.glra1.octave,
      gain: CHAMOMILE_PROTEIN_DATA.glra1.gain,
      notes: glra1Notes,
      currentStep: 0,
      color: CHAMOMILE_PROTEIN_DATA.glra1.color,
      pkStage: CHAMOMILE_PROTEIN_DATA.glra1.pkStage,
      pkStageName: CHAMOMILE_PROTEIN_DATA.glra1.pkStageName,
      pkOnsetDelayMs: CHAMOMILE_PROTEIN_DATA.glra1.pkOnsetDelayMs,
      pkHalfLifeMultiplier: CHAMOMILE_PROTEIN_DATA.glra1.pkHalfLifeMultiplier,
      pkFilterOpenness: CHAMOMILE_PROTEIN_DATA.glra1.pkFilterOpenness,
      pan: CHAMOMILE_PROTEIN_DATA.glra1.pan
    },
    {
      proteinId: CHAMOMILE_PROTEIN_DATA.ugt1a9.id,
      proteinName: CHAMOMILE_PROTEIN_DATA.ugt1a9.name,
      biologicalRole: CHAMOMILE_PROTEIN_DATA.ugt1a9.role,
      aminoSequence: CHAMOMILE_PROTEIN_DATA.ugt1a9.sequence,
      octave: CHAMOMILE_PROTEIN_DATA.ugt1a9.octave,
      gain: CHAMOMILE_PROTEIN_DATA.ugt1a9.gain,
      notes: ugt1a9Notes,
      currentStep: 0,
      color: CHAMOMILE_PROTEIN_DATA.ugt1a9.color,
      pkStage: CHAMOMILE_PROTEIN_DATA.ugt1a9.pkStage,
      pkStageName: CHAMOMILE_PROTEIN_DATA.ugt1a9.pkStageName,
      pkOnsetDelayMs: CHAMOMILE_PROTEIN_DATA.ugt1a9.pkOnsetDelayMs,
      pkHalfLifeMultiplier: CHAMOMILE_PROTEIN_DATA.ugt1a9.pkHalfLifeMultiplier,
      pkFilterOpenness: CHAMOMILE_PROTEIN_DATA.ugt1a9.pkFilterOpenness,
      pan: CHAMOMILE_PROTEIN_DATA.ugt1a9.pan
    }
  ];

  return {
    id: 'meta-chamomile',
    name: 'Chamomile & Sweet Dreams (Apigenin Hypnotic Cascade)',
    substance: 'Chamomile (Matricaria chamomilla)',
    category: 'Relaxant & Sleep',
    description: 'A 4-voice tranquilizer chord mapping apigenin GABA-A calm, circadian melatonin rhythm cooling, glycine neuromuscular release, and nocturnal glucuronidation.',
    biologicalMechanism: 'Apigenin binds to central GABA-A Benzodiazepine sites (GABRA2) without ataxia, Melatonin MT1 receptors (MTNR1A) lower metabolic temperature for sleep initiation, Glycine Alpha 1 (GLRA1) silences spinal motor efferents, and gradual UGT1A9 clearance produces deep restorative rest.',
    layers,
    polyphonyMode: 'polyphonic_chord',
    pkMode: 'pk_cascade',
    pkTimeScale: 1.0,
    pkClearanceTailMultiplier: 2.8,
    enableSecondaryStructureArticulation: true
  };
}

/**
 * Creates a fully customized user-defined Meta-Proteody configuration
 */
export function createCustomMetaProteody(params: {
  id?: string;
  name: string;
  substance: string;
  category: MetaProteodyConfig['category'];
  description: string;
  biologicalMechanism: string;
  layers: Array<{
    proteinId: string;
    proteinName: string;
    biologicalRole: string;
    aminoSequence: string;
    octave: number;
    gain: number;
    color: string;
    pkStage: MetaProteodyLayer['pkStage'];
    pkStageName: string;
    pkOnsetDelayMs: number;
    pkHalfLifeMultiplier: number;
    pkFilterOpenness?: number;
    pan?: number;
  }>;
  pkMode?: 'pk_cascade' | 'simultaneous_chord';
  pkTimeScale?: number;
  pkClearanceTailMultiplier?: number;
  enableSecondaryStructureArticulation?: boolean;
}): MetaProteodyConfig {
  const initializedLayers: MetaProteodyLayer[] = params.layers.map(layer => {
    const notes = translateSequenceToProteody(layer.aminoSequence, layer.octave, layer.gain, 'sternheimer_mass_5just');
    return {
      ...layer,
      notes,
      currentStep: 0,
      pkFilterOpenness: layer.pkFilterOpenness ?? 0.80,
      pan: layer.pan ?? 0.0
    };
  });

  return {
    id: params.id || `meta-custom-${Date.now()}`,
    name: params.name,
    substance: params.substance,
    category: params.category,
    description: params.description,
    biologicalMechanism: params.biologicalMechanism,
    layers: initializedLayers,
    polyphonyMode: 'polyphonic_chord',
    pkMode: params.pkMode || 'pk_cascade',
    pkTimeScale: params.pkTimeScale ?? 1.0,
    pkClearanceTailMultiplier: params.pkClearanceTailMultiplier ?? 2.2,
    enableSecondaryStructureArticulation: params.enableSecondaryStructureArticulation ?? true
  };
}

export const CURATED_META_PROTEODIES: MetaProteodyConfig[] = [
  createCoffeeMetaProteody(),
  createGreenTeaMetaProteody(),
  createCacaoMetaProteody(),
  createChamomileMetaProteody()
];

