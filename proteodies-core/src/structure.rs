//! Secondary-structure articulation — a **non-pitch** rhythm axis.
//!
//! Predicts a residue's conformation (α-helix / β-sheet / loop-coil) from
//! Chou-Fasman propensity and returns a **gate multiplier**: the rhythm /
//! envelope axis that shapes how the (fixed, immutable) pitch is articulated.
//! This never touches pitch, matching the Proteodies principle and the
//! prototype (`docs/PROTOTYPE.md` §5).

use crate::seq::AminoAcid;

/// A predicted secondary-structure class.
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum SecondaryStructure {
    AlphaHelix,
    BetaSheet,
    LoopCoil,
}

impl SecondaryStructure {
    /// The gate-length multiplier that articulates this conformation.
    /// α-helix = punchy staccato (0.70), β-sheet = balanced (0.95),
    /// loop/coil = legato sustain (1.30).
    pub fn gate_multiplier(self) -> f32 {
        match self {
            SecondaryStructure::AlphaHelix => 0.70,
            SecondaryStructure::BetaSheet => 0.95,
            SecondaryStructure::LoopCoil => 1.30,
        }
    }

    /// Short display symbol (α / β / Ω).
    pub fn symbol(self) -> &'static str {
        match self {
            SecondaryStructure::AlphaHelix => "α",
            SecondaryStructure::BetaSheet => "β",
            SecondaryStructure::LoopCoil => "Ω",
        }
    }

    /// Human-readable label.
    pub fn label(self) -> &'static str {
        match self {
            SecondaryStructure::AlphaHelix => "α-Helix",
            SecondaryStructure::BetaSheet => "β-Sheet",
            SecondaryStructure::LoopCoil => "Loop/Coil",
        }
    }
}

/// Predict the secondary structure for an amino acid from Chou-Fasman
/// propensity, matching the prototype's `getSecondaryStructure`.
///
/// - α-Helix formers: A, L, M, E, K, Q, H
/// - β-Sheet formers: V, I, Y, C, W, F, T
/// - Loops/turns/coils: everything else (G, P, S, D, N, R). `Gap` → LoopCoil.
pub fn for_amino_acid(aa: AminoAcid) -> SecondaryStructure {
    use AminoAcid::*;
    match aa {
        Ala | Leu | Met | Glu | Lys | Gln | His => SecondaryStructure::AlphaHelix,
        Val | Ile | Tyr | Cys | Trp | Phe | Thr => SecondaryStructure::BetaSheet,
        Gly | Pro | Ser | Asp | Asn | Arg => SecondaryStructure::LoopCoil,
        Gap => SecondaryStructure::LoopCoil,
    }
}

/// Convenience: the gate multiplier for a residue.
pub fn gate_multiplier(aa: AminoAcid) -> f32 {
    for_amino_acid(aa).gate_multiplier()
}

#[cfg(test)]
mod tests {
    use super::*;
    use AminoAcid::*;

    #[test]
    fn helix_formers_get_alpha() {
        for &aa in &[Ala, Leu, Met, Glu, Lys, Gln, His] {
            assert_eq!(for_amino_acid(aa), SecondaryStructure::AlphaHelix);
            assert_eq!(gate_multiplier(aa), 0.70);
        }
    }

    #[test]
    fn sheet_formers_get_beta() {
        for &aa in &[Val, Ile, Tyr, Cys, Trp, Phe, Thr] {
            assert_eq!(for_amino_acid(aa), SecondaryStructure::BetaSheet);
            assert_eq!(gate_multiplier(aa), 0.95);
        }
    }

    #[test]
    fn coil_formers_get_loop() {
        for &aa in &[Gly, Pro, Ser, Asp, Asn, Arg] {
            assert_eq!(for_amino_acid(aa), SecondaryStructure::LoopCoil);
            assert_eq!(gate_multiplier(aa), 1.30);
        }
    }

    #[test]
    fn gap_is_loop_coil() {
        assert_eq!(for_amino_acid(AminoAcid::Gap), SecondaryStructure::LoopCoil);
    }

    #[test]
    fn all_twenty_residues_classified() {
        use AminoAcid::*;
        let all = [
            Ala, Arg, Asn, Asp, Cys, Gln, Glu, Gly, His, Ile, Leu, Lys, Met, Phe,
            Pro, Ser, Thr, Trp, Tyr, Val,
        ];
        for aa in all {
            let _ = for_amino_acid(aa);
        }
    }
}
