/**
 * Mouse-Driven Envelope Designer & Sound Modulator
 * 
 * Maps mouse movement and gestures to dynamic Attack, Sustain, Decay & Release
 * parameters with real-time visual sculpting, 2D kinetic modulation pad, and presets.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MousePointer, Sparkles, Zap, Flame, Wind, Radio, Volume2, Move, RotateCcw } from 'lucide-react';
import { EnvelopeSettings } from '../types/synth';
import { SoundCardCVEngine } from '../audio/cvEngine';
import { formatVolts } from '../audio/tuning';

interface MouseEnvelopeDesignerProps {
  envelope: EnvelopeSettings;
  onChange: (env: EnvelopeSettings) => void;
  engine: SoundCardCVEngine | null;
}

export const MouseEnvelopeDesigner: React.FC<MouseEnvelopeDesignerProps> = ({
  envelope,
  onChange,
  engine
}) => {
  const [activeTab, setActiveTab] = useState<'gesture_pad' | 'sculptor'>('gesture_pad');
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.2, y: 0.4 });
  const [trail, setTrail] = useState<{ x: number; y: number; time: number }[]>([]);
  const padRef = useRef<HTMLDivElement | null>(null);

  // Sync mouse position from incoming envelope parameters
  useEffect(() => {
    // Inverse mapping: x from Attack/Decay, y from Sustain
    const normX = Math.max(0, Math.min(1, envelope.attack / 1.0));
    const normY = Math.max(0, Math.min(1, 1 - envelope.sustain));
    setMousePos({ x: normX, y: normY });
  }, []);

  // Update mouse position and envelope parameters when interacting with 2D Pad
  const handlePadInteraction = useCallback((clientX: number, clientY: number, pressed: boolean) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    setMousePos({ x, y });
    setTrail(prev => [{ x, y, time: Date.now() }, ...prev.slice(0, 15)]);

    // Map X (0..1) to Attack & Decay time
    // X = 0 -> Snappy 2ms attack, 150ms decay
    // X = 1 -> Swelling 1.2s attack, 800ms decay
    const attack = Math.max(0.002, Math.pow(x, 1.8) * 1.5);
    const decay = Math.max(0.02, 0.1 + (1 - x * 0.5) * 1.2);
    
    // Map Y (0..1 from top to bottom) to Sustain level & Release
    // Y at top (0.0) -> Sustain 100% (5V), longer release
    // Y at bottom (1.0) -> Sustain 0% (0V), short percussive release
    const sustain = Math.max(0.0, Math.min(1.0, 1 - y));
    const release = Math.max(0.02, 0.05 + (1 - y) * 1.8);

    const updatedEnv: EnvelopeSettings = {
      ...envelope,
      attack,
      decay,
      sustain,
      release
    };

    onChange(updatedEnv);

    if (engine) {
      engine.updateEnvelopeSettings(updatedEnv);
      engine.updateMouseModulation(x, y, pressed);
    }
  }, [envelope, onChange, engine]);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsMouseDown(true);
    handlePadInteraction(e.clientX, e.clientY, true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isMouseDown || activeTab === 'gesture_pad') {
      handlePadInteraction(e.clientX, e.clientY, isMouseDown);
    }
  };

  const onMouseUp = () => {
    setIsMouseDown(false);
    if (engine) {
      engine.updateMouseModulation(mousePos.x, mousePos.y, false);
    }
  };

  // Preset Handlers
  const applyPreset = (preset: 'pluck' | 'acid' | 'swell' | 'organ' | 's_curve') => {
    let newEnv: EnvelopeSettings;
    switch (preset) {
      case 'pluck':
        newEnv = { ...envelope, attack: 0.003, decay: 0.18, sustain: 0.0, release: 0.08 };
        break;
      case 'acid':
        newEnv = { ...envelope, attack: 0.005, decay: 0.28, sustain: 0.35, release: 0.15 };
        break;
      case 'swell':
        newEnv = { ...envelope, attack: 0.45, decay: 0.6, sustain: 0.85, release: 0.75 };
        break;
      case 'organ':
        newEnv = { ...envelope, attack: 0.01, decay: 0.05, sustain: 0.95, release: 0.25 };
        break;
      case 's_curve':
        newEnv = { ...envelope, attack: 0.2, decay: 0.35, sustain: 0.6, release: 0.45 };
        break;
    }
    onChange(newEnv);
    if (engine) engine.updateEnvelopeSettings(newEnv);
  };

  // Generate SVG Path for Visual ADSR Envelope Curve
  const maxV = envelope.maxVoltage || 5.0;
  const sustainVolts = envelope.sustain * maxV;
  const totalDisplayTime = Math.max(1.0, envelope.attack + envelope.decay + 0.3 + envelope.release);

  const w = 360;
  const h = 120;
  const padding = 15;
  const drawW = w - padding * 2;
  const drawH = h - padding * 2;

  const t0 = 0;
  const tAttack = (envelope.attack / totalDisplayTime) * drawW;
  const tDecay = ((envelope.attack + envelope.decay) / totalDisplayTime) * drawW;
  const tGateEnd = tDecay + (0.3 / totalDisplayTime) * drawW;
  const tRelease = Math.min(drawW, tGateEnd + (envelope.release / totalDisplayTime) * drawW);

  const yZero = h - padding;
  const yPeak = padding;
  const ySustain = yZero - envelope.sustain * drawH;

  const pathD = `M ${padding} ${yZero} L ${padding + tAttack} ${yPeak} L ${padding + tDecay} ${ySustain} L ${padding + tGateEnd} ${ySustain} L ${padding + tRelease} ${yZero}`;

  return (
    <div id="envelope-designer-module" className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 shadow-xl backdrop-blur-md">
      {/* Header with Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-600/40 text-amber-400">
            <MousePointer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-sm tracking-wide text-slate-100 flex items-center gap-1.5">
              <span>MOUSE ENVELOPE MODULATOR</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-normal border border-amber-800">
                0V to +{maxV}V CV
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive gesture pad: X maps Attack/Decay, Y maps Sustain & Voltage
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
          <button
            id="tab-gesture-pad"
            onClick={() => setActiveTab('gesture_pad')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'gesture_pad'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2D Kinetic Pad
          </button>
          <button
            id="tab-sculptor"
            onClick={() => setActiveTab('sculptor')}
            className={`px-3 py-1 rounded transition-all ${
              activeTab === 'sculptor'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ADSR Sliders
          </button>
        </div>
      </div>

      {/* Main Interactive Space */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3.5">
        {/* Left Column: 2D Gesture Pad or Sliders */}
        <div className="lg:col-span-7">
          {activeTab === 'gesture_pad' ? (
            <div className="relative">
              {/* 2D Interactive Radar Canvas / Gesture Zone */}
              <div
                id="kinetic-envelope-pad"
                ref={padRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                className="relative w-full h-56 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden cursor-crosshair select-none shadow-inner group"
              >
                {/* Visual Polar / Orthogonal Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="border border-amber-500/30" />
                  ))}
                </div>

                {/* Coordinate Axes Labels */}
                <div className="absolute top-2 left-2 text-[10px] font-mono text-amber-400/70 pointer-events-none">
                  HIGH SUSTAIN (+{maxV}V)
                </div>
                <div className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-400/70 pointer-events-none">
                  INSTANT ATTACK (2ms)
                </div>
                <div className="absolute bottom-2 right-2 text-[10px] font-mono text-amber-400/70 pointer-events-none">
                  SLOW ATTACK / SWELL (1.5s)
                </div>
                <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-500 pointer-events-none">
                  PERCUSSIVE (0V)
                </div>

                {/* Center Cross Guide */}
                <div
                  className="absolute border-l border-amber-500/30 h-full pointer-events-none"
                  style={{ left: `${mousePos.x * 100}%` }}
                />
                <div
                  className="absolute border-t border-amber-500/30 w-full pointer-events-none"
                  style={{ top: `${mousePos.y * 100}%` }}
                />

                {/* Mouse Motion Trails */}
                {trail.map((pt, idx) => (
                  <div
                    key={idx}
                    className="absolute rounded-full pointer-events-none bg-amber-400 transition-opacity"
                    style={{
                      left: `${pt.x * 100}%`,
                      top: `${pt.y * 100}%`,
                      width: `${Math.max(3, 14 - idx)}px`,
                      height: `${Math.max(3, 14 - idx)}px`,
                      transform: 'translate(-50%, -50%)',
                      opacity: (15 - idx) / 30,
                      filter: 'blur(1px)'
                    }}
                  />
                ))}

                {/* Active Glowing Modulation Puck */}
                <div
                  className={`absolute rounded-full pointer-events-none border-2 transition-transform duration-75 ${
                    isMouseDown
                      ? 'bg-amber-400 border-white shadow-[0_0_20px_#f59e0b] scale-125'
                      : 'bg-amber-500/80 border-amber-200 shadow-[0_0_12px_#f59e0b]'
                  }`}
                  style={{
                    left: `${mousePos.x * 100}%`,
                    top: `${mousePos.y * 100}%`,
                    width: '20px',
                    height: '20px',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* Live Floating Readout */}
                <div
                  className="absolute pointer-events-none font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900/90 text-amber-300 border border-amber-500/40 shadow"
                  style={{
                    left: `${Math.min(80, Math.max(15, mousePos.x * 100))}%`,
                    top: `${Math.min(85, Math.max(15, mousePos.y * 100 - 10))}%`,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  A: {(envelope.attack * 1000).toFixed(0)}ms | S: {(envelope.sustain * 100).toFixed(0)}%
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1 px-1">
                <span>Hold & Drag mouse to sculpt live CV modulation</span>
                <span className="text-amber-400">
                  Real-time Envelope Voltage: {formatVolts(sustainVolts, 2)}
                </span>
              </div>
            </div>
          ) : (
            /* Precision ADSR Sliders */
            <div className="h-56 bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between font-mono text-xs">
              {/* Attack Slider */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="text-cyan-400">ATTACK TIME</span>
                  <span className="font-bold">{(envelope.attack * 1000).toFixed(0)} ms</span>
                </div>
                <input
                  id="slider-env-attack"
                  type="range"
                  min="0.002"
                  max="1.5"
                  step="0.005"
                  value={envelope.attack}
                  onChange={e => {
                    const attack = parseFloat(e.target.value);
                    const updated = { ...envelope, attack };
                    onChange(updated);
                    if (engine) engine.updateEnvelopeSettings(updated);
                  }}
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Decay Slider */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="text-amber-400">DECAY TIME</span>
                  <span className="font-bold">{(envelope.decay * 1000).toFixed(0)} ms</span>
                </div>
                <input
                  id="slider-env-decay"
                  type="range"
                  min="0.02"
                  max="2.0"
                  step="0.01"
                  value={envelope.decay}
                  onChange={e => {
                    const decay = parseFloat(e.target.value);
                    const updated = { ...envelope, decay };
                    onChange(updated);
                    if (engine) engine.updateEnvelopeSettings(updated);
                  }}
                  className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Sustain Slider */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="text-emerald-400">SUSTAIN LEVEL</span>
                  <span className="font-bold">{(envelope.sustain * 100).toFixed(0)}% ({formatVolts(sustainVolts, 2)})</span>
                </div>
                <input
                  id="slider-env-sustain"
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={envelope.sustain}
                  onChange={e => {
                    const sustain = parseFloat(e.target.value);
                    const updated = { ...envelope, sustain };
                    onChange(updated);
                    if (engine) engine.updateEnvelopeSettings(updated);
                  }}
                  className="w-full accent-emerald-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Release Slider */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="text-purple-400">RELEASE TIME</span>
                  <span className="font-bold">{(envelope.release * 1000).toFixed(0)} ms</span>
                </div>
                <input
                  id="slider-env-release"
                  type="range"
                  min="0.02"
                  max="2.5"
                  step="0.01"
                  value={envelope.release}
                  onChange={e => {
                    const release = parseFloat(e.target.value);
                    const updated = { ...envelope, release };
                    onChange(updated);
                    if (engine) engine.updateEnvelopeSettings(updated);
                  }}
                  className="w-full accent-purple-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Envelope Curve Visualizer & Presets */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          {/* Real-time ADSR Curve Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 relative overflow-hidden">
            <div className="flex justify-between items-center px-1 mb-1 font-mono text-[10px] text-slate-400">
              <span>ENVELOPE CV TRAJECTORY</span>
              <span className="text-amber-300">Peak: +{maxV}V</span>
            </div>

            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 block">
              {/* Baseline Grid */}
              <line x1={padding} y1={yZero} x2={w - padding} y2={yZero} stroke="rgba(70, 90, 120, 0.4)" strokeWidth="1" />
              <line x1={padding} y1={yPeak} x2={w - padding} y2={yPeak} stroke="rgba(70, 90, 120, 0.2)" strokeDasharray="3 3" />
              <line x1={padding} y1={ySustain} x2={w - padding} y2={ySustain} stroke="rgba(245, 158, 11, 0.25)" strokeDasharray="2 2" />

              {/* Envelope Fill */}
              <path
                d={`${pathD} L ${padding + tRelease} ${yZero} Z`}
                fill="url(#envGradient)"
                opacity="0.3"
              />

              {/* Envelope Stroke */}
              <path
                d={pathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]"
              />

              {/* Key Knots */}
              <circle cx={padding + tAttack} cy={yPeak} r="3.5" fill="#38bdf8" />
              <circle cx={padding + tDecay} cy={ySustain} r="3.5" fill="#f59e0b" />
              <circle cx={padding + tGateEnd} cy={ySustain} r="3.5" fill="#34d399" />
              <circle cx={padding + tRelease} cy={yZero} r="3.5" fill="#c084fc" />

              <defs>
                <linearGradient id="envGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Voltage & Timing tags */}
            <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px] mt-1 pt-1 border-t border-slate-900 text-slate-400">
              <div>A: {(envelope.attack * 1000).toFixed(0)}ms</div>
              <div>D: {(envelope.decay * 1000).toFixed(0)}ms</div>
              <div>S: {(envelope.sustain * 100).toFixed(0)}%</div>
              <div>R: {(envelope.release * 1000).toFixed(0)}ms</div>
            </div>
          </div>

          {/* Quick Sound Modulation Presets */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5">
            <div className="text-[10px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
              <span>MODULATION PRESETS</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                id="preset-pluck"
                onClick={() => applyPreset('pluck')}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 rounded font-mono text-[11px] text-slate-300 hover:text-amber-300 transition-all flex items-center justify-center gap-1"
              >
                <Zap className="w-3 h-3 text-cyan-400" />
                Pluck
              </button>
              <button
                id="preset-acid"
                onClick={() => applyPreset('acid')}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 rounded font-mono text-[11px] text-slate-300 hover:text-amber-300 transition-all flex items-center justify-center gap-1"
              >
                <Flame className="w-3 h-3 text-amber-400" />
                Acid
              </button>
              <button
                id="preset-swell"
                onClick={() => applyPreset('swell')}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 rounded font-mono text-[11px] text-slate-300 hover:text-amber-300 transition-all flex items-center justify-center gap-1"
              >
                <Wind className="w-3 h-3 text-emerald-400" />
                Swell
              </button>
              <button
                id="preset-organ"
                onClick={() => applyPreset('organ')}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 rounded font-mono text-[11px] text-slate-300 hover:text-amber-300 transition-all flex items-center justify-center gap-1"
              >
                <Volume2 className="w-3 h-3 text-purple-400" />
                Hold/Pad
              </button>
              <button
                id="preset-scurve"
                onClick={() => applyPreset('s_curve')}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 rounded font-mono text-[11px] text-slate-300 hover:text-amber-300 transition-all flex items-center justify-center gap-1"
              >
                <Radio className="w-3 h-3 text-blue-400" />
                S-Curve
              </button>
              <button
                id="preset-max-volts"
                onClick={() => {
                  const newV = envelope.maxVoltage === 5.0 ? 8.0 : envelope.maxVoltage === 8.0 ? 10.0 : 5.0;
                  const updated = { ...envelope, maxVoltage: newV };
                  onChange(updated);
                  if (engine) engine.updateEnvelopeSettings(updated);
                }}
                className="px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/50 rounded font-mono text-[11px] text-amber-300 transition-all"
                title="Toggle Eurorack Envelope CV peak range"
              >
                Range: +{maxV}V
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
