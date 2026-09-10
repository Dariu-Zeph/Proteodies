/**
 * 5-Limit Just Intonation & Scientific Tuning Reference Guide
 */

import React from 'react';
import { BookOpen, X, Info, Zap } from 'lucide-react';
import { JUST_INTERVALS, ORDERED_INTERVAL_KEYS, calculateJustFrequency, noteToPitchCV, formatHz, formatVolts } from '../audio/tuning';

interface TuningReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TuningReferenceModal: React.FC<TuningReferenceModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-3xl w-full shadow-2xl font-mono text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <BookOpen className="w-4 h-4" />
            <span>5-LIMIT JUST INTONATION & SCIENTIFIC TUNING REFERENCE</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold"
          >
            &times;
          </button>
        </div>

        {/* Intro */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 text-[11px] mb-4 space-y-2">
          <p>
            <strong>Scientific Pitch (Verdi Tuning)</strong> fixes <strong>C4 at exactly 256.000 Hz</strong> (a pure power of two: 2^8 = 256, C0 = 16 Hz, C2 = 64 Hz, C3 = 128 Hz, C5 = 512 Hz).
          </p>
          <p>
            <strong>5-Limit Just Temperament</strong> constructs all musical intervals using pure harmonic ratios with prime factors 2, 3, and 5 (such as pure major thirds 5:4, perfect fifths 3:2, and pure minor thirds 6:5). These intervals resonate cleanly with no acoustic beating.
          </p>
          <p>
            In Eurorack modular synthesizers, <strong>1V/Octave CV</strong> is defined as V = log2(f / 64.0 Hz) (where C2 = 0.000 V, C3 = 1.000 V, C4 = 2.000 V, C5 = 3.000 V).
          </p>
        </div>

        {/* 12-Tone 5-Just Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px]">
                <th className="py-2 px-2">NOTE</th>
                <th className="py-2 px-2">INTERVAL NAME</th>
                <th className="py-2 px-2">5-JUST RATIO</th>
                <th className="py-2 px-2">EXACT FREQ (OCT 4)</th>
                <th className="py-2 px-2">EURORACK CV (OCT 4)</th>
                <th className="py-2 px-2">12-TET CENTS</th>
                <th className="py-2 px-2">DEVIATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              {ORDERED_INTERVAL_KEYS.map(key => {
                const interval = JUST_INTERVALS[key];
                const freq = calculateJustFrequency(key, 4);
                const cv = noteToPitchCV(key, 4, 2);
                const tetCents = interval.semitones12TET * 100;
                const deviation = interval.cents - tetCents;
                const devStr = deviation >= 0 ? `+${deviation.toFixed(1)}¢` : `${deviation.toFixed(1)}¢`;

                return (
                  <tr key={key} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2 px-2 font-bold text-cyan-300">{interval.symbol}4</td>
                    <td className="py-2 px-2 text-slate-300">{interval.name}</td>
                    <td className="py-2 px-2 font-bold text-amber-400">
                      {interval.numerator} : {interval.denominator} ({interval.ratio.toFixed(4)})
                    </td>
                    <td className="py-2 px-2 text-slate-200">{formatHz(freq)}</td>
                    <td className="py-2 px-2 font-bold text-cyan-400">{formatVolts(cv, 4)}</td>
                    <td className="py-2 px-2 text-slate-400">{interval.cents.toFixed(1)}¢</td>
                    <td className={`py-2 px-2 font-bold ${deviation > 0 ? 'text-emerald-400' : deviation < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {devStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
