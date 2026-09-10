//! Output sinks. The core renders `TimedEvent`s; a sink consumes them. MIDI is
//! the default hardware-free sink so the instrument can be prototyped and played
//! without CV gear. The `CvSink` trait is ready for the future DC-coupled
//! driver.

use crate::sequencer::TimedEvent;

/// Something that consumes timed events.
pub trait Sink {
    type Error;
    fn emit(&mut self, event: &TimedEvent) -> Result<(), Self::Error>;
}

/// A sink that prints events to a writer. Used by the CLI smoke and tests.
pub struct PrintSink<W: std::io::Write> {
    out: W,
}

impl<W: std::io::Write> PrintSink<W> {
    pub fn new(out: W) -> Self {
        PrintSink { out }
    }
}

impl<W: std::io::Write> Sink for PrintSink<W> {
    type Error = std::io::Error;
    fn emit(&mut self, event: &TimedEvent) -> Result<(), Self::Error> {
        writeln!(
            self.out,
            "t={:>7.3}s  {:?}  {:>7.3}V",
            event.time_seconds, event.channel, event.volts
        )
    }
}

/// Convert pitch volts (1V/octave, 0V = C4 = 256 Hz) to a MIDI note number and
/// cents offset for the MIDI sink. Returns None for out-of-MIDI-range pitches.
pub fn pitch_volts_to_midi(volts: f32) -> Option<(u8, i8)> {
    // MIDI note 69 (A4) = 440 Hz. C4 (256 Hz) is below A4 (440): ratio 256/440.
    // semitones above C4 = volts * 12; C4 MIDI note = 60.
    let semis = volts * 12.0;
    let note_f = 60.0 + semis;
    if !(0.0..=127.0).contains(&note_f) {
        return None;
    }
    let note = note_f.round() as i32;
    let cents = ((note_f - note as f32) * 100.0).round() as i32;
    let cents = cents.clamp(-50, 50) as i8;
    Some((note as u8, cents))
}

/// A placeholder MIDI sink that records the MIDI notes it would send, without
/// touching hardware. Used to exercise the MIDI path headless.
pub struct MidiSink {
    pub notes: Vec<(f32, u8, i8)>,
}

impl MidiSink {
    pub fn new() -> MidiSink {
        MidiSink { notes: Vec::new() }
    }
}

impl Default for MidiSink {
    fn default() -> Self {
        Self::new()
    }
}

impl Sink for MidiSink {
    type Error = std::convert::Infallible;
    fn emit(&mut self, event: &TimedEvent) -> Result<(), Self::Error> {
        if event.channel == crate::cv::Channel::Pitch {
            if let Some((note, cents)) = pitch_volts_to_midi(event.volts) {
                self.notes.push((event.time_seconds, note, cents));
            }
        }
        Ok(())
    }
}

/// Future CV sink trait marker (no driver yet).
pub trait CvSink {
    fn send(&mut self, channel: crate::cv::Channel, volts: f32);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cv::Channel;

    #[test]
    fn c4_volts_map_to_midi_60() {
        let (note, cents) = pitch_volts_to_midi(0.0).unwrap();
        assert_eq!(note, 60);
        assert_eq!(cents, 0);
    }

    #[test]
    fn octave_up_is_midi_72() {
        let (note, _) = pitch_volts_to_midi(1.0).unwrap();
        assert_eq!(note, 72);
    }

    #[test]
    fn out_of_range_returns_none() {
        assert!(pitch_volts_to_midi(20.0).is_none());
        assert!(pitch_volts_to_midi(-20.0).is_none());
    }

    #[test]
    fn midi_sink_records_pitch_events() {
        use crate::sequencer::TimedEvent;
        let mut sink = MidiSink::new();
        sink.emit(&TimedEvent { time_seconds: 0.0, channel: Channel::Pitch, volts: 0.0 }).unwrap();
        sink.emit(&TimedEvent { time_seconds: 0.5, channel: Channel::Gate, volts: 5.0 }).unwrap();
        assert_eq!(sink.notes, vec![(0.0, 60, 0)]);
    }
}
