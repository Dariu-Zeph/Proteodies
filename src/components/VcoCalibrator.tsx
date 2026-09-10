/**
 * Eurorack VCO & Sound Card Calibration Suite
 * 
 * Provides precision tools for calibrating 1V/Octave tracking slopes, 0V offsets,
 * multi-point octave linearization tables, DC test voltage generation, and channel routing.
 */

import React, { useState } from 'react';
import { Gauge, Sliders, CheckCircle2, AlertTriangle, Volume2, Headphones, RotateCcw, Zap, HelpCircle, Sparkles } from 'lucide-react';
import { CalibrationProfile } from '../types/synth';
import { SoundCardCVEngine } from '../audio/cvEngine';
import { formatHz, formatVolts, SCIENTIFIC_C4, SCIENTIFIC_C2 } from '../audio/tuning';

interface VcoCalibratorProps {
  profile: CalibrationProfile;
  onChange: (profile: CalibrationProfile) => void;
  engine: SoundCardCVEngine | null;
}

export const VcoCalibrator: React.FC<VcoCalibratorProps> = ({
  profile,
  onChange,
  engine
}) => {
  const [activeTestVolt, setActiveTestVolt] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const updateProfileField = <K extends keyof CalibrationProfile>(field: K, value: CalibrationProfile[K]) => {
    const updated = { ...profile, [field]: value };
    onChange(updated);
    if (engine) engine.updateProfile(updated);
  };

  const updateOctaveCorrection = (octaveKey: keyof CalibrationProfile['octaveCorrections'], val: number) => {
    const updatedCorrections = {
      ...profile.octaveCorrections,
      [octaveKey]: val
    };
    const updated = { ...profile, octaveCorrections: updatedCorrections };
    onChange(updated);
    if (engine) engine.updateProfile(updated);
  };

  const triggerTestVoltage = (volts: number) => {
    setActiveTestVolt(volts);
    if (engine) {
      engine.init().then(() => {
        engine.outputDirectCalibrationVoltage(volts);
      });
    }
  };

  const resetCalibration = () => {
    const defaultProfile: CalibrationProfile = {
      ...profile,
      slope: 1.0,
      offset: 0.0,
      soundCardMaxVoltage: 5.0,
      octaveCorrections: {
        c1: 0.0,
        c2: 0.0,
        c3: 0.0,
        c4: 0.0,
        c5: 0.0,
        c6: 0.0
      }
    };
    onChange(defaultProfile);
    if (engine) engine.updateProfile(defaultProfile);
  };

  return (
    <div id="vco-calibrator-module" className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 shadow-xl backdrop-blur-md font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-600/40 text-cyan-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>EURORACK VCO & SOUND CARD CALIBRATION</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-normal border border-cyan-800">
                1V/Oct Trimmer
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Calibrate soundcard DAC full scale, V/Oct slope scaling, and multi-point octave offsets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all flex items-center gap-1"
            title="How to calibrate your Eurorack VCO"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="text-[10px]">Calibration Guide</span>
          </button>

          <button
            onClick={resetCalibration}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all flex items-center gap-1"
            title="Reset calibration trims to default 1.000 slope and 0.000 offset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[10px]">Reset</span>
          </button>
        </div>
      </div>

      {/* Guide Accordion */}
      {showHelp && (
        <div className="my-3 p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-lg text-cyan-200 text-[11px] space-y-2">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Quick Eurorack Calibration Steps:
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-300">
            <li>Connect your sound card <strong>Left Output (Pitch CV)</strong> to the 1V/Oct input of your Eurorack VCO.</li>
            <li>Connect <strong>Right Output (Env CV)</strong> to your VCF or VCA envelope input.</li>
            <li>Click <strong>[0.000 V (C2)]</strong> below and adjust your VCO tune knob until it sounds at 64.0 Hz (or C2 on your tuner).</li>
            <li>Click <strong>[+2.000 V (C4)]</strong> and verify it reaches 256.0 Hz. If it is flat or sharp, adjust the <strong>Slope Trimmer</strong> slider until exact.</li>
            <li>Use the 5-point octave table for micro-trimming individual octaves if your soundcard DAC or VCO has non-linear tracking.</li>
          </ol>
        </div>
      )}

      {/* Grid: Calibration Controls & Test Voltage Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3">
        {/* Left Column: Slope & Global Offset Trimmers */}
        <div className="lg:col-span-7 space-y-3">
          {/* DAC Max Voltage & Slope */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sound Card Max Volts */}
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">
                  SOUND CARD DAC FULL SCALE (V_MAX)
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="select-soundcard-max-voltage"
                    value={profile.soundCardMaxVoltage}
                    onChange={e => updateProfileField('soundCardMaxVoltage', parseFloat(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 w-full focus:outline-none focus:border-cyan-500"
                  >
                    <option value="2.5">2.5V (Standard Consumer DAC)</option>
                    <option value="3.3">3.3V (Pro Audio line level)</option>
                    <option value="5.0">5.0V (DC-Coupled Eurorack Interface)</option>
                    <option value="10.0">10.0V (ES-8 / ES-9 High-Voltage)</option>
                  </select>
                </div>
              </div>

              {/* Portamento Glide */}
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">
                  PORTAMENTO / SLEW TIME (GLIDE)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="slider-glide-time"
                    type="range"
                    min="0.001"
                    max="0.25"
                    step="0.005"
                    value={profile.glideTime}
                    onChange={e => updateProfileField('glideTime', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer"
                  />
                  <span className="text-cyan-300 w-14 text-right">
                    {(profile.glideTime * 1000).toFixed(0)} ms
                  </span>
                </div>
              </div>
            </div>

            {/* 1V/Octave Slope Fine Trimmer */}
            <div className="pt-2 border-t border-slate-900">
              <div className="flex justify-between items-center text-slate-300 mb-1">
                <span className="text-cyan-400">1V/OCTAVE TRACKING SLOPE MULTIPLIER</span>
                <span className="font-bold text-cyan-300 text-sm">
                  &times;{profile.slope.toFixed(4)}
                </span>
              </div>
              <input
                id="slider-vco-slope"
                type="range"
                min="0.900"
                max="1.100"
                step="0.0005"
                value={profile.slope}
                onChange={e => updateProfileField('slope', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-2 rounded appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0.9000 (Flat)</span>
                <span>1.0000 (Standard)</span>
                <span>1.1000 (Sharp)</span>
              </div>
            </div>

            {/* Global Voltage Offset */}
            <div>
              <div className="flex justify-between items-center text-slate-300 mb-1">
                <span className="text-amber-400">GLOBAL 0V OFFSET TRIM</span>
                <span className="font-bold text-amber-300 text-sm">
                  {formatVolts(profile.offset, 4)}
                </span>
              </div>
              <input
                id="slider-vco-offset"
                type="range"
                min="-1.000"
                max="1.000"
                step="0.001"
                value={profile.offset}
                onChange={e => updateProfileField('offset', parseFloat(e.target.value))}
                className="w-full accent-amber-400 bg-slate-800 h-2 rounded appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* 5-Point Octave Micro-Calibration Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300 text-[11px] font-bold text-emerald-400">
                MULTI-OCTAVE LINEARIZATION MATRIX
              </span>
              <span className="text-[10px] text-slate-500">Fine trim each octave (mV offset)</span>
            </div>

            <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
              {(['c2', 'c3', 'c4', 'c5', 'c6'] as const).map((oct, idx) => {
                const voltsBase = idx;
                const freqBase = 64 * Math.pow(2, idx);
                const currentTrim = profile.octaveCorrections[oct];

                return (
                  <div key={oct} className="bg-slate-900 border border-slate-800 rounded p-1.5 space-y-1">
                    <div className="text-slate-400 uppercase font-bold">{oct} ({voltsBase}V)</div>
                    <div className="text-[9px] text-cyan-400">{freqBase}Hz</div>
                    <input
                      type="number"
                      step="0.005"
                      min="-0.5"
                      max="0.5"
                      value={currentTrim}
                      onChange={e => updateOctaveCorrection(oct, parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center text-slate-200 text-[10px] focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <div className="text-[9px] text-slate-500">
                      {(currentTrim * 1000).toFixed(0)} mV
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Direct DC Test Voltage Generator & Audio Monitor */}
        <div className="lg:col-span-5 space-y-3">
          {/* DC Test Voltage Generator */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2 text-[11px] text-slate-300">
              <span className="font-bold text-amber-400">PRECISION DC TEST VOLTAGES</span>
              <span className="text-[10px] text-slate-500">Multimeter / Tuner Zero</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {[
                { v: 0.0, label: '0.000 V (C2)' },
                { v: 1.0, label: '+1.000 V (C3)' },
                { v: 2.0, label: '+2.000 V (C4)' },
                { v: 3.0, label: '+3.000 V (C5)' },
                { v: 4.0, label: '+4.000 V (C6)' },
                { v: 5.0, label: '+5.000 V (C7)' }
              ].map(test => (
                <button
                  key={test.v}
                  onClick={() => triggerTestVoltage(test.v)}
                  className={`px-2 py-2 rounded font-mono text-[10px] border transition-all text-center ${
                    activeTestVolt === test.v
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700 hover:border-amber-500/50'
                  }`}
                >
                  {test.label}
                </button>
              ))}
            </div>

            <div className="text-[10px] text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800/80">
              {activeTestVolt !== null ? (
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Transmitting steady {formatVolts(activeTestVolt, 3)} to soundcard</span>
                </div>
              ) : (
                <span>Click any voltage button to output steady reference DC</span>
              )}
            </div>
          </div>

          {/* Sound Card Channel Routing & Polarity */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="text-[11px] font-bold text-slate-300 mb-1">
              SOUND CARD CHANNEL ROUTING
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-slate-400 block mb-0.5">PITCH CV JACK:</span>
                <select
                  value={profile.outputChannels.pitchChannel}
                  onChange={e => {
                    const pitchChannel = e.target.value as 'left' | 'right';
                    const envelopeChannel = pitchChannel === 'left' ? 'right' : 'left';
                    updateProfileField('outputChannels', {
                      ...profile.outputChannels,
                      pitchChannel,
                      envelopeChannel
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300"
                >
                  <option value="left">Left Channel (Tip)</option>
                  <option value="right">Right Channel (Ring)</option>
                </select>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">ENVELOPE CV JACK:</span>
                <select
                  value={profile.outputChannels.envelopeChannel}
                  onChange={e => {
                    const envelopeChannel = e.target.value as 'left' | 'right' | 'none';
                    updateProfileField('outputChannels', {
                      ...profile.outputChannels,
                      envelopeChannel
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300"
                >
                  <option value="right">Right Channel (Ring)</option>
                  <option value="left">Left Channel (Tip)</option>
                  <option value="none">Disabled / Off</option>
                </select>
              </div>
            </div>

            {/* Invert Polarity */}
            <div className="flex items-center gap-4 pt-1 text-[10px] text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.outputChannels.invertPitch}
                  onChange={e => {
                    updateProfileField('outputChannels', {
                      ...profile.outputChannels,
                      invertPitch: e.target.checked
                    });
                  }}
                  className="accent-cyan-400 rounded"
                />
                <span>Invert Pitch (-1V/Oct)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.outputChannels.invertEnvelope}
                  onChange={e => {
                    updateProfileField('outputChannels', {
                      ...profile.outputChannels,
                      invertEnvelope: e.target.checked
                    });
                  }}
                  className="accent-amber-400 rounded"
                />
                <span>Invert Env CV</span>
              </label>
            </div>
          </div>

          {/* Audible Reference Monitor Synth */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5" />
                AUDIBLE SYNTH MONITOR
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.enableAudibleMonitor}
                  onChange={e => updateProfileField('enableAudibleMonitor', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] mt-2">
              <div>
                <span className="text-slate-400 block mb-0.5">WAVEFORM:</span>
                <select
                  value={profile.monitorWaveform}
                  onChange={e => updateProfileField('monitorWaveform', e.target.value as 'sawtooth' | 'sine' | 'triangle' | 'square')}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="sawtooth">Analog Sawtooth</option>
                  <option value="sine">Pure Sine (5-Just)</option>
                  <option value="triangle">Triangle Wave</option>
                  <option value="square">Square Wave</option>
                </select>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">VOLUME:</span>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={profile.monitorVolume}
                  onChange={e => updateProfileField('monitorVolume', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-slate-800 h-1.5 rounded mt-1.5 appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Rich Multi-Octave Voice Quick Section */}
            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  RICHER NOTES (OCTAVE LAYERS)
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={profile.richHarmonics?.enabled}
                    onChange={e => {
                      const rh = profile.richHarmonics || {
                        enabled: true,
                        preset: 'warm_octaves',
                        baseGain: 0.9,
                        subOctave1Gain: 0.35,
                        subOctave1Waveform: 'triangle',
                        subOctave2Gain: 0.15,
                        superOctave1Gain: 0.28,
                        superOctave1Waveform: 'sine',
                        superOctave2Gain: 0.12,
                        fifthHarmonicGain: 0.10,
                        analogDetuneCents: 4.0
                      };
                      updateProfileField('richHarmonics', { ...rh, enabled: e.target.checked });
                    }}
                    className="accent-amber-400 rounded"
                  />
                  <span>Enabled</span>
                </label>
              </div>

              {profile.richHarmonics?.enabled && (
                <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-2 rounded border border-slate-800">
                  <div>
                    <div className="flex justify-between text-[9px] text-cyan-300">
                      <span>-1 OCT (SUB):</span>
                      <span className="font-bold">{Math.round((profile.richHarmonics.subOctave1Gain || 0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={profile.richHarmonics.subOctave1Gain}
                      onChange={e => {
                        updateProfileField('richHarmonics', {
                          ...profile.richHarmonics,
                          subOctave1Gain: parseFloat(e.target.value)
                        });
                      }}
                      className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer mt-1"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] text-amber-300">
                      <span>+1 OCT (SUPER):</span>
                      <span className="font-bold">{Math.round((profile.richHarmonics.superOctave1Gain || 0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={profile.richHarmonics.superOctave1Gain}
                      onChange={e => {
                        updateProfileField('richHarmonics', {
                          ...profile.richHarmonics,
                          superOctave1Gain: parseFloat(e.target.value)
                        });
                      }}
                      className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
