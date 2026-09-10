//! Just Intonation tuning fixed at C4 = 256 Hz, plus the Sternheimer
//! mass→sound physical constants.
//!
//! Reconciled to the `Dariu-Zeph/Proteodies` prototype reference spec
//! (`docs/PROTOTYPE.md`):
//! - The 12-interval **5-limit Just Intonation** table (ratios of prime
//!   factors 2, 3, 5).
//! - The **Sternheimer** physical constants: de Broglie quantum frequency
//!   `nu = m·c²/h` and the 2^76 octave reduction to an audible frequency.
//!
//! Pitches are exact rational intervals relative to the 256 Hz base. Frequency
//! and voltage are derived from the ratio; no floating point is used in the
//! pitch path until that final conversion, so there is no accumulated
//! temperament error and the resonance base is preserved exactly.

// ---------------------------------------------------------------------------
// Physical constants (Sternheimer mass → sound)
// ---------------------------------------------------------------------------

/// Speed of light, c (m/s).
pub const SPEED_OF_LIGHT: f64 = 299_792_458.0;
/// Planck constant, h (J·s).
pub const PLANCK_CONSTANT: f64 = 6.62607015e-34;
/// Atomic mass unit, u (kg, = 1 Da).
pub const ATOMIC_MASS_UNIT: f64 = 1.6605390666e-27;

/// `Sternheimer quantum factor = (u · c²) / h` ≈ 2.252342718e23 Hz/Da.
pub const STERNHEIMER_QUANTUM_FACTOR: f64 =
    (ATOMIC_MASS_UNIT * SPEED_OF_LIGHT * SPEED_OF_LIGHT) / PLANCK_CONSTANT;

/// Octave reduction exponent: divide the de Broglie frequency by 2^76 to fold
/// it into the audible band.
pub const STERNHEIMER_OCTAVE_DIVISOR_EXP: u32 = 76;
/// 2^76.
pub const STERNHEIMER_OCTAVE_DIVISOR: f64 = (1u128 << STERNHEIMER_OCTAVE_DIVISOR_EXP) as f64;

/// Audible factor = quantum factor / 2^76 ≈ 2.981084 Hz/Da.
pub const STERNHEIMER_AUDIBLE_FACTOR: f64 =
    STERNHEIMER_QUANTUM_FACTOR / STERNHEIMER_OCTAVE_DIVISOR;

/// de Broglie quantum frequency (≈10^25 Hz) for a mass in Daltons.
pub fn mass_to_de_broglie_hz(mass_da: f64) -> f64 {
    mass_da * STERNHEIMER_QUANTUM_FACTOR
}

/// Sternheimer audible frequency (≈200–650 Hz) for a mass in Daltons, via the
/// 2^76 octave reduction.
pub fn mass_to_audible_hz(mass_da: f64) -> f64 {
    mass_da * STERNHEIMER_AUDIBLE_FACTOR
}

// ---------------------------------------------------------------------------
// Just Intonation at C4 = 256 Hz
// ---------------------------------------------------------------------------

/// The fixed base frequency: C4 = 256 Hz (2^8, the "scientific" / Verdi base).
pub const BASE_HZ: f64 = 256.0;
/// The Eurorack 0V reference: C2 = 64 Hz.
pub const CV_BASE_HZ: f64 = 64.0;

/// An exact rational interval relative to the base frequency.
///
/// `num`/`den` is the ratio of the pitch's frequency to `BASE_HZ`. Octave
/// shifts multiply the frequency by powers of two.
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

    /// The interval ratio as a float (num/den), ignoring octave.
    pub fn ratio_f64(self) -> f64 {
        self.num as f64 / self.den as f64
    }

    /// Cents above the base (for display only; not used for tuning).
    pub fn cents_above_base(self) -> f64 {
        1200.0 * (self.hz() / BASE_HZ).log2()
    }
}

/// A named 5-limit Just Intonation interval (one of the 12 within the octave).
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub struct JustInterval {
    /// Two/three-letter note symbol ("C", "Db", "F#", ...).
    pub symbol: &'static str,
    pub num: u32,
    pub den: u32,
}

/// The 12-interval 5-limit Just Intonation table, ordered by ascending pitch
/// within the octave, matching the prototype's `JUST_INTERVALS` /
/// `ORDERED_INTERVAL_KEYS`.
pub const JUST_INTERVALS: [JustInterval; 12] = [
    JustInterval { symbol: "C",  num: 1,  den: 1 },
    JustInterval { symbol: "Db", num: 16, den: 15 },
    JustInterval { symbol: "D",  num: 9,  den: 8 },
    JustInterval { symbol: "Eb", num: 6,  den: 5 },
    JustInterval { symbol: "E",  num: 5,  den: 4 },
    JustInterval { symbol: "F",  num: 4,  den: 3 },
    JustInterval { symbol: "F#", num: 45, den: 32 },
    JustInterval { symbol: "G",  num: 3,  den: 2 },
    JustInterval { symbol: "Ab", num: 8,  den: 5 },
    JustInterval { symbol: "A",  num: 5,  den: 3 },
    JustInterval { symbol: "Bb", num: 9,  den: 5 },
    JustInterval { symbol: "B",  num: 15, den: 8 },
];

/// Look up an interval by its note symbol.
pub fn interval_by_symbol(symbol: &str) -> Option<JustInterval> {
    JUST_INTERVALS.iter().copied().find(|i| i.symbol == symbol)
}

/// The frequency of a note symbol at a given octave:
/// `BASE_HZ * 2^(octave-4) * interval.ratio`.
pub fn just_frequency(symbol: &str, octave: i32) -> f64 {
    let iv = interval_by_symbol(symbol).unwrap_or(JUST_INTERVALS[0]);
    BASE_HZ * 2f64.powi(octave - 4) * (iv.num as f64 / iv.den as f64)
}

/// 1V/octave pitch volts for a frequency, relative to C2 = 0V.
pub fn frequency_to_pitch_cv(hz: f64) -> f64 {
    if hz <= 0.0 {
        return 0.0;
    }
    (hz / CV_BASE_HZ).log2()
}

/// 1V/octave pitch volts for a note symbol + octave, relative to a base octave
/// (default C2 = 0V).
pub fn note_to_pitch_cv(symbol: &str, octave: i32, base_octave: i32) -> f64 {
    let iv = interval_by_symbol(symbol).unwrap_or(JUST_INTERVALS[0]);
    let octave_volts = (octave - base_octave) as f64;
    let interval_volts = (iv.num as f64 / iv.den as f64).log2();
    octave_volts + interval_volts
}

/// Snap an arbitrary frequency to the nearest 5-limit Just interval.
///
/// Normalizes the target into the `[256, 512)` octave, picks the nearest table
/// ratio, and returns the chosen interval, the octave, the exact JI
/// frequency, and the cents deviation of the raw target from the snapped JI
/// pitch. Matches the prototype's `findClosest5JustInterval`.
pub fn find_closest_just_interval(target_hz: f64) -> SnappedInterval {
    let mut octave = 4;
    let mut normalized = target_hz;
    while normalized >= 512.0 {
        normalized /= 2.0;
        octave += 1;
    }
    while normalized < 256.0 {
        normalized *= 2.0;
        octave -= 1;
    }
    let ratio = normalized / 256.0;

    let mut best = JUST_INTERVALS[0];
    let mut best_diff = f64::INFINITY;
    for iv in JUST_INTERVALS {
        let diff = ((iv.num as f64 / iv.den as f64) - ratio).abs();
        if diff < best_diff {
            best_diff = diff;
            best = iv;
        }
    }
    let exact_hz = 256.0 * 2f64.powi(octave - 4) * (best.num as f64 / best.den as f64);
    let cents_dev = if target_hz > 0.0 {
        1200.0 * (target_hz / exact_hz).log2()
    } else {
        0.0
    };
    SnappedInterval {
        interval: best,
        octave,
        exact_hz,
        cents_deviation: cents_dev,
    }
}

/// Result of snapping a frequency to the 5-limit Just lattice.
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct SnappedInterval {
    pub interval: JustInterval,
    pub octave: i32,
    pub exact_hz: f64,
    pub cents_deviation: f64,
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
    fn cv_base_is_c2_64hz() {
        assert_eq!(CV_BASE_HZ, 64.0);
    }

    #[test]
    fn octave_is_exact_double() {
        let octave = Ratio { num: 2, den: 1, octave: 0 };
        assert_eq!(octave.hz(), 512.0);
    }

    #[test]
    fn fifth_is_exact() {
        let fifth = Ratio { num: 3, den: 2, octave: 0 };
        assert_eq!(fifth.hz(), 384.0);
    }

    #[test]
    fn just_intervals_table_matches_prototype() {
        assert_eq!(JUST_INTERVALS.len(), 12);
        assert_eq!(JUST_INTERVALS[0].symbol, "C");
        assert_eq!(JUST_INTERVALS[6].symbol, "F#");
        assert_eq!(JUST_INTERVALS[6].num, 45);
        assert_eq!(JUST_INTERVALS[6].den, 32);
        assert_eq!(JUST_INTERVALS[11].symbol, "B");
        assert_eq!(JUST_INTERVALS[11].num, 15);
        assert_eq!(JUST_INTERVALS[11].den, 8);
    }

    #[test]
    fn just_frequency_c4_is_256() {
        assert_eq!(just_frequency("C", 4), 256.0);
        assert_eq!(just_frequency("G", 4), 384.0);
        assert_eq!(just_frequency("C", 5), 512.0);
    }

    #[test]
    fn note_to_pitch_cv_c2_is_zero() {
        assert!((note_to_pitch_cv("C", 2, 2)).abs() < 1e-9);
        assert!((note_to_pitch_cv("C", 4, 2) - 2.0).abs() < 1e-9);
    }

    #[test]
    fn frequency_to_pitch_cv_c2_is_zero() {
        assert!((frequency_to_pitch_cv(64.0)).abs() < 1e-9);
        assert!((frequency_to_pitch_cv(256.0) - 2.0).abs() < 1e-9);
    }

    #[test]
    fn sternheimer_audible_factor_matches_prototype() {
        // ≈ 2.981084 Hz/Da
        assert!((STERNHEIMER_AUDIBLE_FACTOR - 2.981084).abs() < 1e-3);
    }

    #[test]
    fn glycine_mass_to_audible_hz_matches_prototype() {
        // 75.07 Da * 2.981084 ≈ 223.79 Hz
        let hz = mass_to_audible_hz(75.07);
        assert!((hz - 223.79).abs() < 0.5);
    }

    #[test]
    fn tryptophan_mass_to_audible_hz_matches_prototype() {
        // 204.23 Da ≈ 608.83 Hz
        let hz = mass_to_audible_hz(204.23);
        assert!((hz - 608.83).abs() < 0.5);
    }

    #[test]
    fn de_broglie_is_audible_times_2_76() {
        let m = 100.0;
        assert!(
            (mass_to_de_broglie_hz(m) / mass_to_audible_hz(m) - STERNHEIMER_OCTAVE_DIVISOR).abs()
                < 1e-3
        );
    }

    #[test]
    fn find_closest_snaps_c4() {
        let s = find_closest_just_interval(256.0);
        assert_eq!(s.interval.symbol, "C");
        assert_eq!(s.octave, 4);
        assert!(s.cents_deviation.abs() < 1e-6);
    }

    #[test]
    fn find_closest_snaps_g4() {
        let s = find_closest_just_interval(384.0);
        assert_eq!(s.interval.symbol, "G");
        assert_eq!(s.octave, 4);
    }

    #[test]
    fn find_closest_returns_cents_deviation() {
        // 384.5 Hz is ~+2.25 cents above the exact 3/2 fifth (384 Hz)
        let s = find_closest_just_interval(384.5);
        assert_eq!(s.interval.symbol, "G");
        assert!(s.cents_deviation > 0.0 && s.cents_deviation < 10.0);
    }
}
