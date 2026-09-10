//! The resonance pitch mapping — **immutable by design**, now driven by one of
//! the five Sternheimer algorithms from the prototype reference spec
//! (`docs/PROTOTYPE.md` §4).
//!
//! `ResonanceMap` is built once from a `Sequence` + an `Algorithm` (chosen at
//! construction; no live setter) and assigns each residue an exact
//! Just-Intonation pitch. The type exposes only read access: `pitch_at`,
//! `iter`, `len`, and the `algorithm` that produced it. There is no setter and
//! no `&mut` producer, so the performer cannot retune an individual note. This
//! is the structural guarantee of the resonance principle.

use crate::seq::{AminoAcid, Sequence};
use crate::tuning::{self, JustInterval, Ratio};

/// The pitch for one residue: a fixed JI tone, a continuous microtonal tone
/// (carrying the unquantized frequency), or a rest for a `Gap`.
#[derive(Copy, Clone, Debug, PartialEq)]
pub enum Pitch {
    /// Quantized to the 5-limit Just lattice.
    Tone {
        ratio: Ratio,
        symbol: &'static str,
        octave: i32,
        hz: f64,
        cents_deviation: f64,
    },
    /// Unquantized microtonal frequency (still fixed; nearest JI note kept for
    /// display only, via the `continuous` algorithms).
    Continuous {
        hz: f64,
        nearest: JustInterval,
        nearest_octave: i32,
        cents_deviation: f64,
    },
    /// No pitch (alignment gap).
    Rest,
}

impl Pitch {
    pub fn hz(&self) -> Option<f64> {
        match self {
            Pitch::Tone { hz, .. } | Pitch::Continuous { hz, .. } => Some(*hz),
            Pitch::Rest => None,
        }
    }

    /// The JI note symbol for display (nearest, for continuous pitches).
    pub fn symbol(&self) -> Option<&'static str> {
        match self {
            Pitch::Tone { symbol, .. } => Some(*symbol),
            Pitch::Continuous { nearest, .. } => Some(nearest.symbol),
            Pitch::Rest => None,
        }
    }

    /// 1V/octave pitch volts relative to C2 = 0V.
    pub fn pitch_cv_volts(&self) -> Option<f64> {
        self.hz().map(tuning::frequency_to_pitch_cv)
    }
}

/// The algorithm used to derive pitch from a residue. Chosen once at map
/// construction; immutable thereafter. Matches the prototype's `algorithm`
/// field (`docs/PROTOTYPE.md` §4).
#[derive(Copy, Clone, Debug, Default, PartialEq, Eq, Hash)]
pub enum Algorithm {
    /// Mass → Sternheimer audible Hz → snap to 5-limit Just. (Default.)
    #[default]
    SternheimerMass5Just,
    /// Mass → Sternheimer audible Hz, unquantized microtonal.
    SternheimerMassContinuous,
    /// Canonical Sternheimer codon scale (per-AA default note/octave).
    SternheimerCanonical,
    /// Chromatic 12-bucket distribution keyed to molecular weight.
    MolecularWeight,
    /// 7-tone diatonic distribution keyed to Kyte-Doolittle hydropathy.
    Hydropathy,
}

/// Options for building a resonance map. All fields are fixed at construction.
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct BuildOptions {
    pub algorithm: Algorithm,
    /// Base octave (default 4). Algorithm-dependent shift.
    pub base_octave: i32,
}

impl Default for BuildOptions {
    fn default() -> Self {
        BuildOptions {
            algorithm: Algorithm::default(),
            base_octave: 4,
        }
    }
}

/// An immutable, constructed-once mapping from residue index to fixed pitch.
///
/// Construct with [`ResonanceMap::from_sequence`]. Once built it cannot be
/// modified: there is no setter, no `&mut` producer, and no algorithm switch.
#[derive(Clone, Debug)]
pub struct ResonanceMap {
    algorithm: Algorithm,
    pitches: Vec<Pitch>,
}

impl ResonanceMap {
    /// Build the resonance map for a sequence using the given algorithm. The
    /// pitch assignment is fixed for the life of the map.
    pub fn from_sequence(seq: &Sequence, options: BuildOptions) -> Self {
        let pitches = seq
            .residues()
            .iter()
            .map(|aa| pitch_for(*aa, &options))
            .collect();
        ResonanceMap {
            algorithm: options.algorithm,
            pitches,
        }
    }

    /// The algorithm that produced this map (read-only).
    pub fn algorithm(&self) -> Algorithm {
        self.algorithm
    }

    pub fn len(&self) -> usize {
        self.pitches.len()
    }

    pub fn is_empty(&self) -> bool {
        self.pitches.is_empty()
    }

    /// Fixed pitch at residue index `i`. Out of bounds -> `None`.
    pub fn pitch_at(&self, i: usize) -> Option<Pitch> {
        self.pitches.get(i).copied()
    }

    pub fn iter(&self) -> impl Iterator<Item = Pitch> + '_ {
        self.pitches.iter().copied()
    }
}

/// Compute the fixed pitch for one amino acid under the chosen algorithm.
/// Pure; exposed for tests and display.
pub fn pitch_for(aa: AminoAcid, options: &BuildOptions) -> Pitch {
    use Algorithm::*;
    match options.algorithm {
        SternheimerMass5Just => sternheimer_5just(aa, options.base_octave),
        SternheimerMassContinuous => sternheimer_continuous(aa, options.base_octave),
        SternheimerCanonical => sternheimer_canonical(aa, options.base_octave),
        MolecularWeight => molecular_weight(aa, options.base_octave),
        Hydropathy => hydropathy(aa, options.base_octave),
    }
}

fn sternheimer_5just(aa: AminoAcid, base_octave: i32) -> Pitch {
    let Some(mw) = aa.molecular_weight_da() else {
        return Pitch::Rest;
    };
    let audible = tuning::mass_to_audible_hz(mw);
    let snap = tuning::find_closest_just_interval(audible);
    let octave = snap.octave + (base_octave - 4);
    let hz = tuning::just_frequency(snap.interval.symbol, octave);
    Pitch::Tone {
        ratio: Ratio {
            num: snap.interval.num,
            den: snap.interval.den,
            octave: snap.octave,
        },
        symbol: snap.interval.symbol,
        octave,
        hz,
        cents_deviation: snap.cents_deviation,
    }
}

fn sternheimer_continuous(aa: AminoAcid, base_octave: i32) -> Pitch {
    let Some(mw) = aa.molecular_weight_da() else {
        return Pitch::Rest;
    };
    let octave_mult = 2f64.powi(base_octave - 4);
    let hz = tuning::mass_to_audible_hz(mw) * octave_mult;
    let snap = tuning::find_closest_just_interval(hz / octave_mult);
    Pitch::Continuous {
        hz,
        nearest: snap.interval,
        nearest_octave: base_octave,
        cents_deviation: snap.cents_deviation,
    }
}

fn sternheimer_canonical(aa: AminoAcid, base_octave: i32) -> Pitch {
    let (Some(symbol), Some(def_oct)) = (aa.sternheimer_default_note(), aa.sternheimer_default_octave())
    else {
        return Pitch::Rest;
    };
    let octave = def_oct + (base_octave - 4);
    let iv = tuning::interval_by_symbol(symbol).unwrap_or(tuning::JUST_INTERVALS[0]);
    let hz = tuning::just_frequency(symbol, octave);
    Pitch::Tone {
        ratio: Ratio {
            num: iv.num,
            den: iv.den,
            octave: def_oct,
        },
        symbol,
        octave,
        hz,
        cents_deviation: 0.0,
    }
}

fn molecular_weight(aa: AminoAcid, base_octave: i32) -> Pitch {
    let Some(mw) = aa.molecular_weight_da() else {
        return Pitch::Rest;
    };
    let order = [
        "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
    ];
    let norm = ((mw - 75.0) / (205.0 - 75.0)).clamp(0.0, 1.0);
    let idx = (norm * 12.0).floor() as usize;
    let idx = idx.min(11);
    let symbol = order[idx];
    let octave = base_octave + if mw > 150.0 { 1 } else { 0 };
    let hz = tuning::just_frequency(symbol, octave);
    let iv = tuning::interval_by_symbol(symbol).unwrap_or(tuning::JUST_INTERVALS[0]);
    Pitch::Tone {
        ratio: Ratio {
            num: iv.num,
            den: iv.den,
            octave: octave - base_octave,
        },
        symbol,
        octave,
        hz,
        cents_deviation: 0.0,
    }
}

fn hydropathy(aa: AminoAcid, base_octave: i32) -> Pitch {
    let Some(h) = aa.hydropathy() else {
        return Pitch::Rest;
    };
    let order = ["C", "D", "E", "F", "G", "A", "B"];
    let norm = ((h + 4.5) / 9.0).clamp(0.0, 1.0);
    let idx = (norm * order.len() as f64).floor() as usize;
    let idx = idx.min(order.len() - 1);
    let symbol = order[idx];
    let octave = base_octave + if h > 0.0 { 0 } else { -1 };
    let hz = tuning::just_frequency(symbol, octave);
    let iv = tuning::interval_by_symbol(symbol).unwrap_or(tuning::JUST_INTERVALS[0]);
    Pitch::Tone {
        ratio: Ratio {
            num: iv.num,
            den: iv.den,
            octave: octave - base_octave,
        },
        symbol,
        octave,
        hz,
        cents_deviation: 0.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::seq::AminoAcid::*;

    fn map(aa: AminoAcid, algo: Algorithm) -> Pitch {
        pitch_for(
            aa,
            &BuildOptions {
                algorithm: algo,
                base_octave: 4,
            },
        )
    }

    #[test]
    fn gap_is_rest_under_all_algorithms() {
        for &algo in &[
            Algorithm::SternheimerMass5Just,
            Algorithm::SternheimerMassContinuous,
            Algorithm::SternheimerCanonical,
            Algorithm::MolecularWeight,
            Algorithm::Hydropathy,
        ] {
            assert_eq!(map(AminoAcid::Gap, algo), Pitch::Rest, "{:?}", algo);
        }
    }

    #[test]
    fn sternheimer_5just_glycine_is_audible_pitch() {
        let p = map(Gly, Algorithm::SternheimerMass5Just);
        let hz = p.hz().unwrap();
        assert!(hz < 256.0, "glycine should be below C4, got {hz}");
        assert!(hz > 200.0);
    }

    #[test]
    fn sternheimer_5just_tryptophan_is_higher_than_glycine() {
        let gly = map(Gly, Algorithm::SternheimerMass5Just).hz().unwrap();
        let trp = map(Trp, Algorithm::SternheimerMass5Just).hz().unwrap();
        assert!(trp > gly, "heavier residue should be higher pitched");
    }

    #[test]
    fn sternheimer_continuous_preserves_unquantized_frequency() {
        let p = map(Gly, Algorithm::SternheimerMassContinuous);
        assert!(matches!(p, Pitch::Continuous { .. }));
        let hz = p.hz().unwrap();
        assert!((hz - 223.79).abs() < 0.5);
    }

    #[test]
    fn canonical_uses_per_aa_default_note() {
        let p = map(Ala, Algorithm::SternheimerCanonical);
        assert_eq!(p.symbol(), Some("D"));
        assert_eq!(p.hz().unwrap(), tuning::just_frequency("D", 3));
    }

    #[test]
    fn molecular_weight_is_quantized_to_12_buckets() {
        let p = map(Gly, Algorithm::MolecularWeight);
        assert_eq!(p.symbol(), Some("C"));
        let p = map(Trp, Algorithm::MolecularWeight);
        assert!(p.hz().unwrap() > 256.0);
    }

    #[test]
    fn hydropathy_maps_hydrophobic_up() {
        let p = map(Ile, Algorithm::Hydropathy);
        assert_eq!(p.symbol(), Some("B"));
        let p = map(Arg, Algorithm::Hydropathy);
        assert_eq!(p.symbol(), Some("C"));
    }

    #[test]
    fn map_is_stable_for_same_sequence_and_algorithm() {
        let seq = Sequence::new(vec![Ala, Val, Ile]);
        let o = BuildOptions::default();
        let a = ResonanceMap::from_sequence(&seq, o);
        let b = ResonanceMap::from_sequence(&seq, o);
        assert_eq!(a.pitches, b.pitches);
        assert_eq!(a.algorithm(), o.algorithm);
    }

    #[test]
    fn different_algorithms_yield_different_maps() {
        let seq = Sequence::new(vec![Gly, Trp]);
        let just = ResonanceMap::from_sequence(
            &seq,
            BuildOptions {
                algorithm: Algorithm::SternheimerMass5Just,
                base_octave: 4,
            },
        );
        let canon = ResonanceMap::from_sequence(
            &seq,
            BuildOptions {
                algorithm: Algorithm::SternheimerCanonical,
                base_octave: 4,
            },
        );
        assert_ne!(just.pitches, canon.pitches);
        assert_ne!(just.algorithm(), canon.algorithm());
    }

    #[test]
    fn no_mutable_pitch_access_exists() {
        let seq = Sequence::new(vec![Ala]);
        let map = ResonanceMap::from_sequence(&seq, BuildOptions::default());
        let _ = map.pitch_at(0);
        let _ = map.iter().count();
        let _ = map.algorithm();
        let _ = map.len();
    }

    #[test]
    fn pitch_cv_volts_uses_c2_reference() {
        let p = Pitch::Tone {
            ratio: Ratio { num: 1, den: 1, octave: 0 },
            symbol: "C",
            octave: 4,
            hz: 256.0,
            cents_deviation: 0.0,
        };
        assert!((p.pitch_cv_volts().unwrap() - 2.0).abs() < 1e-9);
    }
}
