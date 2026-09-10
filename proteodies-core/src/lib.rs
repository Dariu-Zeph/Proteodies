//! Proteodies core: pure, headless library.
//!
//! Encodes the resonance invariant: pitch is immutable data derived from a
//! protein sequence and a Just-Intonation tuning at C4 = 256 Hz. The performer
//! only controls aesthetic (non-pitch) parameters, mapped to control voltage.
//!
//! See `ARCHITECTURE.md` for the layer design.

pub mod aesthetic;
pub mod cv;
pub mod mapping;
pub mod output;
pub mod seq;
pub mod sequencer;
pub mod tuning;
