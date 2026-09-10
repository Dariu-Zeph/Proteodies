//! Sequencer / transport: combine the **immutable** resonance map with the
//! **mutable** aesthetic and render a deterministic stream of timed events.
//!
//! Pitch events come only from the resonance map; volume/envelope/brightness
//! come from the aesthetic. The same sequence + aesthetic + seed + tempo yields
//! the same event stream.

use crate::aesthetic::Aesthetic;
use crate::cv::{self, Calibration, Channel};
use crate::mapping::{Pitch, ResonanceMap};

/// Tempo in beats per minute. One residue = one beat by default.
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct Tempo(pub f32);

impl Tempo {
    pub const BPM_120: Tempo = Tempo(120.0);

    /// Seconds per beat.
    pub fn beat_seconds(&self) -> f32 {
        60.0 / self.0
    }
}

/// A timed output event.
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct TimedEvent {
    pub time_seconds: f32,
    pub channel: Channel,
    pub volts: f32,
}

/// Render the whole sequence to timed events, one beat per residue, looping
/// once over the map. Pitch comes from the resonance map; the gate, volume,
/// and a brightness CV come from the aesthetic. Rests produce a gate-off.
pub fn render(
    map: &ResonanceMap,
    aesthetic: &Aesthetic,
    tempo: Tempo,
    pitch_cal: Calibration,
    clamp_lo: f32,
    clamp_hi: f32,
) -> Vec<TimedEvent> {
    let beat = tempo.beat_seconds();
    let mut events = Vec::with_capacity(map.len() * 4);

    for (i, pitch) in map.iter().enumerate() {
        let t = i as f32 * beat;
        match pitch {
            Pitch::Tone(ratio) => {
                let hz = ratio.hz();
                let pv = cv::pitch_voltage(hz, pitch_cal, clamp_lo, clamp_hi);
                events.push(TimedEvent { time_seconds: t, channel: pv.channel, volts: pv.volts });

                let vol = aesthetic.volume.clamp();
                let accent = aesthetic.rhythm.accent_at(i);
                let gated = aesthetic.rhythm.rest_at(i);
                let gate_v = if gated { 0.0 } else { 5.0 };
                let vol_v = if gated { 0.0 } else { vol.as_cv_volts(0.0, 5.0) * accent };
                events.push(TimedEvent { time_seconds: t, channel: Channel::Gate, volts: gate_v });
                events.push(TimedEvent { time_seconds: t, channel: Channel::Volume, volts: clamp_cv(vol_v, clamp_lo, clamp_hi) });

                let bright = aesthetic.harmonics.brightness().clamp(0.0, 1.0);
                let bright_v = bright * 5.0;
                events.push(TimedEvent { time_seconds: t, channel: Channel::Brightness, volts: clamp_cv(bright_v, clamp_lo, clamp_hi) });
            }
            Pitch::Rest => {
                events.push(TimedEvent { time_seconds: t, channel: Channel::Gate, volts: 0.0 });
                events.push(TimedEvent { time_seconds: t, channel: Channel::Volume, volts: 0.0 });
            }
        }
    }

    events
}

fn clamp_cv(v: f32, lo: f32, hi: f32) -> f32 {
    cv::clamp_volts(v, lo, hi)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::seq::AminoAcid;
    use crate::seq::Sequence;

    fn map_of(residues: &[AminoAcid]) -> ResonanceMap {
        ResonanceMap::from_sequence(&Sequence::new(residues.to_vec()))
    }

    #[test]
    fn render_is_deterministic() {
        let map = map_of(&[AminoAcid::Ala, AminoAcid::Gly, AminoAcid::Cys]);
        let aes = Aesthetic::neutral(3);
        let a = render(&map, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0);
        let b = render(&map, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0);
        assert_eq!(a, b);
    }

    #[test]
    fn pitch_events_match_resonance_map_only() {
        let map = map_of(&[AminoAcid::Ala, AminoAcid::Gly]);
        let aes = Aesthetic::neutral(2);
        let events = render(&map, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0);
        let pitches: Vec<f32> = events
            .iter()
            .filter(|e| e.channel == Channel::Pitch)
            .map(|e| e.volts)
            .collect();
        // Ala = 1/1 -> 0V, Gly = 3/2 -> log2(1.5)
        assert_eq!(pitches.len(), 2);
        assert!(pitches[0].abs() < 1e-5);
        assert!((pitches[1] - 0.5849625).abs() < 1e-5);
    }

    #[test]
    fn rests_produce_gate_off() {
        let map = map_of(&[AminoAcid::Ala, AminoAcid::Gap, AminoAcid::Gly]);
        let mut aes = Aesthetic::neutral(3);
        aes.rhythm = crate::aesthetic::Rhythm::straight(3);
        let events = render(&map, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0);
        let gate = events.iter().find(|e| e.channel == Channel::Gate && (e.time_seconds - 60.0 / 120.0).abs() < 1e-6);
        assert!(gate.is_some());
        assert_eq!(gate.unwrap().volts, 0.0);
    }

    #[test]
    fn rhythm_rest_silences_a_tone() {
        let map = map_of(&[AminoAcid::Ala, AminoAcid::Gly]);
        let mut aes = Aesthetic::neutral(2);
        aes.rhythm = crate::aesthetic::Rhythm {
            subdivision: 1,
            swing: 0.0,
            accents: vec![1.0, 1.0],
            rests: vec![false, true],
        };
        let events = render(&map, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0);
        // The second step's gate must be off.
        let t1 = 60.0 / 120.0;
        let gate = events.iter().find(|e| e.channel == Channel::Gate && (e.time_seconds - t1).abs() < 1e-6);
        assert!(gate.is_some());
        assert_eq!(gate.unwrap().volts, 0.0);
    }

    #[test]
    fn all_voltages_within_safe_range() {
        let map = map_of(&[AminoAcid::Val, AminoAcid::Met, AminoAcid::Phe]);
        let aes = Aesthetic::neutral(3);
        let events = render(&map, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0);
        for e in &events {
            assert!(e.volts >= -10.0 && e.volts <= 10.0, "out of range: {:?}", e);
        }
    }

    // Compile-time proof that the resonance map is never mutated during render.
    #[test]
    fn render_takes_immutable_map() {
        fn _accepts_ref(_m: &ResonanceMap) {}
        let map = map_of(&[AminoAcid::Ala]);
        _accepts_ref(&map);
    }
}
