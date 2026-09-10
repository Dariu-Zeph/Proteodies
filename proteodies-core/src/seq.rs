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

    /// Kyte-Doolittle hydropathy index. Higher = more hydrophobic.
    pub fn hydropathy(self) -> i32 {
        match self {
            AminoAcid::Ile => 45,
            AminoAcid::Val => 42,
            AminoAcid::Leu => 37,
            AminoAcid::Phe => 28,
            AminoAcid::Cys => 25,
            AminoAcid::Met => 16,
            AminoAcid::Ala => 18,
            AminoAcid::Gly => -8,
            AminoAcid::Thr => -13,
            AminoAcid::Ser => -30,
            AminoAcid::Trp => -9,
            AminoAcid::Tyr => -14,
            AminoAcid::Pro => -46,
            AminoAcid::His => -42,
            AminoAcid::Glu => -55,
            AminoAcid::Gln => -35,
            AminoAcid::Asp => -54,
            AminoAcid::Asn => -28,
            AminoAcid::Lys => -52,
            AminoAcid::Arg => -25,
            AminoAcid::Gap => 0,
        }
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
            if line.starts_with('>') {
                if header.is_some() {
                    break;
                }
                header = Some(line[1..].trim().to_string());
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
