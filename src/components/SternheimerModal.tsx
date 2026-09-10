/**
 * Joel Sternheimer Proteodies Quantum Mass-to-Sound Calculator & Matrix
 */

import React, { useState } from 'react';
import { Atom, Volume2, X, Zap, ChevronRight, Calculator, Check, ArrowRight } from 'lucide-react';
import {
  AMINO_ACIDS,
  SPEED_OF_LIGHT,
  PLANCK_CONSTANT,
  ATOMIC_MASS_UNIT,
  STERNHEIMER_QUANTUM_FACTOR,
  STERNHEIMER_OCTAVE_DIVISOR_EXP,
  STERNHEIMER_AUDIBLE_FACTOR,
  findClosest5JustInterval
} from '../data/proteodyLibrary';
import { SoundCardCVEngine } from '../audio/cvEngine';
import { calculateJustFrequency, formatHz, formatVolts, noteToPitchCV } from '../audio/tuning';
import { ProteodyNote } from '../types/synth';

interface SternheimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: SoundCardCVEngine | null;
}

export const SternheimerModal: React.FC<SternheimerModalProps> = ({
  isOpen,
  onClose,
  engine
}) => {
  const [customMass, setCustomMass] = useState<number>(131.18); // Default Isoleucine
  const [activeResidue, setActiveResidue] = useState<string | null>(null);

  if (!isOpen) return null;

  const deBroglieQuantumHz = customMass * STERNHEIMER_QUANTUM_FACTOR;
  const audibleHz = customMass * STERNHEIMER_AUDIBLE_FACTOR;
  const match = findClosest5JustInterval(audibleHz);
  const targetCV = noteToPitchCV(match.interval.symbol, match.octave, 2);

  const testNote = (code1: string) => {
    const aa = AMINO_ACIDS[code1];
    if (!aa || !engine) return;

    setActiveResidue(code1);
    const m = findClosest5JustInterval(aa.sternheimerAudibleHz);
    const note: ProteodyNote = {
      id: `test-${code1}`,
      aminoAcid: aa.code1,
      aminoName: aa.code3,
      molecularWeight: aa.molecularWeight,
      quantumFrequency: aa.deBroglieQuantumHz,
      symbol: m.interval.symbol,
      octave: m.octave,
      interval: m.interval,
      frequency: m.exact5JustFreq,
      targetVoltage: noteToPitchCV(m.interval.symbol, m.octave, 2),
      duration: 1.0,
      gate: 0.8,
      velocity: 0.9
    };

    engine.init().then(() => {
      engine.triggerNote(note, 0.6, 0.85);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-6 max-w-4xl w-full shadow-2xl font-mono text-xs max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
            <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-600/40">
              <Atom className="w-4 h-4 text-amber-400 animate-spin-slow" />
            </div>
            <div>
              <span className="block leading-tight">JOËL STERNHEIMER PROTEODIES CONVERSION</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Louis de Broglie Quantum Wave Relation (E = mc² = hν) &rarr; 2⁷⁶ Octave Reduction &rarr; 5-Just Pitch CV
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold p-1"
          >
            &times;
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto pr-1 space-y-4 my-3 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
          {/* Mathematical Physics Breakdown */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2.5 text-slate-300 text-[11px]">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>The 3-Step Quantum Mass-to-Sound Formula:</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {/* Step 1: de Broglie Relation */}
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-1">
                <span className="text-cyan-400 font-bold text-[10px] block">1. DE BROGLIE RELATION</span>
                <div className="font-bold text-white bg-slate-950 p-1 rounded text-center border border-slate-800 text-[11px]">
                  &nu; = (m &bull; c&sup2;) / h
                </div>
                <p className="text-[10px] text-slate-400">
                  With mass in kg (m = M &bull; 1.6605&times;10⁻²⁷ kg), each Dalton yields ~<strong>2.252&times;10²³ Hz</strong>.
                </p>
              </div>

              {/* Step 2: 2^76 Octave Transposition */}
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-1">
                <span className="text-amber-400 font-bold text-[10px] block">2. OCTAVE TRANSPOSITION</span>
                <div className="font-bold text-white bg-slate-950 p-1 rounded text-center border border-slate-800 text-[11px]">
                  f_audible = &nu; / 2⁷⁶
                </div>
                <p className="text-[10px] text-slate-400">
                  Dividing by 2⁷⁶ (7.556&times;10²²) scales quantum waves into the audible spectrum: <strong>M &times; 2.9811 Hz</strong>.
                </p>
              </div>

              {/* Step 3: 5-Just Scientific Tuning */}
              <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-1">
                <span className="text-emerald-400 font-bold text-[10px] block">3. 5-JUST & EURORACK CV</span>
                <div className="font-bold text-white bg-slate-950 p-1 rounded text-center border border-slate-800 text-[11px]">
                  V_CV = log₂(f / 64.0)
                </div>
                <p className="text-[10px] text-slate-400">
                  Audible frequencies are tuned to 5-Limit ratios (C4 = 256Hz) and sent to modular VCOs as 1V/Oct CV.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Mass Calculator */}
          <div className="bg-slate-950 border border-amber-500/30 rounded-lg p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>INTERACTIVE MOLECULAR MASS TESTER</span>
              </span>
              <span className="text-[10px] text-slate-400">Enter custom peptide / residue molecular mass:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
              <div className="sm:col-span-4 flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="500"
                  value={customMass}
                  onChange={e => setCustomMass(parseFloat(e.target.value) || 75.0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-400 text-xs">Da</span>
              </div>

              <div className="sm:col-span-8 bg-slate-900 border border-slate-800 rounded p-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 text-[9px] block">AUDIBLE DE BROGLIE:</span>
                  <span className="text-slate-200 font-bold">{formatHz(audibleHz)}</span>
                </div>
                <div className="border-l border-slate-800 pl-2">
                  <span className="text-slate-500 text-[9px] block">5-JUST NOTE:</span>
                  <span className="text-cyan-300 font-bold">{match.interval.symbol}{match.octave} ({match.interval.numerator}/{match.interval.denominator})</span>
                </div>
                <div className="border-l border-slate-800 pl-2">
                  <span className="text-slate-500 text-[9px] block">EURORACK CV:</span>
                  <span className="text-amber-400 font-bold">{formatVolts(targetCV, 3)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Complete 20 Amino Acid Sternheimer Matrix */}
          <div>
            <div className="flex justify-between items-center mb-1.5 px-1">
              <h4 className="font-bold text-slate-200 text-xs">
                20 AMINO ACID STERNHEIMER HARMONIC SPECTRUM
              </h4>
              <span className="text-[10px] text-slate-500">Click any row to test pitch & CV</span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px]">
                    <th className="py-2 px-2">RESIDUE</th>
                    <th className="py-2 px-2">MASS (Da)</th>
                    <th className="py-2 px-2">QUANTUM &nu; (Hz)</th>
                    <th className="py-2 px-2">2⁷⁶ AUDIBLE</th>
                    <th className="py-2 px-2">5-JUST NOTE</th>
                    <th className="py-2 px-2">EURORACK CV</th>
                    <th className="py-2 px-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {Object.values(AMINO_ACIDS).map(aa => {
                    const m = findClosest5JustInterval(aa.sternheimerAudibleHz);
                    const cv = noteToPitchCV(m.interval.symbol, m.octave, 2);
                    const isCurrent = activeResidue === aa.code1;

                    return (
                      <tr
                        key={aa.code1}
                        className={`hover:bg-slate-800/50 transition-colors ${
                          isCurrent ? 'bg-amber-950/40 border-l-2 border-amber-400' : ''
                        }`}
                      >
                        <td className="py-1.5 px-2">
                          <span className="font-bold text-emerald-400 mr-1.5">{aa.code1}</span>
                          <span className="text-slate-300 font-semibold">{aa.code3}</span>
                          <span className="text-slate-500 text-[10px] ml-1 hidden sm:inline">({aa.name})</span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-300 font-mono font-bold">
                          {aa.molecularWeight.toFixed(2)} Da
                        </td>
                        <td className="py-1.5 px-2 text-slate-400 text-[10px]">
                          {(aa.deBroglieQuantumHz / 1e25).toFixed(3)}&times;10²⁵ Hz
                        </td>
                        <td className="py-1.5 px-2 text-slate-200 font-bold">
                          {formatHz(aa.sternheimerAudibleHz)}
                        </td>
                        <td className="py-1.5 px-2">
                          <span className="font-bold text-cyan-300">{m.interval.symbol}{m.octave}</span>
                          <span className="text-amber-400/90 text-[10px] ml-1">
                            ({m.interval.numerator}/{m.interval.denominator})
                          </span>
                        </td>
                        <td className="py-1.5 px-2 font-bold text-amber-400">
                          {formatVolts(cv, 3)}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <button
                            onClick={() => testNote(aa.code1)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-[10px] font-bold border border-slate-700 transition-all inline-flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Play</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-800 flex-shrink-0">
          <span className="text-[11px] text-slate-400">
            Joël Sternheimer French Patent FR 92 06765 &bull; Quantum Proteodies Engine
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
