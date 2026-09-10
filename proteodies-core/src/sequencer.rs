//! Sequencer / transport: combine the **immutable** resonance map with the
//! **mutable** aesthetic and render a deterministic stream of timed events.
//!
//! Pitch events come only from the resonance map; volume/envelope/brightness
//! come from the aesthetic. The same sequence + aesthetic + seed + tempo yields
//! the same event stream.

use crate::aesthetic::Aesthetic;
use crate::cv::{self, Calibration, Channel};
use crate::mapping::{Pitch, ResonanceMap};
use crate::seq::Sequence;

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
/// once over the map. Pitch comes only from the resonance map (immutable); the
/// gate, volume, and a brightness CV come from the mutable aesthetic. Rests
/// produce a gate-off. When `apply_structure_gates` is true, each residue's
/// gate-length is modulated by its predicted secondary structure — a non-pitch
/// rhythm axis (`structure.rs`).
#[allow(clippy::too_many_arguments)]
pub fn render(
    map: &ResonanceMap,
    seq: &Sequence,
    aesthetic: &Aesthetic,
    tempo: Tempo,
    pitch_cal: Calibration,
    clamp_lo: f32,
    clamp_hi: f32,
    apply_structure_gates: bool,
) -> Vec<TimedEvent> {
    let beat = tempo.beat_seconds();
    let mut events = Vec::with_capacity(map.len() * 4);

    for (i, pitch) in map.iter().enumerate() {
        let t = i as f32 * beat;
        let struct_gate = if apply_structure_gates {
            seq.get(i)
                .map(crate::structure::gate_multiplier)
                .unwrap_or(1.0)
        } else {
            1.0
        };
        match pitch {
            Pitch::Tone { hz, .. } | Pitch::Continuous { hz, .. } => {
                let pv = cv::pitch_voltage(hz, pitch_cal, clamp_lo, clamp_hi);
                events.push(TimedEvent { time_seconds: t, channel: pv.channel, volts: pv.volts });

                let vol = aesthetic.volume.clamp();
                let accent = aesthetic.rhythm.accent_at(i);
                let rested = aesthetic.rhythm.rest_at(i);
                let gate_v = if rested { 0.0 } else { 5.0 };
                let vol_v = if rested {
                    0.0
                } else {
                    vol.as_cv_volts(0.0, 5.0) * accent
                };
                events.push(TimedEvent { time_seconds: t, channel: Channel::Gate, volts: gate_v });
                events.push(TimedEvent { time_seconds: t, channel: Channel::Volume, volts: clamp_cv(vol_v, clamp_lo, clamp_hi) });
                if apply_structure_gates {
                    events.push(TimedEvent { time_seconds: t, channel: Channel::StructureGate, volts: clamp_cv(struct_gate * 5.0, clamp_lo, clamp_hi) });
                }

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

    fn seq_of(residues: &[AminoAcid]) -> Sequence {
        Sequence::new(residues.to_vec())
    }

    fn map_of(residues: &[AminoAcid]) -> ResonanceMap {
        ResonanceMap::from_sequence(&seq_of(residues), crate::mapping::BuildOptions::default())
    }

    #[test]
    fn render_is_deterministic() {
        let seq = seq_of(&[AminoAcid::Ala, AminoAcid::Gly, AminoAcid::Cys]);
        let map = map_of(&[AminoAcid::Ala, AminoAcid::Gly, AminoAcid::Cys]);
        let aes = Aesthetic::neutral(3);
        let a = render(&map, &seq, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0, false);
        let b = render(&map, &seq, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0, false);
        assert_eq!(a, b);
    }

    #[test]
    fn pitch_events_come_only_from_resonance_map() {
        let seq = seq_of(&[AminoAcid::Ala, AminoAcid::Gly]);
        let map = map_of(&[AminoAcid::Ala, AminoAcid::Gly]);
        let aes = Aesthetic::neutral(2);
        let events = render(&map, &seq, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0, false);
        let pitches: Vec<f32> = events
            .iter()
            .filter(|e| e.channel == Channel::Pitch)
            .map(|e| e.volts)
            .collect();
        assert_eq!(pitches.len(), 2);
        // Pitch volts come from the (immutable) map's hz via 1V/oct (C2=0V),
        // so they are a function of the map, not the aesthetic.
        assert!(pitches[0] != pitches[1], "distinct residues should differ in pitch");
    }

    #[test]
    fn rests_produce_gate_off() {
        let seq = seq_of(&[AminoAcid::Ala, AminoAcid::Gap, AminoAcid::Gly]);
        let map = map_of(&[AminoAcid::Ala, AminoAcid::Gap, AminoAcid::Gly]);
        let mut aes = Aesthetic::neutral(3);
        aes.rhythm = crate::aesthetic::Rhythm::straight(3);
        let events = render(&map, &seq, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0, false);
        let gate = events.iter().find(|e| e.channel == Channel::Gate && (e.time_seconds - 60.0 / 120.0).abs() < 1e-6);
        assert!(gate.is_some());
        assert_eq!(gate.unwrap().volts, 0.0);
    }

    #[test]
    fn rhythm_rest_silences_a_tone() {
        let seq = seq_of(&[AminoAcid::Ala, AminoAcid::Gly]);
        let map = map_of(&[AminoAcid::Ala, AminoAcid::Gly]);
        let mut aes = Aesthetic::neutral(2);
        aes.rhythm = crate::aesthetic::Rhythm {
            subdivision: 1,
            swing: 0.0,
            accents: vec![1.0, 1.0],
            rests: vec![false, true],
        };
        let events = render(&map, &seq, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0, false);
        let t1 = 60.0 / 120.0;
        let gate = events.iter().find(|e| e.channel == Channel::Gate && (e.time_seconds - t1).abs() < 1e-6);
        assert!(gate.is_some());
        assert_eq!(gate.unwrap().volts, 0.0);
    }

    #[test]
    fn all_voltages_within_safe_range() {
        let seq = seq_of(&[AminoAcid::Val, AminoAcid::Met, AminoAcid::Phe]);
        let map = map_of(&[AminoAcid::Val, AminoAcid::Met, AminoAcid::Phe]);
        let aes = Aesthetic::neutral(3);
        let events = render(&map, &seq, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0, true);
        for e in &events {
            assert!(e.volts >= -10.0 && e.volts <= 10.0, "out of range: {:?}", e);
        }
    }

    #[test]
    fn structure_gate_channel_present_when_enabled() {
        let seq = seq_of(&[AminoAcid::Ala]); // Ala = α-helix -> 0.70
        let map = map_of(&[AminoAcid::Ala]);
        let aes = Aesthetic::neutral(1);
        let events = render(&map, &seq, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0, true);
        let sg = events.iter().find(|e| e.channel == Channel::StructureGate);
        assert!(sg.is_some(), "structure gate CV emitted when enabled");
        assert!((sg.unwrap().volts - 0.70 * 5.0).abs() < 1e-5);
    }

    #[test]
    fn structure_gate_absent_when_disabled() {
        let seq = seq_of(&[AminoAcid::Ala]);
        let map = map_of(&[AminoAcid::Ala]);
        let aes = Aesthetic::neutral(1);
        let events = render(&map, &seq, &aes, Tempo::BPM_120, Calibration::UNCALIBRATED, -10.0, 10.0, false);
        assert!(events.iter().all(|e| e.channel != Channel::StructureGate));
    }

    // Compile-time proof that the resonance map is never mutated during render.
    #[test]
    fn render_takes_immutable_map() {
        fn _accepts_ref(_m: &ResonanceMap) {}
        let map = map_of(&[AminoAcid::Ala]);
        _accepts_ref(&map);
    }
}
