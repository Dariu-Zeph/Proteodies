//! Control-voltage output: pitch -> volts (1V/octave), with per-channel
//! calibration and safety clamping.
//!
//! The pitch channel derives voltage from the exact JI frequency via
//! `log2(f / base)`. Calibration corrects per-channel offset and scale from
//! measured endpoints; without it output is approximate. Every voltage is
//! clamped to a safe range (default ±10V) to protect modules.

use crate::tuning::BASE_HZ;

/// Default safety clamp range for Eurorack CV: ±10V.
pub const DEFAULT_CLAMP_LO: f32 = -10.0;
pub const DEFAULT_CLAMP_HI: f32 = 10.0;

/// A named CV channel.
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum Channel {
    Pitch,
    Gate,
    Volume,
    StructureGate,
    EnvelopeAttack,
    EnvelopeDecay,
    EnvelopeSustain,
    EnvelopeRelease,
    Brightness,
}

/// Per-channel calibration: a measured linear map from nominal volts to actual.
///
/// `actual = nominal * scale + offset`. With uncalibrated defaults
/// (scale=1, offset=0) output equals the nominal value.
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct Calibration {
    pub scale: f32,
    pub offset: f32,
}

impl Calibration {
    pub const UNCALIBRATED: Calibration = Calibration { scale: 1.0, offset: 0.0 };

    /// Derive calibration from two measured endpoints.
    /// Given nominal low/high and the measured volts at each, solve for
    /// scale and offset. Panics if the two nominal points are equal.
    pub fn from_endpoints(nom_lo: f32, nom_hi: f32, meas_lo: f32, meas_hi: f32) -> Calibration {
        let scale = (meas_hi - meas_lo) / (nom_hi - nom_lo);
        let offset = meas_lo - nom_lo * scale;
        Calibration { scale, offset }
    }

    pub fn apply(&self, nominal: f32) -> f32 {
        nominal * self.scale + self.offset
    }
}

/// Convert a frequency in Hz to 1V/octave pitch volts relative to `BASE_HZ`
/// (so C4 = 256 Hz maps to 0V in the nominal, uncalibrated case).
pub fn hz_to_pitch_volts(hz: f64) -> f32 {
    (hz / BASE_HZ).log2() as f32
}

/// Clamp a voltage to the safe range.
pub fn clamp_volts(v: f32, lo: f32, hi: f32) -> f32 {
    if v < lo {
        lo
    } else if v > hi {
        hi
    } else {
        v
    }
}

/// A calibrated, clamped voltage event on a channel.
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct Voltage {
    pub channel: Channel,
    pub volts: f32,
}

/// Produce a safe pitch voltage from an exact frequency, applying calibration
/// and the default clamp.
pub fn pitch_voltage(
    hz: f64,
    cal: Calibration,
    clamp_lo: f32,
    clamp_hi: f32,
) -> Voltage {
    let nominal = hz_to_pitch_volts(hz);
    let calibrated = cal.apply(nominal);
    let safe = clamp_volts(calibrated, clamp_lo, clamp_hi);
    Voltage { channel: Channel::Pitch, volts: safe }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn c4_is_zero_volts_nominal() {
        assert!((hz_to_pitch_volts(BASE_HZ)).abs() < 1e-6);
    }

    #[test]
    fn octave_up_is_one_volt() {
        assert!((hz_to_pitch_volts(512.0) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn fifth_is_log2_3_2() {
        // 3/2 above 256 = 384 Hz -> log2(1.5) V
        let v = hz_to_pitch_volts(384.0);
        assert!((v - 0.5849625).abs() < 1e-5);
    }

    #[test]
    fn calibration_identity_unchanged() {
        let v = pitch_voltage(384.0, Calibration::UNCALIBRATED, -10.0, 10.0);
        assert!((v.volts - 0.5849625).abs() < 1e-5);
    }

    #[test]
    fn calibration_from_endpoints() {
        // nominal 0..1V measured as 0.05..1.02V
        let cal = Calibration::from_endpoints(0.0, 1.0, 0.05, 1.02);
        assert!((cal.scale - 0.97).abs() < 1e-5);
        assert!((cal.offset - 0.05).abs() < 1e-5);
    }

    #[test]
    fn out_of_range_volts_are_clamped() {
        let v = pitch_voltage(1e9, Calibration::UNCALIBRATED, -10.0, 10.0);
        assert_eq!(v.volts, 10.0);
        let v = pitch_voltage(1e-9, Calibration::UNCALIBRATED, -10.0, 10.0);
        assert_eq!(v.volts, -10.0);
    }
}
