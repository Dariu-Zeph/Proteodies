/**
 * Eurorack Modular Studio Header & Jack Interface
 */

import React from 'react';
import { Activity, Disc3, Radio, Power, Sparkles, Volume2, Waves, Layers } from 'lucide-react';
import { SoundCardCVEngine } from '../audio/cvEngine';
import { CalibrationProfile } from '../types/synth';
import { formatVolts } from '../audio/tuning';

interface HeaderProps {
  engine: SoundCardCVEngine | null;
  profile: CalibrationProfile;
  isPlaying: boolean;
  activeView: 'full' | 'live' | 'sequencer' | 'envelope' | 'calibrator' | 'harmonics';
  setActiveView: (view: 'full' | 'live' | 'sequencer' | 'envelope' | 'calibrator' | 'harmonics') => void;
  onTogglePower: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  engine,
  profile,
  isPlaying,
  activeView,
  setActiveView,
  onTogglePower
}) => {
  const isAudioActive = !!engine;

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-200 sticky top-0 z-40 shadow-xl">
      {/* Top Branding & Master Patch Interface */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Modular Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-emerald-500 to-amber-500 p-[1.5px] shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Waves className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-extrabold text-base tracking-wider text-white">
                PROTEODY CV STUDIO
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800 font-mono text-[10px]">
                EURORACK 1V/OCT
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono hidden sm:block">
              Sound Card CV Generator &bull; 5-Limit Just Temperament &bull; C4 = 256 Hz
            </p>
          </div>
        </div>

        {/* Modular Hardware Jacks Status (Mini-Jacks Representation) */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-xs shadow-inner">
          {/* Pitch CV Out Jack */}
          <div className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm ${
              isPlaying
                ? 'border-cyan-400 bg-cyan-950/90 shadow-[0_0_8px_#06b6d4]'
                : 'border-slate-600 bg-slate-950'
            }`}>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>
            <div className="text-[10px]">
              <span className="text-slate-400 block leading-none">PITCH CV (L)</span>
              <span className="text-cyan-300 font-bold">1V/Oct</span>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-800" />

          {/* Envelope CV Out Jack */}
          <div className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-sm ${
              isPlaying
                ? 'border-amber-400 bg-amber-950/90 shadow-[0_0_8px_#f59e0b]'
                : 'border-slate-600 bg-slate-950'
            }`}>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
            <div className="text-[10px]">
              <span className="text-slate-400 block leading-none">ENV CV (R)</span>
              <span className="text-amber-300 font-bold">0-5V</span>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-800" />

          {/* Power / Audio Engine Toggle */}
          <button
            id="btn-master-power"
            onClick={onTogglePower}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs ${
              isAudioActive
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isAudioActive ? 'DAC ARMED' : 'ENABLE AUDIO'}</span>
          </button>
        </div>
      </div>

      {/* Navigation View Filter Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between border-t border-slate-900 text-xs font-mono">
        <div className="flex items-center space-x-1 py-1">
          <button
            onClick={() => setActiveView('live')}
            className={`px-3 py-1.5 rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeView === 'live'
                ? 'bg-slate-900 text-emerald-300 border-t border-x border-slate-700 font-extrabold shadow-sm'
                : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-slate-900/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Play</span>
          </button>
          <button
            onClick={() => setActiveView('full')}
            className={`px-3 py-1.5 rounded-t-lg transition-all ${
              activeView === 'full'
                ? 'bg-slate-900 text-cyan-300 border-t border-x border-slate-700 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rack View (All Modules)
          </button>
          <button
            onClick={() => setActiveView('sequencer')}
            className={`px-3 py-1.5 rounded-t-lg transition-all ${
              activeView === 'sequencer'
                ? 'bg-slate-900 text-emerald-300 border-t border-x border-slate-700 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Proteody Sequencer
          </button>
          <button
            onClick={() => setActiveView('envelope')}
            className={`px-3 py-1.5 rounded-t-lg transition-all ${
              activeView === 'envelope'
                ? 'bg-slate-900 text-amber-300 border-t border-x border-slate-700 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mouse Envelope Designer
          </button>
          <button
            onClick={() => setActiveView('calibrator')}
            className={`px-3 py-1.5 rounded-t-lg transition-all ${
              activeView === 'calibrator'
                ? 'bg-slate-900 text-cyan-300 border-t border-x border-slate-700 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            VCO Calibrator
          </button>
          <button
            onClick={() => setActiveView('harmonics')}
            className={`px-3 py-1.5 rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeView === 'harmonics'
                ? 'bg-slate-900 text-amber-300 border-t border-x border-slate-700 font-bold'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-900/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Rich Harmonics</span>
            {profile.richHarmonics?.enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* 5-Just Scientific Reference & Rich Octaves Status Badge */}
        <div className="hidden md:flex items-center gap-3 py-1 text-[11px] text-slate-400">
          <button
            onClick={() => setActiveView('harmonics')}
            className={`px-2 py-0.5 rounded border flex items-center gap-1.5 transition-all ${
              profile.richHarmonics?.enabled
                ? 'bg-amber-950/80 border-amber-600/60 text-amber-300 hover:bg-amber-900'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Configure Rich Multi-Octave Voice Layers"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Rich Octaves: {profile.richHarmonics?.enabled ? 'ON' : 'OFF'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Scientific: <strong>C4 = 256 Hz</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
};
