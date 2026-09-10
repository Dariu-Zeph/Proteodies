/**
 * Meta-Proteody Biological Modal Dialog & Inspector
 * Explains the scientific reasoning and protein cascade of complex substances (Coffee, etc.)
 */

import React, { useState } from 'react';
import { X, Coffee, Sparkles, BookOpen, Layers, Zap, Clock, Activity, Dna, Sliders, CheckCircle2 } from 'lucide-react';
import { MetaProteodyConfig } from '../types/synth';
import { formatHz, formatVolts } from '../audio/tuning';

interface MetaProteodyModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MetaProteodyConfig;
  onUpdateConfig?: (newConfig: MetaProteodyConfig) => void;
}

export const MetaProteodyModal: React.FC<MetaProteodyModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig
}) => {
  const [localConfig, setLocalConfig] = useState<MetaProteodyConfig>(config);

  if (!isOpen) return null;

  const handleModeChange = (mode: 'pk_cascade' | 'simultaneous_chord') => {
    const updated = { ...localConfig, pkMode: mode };
    setLocalConfig(updated);
    if (onUpdateConfig) onUpdateConfig(updated);
  };

  const handleTimeScaleChange = (val: number) => {
    const updated = { ...localConfig, pkTimeScale: val };
    setLocalConfig(updated);
    if (onUpdateConfig) onUpdateConfig(updated);
  };

  const handleTailMultiplierChange = (val: number) => {
    const updated = { ...localConfig, pkClearanceTailMultiplier: val };
    setLocalConfig(updated);
    if (onUpdateConfig) onUpdateConfig(updated);
  };

  const handleToggleSecondaryStructure = () => {
    const updated = {
      ...localConfig,
      enableSecondaryStructureArticulation: !localConfig.enableSecondaryStructureArticulation
    };
    setLocalConfig(updated);
    if (onUpdateConfig) onUpdateConfig(updated);
  };

  const isCascade = (localConfig.pkMode ?? 'pk_cascade') === 'pk_cascade';
  const timeScale = localConfig.pkTimeScale ?? 1.0;
  const tailMult = localConfig.pkClearanceTailMultiplier ?? 2.2;
  const enableSec = localConfig.enableSecondaryStructureArticulation ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col scrollbar-thin scrollbar-thumb-slate-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/95 sticky top-0 z-20 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                  META-PROTEODY PHARMACOKINETICS & COUNTERPOINT
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {localConfig.substance}
                </span>
              </div>
              <h2 className="text-lg font-black text-white tracking-wide mt-0.5">
                {localConfig.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-sm">
          {/* Concept Banner */}
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>What is a Meta-Proteody?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              In nature, biological substances (like coffee, cacao, or green tea) are not single molecules. 
              Instead, they spark a <strong>multi-target biochemical symphony</strong> across receptors, metabolic enzymes, 
              and ion channels in the human body. A <strong>Meta-Proteody</strong> bundles the exact proteins responsible 
              for this substance into a unified chord counterpoint. When you press the mapped key, the notes 
              trigger with <strong>authentic pharmacokinetic (PK/PD) temporal offsets</strong>, reproducing the biological cascade 
              of absorption, distribution, receptor binding, and hepatic clearance.
            </p>
          </div>

          {/* Biological Pharmacokinetics (PK/PD) Interactive Control Panel */}
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-800/50 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Sliders className="w-4 h-4" />
                <span>PHARMACOKINETIC (PK/PD) KINETIC ENGINE SETTINGS</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Mode: <strong className={isCascade ? 'text-amber-400' : 'text-slate-300'}>
                  {isCascade ? 'Biological PK/PD Cascade' : 'Simultaneous Block Chord'}
                </strong>
              </span>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('pk_cascade')}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  isCascade
                    ? 'bg-amber-950/40 border-amber-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${isCascade ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>True PK/PD Cascade</span>
                    {isCascade && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Staggered biological onset delays (0ms &rarr; 45ms &rarr; 90ms &rarr; 140ms) with prolonged clearance tail.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('simultaneous_chord')}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  !isCascade
                    ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Layers className={`w-4 h-4 mt-0.5 shrink-0 ${!isCascade ? 'text-cyan-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>Simultaneous Block Chord</span>
                    {!isCascade && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    All 4 protein voices strike together synchronously at t = 0ms for full-weight polyphony.
                  </p>
                </div>
              </button>
            </div>

            {/* Cascade Sliders & Secondary Structure Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Kinetic Time Scale Slider */}
              <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Kinetic Spread (&tau;<sub>onset</sub>):</span>
                  <span className="font-mono font-bold text-amber-400">{timeScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={timeScale}
                  disabled={!isCascade}
                  onChange={e => handleTimeScaleChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Fast (0.5x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Stretched (2.5x)</span>
                </div>
              </div>

              {/* Metabolic Clearance Tail Slider */}
              <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Clearance Tail (t<sub>1/2</sub>):</span>
                  <span className="font-mono font-bold text-emerald-400">{tailMult.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="3.5"
                  step="0.1"
                  value={tailMult}
                  onChange={e => handleTailMultiplierChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Snappy (1.0x)</span>
                  <span>Standard (2.2x)</span>
                  <span>Lingering (3.5x)</span>
                </div>
              </div>

              {/* Secondary Structure Folding Modulation Toggle */}
              <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Folding Articulation:</span>
                  <span className={`font-mono font-bold ${enableSec ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {enableSec ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSecondaryStructure}
                  className={`w-full py-1.5 px-2.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    enableSec
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <Dna className="w-3.5 h-3.5" />
                  <span>{enableSec ? '&alpha;-Helix / &beta;-Sheet Gates' : 'Flat Gate Length'}</span>
                </button>
                <div className="text-[10px] text-slate-500 leading-tight">
                  &alpha;-helix staccato (0.70x), &beta;-sheet (0.95x), loop legato (1.30x)
                </div>
              </div>
            </div>

            {/* Pharmacokinetic Timeline Diagram */}
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  Pharmacokinetic Plasma Activation Timeline (Coffee):
                </span>
                <span className="font-mono text-slate-500">Eurorack Envelope CV (Ch R)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                {/* Stage 1 */}
                <div className="p-2 rounded bg-amber-950/40 border border-amber-800/80">
                  <div className="flex items-center justify-between text-amber-400 font-bold">
                    <span>1. Receptor Binding</span>
                    <span className="font-mono text-[10px]">0 ms</span>
                  </div>
                  <div className="text-slate-300 font-semibold mt-0.5">ADORA2A</div>
                  <div className="text-[10px] text-slate-400">Initial competitive binding spike</div>
                </div>

                {/* Stage 2 */}
                <div className="p-2 rounded bg-rose-950/40 border border-rose-800/80">
                  <div className="flex items-center justify-between text-rose-400 font-bold">
                    <span>2. Ca2+ Ion Flux</span>
                    <span className="font-mono text-[10px]">+{Math.round(45 * timeScale)} ms</span>
                  </div>
                  <div className="text-slate-300 font-semibold mt-0.5">RYR1 (Bass Sub)</div>
                  <div className="text-[10px] text-slate-400">Muscular vigor & heart rate entry</div>
                </div>

                {/* Stage 3 */}
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-800/80">
                  <div className="flex items-center justify-between text-cyan-400 font-bold">
                    <span>3. Dopamine Drive</span>
                    <span className="font-mono text-[10px]">+{Math.round(90 * timeScale)} ms</span>
                  </div>
                  <div className="text-slate-300 font-semibold mt-0.5">DRD2 (High Shimmer)</div>
                  <div className="text-[10px] text-slate-400">Striatal disinhibition & filter open</div>
                </div>

                {/* Stage 4 */}
                <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/80">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>4. Liver Clearance</span>
                    <span className="font-mono text-[10px]">+{Math.round(140 * timeScale)} ms</span>
                  </div>
                  <div className="text-slate-300 font-semibold mt-0.5">CYP1A2 (Pedal Mid)</div>
                  <div className="text-[10px] text-slate-400">Slow {tailMult}x half-life decay tail</div>
                </div>
              </div>
            </div>
          </div>

          {/* Biological Reasoning & Mechanism Section */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-amber-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>WHY THESE 4 PROTEINS CONSTITUTE COFFEE</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              {localConfig.biologicalMechanism}
            </p>
          </div>

          {/* Detailed Protein Breakdown Cards */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>THE 4 PROTEIN VOICES IN THE COFFEE CHORD</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {localConfig.layers.map((layer, idx) => {
                const firstNote = layer.notes[0];
                return (
                  <div 
                    key={layer.proteinId}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-extrabold uppercase"
                          style={{
                            backgroundColor: idx === 0 ? '#451a03' : idx === 1 ? '#4c0519' : idx === 2 ? '#083344' : '#022c22',
                            color: idx === 0 ? '#fcd34d' : idx === 1 ? '#fda4af' : idx === 2 ? '#67e8f9' : '#6ee7b7'
                          }}
                        >
                          Voice {idx + 1} &bull; Octave {layer.octave}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                            +{Math.round((layer.pkOnsetDelayMs || 0) * timeScale)}ms
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {layer.aminoSequence.length} residues
                          </span>
                        </div>
                      </div>

                      <h5 className="font-bold text-white text-sm">
                        {layer.proteinName}
                      </h5>

                      <div className="text-[10px] text-amber-400/90 font-medium mt-0.5">
                        {layer.pkStageName}
                      </div>

                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {layer.biologicalRole}
                      </p>
                    </div>

                    {/* First Note Preview (Step 1 of chord) */}
                    {firstNote && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <span>1st: </span>
                          <strong className="text-white">{firstNote.aminoAcid} ({firstNote.symbol}{firstNote.octave})</strong>
                          {firstNote.structureLabel && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-sans">
                              {firstNote.structureLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-cyan-400">
                          {formatHz(firstNote.frequency)}
                        </div>
                        <div className="text-amber-400">
                          {formatVolts(firstNote.targetVoltage, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Instructions */}
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-900/40 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-cyan-400">
              <Zap className="w-4 h-4" />
              <span>HOW TO PLAY IN THE LIVE SECTION</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>
                <strong>Single Key Trigger:</strong> Press the mapped key (default <strong>K</strong> for Coffee) or click the pad in the live view.
              </li>
              <li>
                <strong>Biological Cascades:</strong> Each press sounds the 4 proteins with microsecond-accurate pharmacokinetic delays simulating drug receptor kinetics.
              </li>
              <li>
                <strong>Secondary Structure Articulation:</strong> &alpha;-Helical amino acids trigger staccato punchy gates, while dynamic active loops provide fluid legato sustain.
              </li>
              <li>
                <strong>Polymetric Looping:</strong> Each protein sequence has its own natural length, creating an evolving living organic cycle!
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            Current Mode: <strong className="text-white">{isCascade ? 'PK/PD Cascade Active' : 'Simultaneous Chord'}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all"
          >
            Apply &bull; Play Coffee Meta-Proteody
          </button>
        </div>
      </div>
    </div>
  );
};
