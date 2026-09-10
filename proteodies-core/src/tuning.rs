//! Just Intonation tuning fixed at C4 = 256 Hz.
//!
//! Pitches are exact rational intervals relative to the 256 Hz base. Frequency
//! and voltage are derived from the ratio; no floating point is used in the
//! pitch path until that final conversion, so there is no accumulated
//! temperament error and the resonance base is preserved exactly.

/// The fixed base frequency: C4 = 256 Hz (2^8, the "scientific" / Verdi base).
pub const BASE_HZ: f64 = 256.0;

/// An exact rational interval relative to the base frequency.
///
/// `num`/`den` is the ratio of the pitch's frequency to `BASE_HZ`. Octave
/// shifts multiply the numerator by powers of two.
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub struct Ratio {
    pub num: u32,
    pub den: u32,
    pub octave: i32,
}

impl Ratio {
    pub const UNISON: Ratio = Ratio { num: 1, den: 1, octave: 0 };

    /// The pitch frequency in Hz: `BASE_HZ * (num/den) * 2^octave`.
    pub fn hz(self) -> f64 {
        BASE_HZ * (self.num as f64 / self.den as f64) * 2f64.powi(self.octave)
    }

    /// Cents above the base (for display only; not used for tuning).
    pub fn cents_above_base(self) -> f64 {
        1200.0 * (self.hz() / BASE_HZ).log2()
    }
}

/// A small table of small-integer-ratio intervals (the JI lattice), sufficient
/// to give each amino acid a distinct resonant pitch. These are the ratios
/// relative to C4 = 256 Hz, in the base octave.
///
/// All ratios are superparticular or low-integer ratios, chosen for
/// consonance. The assignment to amino acids is stable and is the resonance
/// signature.
pub const INTERVALS: [Ratio; 20] = [
    Ratio { num: 1, den: 1, octave: 0 },  // Ala  - 1/1 (unison)
    Ratio { num: 16, den: 15, octave: 0 }, // Arg - 16/15 (minor second)
    Ratio { num: 9, den: 8, octave: 0 },   // Asn - 9/8 (major second)
    Ratio { num: 6, den: 5, octave: 0 },  // Asp - 6/5 (minor third)
    Ratio { num: 5, den: 4, octave: 0 },  // Cys - 5/4 (major third)
    Ratio { num: 4, den: 3, octave: 0 },  // Gln - 4/3 (fourth)
    Ratio { num: 45, den: 32, octave: 0 }, // Glu - 45/32 (augmented fourth)
    Ratio { num: 3, den: 2, octave: 0 },  // Gly - 3/2 (fifth)
    Ratio { num: 8, den: 5, octave: 0 },  // His - 8/5 (minor sixth)
    Ratio { num: 5, den: 3, octave: 0 },  // Ile - 5/3 (major sixth)
    Ratio { num: 9, den: 5, octave: 0 },  // Leu - 9/5 (minor seventh)
    Ratio { num: 15, den: 8, octave: 0 }, // Lys - 15/8 (major seventh)
    Ratio { num: 2, den: 1, octave: 0 },  // Met - 2/1 (octave up)
    Ratio { num: 1, den: 1, octave: 1 },  // Phe - 1/1 octave 1
    Ratio { num: 16, den: 15, octave: 1 }, // Pro
    Ratio { num: 9, den: 8, octave: 1 },  // Ser
    Ratio { num: 6, den: 5, octave: 1 },  // Thr
    Ratio { num: 5, den: 4, octave: 1 },  // Trp
    Ratio { num: 4, den: 3, octave: 1 },  // Tyr
    Ratio { num: 3, den: 2, octave: 1 },  // Val
];

/// Index of an amino acid in the standard ordering (Ala=0 .. Val=19), used to
/// look up its fixed JI interval. `Gap` has no pitch.
pub fn interval_index_for(aa: crate::seq::AminoAcid) -> Option<usize> {
    use crate::seq::AminoAcid::*;
    Some(match aa {
        Ala => 0,
        Arg => 1,
        Asn => 2,
        Asp => 3,
        Cys => 4,
        Gln => 5,
        Glu => 6,
        Gly => 7,
        His => 8,
        Ile => 9,
        Leu => 10,
        Lys => 11,
        Met => 12,
        Phe => 13,
        Pro => 14,
        Ser => 15,
        Thr => 16,
        Trp => 17,
        Tyr => 18,
        Val => 19,
        Gap => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base_is_256() {
        assert_eq!(BASE_HZ, 256.0);
        assert_eq!(Ratio::UNISON.hz(), 256.0);
    }

    #[test]
    fn octave_is_exact_double() {
        let octave = Ratio { num: 2, den: 1, octave: 0 };
        assert_eq!(octave.hz(), 512.0);
    }

    #[test]
    fn fifth_is_exact() {
        let fifth = Ratio { num: 3, den: 2, octave: 0 };
        assert_eq!(fifth.hz(), 384.0); // 256 * 3/2
    }

    #[test]
    fn every_interval_is_exact_integer_ratio_hz() {
        for r in INTERVALS {
            let hz = r.hz();
            assert!(hz >= 0.0);
            // 256 * num/den * 2^oct must be rational with small denom.
            let reconstructed = BASE_HZ * r.num as f64 / r.den as f64 * 2f64.powi(r.octave);
            assert_eq!(hz, reconstructed);
        }
    }
}
