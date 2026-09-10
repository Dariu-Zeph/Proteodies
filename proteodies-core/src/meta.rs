//! Meta-Proteodies + Pharmacokinetic (PK/PD) cascade model.
//!
//! A **Meta-Proteody** models a multi-protein mixture (e.g. "Coffee") as N
//! parallel protein voices played together, each at a different stage of a
//! pharmacokinetic cascade. This is pure data — the actual audio cascade lives
//! in the live-audio layer; the core only models the scheduling and envelope
//! shape so it can be rendered to timed events deterministically.
//!
//! Matches the prototype reference spec (`docs/PROTOTYPE.md` §6).

use crate::seq::Sequence;

/// A pharmacokinetic cascade stage. Earlier stages enter sooner and clear
/// faster; later stages enter later with a longer clearance tail.
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum PkStage {
    FastReceptor,
    IonChannel,
    Neuromodulator,
    MetabolicClearance,
}

impl PkStage {
    /// The default onset delay (ms) for this stage, matching the prototype.
    pub fn default_onset_ms(self) -> f32 {
        match self {
            PkStage::FastReceptor => 0.0,
            PkStage::IonChannel => 45.0,
            PkStage::Neuromodulator => 90.0,
            PkStage::MetabolicClearance => 140.0,
        }
    }

    /// The default release half-life multiplier for this stage.
    pub fn default_half_life_multiplier(self) -> f32 {
        match self {
            PkStage::FastReceptor => 1.0,
            PkStage::IonChannel => 1.15,
            PkStage::Neuromodulator => 1.35,
            PkStage::MetabolicClearance => 2.2,
        }
    }
}

/// How the voices of a Meta-Proteody are scheduled.
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum PkMode {
    /// Voices enter with realistic biological onset delays; the envelope CV
    /// follows a 3-phase plasma-concentration curve.
    PkCascade,
    /// All voices fire simultaneously with a plain ADSR.
    SimultaneousChord,
}

/// One protein voice within a Meta-Proteody.
#[derive(Clone, Debug, PartialEq)]
pub struct MetaLayer {
    pub protein_id: String,
    pub protein_name: String,
    pub biological_role: String,
    pub sequence: Sequence,
    pub octave: i32,
    /// Relative balance in the mix, 0..1.
    pub gain: f32,
    /// Display color name (amber, rose, cyan, …), UI-only.
    pub color: String,
    /// Spatial stereo pan, -1.0 (L) .. +1.0 (R).
    pub pan: f32,
    /// PK/PD profile.
    pub pk_stage: PkStage,
    /// Onset delay (ms). Default per stage; overridable.
    pub pk_onset_delay_ms: f32,
    /// Release half-life multiplier. Default per stage; overridable.
    pub pk_half_life_multiplier: f32,
    /// Relative filter openness 0..1 (envelope-shaping hint).
    pub pk_filter_openness: f32,
}

impl MetaLayer {
    /// Build a layer from a raw sequence string, using the stage defaults for
    /// onset and half-life.
    pub fn new(
        protein_id: impl Into<String>,
        protein_name: impl Into<String>,
        biological_role: impl Into<String>,
        sequence_text: &str,
        octave: i32,
        gain: f32,
        color: impl Into<String>,
        pan: f32,
        pk_stage: PkStage,
        pk_filter_openness: f32,
    ) -> Self {
        let (seq, _dropped) = Sequence::from_raw(sequence_text);
        MetaLayer {
            protein_id: protein_id.into(),
            protein_name: protein_name.into(),
            biological_role: biological_role.into(),
            sequence: seq,
            octave,
            gain,
            color: color.into(),
            pan,
            pk_stage,
            pk_onset_delay_ms: pk_stage.default_onset_ms(),
            pk_half_life_multiplier: pk_stage.default_half_life_multiplier(),
            pk_filter_openness,
        }
    }
}

/// Configuration for a Meta-Proteody: N protein voices + cascade settings.
#[derive(Clone, Debug, PartialEq)]
pub struct MetaProteody {
    pub id: String,
    pub name: String,
    pub substance: String,
    pub description: String,
    pub biological_mechanism: String,
    pub layers: Vec<MetaLayer>,
    pub pk_mode: PkMode,
    /// Cascade onset scaling factor (0.5..2.5, default 1.0).
    pub pk_time_scale: f32,
    /// Metabolic clearance release tail multiplier (1.0..4.0).
    pub pk_clearance_tail_multiplier: f32,
    /// Modulate gate lengths/envelopes from secondary-structure conformation.
    pub enable_secondary_structure_articulation: bool,
}

impl MetaProteody {
    /// Number of protein voices.
    pub fn voice_count(&self) -> usize {
        self.layers.len()
    }

    /// Scaled onset time (seconds) for a layer.
    pub fn onset_seconds(&self, layer: &MetaLayer) -> f32 {
        (layer.pk_onset_delay_ms / 1000.0) * self.pk_time_scale
    }

    /// Scaled release time (seconds) for a layer, given a base release.
    pub fn release_seconds(&self, layer: &MetaLayer, base_release: f32) -> f32 {
        let base = base_release * layer.pk_half_life_multiplier;
        if layer.pk_stage == PkStage::MetabolicClearance {
            base * (self.pk_clearance_tail_multiplier / 2.2)
        } else {
            base
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn layer(stage: PkStage) -> MetaLayer {
        MetaLayer::new(
            "p",
            "P",
            "role",
            "AGCD",
            4,
            0.8,
            "amber",
            0.0,
            stage,
            0.8,
        )
    }

    #[test]
    fn stage_defaults_match_prototype() {
        assert_eq!(PkStage::FastReceptor.default_onset_ms(), 0.0);
        assert_eq!(PkStage::IonChannel.default_onset_ms(), 45.0);
        assert_eq!(PkStage::Neuromodulator.default_onset_ms(), 90.0);
        assert_eq!(PkStage::MetabolicClearance.default_onset_ms(), 140.0);
        assert_eq!(PkStage::MetabolicClearance.default_half_life_multiplier(), 2.2);
    }

    #[test]
    fn layer_new_uses_stage_defaults() {
        let l = layer(PkStage::Neuromodulator);
        assert_eq!(l.pk_onset_delay_ms, 90.0);
        assert_eq!(l.pk_half_life_multiplier, 1.35);
        assert_eq!(l.sequence.len(), 4);
    }

    #[test]
    fn onset_seconds_scales_with_time_scale() {
        let mut m = MetaProteody {
            id: "x".into(), name: "x".into(), substance: "x".into(),
            description: "x".into(), biological_mechanism: "x".into(),
            layers: vec![layer(PkStage::IonChannel)],
            pk_mode: PkMode::PkCascade,
            pk_time_scale: 2.0,
            pk_clearance_tail_multiplier: 2.2,
            enable_secondary_structure_articulation: true,
        };
        // 45ms * 2.0 = 90ms = 0.09s
        assert!((m.onset_seconds(&m.layers[0]) - 0.09).abs() < 1e-6);
        m.pk_time_scale = 1.0;
        assert!((m.onset_seconds(&m.layers[0]) - 0.045).abs() < 1e-6);
    }

    #[test]
    fn clearance_layer_gets_extended_tail() {
        let m = MetaProteody {
            id: "x".into(), name: "x".into(), substance: "x".into(),
            description: "x".into(), biological_mechanism: "x".into(),
            layers: vec![layer(PkStage::MetabolicClearance)],
            pk_mode: PkMode::PkCascade,
            pk_time_scale: 1.0,
            pk_clearance_tail_multiplier: 4.0,
            enable_secondary_structure_articulation: true,
        };
        // base_release 0.2 * hl 2.2 * (4.0/2.2) = 0.8
        assert!((m.release_seconds(&m.layers[0], 0.2) - 0.8).abs() < 1e-6);
    }

    #[test]
    fn non_clearance_layer_release_unscaled_by_tail() {
        let mut m = MetaProteody {
            id: "x".into(), name: "x".into(), substance: "x".into(),
            description: "x".into(), biological_mechanism: "x".into(),
            layers: vec![layer(PkStage::FastReceptor)],
            pk_mode: PkMode::PkCascade,
            pk_time_scale: 1.0,
            pk_clearance_tail_multiplier: 4.0,
            enable_secondary_structure_articulation: true,
        };
        // 0.2 * 1.0 (no tail mult for receptor)
        assert!((m.release_seconds(&m.layers[0], 0.2) - 0.2).abs() < 1e-6);
        m.layers[0].pk_half_life_multiplier = 2.0;
        assert!((m.release_seconds(&m.layers[0], 0.2) - 0.4).abs() < 1e-6);
    }
}
