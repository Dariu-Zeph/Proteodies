//! MIDI message encoding and a small adapter that turns `TimedEvent`s into
//! MIDI note-on / note-off / control-change messages.
//!
//! This is pure encoding logic and is fully testable headless. The actual
//! transport to a soft-synth (e.g. `midir`) is a separate, feature-gated
//! backend; this module only decides *what* to send.

use crate::cv::Channel;
use crate::sequencer::TimedEvent;

/// A raw MIDI message bytes.
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub struct MidiMessage {
    pub bytes: [u8; 3],
    pub len: usize,
}

impl MidiMessage {
    /// Note On on `channel` (0..15), `note` (0..127), `velocity` (0..127).
    pub fn note_on(channel: u8, note: u8, velocity: u8) -> MidiMessage {
        MidiMessage {
            bytes: [0x90 | (channel & 0x0F), note & 0x7F, velocity & 0x7F],
            len: 3,
        }
    }

    /// Note Off on `channel` (0..15), `note` (0..127).
    pub fn note_off(channel: u8, note: u8) -> MidiMessage {
        MidiMessage {
            bytes: [0x80 | (channel & 0x0F), note & 0x7F, 0],
            len: 3,
        }
    }

    /// Control Change on `channel`, `controller` (0..119), `value` (0..127).
    pub fn cc(channel: u8, controller: u8, value: u8) -> MidiMessage {
        MidiMessage {
            bytes: [0xB0 | (channel & 0x0F), controller & 0x7F, value & 0x7F],
            len: 3,
        }
    }

    pub fn as_bytes(&self) -> &[u8] {
        &self.bytes[..self.len]
    }
}

/// CC controller numbers for the aesthetic channels (a default mapping; the
/// live UI can reassign these).
pub mod cc {
    pub const VOLUME: u8 = 7;
    pub const BRIGHTNESS: u8 = 74; // "brightness" / filter cutoff slot
    pub const ENV_ATTACK: u8 = 73;
    pub const ENV_DECAY: u8 = 75;
    pub const ENV_SUSTAIN: u8 = 76;
    pub const ENV_RELEASE: u8 = 72;
}

/// Convert pitch volts (1V/octave, 0V = C4 = 256 Hz) to a MIDI note + cents.
/// Cents are returned for pitch-bend / retuning display but are not sent here;
/// the note is the nearest equal-tempered step. This is a *display/transport*
/// convenience — the resonant truth lives in the CV path, not MIDI.
pub fn pitch_volts_to_midi_note(volts: f32) -> Option<u8> {
    let semis = volts * 12.0;
    let note_f = 60.0 + semis;
    if !(0.0..=127.0).contains(&note_f) {
        return None;
    }
    Some(note_f.round().clamp(0.0, 127.0) as u8)
}

/// A bound for a single MIDI channel (note tracking + CC state) so the adapter
/// can send note-off for the previous note before a new note-on.
#[derive(Default)]
pub struct MidiAdapter {
    midi_channel: u8,
    last_note: Option<u8>,
}

impl MidiAdapter {
    pub fn new(midi_channel: u8) -> Self {
        MidiAdapter {
            midi_channel: midi_channel & 0x0F,
            last_note: None,
        }
    }

    /// Reset held state (panic: nothing left ringing).
    pub fn reset(&mut self) {
        self.last_note = None;
    }

    /// Translate a `TimedEvent` into zero or more MIDI messages.
    ///
    /// - Pitch + Gate on  -> note-off (if any) then note-on
    /// - Gate off         -> note-off (if any)
    /// - Volume/Brightness -> control change
    pub fn translate(&mut self, event: &TimedEvent) -> Vec<MidiMessage> {
        match event.channel {
            Channel::Pitch => {
                // Pitch is only meaningful alongside a gate; emit nothing on a
                // bare pitch event unless we already hold a note (re-trigger to
                // the new pitch via note-off + note-on).
                match (pitch_volts_to_midi_note(event.volts), self.last_note) {
                    (Some(note), Some(prev)) if prev != note => {
                        let off = MidiMessage::note_off(self.midi_channel, prev);
                        let on = MidiMessage::note_on(self.midi_channel, note, 100);
                        self.last_note = Some(note);
                        vec![off, on]
                    }
                    (Some(note), None) => {
                        let on = MidiMessage::note_on(self.midi_channel, note, 100);
                        self.last_note = Some(note);
                        vec![on]
                    }
                    _ => vec![],
                }
            }
            Channel::Gate => {
                if event.volts <= 0.0 {
                    if let Some(note) = self.last_note.take() {
                        vec![MidiMessage::note_off(self.midi_channel, note)]
                    } else {
                        vec![]
                    }
                } else {
                    vec![]
                }
            }
            Channel::Volume => {
                let v = (event.volts / 5.0).clamp(0.0, 1.0) * 127.0;
                vec![MidiMessage::cc(self.midi_channel, cc::VOLUME, v as u8)]
            }
            Channel::Brightness => {
                let v = (event.volts / 5.0).clamp(0.0, 1.0) * 127.0;
                vec![MidiMessage::cc(self.midi_channel, cc::BRIGHTNESS, v as u8)]
            }
            _ => vec![],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cv::Channel;

    #[test]
    fn note_on_off_bytes() {
        let on = MidiMessage::note_on(0, 60, 100);
        assert_eq!(on.as_bytes(), &[0x90, 60, 100]);
        let off = MidiMessage::note_off(0, 60);
        assert_eq!(off.as_bytes(), &[0x80, 60, 0]);
    }

    #[test]
    fn cc_bytes() {
        let m = MidiMessage::cc(0, cc::VOLUME, 64);
        assert_eq!(m.as_bytes(), &[0xB0, 7, 64]);
    }

    #[test]
    fn c4_volts_to_note_60() {
        assert_eq!(pitch_volts_to_midi_note(0.0), Some(60));
    }

    #[test]
    fn octave_up_to_note_72() {
        assert_eq!(pitch_volts_to_midi_note(1.0), Some(72));
    }

    #[test]
    fn adapter_triggers_note_on_then_off() {
        let mut a = MidiAdapter::new(0);
        let on = a.translate(&TimedEvent { time_seconds: 0.0, channel: Channel::Pitch, volts: 0.0 });
        assert_eq!(on, vec![MidiMessage::note_on(0, 60, 100)]);
        let off = a.translate(&TimedEvent { time_seconds: 1.0, channel: Channel::Gate, volts: 0.0 });
        assert_eq!(off, vec![MidiMessage::note_off(0, 60)]);
    }

    #[test]
    fn adapter_retriggers_on_pitch_change() {
        let mut a = MidiAdapter::new(0);
        a.translate(&TimedEvent { time_seconds: 0.0, channel: Channel::Pitch, volts: 0.0 });
        let msgs = a.translate(&TimedEvent { time_seconds: 0.5, channel: Channel::Pitch, volts: 1.0 });
        assert_eq!(msgs[0], MidiMessage::note_off(0, 60));
        assert_eq!(msgs[1], MidiMessage::note_on(0, 72, 100));
    }

    #[test]
    fn adapter_sends_volume_cc() {
        let mut a = MidiAdapter::new(2);
        let msgs = a.translate(&TimedEvent { time_seconds: 0.0, channel: Channel::Volume, volts: 2.5 });
        assert_eq!(msgs, vec![MidiMessage::cc(2, cc::VOLUME, 63)]);
    }
}
