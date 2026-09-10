# Proteodies

Proteodies is a live-performance instrument that turns **protein sequences** into
music, with one non-negotiable principle: **resonance is fixed and must not be
altered by the performer.**

The pitch of every residue is determined **once**, by the resonance signature of
the sequence. What the performer plays with — the aesthetic — lives everywhere
*except* pitch:

- **volume / dynamics**
- **envelope** (attack, decay, sustain, release)
- **harmonics / timbre**
- **rhythm** (subdivision, swing, accents, rests)
- and other non-pitch parameters mapped to **control voltage (CV)**

Changing individual pitches to "sound nice" breaks the principle and is not a
control the instrument exposes.

## Tuning

Proteodies uses **Just Intonation at C4 = 256 Hz**.

- 256 Hz = 2⁸, the "scientific" / Verdi base pitch.
- Every interval is an **integer ratio**, so all pitched material is maximally
  resonant. No equal temperament, no cents drift, no temperament compromise.

The pitch mapping is computed from the protein and from the JI tuning. It is
**read-only data**: the core exposes it to be played and sent over CV, never to
be edited.

## Output

The instrument targets **modular synthesis** via **control voltage** (the
1V/octave analog standard). Pitch and each aesthetic parameter become timed
voltage events on independent CV channels, with per-channel calibration and
safety clamping so a glitch cannot damage a module.

MIDI is also supported as a default output so the instrument can be prototyped
and played without CV hardware.

## Status

**Concept / foundation.** This repository currently contains the project
foundation: the product principles, architecture, roadmap, and the
`proteodies-core` library that encodes the resonance invariant and renders
protein sequences to timed musical events. The live audio + GUI + CV-driver
milestones come later, on top of this core.

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [ROADMAP.md](./ROADMAP.md).

## Principles (short)

1. **Resonance is fixed.** Pitch derives from the sequence and the JI tuning.
   The performer cannot retune individual notes.
2. **Aesthetic is everything else.** Volume, envelope, harmonics, rhythm and
   other non-pitch parameters are the expressive surface, mapped to CV.
3. **Just Intonation at 256 Hz.** Integer-ratio intervals only.
4. **Offline-first, deterministic.** Live performance never depends on a
   network. Generation is seed-reproducible.
5. **Safe CV.** Calibrated, clamped, ramped voltage output.

## Repository layout

```
proteodies-core   pure, headless core (resonance invariant, JI, CV, sequencer)
proteodies-cli     headless smoke: FASTA -> timed events
ARCHITECTURE.md    layer design and why the resonance invariant is a type
ROADMAP.md         milestone plan
```

## Build & test

```
cargo test
cargo run --release --bin proteodies-cli -- examples/insulin.fasta
```

## License

To be determined.
