//! Amino acids and protein sequences.
//!
//! The 20 standard residues plus a `Gap` for alignment holes. Physical and
//! chemical properties are read-only reference data used by the mapping and the
//! aesthetic; they are never edited.

/// The 20 standard amino acids plus `Gap` for alignment holes.
///
/// Variants are ordered by hydrophobicity rank only for stable iteration; the
/// ranking is not part of the public contract.
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum AminoAcid {
    Ala,
    Arg,
    Asn,
    Asp,
    Cys,
    Gln,
    Glu,
    Gly,
    His,
    Ile,
    Leu,
    Lys,
    Met,
    Phe,
    Pro,
    Ser,
    Thr,
    Trp,
    Tyr,
    Val,
    Gap,
}

impl AminoAcid {
    /// One-letter IUPAC code.
    pub fn one_letter(self) -> char {
        match self {
            AminoAcid::Ala => 'A',
            AminoAcid::Arg => 'R',
            AminoAcid::Asn => 'N',
            AminoAcid::Asp => 'D',
            AminoAcid::Cys => 'C',
            AminoAcid::Gln => 'Q',
            AminoAcid::Glu => 'E',
            AminoAcid::Gly => 'G',
            AminoAcid::His => 'H',
            AminoAcid::Ile => 'I',
            AminoAcid::Leu => 'L',
            AminoAcid::Lys => 'K',
            AminoAcid::Met => 'M',
            AminoAcid::Phe => 'F',
            AminoAcid::Pro => 'P',
            AminoAcid::Ser => 'S',
            AminoAcid::Thr => 'T',
            AminoAcid::Trp => 'W',
            AminoAcid::Tyr => 'Y',
            AminoAcid::Val => 'V',
            AminoAcid::Gap => '-',
        }
    }

    /// Parse a one-letter IUPAC code. Returns `None` for ambiguous codes and
    /// unknown characters. `-` and `.` parse as `Gap`.
    pub fn from_one_letter(c: char) -> Option<AminoAcid> {
        Some(match c.to_ascii_uppercase() {
            'A' => AminoAcid::Ala,
            'R' => AminoAcid::Arg,
            'N' => AminoAcid::Asn,
            'D' => AminoAcid::Asp,
            'C' => AminoAcid::Cys,
            'Q' => AminoAcid::Gln,
            'E' => AminoAcid::Glu,
            'G' => AminoAcid::Gly,
            'H' => AminoAcid::His,
            'I' => AminoAcid::Ile,
            'L' => AminoAcid::Leu,
            'K' => AminoAcid::Lys,
            'M' => AminoAcid::Met,
            'F' => AminoAcid::Phe,
            'P' => AminoAcid::Pro,
            'S' => AminoAcid::Ser,
            'T' => AminoAcid::Thr,
            'W' => AminoAcid::Trp,
            'Y' => AminoAcid::Tyr,
            'V' => AminoAcid::Val,
            '-' | '.' => AminoAcid::Gap,
            _ => return None,
        })
    }

    /// Molecular weight in Daltons (Da), matching the prototype's
    /// `AMINO_ACIDS` table (`docs/PROTOTYPE.md` §3).
    pub fn molecular_weight_da(self) -> Option<f64> {
        use crate::tuning::mass_to_audible_hz;
        let mw = match self {
            AminoAcid::Gly => 75.07,
            AminoAcid::Ala => 89.09,
            AminoAcid::Ser => 105.09,
            AminoAcid::Pro => 115.13,
            AminoAcid::Val => 117.15,
            AminoAcid::Thr => 119.12,
            AminoAcid::Cys => 121.16,
            AminoAcid::Ile | AminoAcid::Leu => 131.18,
            AminoAcid::Asn => 132.12,
            AminoAcid::Asp => 133.10,
            AminoAcid::Gln => 146.15,
            AminoAcid::Lys => 146.19,
            AminoAcid::Glu => 147.13,
            AminoAcid::Met => 149.21,
            AminoAcid::His => 155.16,
            AminoAcid::Phe => 165.19,
            AminoAcid::Arg => 174.20,
            AminoAcid::Tyr => 181.19,
            AminoAcid::Trp => 204.23,
            AminoAcid::Gap => return None,
        };
        // Silence unused-import lint when this fn is inlined; mass_to_audible_hz
        // is exercised elsewhere, but keep the link live for clarity.
        let _ = mass_to_audible_hz;
        Some(mw)
    }

    /// Sternheimer audible frequency (Hz) via the 2^76 octave reduction of the
    /// de Broglie frequency. `None` for `Gap`.
    pub fn sternheimer_audible_hz(self) -> Option<f64> {
        self.molecular_weight_da()
            .map(crate::tuning::mass_to_audible_hz)
    }

    /// Kyte-Doolittle hydropathy index on the standard float scale (higher =
    /// more hydrophobic), matching the prototype's table.
    pub fn hydropathy(self) -> Option<f64> {
        use AminoAcid::*;
        Some(match self {
            Ile => 4.5,
            Val => 4.2,
            Leu => 3.8,
            Phe => 2.8,
            Cys => 2.5,
            Met => 1.9,
            Ala => 1.8,
            Gly => -0.4,
            Thr => -0.7,
            Ser => -0.8,
            Trp => -0.9,
            Tyr => -1.3,
            Pro => -1.6,
            His => -3.2,
            Gln | Asn | Asp | Glu => -3.5,
            Lys => -3.9,
            Arg => -4.5,
            Gap => return None,
        })
    }

    /// Canonical Sternheimer default note symbol (for the
    /// `sternheimer_canonical` algorithm), matching the prototype.
    pub fn sternheimer_default_note(self) -> Option<&'static str> {
        use AminoAcid::*;
        Some(match self {
            Gly => "C",  Ala => "D",  Ser => "E",  Pro => "F",
            Val => "G",  Thr => "A",  Cys => "B",  Ile => "C",
            Leu => "D",  Asn => "Eb", Asp => "E",  Gln => "F",
            Lys => "F#", Glu => "G",  Met => "Ab", His => "A",
            Phe => "Bb", Arg => "B",  Tyr => "C",  Trp => "E",
            Gap => return None,
        })
    }

    /// Canonical Sternheimer default octave (for `sternheimer_canonical`).
    pub fn sternheimer_default_octave(self) -> Option<i32> {
        use AminoAcid::*;
        Some(match self {
            Gly | Ala | Ser | Pro | Val | Thr | Cys => 3,
            Ile | Leu | Asn | Asp | Gln | Lys | Glu | Met | His | Phe | Arg => 4,
            Tyr | Trp => 5,
            Gap => return None,
        })
    }
}

/// An amino-acid sequence. Newtype over `Vec<AminoAcid>`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Sequence(Vec<AminoAcid>);

impl Sequence {
    pub fn new(residues: Vec<AminoAcid>) -> Self {
        Sequence(residues)
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    pub fn residues(&self) -> &[AminoAcid] {
        &self.0
    }

    pub fn get(&self, i: usize) -> Option<AminoAcid> {
        self.0.get(i).copied()
    }
}

impl Sequence {
    /// Parse raw one-letter sequence text. Unknown characters are dropped
    /// (they are reported via the returned count).
    pub fn from_raw(text: &str) -> (Sequence, usize) {
        let mut residues = Vec::new();
        let mut dropped = 0usize;
        for c in text.chars() {
            match AminoAcid::from_one_letter(c) {
                Some(aa) => residues.push(aa),
                None => dropped += 1,
            }
        }
        (Sequence(residues), dropped)
    }

    /// Parse FASTA text. One record is read (the first). Header lines start
    /// with `>`. Unknown characters within the sequence are dropped.
    pub fn from_fasta(text: &str) -> Result<(Sequence, String), ParseError> {
        let mut header: Option<String> = None;
        let mut seq_body = String::new();
        for line in text.lines() {
            if line.is_empty() {
                continue;
            }
            if let Some(rest) = line.strip_prefix('>') {
                if header.is_some() {
                    break;
                }
                header = Some(rest.trim().to_string());
                continue;
            }
            seq_body.push_str(line.trim());
        }
        let header = header.ok_or(ParseError::NoRecord)?;
        let (seq, _dropped) = Sequence::from_raw(&seq_body);
        if seq.is_empty() {
            return Err(ParseError::EmptySequence);
        }
        Ok((seq, header))
    }
}

#[derive(Debug)]
pub enum ParseError {
    NoRecord,
    EmptySequence,
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ParseError::NoRecord => f.write_str("no FASTA record found"),
            ParseError::EmptySequence => f.write_str("FASTA record has an empty sequence"),
        }
    }
}

impl std::error::Error for ParseError {}
