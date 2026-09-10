/**
 * Dual-Trace Eurorack Oscilloscope Component
 * 
 * Visualizes Pitch CV (1V/Oct) & Envelope CV / Gate signals in real-time
 * before transmitting to external modular hardware or audio DAC.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Activity, Eye, Sliders, Zap, ZoomIn, ZoomOut } from 'lucide-react';
import { OscilloscopeConfig, ProteodyNote } from '../types/synth';
import { SoundCardCVEngine } from '../audio/cvEngine';
import { formatHz, formatVolts } from '../audio/tuning';

interface OscilloscopeProps {
  engine: SoundCardCVEngine | null;
  currentNote: ProteodyNote | null;
  isPlaying: boolean;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  engine,
  currentNote,
  isPlaying
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [config, setConfig] = useState<OscilloscopeConfig>({
    timebase: 50, // ms per div
    voltageScale: 1.0, // V per div
    triggerMode: 'auto',
    triggerLevel: 1.0,
    showPitchCV: true,
    showEnvCV: true,
    showMonitorAudio: false,
    persistence: true,
    gridVisible: true
  });

  const [liveReadout, setLiveReadout] = useState({
    pitchV: 0,
    envV: 0,
    frequency: 256.0,
    noteStr: 'C4',
    ratioStr: '1/1',
    gate: false
  });

  // Animation frame loop for 60fps CRT canvas rendering
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      // Read values from engine
      if (engine) {
        setLiveReadout({
          pitchV: engine.currentPitchVolts,
          envV: engine.currentEnvVolts,
          frequency: engine.currentFrequency,
          noteStr: currentNote ? `${currentNote.symbol}${currentNote.octave}` : 'C4',
          ratioStr: currentNote ? `${currentNote.interval.numerator}/${currentNote.interval.denominator}` : '1/1',
          gate: engine.isGateActive
        });
      }

      // Background fade / persistence
      if (config.persistence) {
        ctx.fillStyle = 'rgba(10, 14, 20, 0.25)';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#0a0e14';
        ctx.fillRect(0, 0, width, height);
      }

      const centerY = height * 0.72; // 0V base line
      const pixelsPerVolt = (height * 0.12) / config.voltageScale;

      // 1. Draw Oscilloscope Calibration Grid
      if (config.gridVisible) {
        ctx.strokeStyle = 'rgba(40, 60, 80, 0.4)';
        ctx.lineWidth = 1;

        // Voltage horizontal lines (0V, 1V, 2V, 3V, 4V, 5V, -1V)
        for (let v = -2; v <= 6; v++) {
          const y = centerY - v * pixelsPerVolt;
          if (y >= 0 && y <= height) {
            ctx.beginPath();
            ctx.setLineDash(v === 0 ? [] : [2, 4]);
            ctx.strokeStyle = v === 0 ? 'rgba(70, 130, 180, 0.6)' : 'rgba(30, 50, 70, 0.35)';
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Voltage labels
            ctx.setLineDash([]);
            ctx.fillStyle = v === 0 ? '#60a5fa' : 'rgba(148, 163, 184, 0.5)';
            ctx.font = '10px monospace';
            ctx.fillText(`${v >= 0 ? '+' : ''}${v}V`, 8, y - 3);
          }
        }

        // Time vertical grid divisions (8 columns)
        const cols = 8;
        const colWidth = width / cols;
        for (let c = 0; c <= cols; c++) {
          const x = c * colWidth;
          ctx.beginPath();
          ctx.setLineDash([2, 4]);
          ctx.strokeStyle = 'rgba(30, 50, 70, 0.35)';
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Draw Center Crosshair ticks
      ctx.strokeStyle = 'rgba(70, 120, 170, 0.5)';
      ctx.beginPath();
      ctx.moveTo(width / 2, centerY - 6);
      ctx.lineTo(width / 2, centerY + 6);
      ctx.moveTo(width / 2 - 6, centerY);
      ctx.lineTo(width / 2 + 6, centerY);
      ctx.stroke();

      if (engine) {
        const bufferLen = engine.pitchBuffer.length;
        const step = Math.max(1, Math.floor(bufferLen / width));

        // 2. Trace 1: Pitch CV (Cyan / Phosphor Teal)
        if (config.showPitchCV) {
          ctx.save();
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 8;

          ctx.beginPath();
          for (let x = 0; x < width; x++) {
            const bufIdx = (x * step) % bufferLen;
            const volts = engine.pitchBuffer[bufIdx] || 0;
            const y = centerY - volts * pixelsPerVolt;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // 3. Trace 2: Envelope CV (Amber / Orange)
        if (config.showEnvCV) {
          ctx.save();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.0;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;

          ctx.beginPath();
          for (let x = 0; x < width; x++) {
            const bufIdx = (x * step) % bufferLen;
            const envV = engine.envBuffer[bufIdx] || 0;
            const y = centerY - envV * pixelsPerVolt;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // 4. Trace 3: Audio Monitor Synth waveform (Optional Green)
        if (config.showMonitorAudio) {
          ctx.save();
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 6;

          ctx.beginPath();
          for (let x = 0; x < width; x++) {
            const bufIdx = (x * step) % bufferLen;
            const audioVal = engine.audioBuffer[bufIdx] || 0;
            const y = (height * 0.35) - audioVal * (height * 0.2);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [config, engine, currentNote]);

  return (
    <div id="oscilloscope-panel" className="bg-slate-900/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Top Header & Scope Controls */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-mono font-bold tracking-wider text-cyan-400">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>PROTEODY CV DUAL-TRACE OSCILLOSCOPE</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-400 font-mono text-[11px] border border-slate-700">
            C4 = 256Hz (5-Just)
          </span>
          {isPlaying && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE TRANSMIT
            </span>
          )}
        </div>

        {/* Traces & Grid Toggles */}
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <button
            id="toggle-trace-pitch"
            onClick={() => setConfig(c => ({ ...c, showPitchCV: !c.showPitchCV }))}
            className={`px-2 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${
              config.showPitchCV
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            CH1: Pitch CV (L)
          </button>

          <button
            id="toggle-trace-env"
            onClick={() => setConfig(c => ({ ...c, showEnvCV: !c.showEnvCV }))}
            className={`px-2 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${
              config.showEnvCV
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            CH2: Env CV (R)
          </button>

          <button
            id="toggle-trace-monitor"
            onClick={() => setConfig(c => ({ ...c, showMonitorAudio: !c.showMonitorAudio }))}
            className={`px-2 py-1 rounded font-mono text-[11px] font-semibold transition-all border ${
              config.showMonitorAudio
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            Monitor Audio
          </button>

          <button
            id="toggle-scope-grid"
            onClick={() => setConfig(c => ({ ...c, gridVisible: !c.gridVisible }))}
            className={`px-2 py-1 rounded font-mono text-[11px] border transition-all ${
              config.gridVisible
                ? 'bg-slate-800 text-slate-300 border-slate-600'
                : 'bg-slate-900 text-slate-600 border-slate-800'
            }`}
            title="Toggle Voltage Calibration Grid"
          >
            Grid
          </button>
        </div>
      </div>

      {/* Main CRT Scope Screen */}
      <div className="relative bg-slate-950 w-full h-56 sm:h-64 overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          width={960}
          height={260}
          className="w-full h-full block"
        />

        {/* Realtime Voltage & Frequency HUD Overlay */}
        <div className="absolute top-2.5 left-3 flex flex-wrap gap-2.5 font-mono text-xs pointer-events-none">
          <div className="bg-slate-950/85 border border-cyan-500/40 rounded px-2.5 py-1 text-cyan-300 shadow-lg backdrop-blur-sm">
            <span className="text-slate-400 text-[10px] block">PITCH CV (1V/OCT)</span>
            <span className="font-bold text-sm">{formatVolts(liveReadout.pitchV, 3)}</span>
            <span className="text-slate-400 ml-1.5 text-[11px]">
              [{liveReadout.noteStr} : {formatHz(liveReadout.frequency)}]
            </span>
          </div>

          <div className="bg-slate-950/85 border border-amber-500/40 rounded px-2.5 py-1 text-amber-300 shadow-lg backdrop-blur-sm">
            <span className="text-slate-400 text-[10px] block">ENVELOPE CV</span>
            <span className="font-bold text-sm">{formatVolts(liveReadout.envV, 3)}</span>
            <span className="text-slate-400 ml-1.5 text-[11px]">
              (5-Just: {liveReadout.ratioStr})
            </span>
          </div>
        </div>

        {/* Scope Scale & Timebase Controls Overlay (Bottom-Right) */}
        <div className="absolute bottom-2.5 right-3 flex items-center gap-2 bg-slate-950/90 border border-slate-800/90 rounded-lg p-1.5 font-mono text-[11px] text-slate-300 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-1 pl-1">
            <span className="text-slate-400 text-[10px]">SCALE:</span>
            <select
              id="scope-voltage-scale"
              value={config.voltageScale}
              onChange={e => setConfig(c => ({ ...c, voltageScale: parseFloat(e.target.value) }))}
              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
            >
              <option value="0.5">0.5 V/div</option>
              <option value="1.0">1.0 V/div</option>
              <option value="2.0">2.0 V/div</option>
            </select>
          </div>

          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            <span className="text-slate-400 text-[10px]">TIME:</span>
            <select
              id="scope-timebase"
              value={config.timebase}
              onChange={e => setConfig(c => ({ ...c, timebase: parseInt(e.target.value) }))}
              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-amber-300 font-mono text-[11px] focus:outline-none focus:border-amber-500"
            >
              <option value="20">20 ms/div</option>
              <option value="50">50 ms/div</option>
              <option value="100">100 ms/div</option>
              <option value="200">200 ms/div</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
