/**
 * Proteody CV Studio - Eurorack Sound Card CV Generator & Sequencer
 * 
 * 5-Limit Just Temperament with Scientific Tuning (C4 = 256 Hz)
 * Joël Sternheimer de Broglie Mass-to-Sound Conversion Matrix
 * Protein Melody Proteody Library & Feeder
 * Real-time Dual-Trace Oscilloscope
 * Mouse-Driven Envelope Sculptor & Kinetic Modulator
 * Eurorack VCO 1V/Octave Calibration Suite
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Oscilloscope } from './components/Oscilloscope';
import { ProteodySequencer } from './components/ProteodySequencer';
import { MouseEnvelopeDesigner } from './components/MouseEnvelopeDesigner';
import { VcoCalibrator } from './components/VcoCalibrator';
import { TuningReferenceModal } from './components/TuningReferenceModal';
import { SternheimerModal } from './components/SternheimerModal';
import { LivePerformance } from './components/LivePerformance';
import { CalibrationProfile, EnvelopeSettings, ProteodyNote } from './types/synth';
import { SoundCardCVEngine, DEFAULT_RICH_HARMONICS } from './audio/cvEngine';
import { BookOpen, Sparkles, Waves, Atom } from 'lucide-react';
import { RichHarmonicsPanel } from './components/RichHarmonicsPanel';

const DEFAULT_CALIBRATION_PROFILE: CalibrationProfile = {
  name: 'Default Eurorack Profile',
  vcoModel: 'Standard 1V/Oct Analog VCO',
  soundCardMaxVoltage: 5.0, // 5.0V full scale dBu equivalent
  slope: 1.0,
  offset: 0.0,
  baseNote: 'C2',
  baseFrequency: 64.0,
  octaveCorrections: {
    c1: 0.0,
    c2: 0.0,
    c3: 0.0,
    c4: 0.0,
    c5: 0.0,
    c6: 0.0
  },
  outputChannels: {
    pitchChannel: 'left',
    envelopeChannel: 'right',
    invertPitch: false,
    invertEnvelope: false
  },
  enableAudibleMonitor: true,
  monitorWaveform: 'sawtooth',
  monitorVolume: 0.45,
  glideTime: 0.008,
  richHarmonics: { ...DEFAULT_RICH_HARMONICS }
};

const DEFAULT_ENVELOPE: EnvelopeSettings = {
  attack: 0.02,
  decay: 0.25,
  sustain: 0.65,
  release: 0.35,
  attackCurve: 0,
  decayCurve: 0,
  releaseCurve: 0,
  maxVoltage: 5.0,
  mode: 'mouse_live'
};

export default function App() {
  const [profile, setProfile] = useState<CalibrationProfile>(DEFAULT_CALIBRATION_PROFILE);
  const [envelope, setEnvelope] = useState<EnvelopeSettings>(DEFAULT_ENVELOPE);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentNote, setCurrentNote] = useState<ProteodyNote | null>(null);
  const [activeView, setActiveView] = useState<'full' | 'live' | 'sequencer' | 'envelope' | 'calibrator' | 'harmonics'>('live');
  const [isTuningModalOpen, setIsTuningModalOpen] = useState<boolean>(false);
  const [isSternheimerModalOpen, setIsSternheimerModalOpen] = useState<boolean>(false);

  // Sound Card CV Audio Engine instance
  const engineRef = useRef<SoundCardCVEngine | null>(null);
  const [, setEngineReadyTick] = useState<number>(0);

  // Initialize engine once on mount
  useEffect(() => {
    const engine = new SoundCardCVEngine(profile, envelope);
    engineRef.current = engine;
    setEngineReadyTick(Date.now());

    return () => {
      engine.dispose();
    };
  }, []);

  const handleTogglePower = async () => {
    if (!engineRef.current) return;
    await engineRef.current.init();
    setEngineReadyTick(Date.now());
  };

  const handleProfileChange = (newProfile: CalibrationProfile) => {
    setProfile(newProfile);
    if (engineRef.current) {
      engineRef.current.updateProfile(newProfile);
    }
  };

  const handleEnvelopeChange = (newEnv: EnvelopeSettings) => {
    setEnvelope(newEnv);
    if (engineRef.current) {
      engineRef.current.updateEnvelopeSettings(newEnv);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Top Eurorack Studio Header */}
      <Header
        engine={engineRef.current}
        profile={profile}
        isPlaying={isPlaying}
        activeView={activeView}
        setActiveView={setActiveView}
        onTogglePower={handleTogglePower}
      />

      {/* Main Modular Studio Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 space-y-4">
        {/* Real-time Oscilloscope Module (Always visible at the top as primary signal visualizer) */}
        <section aria-label="Oscilloscope Signal Visualizer">
          <Oscilloscope
            engine={engineRef.current}
            currentNote={currentNote}
            isPlaying={isPlaying}
          />
        </section>

        {/* Live Performance Key-Mapping Module (Visible in 'live' and 'full' views) */}
        {(activeView === 'full' || activeView === 'live') && (
          <section aria-label="Live Proteody Keyboard & Burst Player">
            <LivePerformance
              engine={engineRef.current}
              profile={profile}
              onProfileChange={handleProfileChange}
              onNoteTrigger={setCurrentNote}
              onOpenSternheimerModal={() => setIsSternheimerModalOpen(true)}
            />
          </section>
        )}

        {/* Rich Harmonics & Octave Layering Dedicated View */}
        {activeView === 'harmonics' && (
          <section aria-label="Rich Harmonics & Multi-Octave Voice Layering">
            <RichHarmonicsPanel
              profile={profile}
              onChange={handleProfileChange}
              engine={engineRef.current}
            />
          </section>
        )}

        {/* Modular Grid Area depending on activeView */}
        {(activeView === 'full' || activeView === 'sequencer') && (
          <section aria-label="Proteody Sequencer & Library Feeder">
            <ProteodySequencer
              engine={engineRef.current}
              onNoteTrigger={setCurrentNote}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              onOpenSternheimerModal={() => setIsSternheimerModalOpen(true)}
            />
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(activeView === 'full' || activeView === 'envelope') && (
            <section aria-label="Mouse Envelope Designer & Modulator" className={activeView === 'envelope' ? 'lg:col-span-2' : ''}>
              <MouseEnvelopeDesigner
                envelope={envelope}
                onChange={handleEnvelopeChange}
                engine={engineRef.current}
              />
            </section>
          )}

          {(activeView === 'full' || activeView === 'calibrator') && (
            <section aria-label="Eurorack VCO Calibrator" className={activeView === 'calibrator' ? 'lg:col-span-2' : ''}>
              <VcoCalibrator
                profile={profile}
                onChange={handleProfileChange}
                engine={engineRef.current}
              />
            </section>
          )}
        </div>

        {/* Bottom Hardware Patching & Tuning Quickbar */}
        <footer className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Waves className="w-4 h-4" />
              <span className="font-bold">SOUND CARD PATCH:</span>
            </div>
            <span>Output L &rarr; VCO 1V/Oct CV</span>
            <span className="text-slate-600">&bull;</span>
            <span>Output R &rarr; VCF/VCA Env CV</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSternheimerModalOpen(true)}
              className="px-2.5 py-1 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 hover:text-white border border-amber-600/50 flex items-center gap-1.5 transition-all shadow"
            >
              <Atom className="w-3.5 h-3.5 text-amber-400" />
              <span>Joël Sternheimer Quantum Proteodies</span>
            </button>

            <button
              onClick={() => setIsTuningModalOpen(true)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>5-Just Tuning Chart (C4 = 256Hz)</span>
            </button>
          </div>
        </footer>
      </main>

      {/* 5-Limit Just Tuning Guide Modal */}
      <TuningReferenceModal
        isOpen={isTuningModalOpen}
        onClose={() => setIsTuningModalOpen(false)}
      />

      {/* Joël Sternheimer Mass-to-Sound Quantum Conversion Modal */}
      <SternheimerModal
        isOpen={isSternheimerModalOpen}
        onClose={() => setIsSternheimerModalOpen(false)}
        engine={engineRef.current}
      />
    </div>
  );
}
