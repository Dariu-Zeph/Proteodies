# Architecture

Proteodies is a Rust workspace. The design goal is to make the resonance
principle **structurally unbreakable** rather than a convention: pitch is
immutable data the performer can only read and play, while only aesthetic
parameters are mutable and exposed as controls.

## Layers

```
sequence (FASTA)  ->  core  ->  timed events  ->  output (CV / MIDI)
                         ^
                         |
              immutable resonance + mutable aesthetic
```

### 1. Sequence

`proteodies-core::seq`
- `AminoAcid` — the 20 standard residues plus a `Gap` for alignment holes.
- `Sequence` — a newtype over `Vec<AminoAcid>` parsed from FASTA or raw text.
- Amino-acid physical/chemical properties are read-only reference data used by
  the mapping and the aesthetic, never edited.

### 2. Just Intonation tuning

`proteodies-core::tuning`
- `Tuning` is fixed at C4 = 256 Hz.
- Pitches are represented as rational intervals relative to 256 Hz
  (numerator/denominator), computed exactly. Frequency is derived from the
  ratio; voltage is derived from the frequency.
- No floating point enters the pitch path until the final frequency/voltage
  conversion, so there is no accumulated temperament error.

### 3. Resonance pitch mapping (immutable)

`proteodies-core::mapping`
- `ResonanceMap` is constructed **once** from a `Sequence` and the `Tuning`.
  It assigns each residue an exact JI pitch (interval + octave).
- The mapping is a function of the sequence's resonance signature. The
  performer has **no API to mutate it**; the type only exposes `pitch_at()` and
  iteration. This is the structural guarantee of the principle.

### 4. Aesthetic domain (mutable, the expressive surface)

`proteodies-core::aesthetic`
- `Aesthetic` holds the *non-pitch* parameters the performer controls:
  - `Volume` (dynamics)
  - `Envelope` (attack / decay / sustain / release, in seconds)
  - `Harmonics` (timbre: relative amplitudes of partials)
  - `Rhythm` (subdivision, swing, accent pattern, rest pattern)
- `Aesthetic` is the only place live mutation happens. It maps to CV channels
  distinct from the pitch channel.

### 5. CV output

`proteodies-core::cv`
- `Pitch` -> volts via 1V/octave: `v = log2(f / base)`, base = C4 voltage.
- `Calibration` is per-channel: offset and scale, derived from measured
  endpoints. Without calibration, output is approximate and out of tune.
- `safety clamp` bounds every voltage to a configurable range (default
  ±10V) and ramps between steps to avoid jumps that could damage modules.

### 6. Sequencer / transport

`proteodies-core::sequencer`
- `Transport` (tempo, play/stop, loop, position) advances a deterministic clock.
- The sequencer combines the **immutable** `ResonanceMap` with the **mutable**
  `Aesthetic` and renders a stream of `TimedEvent`s: `(time, channel, voltage)`
  or MIDI. Pitch events come only from the resonance map; everything else from
  the aesthetic.
- Seeded and reproducible: the same sequence + aesthetic + seed + tempo yields
  the same event stream.

### 7. Output / CLI

`proteodies-core::output`
- `MidiSink` (default, hardware-free) and a `CvSink` trait ready for the future
  DC-coupled driver.
- `proteodies-cli` is a headless smoke test: load FASTA -> build map ->
  render events -> print a few timed events. This is how the core is exercised
  in CI without any audio hardware.

## Why this shape

- The **resonance invariant is a type**, not a rule. You cannot write code that
  retunes a note to "fix" it because the mapping has no setter.
- The **core is pure and headless**, so it is fully testable in CI and on any
  machine — no audio hardware, no network, no GUI.
- The **aesthetic is a separate object** with its own CV channels, so live
  performance changes never touch the resonance path.
- **Integer-ratio JI** keeps the pitch path exact until the final conversion,
  preserving the 256 Hz resonance base with no drift.
