//! The aesthetic domain — the **mutable** expressive surface.
//!
//! This is the only place live mutation happens. Everything here is non-pitch:
//! volume, envelope, harmonics, and rhythm. Each maps to a CV channel distinct
//! from the (immutable) pitch channel, so live performance changes never touch
//! the resonance path.

/// Volume / dynamics, 0.0 = silent, 1.0 = full. Safe-clamped to [0,1].
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct Volume(pub f32);

impl Volume {
    pub const SILENT: Volume = Volume(0.0);
    pub const FULL: Volume = Volume(1.0);

    pub fn clamp(self) -> Volume {
        Volume(self.0.clamp(0.0, 1.0))
    }

    pub fn as_cv_volts(self, lo: f32, hi: f32) -> f32 {
        lo + (hi - lo) * self.0.clamp(0.0, 1.0)
    }
}

/// ADSR envelope in seconds. All times are non-negative.
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct Envelope {
    pub attack: f32,
    pub decay: f32,
    pub sustain: f32, // level, 0..1
    pub release: f32,
}

impl Envelope {
    pub const PLUCK: Envelope = Envelope { attack: 0.005, decay: 0.1, sustain: 0.0, release: 0.05 };
    pub const PAD: Envelope = Envelope { attack: 0.8, decay: 0.4, sustain: 0.7, release: 1.5 };

    /// Total envelope duration (for scheduling the gate-off), ignoring sustain hold.
    pub fn a_d_r(&self) -> f32 {
        self.attack + self.decay + self.release
    }
}

/// Harmonic profile: relative amplitudes of partials 1..N. Normalized to sum 1
/// for timbre shaping. This does not affect pitch.
#[derive(Clone, Debug, PartialEq)]
pub struct Harmonics(pub Vec<f32>);

impl Harmonics {
    /// A pure sine (fundamental only).
    pub fn sine() -> Harmonics {
        Harmonics(vec![1.0])
    }

    /// A saw-like profile: 1/n for n partials.
    pub fn saw(n: usize) -> Harmonics {
        let v: Vec<f32> = (1..=n).map(|i| 1.0 / i as f32).collect();
        Harmonics(v)
    }

    /// Brightness = energy-weighted mean partial index, 1.0 = fundamental only.
    pub fn brightness(&self) -> f32 {
        let total: f32 = self.0.iter().sum();
        if total <= 0.0 {
            return 0.0;
        }
        let weighted: f32 = self
            .0
            .iter()
            .enumerate()
            .map(|(i, &a)| (i + 1) as f32 * a)
            .sum();
        weighted / total
    }
}

/// Rhythm: how the residue stream is divided in time.
#[derive(Clone, Debug, PartialEq)]
pub struct Rhythm {
    /// Steps per residue. 1 = each residue is one step; >1 subdivides.
    pub subdivision: u32,
    /// Swing in [0,1): 0 = straight, ~0.5 = triplet swing.
    pub swing: f32,
    /// Accent pattern, one entry per step: 0..1 multiplier on volume.
    pub accents: Vec<f32>,
    /// Rest pattern: true = the residue is silent at that step.
    pub rests: Vec<bool>,
}

impl Rhythm {
    pub fn straight(n: usize) -> Rhythm {
        Rhythm {
            subdivision: 1,
            swing: 0.0,
            accents: vec![1.0; n],
            rests: vec![false; n],
        }
    }

    pub fn accent_at(&self, step: usize) -> f32 {
        self.accents.get(step).copied().unwrap_or(1.0)
    }

    pub fn rest_at(&self, step: usize) -> bool {
        self.rests.get(step).copied().unwrap_or(false)
    }
}

/// The full aesthetic state. All fields are mutable and performer-controlled.
#[derive(Clone, Debug, PartialEq)]
pub struct Aesthetic {
    pub volume: Volume,
    pub envelope: Envelope,
    pub harmonics: Harmonics,
    pub rhythm: Rhythm,
}

impl Aesthetic {
    /// A sensible default "neutral" aesthetic.
    pub fn neutral(n_steps: usize) -> Aesthetic {
        Aesthetic {
            volume: Volume(0.8),
            envelope: Envelope::PAD,
            harmonics: Harmonics::saw(8),
            rhythm: Rhythm::straight(n_steps),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn volume_clamps() {
        assert_eq!(Volume(1.5).clamp(), Volume(1.0));
        assert_eq!(Volume(-0.2).clamp(), Volume(0.0));
    }

    #[test]
    fn volume_maps_to_cv_range() {
        let v = Volume(0.5).as_cv_volts(0.0, 5.0);
        assert!((v - 2.5).abs() < 1e-6);
    }

    #[test]
    fn saw_brightness_increases_with_partials() {
        let b1 = Harmonics::saw(1).brightness();
        let b8 = Harmonics::saw(8).brightness();
        assert!(b8 > b1);
    }

    #[test]
    fn rhythm_defaults_are_straight() {
        let r = Rhythm::straight(4);
        assert_eq!(r.subdivision, 1);
        assert_eq!(r.swing, 0.0);
        assert!(r.accents.iter().all(|&a| a == 1.0));
        assert!(r.rests.iter().all(|&x| !x));
    }
}
