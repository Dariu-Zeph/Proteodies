/**
 * Rich Note Harmonics & Multi-Octave Voice Layering Component
 * 
 * Expands harmonic enrichment across the complete human hearing range (20 Hz - 20,000 Hz):
 * - Sub-Bass: -4 Octaves (~16-20 Hz), -3 Octaves (~32 Hz), -2 Octaves (~64 Hz), -1 Octave (~128 Hz)
 * - Fundamental: 0 Octave (~256 Hz) with Analog Detune Unison
 * - Natural Overtones: 3rd Harmonic (3f, Just 12th) & 5th Harmonic (5f, Just 17th)
 * - Super-Octaves: +1 Octave (~512 Hz) through +6 Octaves (~16-20 kHz auditory air ceiling)
 */

import React, { useState } from 'react';
import { Sparkles, Waves, Zap, Layers, Activity, Sliders, ArrowDown, ArrowUp } from 'lucide-react';
import { CalibrationProfile, RichHarmonicsSettings } from '../types/synth';
import { SoundCardCVEngine, DEFAULT_RICH_HARMONICS, RICH_HARMONICS_PRESETS } from '../audio/cvEngine';

interface RichHarmonicsPanelProps {
  profile: CalibrationProfile;
  onChange: (updatedProfile: CalibrationProfile) => void;
  engine: SoundCardCVEngine | null;
  compact?: boolean;
}

export const RichHarmonicsPanel: React.FC<RichHarmonicsPanelProps> = ({
  profile,
  onChange,
  engine,
  compact = false
}) => {
  const harmonics: RichHarmonicsSettings = profile.richHarmonics || DEFAULT_RICH_HARMONICS;
  const [activeTab, setActiveTab] = useState<'all' | 'sub' | 'mid' | 'super'>('all');

  const updateHarmonics = (updatedFields: Partial<RichHarmonicsSettings>) => {
    const next: RichHarmonicsSettings = {
      ...harmonics,
      ...updatedFields,
      preset: updatedFields.preset || 'custom'
    };
    const nextProfile: CalibrationProfile = {
      ...profile,
      richHarmonics: next
    };
    onChange(nextProfile);
    if (engine) {
      engine.updateRichHarmonics(next);
    }
  };

  const applyPreset = (presetKey: string) => {
    const preset = RICH_HARMONICS_PRESETS[presetKey];
    if (!preset) return;
    const next: RichHarmonicsSettings = {
      ...harmonics,
      ...preset.values,
      preset: presetKey as RichHarmonicsSettings['preset'],
      enabled: true
    };
    const nextProfile: CalibrationProfile = {
      ...profile,
      richHarmonics: next
    };
    onChange(nextProfile);
    if (engine) {
      engine.updateRichHarmonics(next);
    }
  };

  const harmonicBars = [
    {
      id: 'sub4',
      label: '-4 Oct',
      name: 'Sub-4',
      mult: '0.062x',
      freqRange: '16-20 Hz',
      gain: harmonics.subOctave4Gain || 0,
      color: 'from-violet-900 to-indigo-700',
      textColor: 'text-violet-400',
      badge: 'Sub-Rumble'
    },
    {
      id: 'sub3',
      label: '-3 Oct',
      name: 'Sub-3',
      mult: '0.125x',
      freqRange: '32 Hz',
      gain: harmonics.subOctave3Gain || 0,
      color: 'from-indigo-800 to-indigo-600',
      textColor: 'text-indigo-400',
      badge: 'Deep Sub'
    },
    {
      id: 'sub2',
      label: '-2 Oct',
      name: 'Sub-2',
      mult: '0.25x',
      freqRange: '64 Hz',
      gain: harmonics.subOctave2Gain,
      color: 'from-indigo-600 to-blue-500',
      textColor: 'text-blue-400',
      badge: 'Bass Anchor'
    },
    {
      id: 'sub1',
      label: '-1 Oct',
      name: 'Sub-1',
      mult: '0.50x',
      freqRange: '128 Hz',
      gain: harmonics.subOctave1Gain,
      color: 'from-blue-600 to-cyan-400',
      textColor: 'text-cyan-400',
      badge: 'Warm Body'
    },
    {
      id: 'base',
      label: 'Main',
      name: '0 Oct',
      mult: '1.00x',
      freqRange: '256 Hz',
      gain: harmonics.baseGain,
      color: 'from-emerald-500 to-teal-300',
      textColor: 'text-emerald-400',
      badge: 'Fundamental'
    },
    {
      id: 'super1',
      label: '+1 Oct',
      name: 'Super-1',
      mult: '2.00x',
      freqRange: '512 Hz',
      gain: harmonics.superOctave1Gain,
      color: 'from-amber-500 to-amber-300',
      textColor: 'text-amber-400',
      badge: 'Presence'
    },
    {
      id: 'fifth',
      label: '+5th',
      name: '12th (3x)',
      mult: '3.00x',
      freqRange: '768 Hz',
      gain: harmonics.fifthHarmonicGain,
      color: 'from-orange-500 to-orange-300',
      textColor: 'text-orange-400',
      badge: '3rd Harm'
    },
    {
      id: 'third',
      label: '+3rd',
      name: '17th (5x)',
      mult: '5.00x',
      freqRange: '1.28 kHz',
      gain: harmonics.thirdHarmonicGain || 0,
      color: 'from-yellow-500 to-yellow-300',
      textColor: 'text-yellow-400',
      badge: '5th Harm'
    },
    {
      id: 'super2',
      label: '+2 Oct',
      name: 'Super-2',
      mult: '4.00x',
      freqRange: '1.02 kHz',
      gain: harmonics.superOctave2Gain,
      color: 'from-pink-500 to-rose-400',
      textColor: 'text-pink-400',
      badge: 'Brightness'
    },
    {
      id: 'super3',
      label: '+3 Oct',
      name: 'Super-3',
      mult: '8.00x',
      freqRange: '2.05 kHz',
      gain: harmonics.superOctave3Gain || 0,
      color: 'from-rose-500 to-fuchsia-400',
      textColor: 'text-rose-400',
      badge: 'Crystal'
    },
    {
      id: 'super4',
      label: '+4 Oct',
      name: 'Super-4',
      mult: '16.0x',
      freqRange: '4.1 kHz',
      gain: harmonics.superOctave4Gain || 0,
      color: 'from-fuchsia-500 to-purple-400',
      textColor: 'text-fuchsia-400',
      badge: 'Sparkle'
    },
    {
      id: 'super5',
      label: '+5 Oct',
      name: 'Super-5',
      mult: '32.0x',
      freqRange: '8.2 kHz',
      gain: harmonics.superOctave5Gain || 0,
      color: 'from-purple-500 to-sky-400',
      textColor: 'text-purple-400',
      badge: 'Air Sheen'
    },
    {
      id: 'super6',
      label: '+6 Oct',
      name: 'Super-6',
      mult: '64.0x',
      freqRange: '16.4 kHz',
      gain: harmonics.superOctave6Gain || 0,
      color: 'from-sky-400 to-white',
      textColor: 'text-sky-300',
      badge: 'Ceiling'
    }
  ];

  return (
    <div id="rich-harmonics-panel" className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-4 shadow-xl backdrop-blur-md font-mono text-xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg border transition-colors ${
            harmonics.enabled
              ? 'bg-amber-950/80 border-amber-500/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-slate-800/80 border-slate-700 text-slate-500'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <span>FULL AUDIBLE SPECTRUM RICH OCTAVES (20 Hz - 20,000 Hz)</span>
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                harmonics.enabled
                  ? 'bg-amber-950/90 text-amber-300 border-amber-600/60'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {harmonics.enabled ? '10-Octave Active Stack' : 'Bypassed (Fundamental Only)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Spans the complete human auditory range: tactile sub-rumble (-4 to -1 octaves) through crystal air shimmer (+1 to +6 octaves)
            </p>
          </div>
        </div>

        {/* Master Enable Toggle */}
        <div className="flex items-center gap-3">
          <button
            id="rich-octaves-master-toggle"
            onClick={() => updateHarmonics({ enabled: !harmonics.enabled })}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all border shadow-sm ${
              harmonics.enabled
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.4)] hover:bg-amber-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{harmonics.enabled ? 'RICH OCTAVES ACTIVE' : 'ENABLE RICH OCTAVES'}</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Selectors */}
      <div className="mt-3.5 pt-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            Audible Spectrum Voicing Presets:
          </span>
          <span className="text-[10px] text-slate-500">
            Active: <span className="text-amber-400 font-bold">{harmonics.preset.toUpperCase()}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
          {Object.entries(RICH_HARMONICS_PRESETS).map(([key, item]) => {
            const isSelected = harmonics.enabled && harmonics.preset === key;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`px-2 py-1.5 rounded border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-950/70 border-amber-500/80 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-[10px] truncate">{item.label}</div>
                <div className="text-[8px] text-slate-500 truncate">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full Spectrum Bar Graph Display (13 Voices) */}
      <div className="mt-4 bg-slate-950 border border-slate-800 rounded-lg p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-amber-400" />
              13-VOICE FULL SPECTRUM DISTRIBUTION (20 Hz — 20 kHz)
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
              f0 = 256 Hz
            </span>
          </div>

          {/* Section Filter Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                activeTab === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              All (13)
            </button>
            <button
              onClick={() => setActiveTab('sub')}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                activeTab === 'sub'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Sub Bass (-4 to -1)
            </button>
            <button
              onClick={() => setActiveTab('mid')}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                activeTab === 'mid'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Core & Overtones
            </button>
            <button
              onClick={() => setActiveTab('super')}
              className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                activeTab === 'super'
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Super Air (+1 to +6)
            </button>
          </div>
        </div>

        {/* High-Density Harmonic Visualizer Bars */}
        <div className="h-32 flex items-end justify-between gap-1.5 px-3 pb-2 pt-4 bg-slate-900/70 rounded border border-slate-800/80 relative overflow-hidden">
          {/* Reference dB Lines */}
          <div className="absolute left-0 right-0 top-4 border-t border-dashed border-slate-700/40 pointer-events-none" />
          <span className="absolute right-2 top-1 text-[8px] text-slate-500 font-mono">100% (0 dB)</span>
          <div className="absolute left-0 right-0 top-16 border-t border-dashed border-slate-800/60 pointer-events-none" />
          <span className="absolute right-2 top-13 text-[8px] text-slate-600 font-mono">50% (-6 dB)</span>

          {harmonicBars.map(bar => {
            const activeGain = harmonics.enabled ? bar.gain : (bar.id === 'base' ? 1.0 : 0.0);
            const heightPercent = Math.max(6, Math.min(100, activeGain * 100));

            return (
              <div key={bar.id} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <span className="text-[8px] text-slate-400 mb-1 group-hover:text-white transition-colors">
                  {Math.round(activeGain * 100)}%
                </span>
                <div className="w-full max-w-[24px] bg-slate-800/80 rounded-t overflow-hidden relative" style={{ height: `${heightPercent}%` }}>
                  <div className={`w-full h-full bg-gradient-to-t ${bar.color} ${activeGain > 0 && harmonics.enabled ? 'opacity-90' : 'opacity-20'}`} />
                </div>
                <span className={`text-[9px] mt-1 font-bold ${bar.textColor}`}>
                  {bar.label}
                </span>
                <span className="text-[7px] text-slate-500 font-mono">
                  {bar.freqRange}
                </span>
              </div>
            );
          })}
        </div>

        {/* Global Detune and Sub-Audible Floor Legend */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[10px]">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Analog Chorus Detune:</span>
              <strong className="text-amber-300 font-mono">{harmonics.analogDetuneCents.toFixed(1)} cents</strong>
            </span>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={harmonics.analogDetuneCents}
              onChange={e => updateHarmonics({ analogDetuneCents: parseFloat(e.target.value) })}
              className="w-32 accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 text-[9px] text-slate-500">
            <span className="flex items-center gap-1 text-violet-400">
              <ArrowDown className="w-2.5 h-2.5" /> 16-20 Hz Sub Floor
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-sky-300">
              <ArrowUp className="w-2.5 h-2.5" /> 16-20 kHz Air Ceiling
            </span>
          </div>
        </div>
      </div>

      {/* Comprehensive Faders Grid */}
      <div className="mt-4 space-y-4">
        {/* GROUP 1: SUB-BASS FOUNDATION (-4, -3, -2, -1 Octaves) */}
        {(activeTab === 'all' || activeTab === 'sub') && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-slate-800/70">
              <span className="font-bold text-indigo-400 uppercase flex items-center gap-1.5 text-[11px]">
                <ArrowDown className="w-3.5 h-3.5" />
                SUB-BASS FOUNDATION (16 Hz — 130 Hz)
              </span>
              <span className="text-[9px] text-slate-500">
                Reinforces visceral low-end without muddying the fundamental
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* -4 Octave (Tactile Rumble) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-violet-400 flex items-center gap-1">
                    <span>-4 OCTAVES</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-violet-950 text-violet-300 border border-violet-800">
                      f / 16 (~16 Hz)
                    </span>
                  </span>
                  <span className="text-violet-300 font-bold">
                    {Math.round((harmonics.subOctave4Gain || 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.subOctave4Gain || 0}
                  onChange={e => updateHarmonics({ subOctave4Gain: parseFloat(e.target.value) })}
                  className="w-full accent-violet-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Tactile rumble floor</span>
                  <span>0% - 20%</span>
                </div>
              </div>

              {/* -3 Octave (Deep Sub) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-indigo-400 flex items-center gap-1">
                    <span>-3 OCTAVES</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      f / 8 (~32 Hz)
                    </span>
                  </span>
                  <span className="text-indigo-300 font-bold">
                    {Math.round((harmonics.subOctave3Gain || 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.subOctave3Gain || 0}
                  onChange={e => updateHarmonics({ subOctave3Gain: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Deep sub harmonic</span>
                  <span>5% - 25%</span>
                </div>
              </div>

              {/* -2 Octave (Bass Foundation) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-400 flex items-center gap-1">
                    <span>-2 OCTAVES</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      f / 4 (~64 Hz)
                    </span>
                  </span>
                  <span className="text-blue-300 font-bold">
                    {Math.round(harmonics.subOctave2Gain * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.subOctave2Gain}
                  onChange={e => updateHarmonics({ subOctave2Gain: parseFloat(e.target.value) })}
                  className="w-full accent-blue-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Bass anchor punch</span>
                  <span>10% - 30%</span>
                </div>
              </div>

              {/* -1 Octave (Warm Body) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                    <span>-1 OCTAVE</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      f / 2 (~128 Hz)
                    </span>
                  </span>
                  <span className="text-cyan-300 font-bold">
                    {Math.round(harmonics.subOctave1Gain * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.subOctave1Gain}
                  onChange={e => updateHarmonics({ subOctave1Gain: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="flex items-center justify-between text-[8px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Wave:</span>
                    <select
                      value={harmonics.subOctave1Waveform}
                      onChange={e => updateHarmonics({ subOctave1Waveform: e.target.value as any })}
                      className="bg-slate-950 border border-slate-700 rounded px-1 text-cyan-300 text-[8px]"
                    >
                      <option value="triangle">Tri</option>
                      <option value="sine">Sine</option>
                      <option value="sawtooth">Saw</option>
                    </select>
                  </div>
                  <span>20% - 40%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GROUP 2: CORE NOTE & NATURAL HARMONIC OVERTONES */}
        {(activeTab === 'all' || activeTab === 'mid') && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-slate-800/70">
              <span className="font-bold text-emerald-400 uppercase flex items-center gap-1.5 text-[11px]">
                <Activity className="w-3.5 h-3.5" />
                CORE FUNDAMENTAL & NATURAL OVERTONES (3rd & 5th)
              </span>
              <span className="text-[9px] text-slate-500">
                Primary pitch focus plus Just-tuned natural integer resonance overtones
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Fundamental (Main Note) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span>FUNDAMENTAL NOTE</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      1.00x (~256 Hz)
                    </span>
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {Math.round(harmonics.baseGain * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.baseGain}
                  onChange={e => updateHarmonics({ baseGain: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Core musical pitch</span>
                  <span>70% - 100%</span>
                </div>
              </div>

              {/* 3rd Harmonic (+1 Oct + 5th) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-orange-400 flex items-center gap-1">
                    <span>3RD HARMONIC (JUST 12TH)</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-orange-950 text-orange-300 border border-orange-800">
                      f * 3.0 (~768 Hz)
                    </span>
                  </span>
                  <span className="text-orange-300 font-bold">
                    {Math.round(harmonics.fifthHarmonicGain * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.fifthHarmonicGain}
                  onChange={e => updateHarmonics({ fifthHarmonicGain: parseFloat(e.target.value) })}
                  className="w-full accent-orange-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Natural 5th overtone</span>
                  <span>5% - 18%</span>
                </div>
              </div>

              {/* 5th Harmonic (+2 Oct + 3rd) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-yellow-400 flex items-center gap-1">
                    <span>5TH HARMONIC (JUST 17TH)</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-yellow-950 text-yellow-300 border border-yellow-800">
                      f * 5.0 (~1.28 kHz)
                    </span>
                  </span>
                  <span className="text-yellow-300 font-bold">
                    {Math.round((harmonics.thirdHarmonicGain || 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.thirdHarmonicGain || 0}
                  onChange={e => updateHarmonics({ thirdHarmonicGain: parseFloat(e.target.value) })}
                  className="w-full accent-yellow-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Natural major 3rd overtone</span>
                  <span>5% - 15%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GROUP 3: SUPER-OCTAVES & AIR CEILING (+1 to +6 Octaves) */}
        {(activeTab === 'all' || activeTab === 'super') && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-slate-800/70">
              <span className="font-bold text-pink-400 uppercase flex items-center gap-1.5 text-[11px]">
                <ArrowUp className="w-3.5 h-3.5" />
                SUPER-OCTAVES & AIR CEILING (512 Hz — 20,000 Hz)
              </span>
              <span className="text-[9px] text-slate-500">
                Spanning presence through crystalline shimmer and ultimate audible air
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* +1 Octave (Presence) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <span>+1 OCTAVE (PRESENCE)</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      f * 2 (~512 Hz)
                    </span>
                  </span>
                  <span className="text-amber-300 font-bold">
                    {Math.round(harmonics.superOctave1Gain * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.superOctave1Gain}
                  onChange={e => updateHarmonics({ superOctave1Gain: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="flex items-center justify-between text-[8px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Wave:</span>
                    <select
                      value={harmonics.superOctave1Waveform}
                      onChange={e => updateHarmonics({ superOctave1Waveform: e.target.value as any })}
                      className="bg-slate-950 border border-slate-700 rounded px-1 text-amber-300 text-[8px]"
                    >
                      <option value="sine">Sine</option>
                      <option value="triangle">Tri</option>
                      <option value="sawtooth">Saw</option>
                    </select>
                  </div>
                  <span>15% - 35%</span>
                </div>
              </div>

              {/* +2 Octave (Brightness) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-pink-400 flex items-center gap-1">
                    <span>+2 OCTAVES (BRIGHTNESS)</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-800">
                      f * 4 (~1.02 kHz)
                    </span>
                  </span>
                  <span className="text-pink-300 font-bold">
                    {Math.round(harmonics.superOctave2Gain * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.superOctave2Gain}
                  onChange={e => updateHarmonics({ superOctave2Gain: parseFloat(e.target.value) })}
                  className="w-full accent-pink-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Chime and clarity</span>
                  <span>10% - 25%</span>
                </div>
              </div>

              {/* +3 Octave (Crystal Brilliance) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <span>+3 OCTAVES (CRYSTAL)</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                      f * 8 (~2.05 kHz)
                    </span>
                  </span>
                  <span className="text-rose-300 font-bold">
                    {Math.round((harmonics.superOctave3Gain || 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.superOctave3Gain || 0}
                  onChange={e => updateHarmonics({ superOctave3Gain: parseFloat(e.target.value) })}
                  className="w-full accent-rose-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Upper vocal articulation</span>
                  <span>5% - 20%</span>
                </div>
              </div>

              {/* +4 Octave (Sparkle Top) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-fuchsia-400 flex items-center gap-1">
                    <span>+4 OCTAVES (SPARKLE)</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800">
                      f * 16 (~4.1 kHz)
                    </span>
                  </span>
                  <span className="text-fuchsia-300 font-bold">
                    {Math.round((harmonics.superOctave4Gain || 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.superOctave4Gain || 0}
                  onChange={e => updateHarmonics({ superOctave4Gain: parseFloat(e.target.value) })}
                  className="w-full accent-fuchsia-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Percussive edge shimmer</span>
                  <span>4% - 15%</span>
                </div>
              </div>

              {/* +5 Octave (Air Band Sheen) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-purple-400 flex items-center gap-1">
                    <span>+5 OCTAVES (AIR SHEEN)</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      f * 32 (~8.2 kHz)
                    </span>
                  </span>
                  <span className="text-purple-300 font-bold">
                    {Math.round((harmonics.superOctave5Gain || 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.superOctave5Gain || 0}
                  onChange={e => updateHarmonics({ superOctave5Gain: parseFloat(e.target.value) })}
                  className="w-full accent-purple-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Silky acoustic air band</span>
                  <span>2% - 12%</span>
                </div>
              </div>

              {/* +6 Octave (Hearing Ceiling) */}
              <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sky-300 flex items-center gap-1">
                    <span>+6 OCTAVES (CEILING)</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-sky-950 text-sky-200 border border-sky-800">
                      f * 64 (~16-20 kHz)
                    </span>
                  </span>
                  <span className="text-sky-200 font-bold">
                    {Math.round((harmonics.superOctave6Gain || 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={harmonics.superOctave6Gain || 0}
                  onChange={e => updateHarmonics({ superOctave6Gain: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>Human auditory ceiling</span>
                  <span>1% - 10%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
