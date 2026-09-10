# Prototype Reference Spec

This document captures the **proven, working design** of the
`Dariu-Zeph/Proteodies` TypeScript prototype (React + Web Audio) so that the
`dariu000` Rust core can be reconciled against it and ported without losing the
prototype's depth. The Rust core treats this as the authoritative target for the
pure (non-audio) logic.

The prototype implements **Joel Sternheimer's quantum proteody theory**: amino
acids are translated into musical pitch via a physical constant chain, then
snapped to 5-limit Just Intonation at C4 = 256 Hz, and emitted as 1V/octave
control voltage plus an envelope CV over a DC-coupled sound card.

## 1. Physical constants (Sternheimer mass → sound)

```
SPEED_OF_LIGHT         c = 299_792_458 m/s
PLANCK_CONSTANT        h = 6.62607015e-34 J·s
ATOMIC_MASS_UNIT       u = 1.6605390666e-27 kg  (1 Da)
```

- **de Broglie quantum frequency**: `nu = m · c² / h`  (~10^25 Hz per Da).
  `STERNHEIMER_QUANTUM_FACTOR = (u · c²) / h ≈ 2.252342718e23 Hz/Da`.
- **Audible octave reduction**: divide by `2^76` to fold the quantum frequency
  into the audible band.
  `STERNHEIMER_AUDIBLE_FACTOR = STERNHEIMER_QUANTUM_FACTOR / 2^76 ≈ 2.981084 Hz/Da`.
- `massToSternheimerAudibleHz(mDa) = mDa · STERNHEIMER_AUDIBLE_FACTOR`.
  Example: Glycine (75.07 Da) → ~223.79 Hz; Tryptophan (204.23 Da) → ~608.83 Hz.

## 2. 5-Limit Just Intonation at C4 = 256 Hz

Base: `C4 = 256.0 Hz`, `C2 = 64.0 Hz` (the 0V Eurorack reference).

The 12-interval 5-limit table (ratios of prime factors 2, 3, 5), ordered by
ascending pitch within the octave:

| Note | Ratio  | num/den   | cents (approx) | 12TET steps |
|------|--------|-----------|----------------|-------------|
| C    | 1/1    | 1/1       | 0.0            | 0           |
| Db   | 16/15  | 16/15     | 111.73         | 1           |
| D    | 9/8    | 9/8       | 203.91         | 2           |
| Eb   | 6/5    | 6/5       | 315.64         | 3           |
| E    | 5/4    | 5/4       | 386.31         | 4           |
| F    | 4/3    | 4/3       | 498.04         | 5           |
| F#   | 45/32  | 45/32     | 590.22         | 6           |
| G    | 3/2    | 3/2       | 701.96         | 7           |
| Ab   | 8/5    | 8/5       | 813.69         | 8           |
| A    | 5/3    | 5/3       | 884.36         | 9           |
| Bb   | 9/5    | 9/5       | 1017.60        | 10          |
| B    | 15/8   | 15/8      | 1088.27        | 11          |

- `calculateJustFrequency(noteSymbol, octave)` =
  `256 · 2^(octave-4) · interval.ratio`.
- `frequencyToPitchCV(f, base=64)` = `log2(f / base)`  (1V/octave, C2=0V).
- `noteToPitchCV(note, octave, baseOctave=2)` =
  `(octave - baseOctave) + log2(interval.ratio)`.

`findClosest5JustInterval(targetFreq)` normalizes `targetFreq` into
`[256, 512)` and snaps to the nearest table ratio, returning the interval,
octave, exact JI frequency, and cents deviation from the raw de Broglie pitch.

## 3. Amino-acid reference data

Molecular weight (Da), Kyte-Doolittle hydropathy, and the canonical
Sternheimer default note/octave used by the `sternheimer_canonical` algorithm:

| AA | name          | MW (Da)  | hydropathy | defaultNote | defaultOctave |
|----|---------------|----------|------------|-------------|---------------|
| G  | Glycine       | 75.07    | -0.4       | C           | 3             |
| A  | Alanine       | 89.09    | 1.8        | D           | 3             |
| S  | Serine        | 105.09   | -0.8       | E           | 3             |
| P  | Proline       | 115.13   | -1.6       | F           | 3             |
| V  | Valine        | 117.15   | 4.2        | G           | 3             |
| T  | Threonine     | 119.12   | -0.7       | A           | 3             |
| C  | Cysteine      | 121.16   | 2.5        | B           | 3             |
| I  | Isoleucine    | 131.18   | 4.5        | C           | 4             |
| L  | Leucine       | 131.18   | 3.8        | D           | 4             |
| N  | Asparagine    | 132.12   | -3.5       | Eb          | 4             |
| D  | Aspartate     | 133.10   | -3.5       | E           | 4             |
| Q  | Glutamine     | 146.15   | -3.5       | F           | 4             |
| K  | Lysine        | 146.19   | -3.9       | F#          | 4             |
| E  | Glutamate     | 147.13   | -3.5       | G           | 4             |
| M  | Methionine    | 149.21   | 1.9        | Ab          | 4             |
| H  | Histidine     | 155.16   | -3.2       | A           | 4             |
| F  | Phenylalanine | 165.19   | 2.8        | Bb          | 4             |
| R  | Arginine      | 174.20   | -4.5       | B           | 4             |
| Y  | Tyrosine      | 181.19   | -1.3       | C           | 5             |
| W  | Tryptophan    | 204.23   | -0.9       | E           | 5             |

## 4. The five mapping algorithms

`translateSequenceToProteody(sequence, baseOctave, defaultGate, algorithm)`
produces a `ProteodyNote[]`. The algorithm is chosen once per translation; pitch
is then fixed (immutable by the Proteodies principle).

- `sternheimer_mass_5just` (default): mass → `massToSternheimerAudibleHz` →
  `findClosest5JustInterval` → exact JI frequency + 1V/oct CV.
- `sternheimer_mass_continuous`: mass → audible Hz, **unquantized**
  microtonal frequency; nearest JI note kept for display only.
- `sternheimer_canonical`: uses each AA's `defaultNote`/`defaultOctave`
  (the Sternheimer codon scale), shifted by `baseOctave - 4`.
- `molecular_weight`: chromatic 12-bucket distribution keyed to mass
  (normalized `(MW-75)/(205-75)`), octave += 1 if MW > 150.
- `hydropathy`: 7-tone diatonic distribution keyed to Kyte-Doolittle
  `(hydropathy+4.5)/9.0`, octave -= 1 if hydropathy < 0.

Each note also carries `velocity = 0.8 + (|hydropathy|/10)·0.2` and a
`duration`/`gate`.

## 5. Secondary-structure articulation (non-pitch rhythm axis)

`getSecondaryStructure(aa)` predicts conformation from Chou-Fasman propensity and
returns a **gate multiplier** (a rhythm/envelope axis, never pitch):

- **α-Helix** (A, L, M, E, K, Q, H): rigid H-bonded spiral → punchy staccato,
  `gateMultiplier = 0.70`.
- **β-Sheet** (V, I, Y, C, W, F, T): pleated strand → balanced body,
  `gateMultiplier = 0.95`.
- **Loop/Coil** (G, P, S, D, N, R): disordered active-site hinge → fluid legato
  sustain, `gateMultiplier = 1.30`.

This is the prototype's realization of the "rhythm" aesthetic axis while pitch
stays fixed.

## 6. Meta-Proteodies + Pharmacokinetic (PK/PD) cascade model

A **Meta-Proteody** models a multi-protein mixture (e.g. "Coffee") as 4 parallel
protein voices played together, each at a different stage of a pharmacokinetic
cascade. Per-layer fields:

- `proteinId`, `proteinName`, `biologicalRole`, `aminoSequence`, `octave`,
  `gain` (0..1 relative balance), `color`, `pan` (-1..+1 stereo).
- PK/PD: `pkStage` ∈
  `{fast_receptor, ion_channel, neuromodulator, metabolic_clearance}`,
  `pkOnsetDelayMs` (typical 0 / 45 / 90 / 140 ms), `pkHalfLifeMultiplier`
  (typical 1.0 / 1.15 / 1.35 / 2.2), `pkFilterOpenness` (0..1).

Config-level fields: `pkMode` ∈ `{pk_cascade, simultaneous_chord}`,
`pkTimeScale` (0.5..2.5, default 1.0), `pkClearanceTailMultiplier`
(1.0..4.0), `enableSecondaryStructureArticulation`.

In cascade mode, voices enter with realistic biological delays, and the envelope
CV on the right channel follows a 3-phase **plasma concentration curve**
(rapid binding spike → physiological peak → prolonged hepatic clearance tail).
In chord mode, all voices fire simultaneously with a plain ADSR.

Curated Meta-Proteodies shipped in the prototype: **Coffee** (ADORA2A, RYR1,
DRD2, CYP1A2), **Green Tea** (GRIA1, GABRA1, COMT, RPSA), **Cacao** (ADORA1,
CNR1, HTR1A, FAAH), **Chamomile** (GABRA2, MTNR1A, GLRA1, UGT1A9).

## 7. CV / audio engine model (for reference, not ported to core)

- Stereo out: **Left = Pitch CV (1V/oct)**, **Right = Envelope CV**.
- Calibration: `V_cal = V_target · slope + offset` + piecewise octave
  corrections `c1..c6` (interpolated per octave), then normalized to DAC range
  `-1..+1` against `soundCardMaxVoltage`. Invert flags for both channels.
- Audible monitor synth: a 10-octave rich-harmonics stack (sub-4 to super-6),
  with presets (warm_octaves, deep_sub, cosmic_range, cathedral, …). This is
  the "harmonics/timbre" aesthetic axis.

## 8. What the Rust core must reconcile

- Replace the ad-hoc interval table with the **12-interval 5-limit table**
  (Section 2) and `findClosest5JustInterval`.
- Add the **Sternheimer constants + mass→audible-Hz** (Section 1) and
  **AA molecular weights + hydropathy** (Section 3).
- Add the **5 algorithms** as an immutable-at-construction enum (Section 4).
- Add **secondary-structure gate multipliers** to the rhythm/aesthetic (Section 5).
- Add the **Meta-Proteody + PK cascade data model** (Section 6) — pure types,
  testable headless; the actual audio cascade is not ported to the core.
- Keep the **resonance invariant**: pitch is read-only; the algorithm is chosen
  once at map construction and has no live setter.
