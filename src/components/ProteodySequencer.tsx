/**
 * Proteody Protein Sequencer & Library Feeder
 * 
 * Translates amino acid sequences to 5-Limit Just Temperament melodies with C4 = 256 Hz.
 * Features built-in biological library, custom FASTA/sequence feeder, step ribbon,
 * octave shift, slew/glide control, and sample-accurate Eurorack CV dispatch.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Shuffle, Repeat, Dna, Upload, Music, Plus, RefreshCw, ChevronRight, Sliders, Sparkles, Atom } from 'lucide-react';
import { ProteodyNote, ProteodyPreset, SequencerState } from '../types/synth';
import { PROTEODY_PRESETS, translateSequenceToProteody } from '../data/proteodyLibrary';
import { SoundCardCVEngine } from '../audio/cvEngine';
import { formatHz, formatVolts } from '../audio/tuning';

interface ProteodySequencerProps {
  engine: SoundCardCVEngine | null;
  onNoteTrigger: (note: ProteodyNote | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onOpenSternheimerModal: () => void;
}

export const ProteodySequencer: React.FC<ProteodySequencerProps> = ({
  engine,
  onNoteTrigger,
  isPlaying,
  setIsPlaying,
  onOpenSternheimerModal
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('oxytocin');
  const [notes, setNotes] = useState<ProteodyNote[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [bpm, setBpm] = useState<number>(96);
  const [octaveShift, setOctaveShift] = useState<number>(0);
  const [gateLength, setGateLength] = useState<number>(0.75);
  const [glideTime, setGlideTime] = useState<number>(0.01);
  const [direction, setDirection] = useState<'forward' | 'reverse' | 'pingpong' | 'random'>('forward');
  const [algorithm, setAlgorithm] = useState<'sternheimer_mass_5just' | 'sternheimer_mass_continuous' | 'sternheimer_canonical' | 'molecular_weight' | 'hydropathy'>('sternheimer_mass_5just');

  // Custom Sequence Feeder State
  const [customInput, setCustomInput] = useState<string>('');
  const [isFeedModalOpen, setIsFeedModalOpen] = useState<boolean>(false);
  const [feedTitle, setFeedTitle] = useState<string>('Custom Peptide');

  const ribbonRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const pingPongDirection = useRef<number>(1);

  // Initialize preset on load
  useEffect(() => {
    loadPreset(selectedPresetId);
  }, [selectedPresetId, algorithm, octaveShift]);

  const loadPreset = (presetId: string) => {
    const preset = PROTEODY_PRESETS.find(p => p.id === presetId) || PROTEODY_PRESETS[0];
    setBpm(preset.defaultBpm);
    setGateLength(preset.defaultGate);
    const translated = translateSequenceToProteody(
      preset.aminoSequence,
      preset.defaultOctave + octaveShift,
      preset.defaultGate,
      algorithm
    );
    setNotes(translated);
    setCurrentStep(0);
  };

  // Handle custom FASTA or amino acid sequence feed
  const handleFeedSequence = () => {
    if (!customInput.trim()) return;
    const translated = translateSequenceToProteody(
      customInput,
      4 + octaveShift,
      gateLength,
      algorithm
    );
    if (translated.length > 0) {
      setNotes(translated);
      setCurrentStep(0);
      setIsFeedModalOpen(false);
    }
  };

  // Step sequencer clock loop
  useEffect(() => {
    if (!isPlaying || notes.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const stepIntervalMs = (60 / bpm) * 1000 * 0.5; // Eighth-note pulses

    timerRef.current = window.setInterval(() => {
      setCurrentStep(prevStep => {
        let nextStep = prevStep;
        if (direction === 'forward') {
          nextStep = (prevStep + 1) % notes.length;
        } else if (direction === 'reverse') {
          nextStep = prevStep <= 0 ? notes.length - 1 : prevStep - 1;
        } else if (direction === 'pingpong') {
          let candidate = prevStep + pingPongDirection.current;
          if (candidate >= notes.length) {
            pingPongDirection.current = -1;
            candidate = notes.length - 2;
          } else if (candidate < 0) {
            pingPongDirection.current = 1;
            candidate = 1;
          }
          nextStep = Math.max(0, Math.min(notes.length - 1, candidate));
        } else if (direction === 'random') {
          nextStep = Math.floor(Math.random() * notes.length);
        }

        const note = notes[nextStep];
        if (note && engine) {
          const durationSec = (60 / bpm) * 0.5;
          engine.triggerNote(note, durationSec, gateLength);
          onNoteTrigger(note);
        }

        // Scroll active step into view smoothly
        if (ribbonRef.current) {
          const stepElement = ribbonRef.current.children[nextStep] as HTMLElement;
          if (stepElement) {
            stepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }

        return nextStep;
      });
    }, stepIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, notes, bpm, direction, gateLength, engine, onNoteTrigger]);

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
    const note = notes[index];
    if (note && engine) {
      engine.triggerNote(note, 0.4, gateLength);
      onNoteTrigger(note);
    }
  };

  const togglePlayback = async () => {
    if (!engine) return;
    await engine.init();
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
      onNoteTrigger(null);
    } else {
      setIsPlaying(true);
      if (notes.length > 0) {
        const note = notes[currentStep];
        if (note) {
          engine.triggerNote(note, (60 / bpm) * 0.5, gateLength);
          onNoteTrigger(note);
        }
      }
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (engine) engine.stop();
    setCurrentStep(0);
    onNoteTrigger(null);
  };

  const activeNote = notes[currentStep] || null;

  return (
    <div id="proteody-sequencer-module" className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 shadow-xl backdrop-blur-md">
      {/* Module Title & Presets Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/40 text-emerald-400">
            <Dna className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>PROTEODY SEQUENCE ENGINE</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                {notes.length} Residues
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              5-Limit Just Temperament (C4 = 256Hz) mapped from peptide codons
            </p>
          </div>
        </div>

        {/* Preset Selector & Feed Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSternheimerModal}
            className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-600/50 font-mono text-xs text-amber-300 hover:text-amber-100 flex items-center gap-1.5 transition-all shadow"
            title="View Joël Sternheimer de Broglie Mass-to-Sound conversion matrix & physical formulas"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-bold">Sternheimer Matrix</span>
          </button>

          <select
            id="select-proteody-preset"
            value={selectedPresetId}
            onChange={e => setSelectedPresetId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 max-w-[180px] sm:max-w-xs"
          >
            {PROTEODY_PRESETS.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.category})
              </option>
            ))}
          </select>

          <button
            id="btn-feed-sequence"
            onClick={() => setIsFeedModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 font-mono text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition-all"
            title="Feed custom protein FASTA or amino acid string"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Feed Sequence</span>
          </button>
        </div>
      </div>

      {/* Main Transport & Master Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 my-3 p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
        {/* Play/Pause/Stop */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-play-pause"
            onClick={togglePlayback}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'START CV'}</span>
          </button>

          <button
            id="btn-stop-seq"
            onClick={stopPlayback}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all"
            title="Stop & Reset to Step 1"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* BPM & Timing */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">TEMPO:</span>
            <input
              id="slider-bpm"
              type="range"
              min="40"
              max="240"
              value={bpm}
              onChange={e => setBpm(parseInt(e.target.value))}
              className="w-20 accent-emerald-400 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer"
            />
            <span className="font-bold text-emerald-400 w-10 text-right">{bpm} BPM</span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <span className="text-slate-400 text-[10px]">GATE:</span>
            <input
              id="slider-gate"
              type="range"
              min="0.1"
              max="0.95"
              step="0.05"
              value={gateLength}
              onChange={e => setGateLength(parseFloat(e.target.value))}
              className="w-16 accent-amber-400 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer"
            />
            <span className="text-amber-300">{(gateLength * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Direction & Octave Shifts */}
        <div className="flex items-center gap-2">
          {/* Direction */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setDirection('forward')}
              className={`px-1.5 py-0.5 rounded ${direction === 'forward' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-500'}`}
              title="Forward"
            >
              &rarr;
            </button>
            <button
              onClick={() => setDirection('reverse')}
              className={`px-1.5 py-0.5 rounded ${direction === 'reverse' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-500'}`}
              title="Reverse"
            >
              &larr;
            </button>
            <button
              onClick={() => setDirection('pingpong')}
              className={`px-1.5 py-0.5 rounded ${direction === 'pingpong' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-500'}`}
              title="Ping-Pong"
            >
              &harr;
            </button>
            <button
              onClick={() => setDirection('random')}
              className={`px-1.5 py-0.5 rounded ${direction === 'random' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-500'}`}
              title="Random"
            >
              <Shuffle className="w-3 h-3" />
            </button>
          </div>

          {/* Octave Transpose */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setOctaveShift(Math.max(-2, octaveShift - 1))}
              className="px-1.5 py-0.5 text-slate-400 hover:text-slate-200"
            >
              -8ve
            </button>
            <span className="px-1 text-slate-200 font-bold">
              {octaveShift >= 0 ? `+${octaveShift}` : octaveShift}
            </span>
            <button
              onClick={() => setOctaveShift(Math.min(2, octaveShift + 1))}
              className="px-1.5 py-0.5 text-slate-400 hover:text-slate-200"
            >
              +8ve
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Step Sequencer Ribbon */}
      <div className="relative">
        <div
          ref={ribbonRef}
          className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950"
          style={{ scrollBehavior: 'smooth' }}
        >
          {notes.map((note, idx) => {
            const isCurrent = idx === currentStep;
            return (
              <button
                key={note.id}
                onClick={() => handleStepClick(idx)}
                className={`flex-shrink-0 w-16 h-28 rounded-lg p-1.5 flex flex-col justify-between items-center transition-all font-mono text-center border relative ${
                  isCurrent
                    ? 'bg-emerald-950/90 border-emerald-400 text-white shadow-[0_0_14px_rgba(52,211,153,0.5)] scale-105 z-10'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Step index & Amino Acid */}
                <div className="w-full flex justify-between items-center text-[10px] text-slate-500">
                  <span>#{idx + 1}</span>
                  <span className="font-bold text-emerald-400">{note.aminoAcid}</span>
                </div>

                {/* Residue name & Note Symbol */}
                <div className="my-auto">
                  <div className="text-[10px] text-slate-400 font-semibold">{note.aminoName}</div>
                  <div className={`text-base font-bold leading-tight ${isCurrent ? 'text-white' : 'text-cyan-300'}`}>
                    {note.symbol}{note.octave}
                  </div>
                  <div className="text-[9px] text-amber-400/90">
                    {note.interval.numerator}/{note.interval.denominator}
                  </div>
                </div>

                {/* Voltage & Frequency tags */}
                <div className="w-full text-[9px] pt-1 border-t border-slate-800/80">
                  <div className="text-cyan-400 font-bold truncate">{formatVolts(note.targetVoltage, 2)}</div>
                  <div className="text-slate-500 truncate">{formatHz(note.frequency)}</div>
                </div>

                {/* Current Active Indicator Pill */}
                {isCurrent && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Note Detail Inspection Bar */}
      {activeNote && (
        <div className="mt-3 p-2.5 bg-slate-950/70 border border-slate-800/90 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">ACTIVE RESIDUE:</span>
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {activeNote.aminoAcid} - {activeNote.aminoName}
            </span>
            <span className="text-cyan-300 font-bold text-sm">
              {activeNote.symbol}{activeNote.octave}
            </span>
            <span className="text-amber-400">
              ({activeNote.interval.name} &bull; {activeNote.interval.numerator}:{activeNote.interval.denominator})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeNote.molecularWeight && (
              <div>
                <span className="text-slate-500 text-[10px] mr-1">MASS:</span>
                <span className="text-amber-300 font-bold">{activeNote.molecularWeight.toFixed(2)} Da</span>
              </div>
            )}
            <div className="border-l border-slate-800 pl-3">
              <span className="text-slate-500 text-[10px] mr-1">EXACT HZ:</span>
              <span className="text-slate-200 font-bold">{formatHz(activeNote.frequency)}</span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-slate-500 text-[10px] mr-1">EURORACK 1V/OCT:</span>
              <span className="text-cyan-400 font-bold">{formatVolts(activeNote.targetVoltage, 3)}</span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-slate-500 text-[10px] mr-1">12-TET CENTS:</span>
              <span className="text-amber-300">{activeNote.interval.cents.toFixed(1)}¢</span>
            </div>
          </div>
        </div>
      )}

      {/* Feed Custom Sequence Modal */}
      {isFeedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Upload className="w-4 h-4" />
                <span>FEED CUSTOM PROTEIN SEQUENCE</span>
              </div>
              <button
                onClick={() => setIsFeedModalOpen(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                &times;
              </button>
            </div>

            <p className="text-slate-400 text-[11px] mb-3">
              Enter any single-letter amino acid string (e.g. FASTA format or protein peptide code).
              The engine applies Joël Sternheimer's de Broglie mass-to-sound quantum transposition (E = mc² = hν &rarr; 2⁷⁶ octave reduction) and 5-Just scientific tuning (C4=256Hz).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 text-[11px] mb-1">
                  AMINO ACID CHAIN (Single-letter codes: A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y)
                </label>
                <textarea
                  id="textarea-feed-sequence"
                  rows={4}
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  placeholder="e.g. GIVEQCCTSICSLYQLENYCNFVNQHLCGSHLVEALYLVCGERGFFYTPKT"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-500 uppercase tracking-widest"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] mb-1">TRANSLATION ALGORITHM</label>
                <select
                  value={algorithm}
                  onChange={e => setAlgorithm(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="sternheimer_mass_5just">Joël Sternheimer: Mass &rarr; de Broglie &rarr; 2⁷⁶ &rarr; 5-Just (C4=256Hz)</option>
                  <option value="sternheimer_mass_continuous">Joël Sternheimer: Continuous Quantum Mass Microtonal CV</option>
                  <option value="sternheimer_canonical">Joël Sternheimer: Canonical Codon Scale</option>
                  <option value="molecular_weight">Direct Molecular Weight Gradient (Da)</option>
                  <option value="hydropathy">Kyte-Doolittle Hydropathy Index</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setIsFeedModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-feed"
                  onClick={handleFeedSequence}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Translate & Load Sequence</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
