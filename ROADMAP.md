# Roadmap

Proteodies is at **Milestone 0 (foundation)**. The milestones below are ordered
so that each one is independently testable and does not block on hardware.

## M0 — Foundation (this PR)

- Product principles and architecture docs.
- `proteodies-core`: amino acids, JI tuning at C4 = 256 Hz, immutable resonance
  pitch map, aesthetic domain (volume / envelope / harmonics / rhythm),
  CV voltage + calibration + safety clamp, sequencer/transport, FASTA loader.
- `proteodies-cli`: headless smoke that loads FASTA and renders timed events.
- Invariant tests: pitch is immutable, JI ratios are exact, CV is clamped,
  rendering is deterministic given a seed.

## M1 — Mapping depth

- Secondary structure (helix / sheet / coil) -> additional CV modulation.
- Property-informed pitch placement within the JI lattice (still immutable;
  chosen once at map construction, not live).
- Mutation = motif: point mutations produce recognizable, developable material.

## M2 — Live MIDI output

- Real-time MIDI sink (not just print), clocked by the transport.
- MIDI controller mapping for a few macros so the laptop can be closed.
- Patch save/recall (sequence + aesthetic + transport).

## M3 — Live CV output

- DC-coupled interface driver (Expert Sleepers ES-8/ES-9 or equivalent).
- Per-channel calibration wizard with measurement loop.
- Latency budget: < 10 ms scheduling jitter; atomic gate+pitch per step.

## M4 — Performer UX

- Dark, high-contrast live UI; three zones (Sequence / Aesthetic / Transport).
- Live step/timeline view of upcoming notes for anticipation.
- Live mutation controls (mutate / swap / reverse) with instant audible result.
- Panic (all-gates-off) and undo.

## M5 — Onboarding & polish

- First-run wizard: famous protein -> aesthetic preset -> play -> route output.
- Inline explanation of what each CV channel is doing.
- Set-list management; crash recovery / auto-save.
