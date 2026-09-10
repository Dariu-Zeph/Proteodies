//! The resonance pitch mapping — **immutable by design**.
//!
//! `ResonanceMap` is built once from a `Sequence` and assigns each residue an
//! exact Just-Intonation pitch. The type exposes only read access: `pitch_at`,
//! `iter`, and `len`. There is no setter, no `&mut` producer, and no way for a
//! performer to retune an individual note. This is the structural guarantee of
//! the resonance principle.

use crate::seq::{AminoAcid, Sequence};
use crate::tuning::{self, Ratio};

/// The fixed pitch for one residue, or a rest for a `Gap`.
#[derive(Copy, Clone, Debug, PartialEq)]
pub enum Pitch {
    Tone(Ratio),
    Rest,
}

impl Pitch {
    pub fn hz(&self) -> Option<f64> {
        match self {
            Pitch::Tone(r) => Some(r.hz()),
            Pitch::Rest => None,
        }
    }
}

/// An immutable, constructed-once mapping from residue index to fixed JI pitch.
///
/// Construct with [`ResonanceMap::from_sequence`]. Once built it cannot be
/// modified.
#[derive(Clone, Debug)]
pub struct ResonanceMap {
    pitches: Vec<Pitch>,
}

impl ResonanceMap {
    /// Build the resonance map for a sequence. The pitch assignment is fixed
    /// for the life of the map.
    pub fn from_sequence(seq: &Sequence) -> Self {
        let pitches = seq
            .residues()
            .iter()
            .map(|aa| match tuning::interval_index_for(*aa) {
                Some(i) => Pitch::Tone(tuning::INTERVALS[i]),
                None => Pitch::Rest,
            })
            .collect();
        ResonanceMap { pitches }
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

/// Fixed amino-acid -> interval assignment, exposed for tests and display.
/// Given an amino acid, returns its fixed JI ratio (or `None` for `Gap`).
pub fn fixed_interval(aa: AminoAcid) -> Option<Ratio> {
    tuning::interval_index_for(aa).map(|i| tuning::INTERVALS[i])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::seq::AminoAcid::*;

    #[test]
    fn each_residue_has_a_fixed_pitch() {
        let seq = Sequence::new(vec![Ala, Gly, Cys, Gap, Met]);
        let map = ResonanceMap::from_sequence(&seq);
        assert_eq!(map.len(), 5);
        assert_eq!(map.pitch_at(0), Some(Pitch::Tone(Ratio { num: 1, den: 1, octave: 0 })));
        assert_eq!(map.pitch_at(1), Some(Pitch::Tone(Ratio { num: 3, den: 2, octave: 0 })));
        assert_eq!(map.pitch_at(2), Some(Pitch::Tone(Ratio { num: 5, den: 4, octave: 0 })));
        assert_eq!(map.pitch_at(3), Some(Pitch::Rest));
        assert_eq!(map.pitch_at(4), Some(Pitch::Tone(Ratio { num: 2, den: 1, octave: 0 })));
    }

    #[test]
    fn map_is_stable_for_the_same_sequence() {
        let seq = Sequence::new(vec![Ala, Val, Ile]);
        let a = ResonanceMap::from_sequence(&seq);
        let b = ResonanceMap::from_sequence(&seq);
        assert_eq!(a.pitches, b.pitches);
    }

    #[test]
    fn no_mutable_access_exists() {
        // Compile-time guarantee: ResonanceMap has no `&mut self` method.
        // This test exists to document that the type is read-only; if a setter
        // were added, this test should be updated to assert it is private.
        let seq = Sequence::new(vec![Ala]);
        let map = ResonanceMap::from_sequence(&seq);
        let _ = map.pitch_at(0);
        let _ = map.iter().count();
    }

    #[test]
    fn every_amino_acid_has_a_distinct_fixed_interval() {
        let aas = [Ala, Arg, Asn, Asp, Cys, Gln, Glu, Gly, His, Ile, Leu, Lys,
                   Met, Phe, Pro, Ser, Thr, Trp, Tyr, Val];
        let mut seen = std::collections::HashSet::new();
        for aa in aas {
            let r = fixed_interval(aa).expect("non-gap amino acid has a fixed interval");
            assert!(seen.insert(r), "duplicate fixed interval for {:?}", aa);
        }
    }

    #[test]
    fn gap_has_no_interval() {
        assert_eq!(fixed_interval(AminoAcid::Gap), None);
    }
}
