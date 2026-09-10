//! proteodies-cli — headless smoke: load FASTA -> build resonance map ->
//! render timed events -> print. Exercises the core without audio hardware.

use std::path::PathBuf;
use std::process::ExitCode;

use proteodies_core::aesthetic::Aesthetic;
use proteodies_core::cv::{Calibration, DEFAULT_CLAMP_HI, DEFAULT_CLAMP_LO};
use proteodies_core::mapping::ResonanceMap;
use proteodies_core::output::{PrintSink, Sink};
use proteodies_core::sequencer::{render, Tempo};
use proteodies_core::seq::Sequence;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let path: PathBuf = match args.get(1) {
        Some(p) => PathBuf::from(p),
        None => {
            eprintln!("usage: proteodies-cli <fasta-file> [bpm]");
            return ExitCode::from(2);
        }
    };
    let bpm: f32 = args
        .get(2)
        .and_then(|s| s.parse().ok())
        .unwrap_or(120.0);

    let text = match std::fs::read_to_string(&path) {
        Ok(t) => t,
        Err(e) => {
            eprintln!("error reading {}: {e}", path.display());
            return ExitCode::from(1);
        }
    };

    let (seq, header) = match Sequence::from_fasta(&text) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("fasta parse error: {e}");
            return ExitCode::from(1);
        }
    };

    println!("# Proteodies — resonance at C4 = 256 Hz (Just Intonation)");
    println!("# record: {header}");
    println!("# residues: {}", seq.len());
    println!("# tempo: {bpm} BPM (one residue per beat)");
    println!("# pitch is fixed (immutable); aesthetic = volume/envelope/harmonics/rhythm");
    println!();

    let map = ResonanceMap::from_sequence(&seq, proteodies_core::mapping::BuildOptions::default());
    println!("# algorithm: {:?}", map.algorithm());
    let aesthetic = Aesthetic::neutral(seq.len());
    let events = render(
        &map,
        &seq,
        &aesthetic,
        Tempo(bpm),
        Calibration::UNCALIBRATED,
        DEFAULT_CLAMP_LO,
        DEFAULT_CLAMP_HI,
        true,
    );

    let mut sink = PrintSink::new(std::io::stdout());
    for event in &events {
        let _ = sink.emit(event);
    }

    println!();
    println!("# {} events rendered", events.len());
    ExitCode::SUCCESS
}
