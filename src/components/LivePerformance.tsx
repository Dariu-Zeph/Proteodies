/**
 * Live Performance Tab - Live Proteody Key Mapping & Sequential Note Player
 * 
 * Maps keyboard letters to proteody sequences.
 * Each time the mapped key is pressed:
 * - Plays the NEXT note in the sequence
 * - Sends sample-accurate 1V/Oct Pitch CV (Left channel) and Envelope CV (Right channel)
 * - Visualizes signal on the oscilloscope and plays the 5-Just monitor tone
 * - Advances step-by-step till the end of the peptide chain
 * - Automatically returns to the beginning (Note 1) when finished and continues seamlessly!
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Keyboard, 
  Sparkles, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Settings2, 
  Zap, 
  Music, 
  Volume2, 
  Layers, 
  Sliders, 
  Check, 
  Clock, 
  Radio, 
  ArrowRight,
  Info,
  Repeat,
  Play,
  ChevronDown,
  ChevronUp,
  Coffee,
  HelpCircle,
  Activity,
  Dna
} from 'lucide-react';
import { CalibrationProfile, LiveKeyMapping, ProteodyNote, MetaProteodyConfig } from '../types/synth';
import { PROTEODY_PRESETS, translateSequenceToProteody, createCoffeeMetaProteody } from '../data/proteodyLibrary';
import { SoundCardCVEngine, MetaCascadeLayerInput } from '../audio/cvEngine';
import { formatHz, formatVolts } from '../audio/tuning';
import { RichHarmonicsPanel } from './RichHarmonicsPanel';
import { MetaProteodyModal } from './MetaProteodyModal';

export interface ActiveChordVoiceItem {
  layerName: string;
  note: ProteodyNote;
  pkStage?: 'fast_receptor' | 'ion_channel' | 'neuromodulator' | 'metabolic_clearance';
  pkOnsetDelayMs?: number;
  pkHalfLifeMultiplier?: number;
  gain?: number;
  color?: string;
}

interface LivePerformanceProps {
  engine: SoundCardCVEngine | null;
  profile?: CalibrationProfile;
  onProfileChange?: (profile: CalibrationProfile) => void;
  onNoteTrigger: (note: ProteodyNote | null) => void;
  onOpenSternheimerModal: () => void;
}

// Initial curated keyboard mappings for immediate live playing
const DEFAULT_MAPPINGS_CONFIG = [
  {
    key: 'O',
    name: 'Oxytocin',
    presetId: 'oxytocin',
    aminoSequence: 'CYIQNCPLG',
    algorithm: 'sternheimer_mass_5just' as const,
    octave: 4,
    color: 'emerald'
  },
  {
    key: 'I',
    name: 'Insulin (A-Chain)',
    presetId: 'insulin-a',
    aminoSequence: 'GIVEQCCTSICSLYQLENYCNFVNQHLCGSHLVEALYLVCGERGFFYTPKT',
    algorithm: 'sternheimer_mass_5just' as const,
    octave: 4,
    color: 'cyan'
  },
  {
    key: 'C',
    name: 'Collagen Helix',
    presetId: 'collagen-1',
    aminoSequence: 'GPAGPAGPKGANGDPGRPGEPGLPGARGITGARGLAGPPGMPGPRG',
    algorithm: 'sternheimer_mass_5just' as const,
    octave: 3,
    color: 'amber'
  },
  {
    key: 'G',
    name: 'GFP Chromophore',
    presetId: 'gfp',
    aminoSequence: 'MSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTT',
    algorithm: 'sternheimer_mass_5just' as const,
    octave: 4,
    color: 'green'
  },
  {
    key: 'R',
    name: 'Rhodopsin',
    presetId: 'rhodopsin',
    aminoSequence: 'MNGTEGPNFYVPFSNKTGVVRSPFEAPQYYLAEPWQFSMLAAYMFLLIVL',
    algorithm: 'sternheimer_mass_5just' as const,
    octave: 4,
    color: 'purple'
  },
  {
    key: 'H',
    name: 'Hemoglobin Beta',
    presetId: 'hemoglobin-beta',
    aminoSequence: 'VHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLST',
    algorithm: 'sternheimer_mass_5just' as const,
    octave: 4,
    color: 'rose'
  },
  {
    key: 'S',
    name: 'Spider Silk',
    presetId: 'spider-silk',
    aminoSequence: 'GAGAAAAAAAAAGQGGYGGLGSQGAGRGGLGGQGAGAAAAAAAAAG',
    algorithm: 'sternheimer_mass_5just' as const,
    octave: 3,
    color: 'indigo'
  },
  {
    key: 'Y',
    name: 'Cytochrome C',
    presetId: 'cytochrome-c',
    aminoSequence: 'MGDVEKGKKIFVQKCAQCHTVEKGGKHKTGPNLHGLFGRKTGQAPGYSYT',
    algorithm: 'sternheimer_mass_5just' as const,
    octave: 4,
    color: 'yellow'
  },
  {
    key: 'K',
    name: 'Coffee (Meta-Proteody)',
    presetId: 'meta-coffee',
    aminoSequence: 'IMGSSVYITVELAIAVLAILGNVLVCWAVWLNSNLQNVTNYFVVSLAAADIAVGVLAIPFAITISTGFCA',
    algorithm: 'sternheimer_mass_5just' as const,
    octave: 4,
    color: 'coffee',
    isMeta: true
  }
];

export const LivePerformance: React.FC<LivePerformanceProps> = ({
  engine,
  profile,
  onProfileChange,
  onNoteTrigger,
  onOpenSternheimerModal
}) => {
  const [showRichHarmonics, setShowRichHarmonics] = useState<boolean>(true);
  const [activeMetaModal, setActiveMetaModal] = useState<MetaProteodyConfig | null>(null);

  // Initialize mappings with translated notes
  const [mappings, setMappings] = useState<LiveKeyMapping[]>(() => {
    return DEFAULT_MAPPINGS_CONFIG.map((cfg, idx) => {
      if (cfg.isMeta) {
        const coffeeMeta = createCoffeeMetaProteody();
        return {
          id: `map-meta-${cfg.key}`,
          key: cfg.key,
          name: cfg.name,
          presetId: cfg.presetId,
          aminoSequence: cfg.aminoSequence,
          algorithm: cfg.algorithm,
          octave: cfg.octave,
          color: cfg.color,
          notes: coffeeMeta.layers[0].notes, // Primary layer notes for default reference
          currentStep: 0,
          isMeta: true,
          metaConfig: coffeeMeta
        };
      }

      return {
        id: `map-${idx}-${cfg.key}`,
        key: cfg.key,
        name: cfg.name,
        presetId: cfg.presetId,
        aminoSequence: cfg.aminoSequence,
        algorithm: cfg.algorithm,
        octave: cfg.octave,
        color: cfg.color,
        notes: translateSequenceToProteody(cfg.aminoSequence, cfg.octave, 0.75, cfg.algorithm),
        currentStep: 0 // 0-indexed: represents the next note index that will be played
      };
    });
  });


  // Performance Controls
  // Default mode: 'step_advance' (exact user request: press key -> play next note -> loop when finished)
  const [playMode, setPlayMode] = useState<'step_advance' | 'burst_multi_tap' | 'hold_stream'>('step_advance');
  const [noteDuration, setNoteDuration] = useState<number>(0.28); // seconds of active gate
  const [liveGateRatio, setLiveGateRatio] = useState<number>(0.85); // gate sustain ratio
  const [preventKeyRepeat, setPreventKeyRepeat] = useState<boolean>(true); // prevent OS key bounce
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [lastPlayedNote, setLastPlayedNote] = useState<ProteodyNote | null>(null);
  const [lastPlayedChord, setLastPlayedChord] = useState<ActiveChordVoiceItem[] | null>(null);
  const [lastPlayedMapping, setLastPlayedMapping] = useState<LiveKeyMapping | null>(null);
  const [lastPlayedStepNumber, setLastPlayedStepNumber] = useState<number | null>(null);
  const [justLoopedKey, setJustLoopedKey] = useState<string | null>(null);

  // Modal / Custom Mapping Editor State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState<string>('Q');
  const [editName, setEditName] = useState<string>('Custom Proteody');
  const [editPresetId, setEditPresetId] = useState<string>('oxytocin');
  const [editSequence, setEditSequence] = useState<string>('CYIQNCPLG');
  const [editAlgorithm, setEditAlgorithm] = useState<'sternheimer_mass_5just' | 'sternheimer_mass_continuous' | 'sternheimer_canonical' | 'molecular_weight' | 'hydropathy'>('sternheimer_mass_5just');
  const [editOctave, setEditOctave] = useState<number>(4);
  const [editColor, setEditColor] = useState<string>('cyan');
  const [listeningForKey, setListeningForKey] = useState<boolean>(false);

  // Key tracking to prevent unintended OS keyboard repeats
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // Multi-tap burst state tracker if burst mode is activated
  const burstTimers = useRef<Record<string, { count: number; timer: NodeJS.Timeout | null }>>({});

  // Play a single note safely through the CV engine and dispatch to oscilloscope
  const playNoteAtStep = useCallback((note: ProteodyNote, mapping: LiveKeyMapping, stepIdx: number) => {
    if (!engine) return;

    setActiveKey(mapping.key);
    setLastPlayedNote(note);
    setLastPlayedChord(null);
    setLastPlayedMapping(mapping);
    setLastPlayedStepNumber(stepIdx + 1); // 1-indexed for display
    onNoteTrigger(note);

    engine.init().then(() => {
      engine.triggerNote(note, noteDuration, liveGateRatio);
    });

    // Clear active highlight after note duration
    setTimeout(() => {
      setActiveKey(prev => (prev === mapping.key ? null : prev));
    }, Math.max(120, noteDuration * 1000 * 0.9));
  }, [engine, noteDuration, liveGateRatio, onNoteTrigger]);

  // Play a Meta-Proteody with authentic biological PK/PD cascade and secondary structure folding articulation
  const playChordAtStep = useCallback((chordNotes: ActiveChordVoiceItem[], mapping: LiveKeyMapping, stepIdx: number) => {
    if (!engine || chordNotes.length === 0) return;

    setActiveKey(mapping.key);
    const primaryNote = chordNotes[0].note;
    setLastPlayedNote(primaryNote);
    setLastPlayedChord(chordNotes);
    setLastPlayedMapping(mapping);
    setLastPlayedStepNumber(stepIdx + 1);
    onNoteTrigger(primaryNote);

    const meta = mapping.metaConfig;

    engine.init().then(() => {
      engine.triggerMetaCascade(
        chordNotes,
        noteDuration,
        liveGateRatio,
        meta?.pkMode || 'pk_cascade',
        meta?.pkTimeScale || 1.0,
        meta?.enableSecondaryStructureArticulation ?? true,
        meta?.pkClearanceTailMultiplier || 2.2
      );
    });

    setTimeout(() => {
      setActiveKey(prev => (prev === mapping.key ? null : prev));
    }, Math.max(120, noteDuration * 1000 * 0.9));
  }, [engine, noteDuration, liveGateRatio, onNoteTrigger]);

  /**
   * Main Key Trigger Handler
   * Core directive:
   * "Each time I press the mapped letter it should play the next note of the sequence till the end
   * and return to the beginning when finished."
   * For Meta-Proteodies:
   * "The first sound is the first note of each protein played together."
   */
  const handleKeyTrigger = useCallback((keyChar: string) => {
    const upperKey = keyChar.toUpperCase();
    const mapping = mappings.find(m => m.key.toUpperCase() === upperKey);
    if (!mapping) return;

    // Handle Meta-Proteody (Polyphonic multi-protein chord)
    if (mapping.isMeta && mapping.metaConfig) {
      const meta = mapping.metaConfig;
      const currentStep = mapping.currentStep;

      // Extract simultaneous note for each layer at currentStep (modulo layer length)
      const chordNotes: ActiveChordVoiceItem[] = meta.layers.map(layer => {
        const step = currentStep % layer.notes.length;
        return {
          layerName: layer.proteinName,
          note: layer.notes[step],
          pkStage: layer.pkStage,
          pkOnsetDelayMs: layer.pkOnsetDelayMs,
          pkHalfLifeMultiplier: layer.pkHalfLifeMultiplier,
          gain: layer.gain,
          color: layer.color
        };
      });

      // Play notes with biological pharmacokinetic cascade
      playChordAtStep(chordNotes, mapping, currentStep);

      // Advance step for all layers
      const maxLen = Math.max(...meta.layers.map(l => l.notes.length));
      const nextStep = (currentStep + 1) % maxLen;

      if (currentStep === maxLen - 1) {
        setJustLoopedKey(upperKey);
        setTimeout(() => {
          setJustLoopedKey(prev => (prev === upperKey ? null : prev));
        }, 1200);
      }

      setMappings(prev => prev.map(m => {
        if (m.id === mapping.id) {
          return {
            ...m,
            currentStep: nextStep
          };
        }
        return m;
      }));
      return;
    }

    if (mapping.notes.length === 0) return;

    if (playMode === 'step_advance') {
      // Step-by-step advance:
      // 1. Determine note to play: currentStep (0-indexed)
      const currentStep = mapping.currentStep % mapping.notes.length;
      const noteToPlay = mapping.notes[currentStep];

      // 2. Play this note immediately
      playNoteAtStep(noteToPlay, mapping, currentStep);

      // 3. Compute next step (wrap around to 0 when finished)
      const isFinishing = currentStep === mapping.notes.length - 1;
      const nextStep = (currentStep + 1) % mapping.notes.length;

      // Show loop flash indicator if returned to the beginning
      if (isFinishing) {
        setJustLoopedKey(upperKey);
        setTimeout(() => {
          setJustLoopedKey(prev => (prev === upperKey ? null : prev));
        }, 1200);
      }

      // 4. Update the mapping state with the new position
      setMappings(prev => prev.map(m => {
        if (m.id === mapping.id) {
          return {
            ...m,
            currentStep: nextStep
          };
        }
        return m;
      }));

    } else if (playMode === 'burst_multi_tap') {
      // Burst mode: collect quick successive taps and play that many notes in rhythm
      if (!burstTimers.current[upperKey]) {
        burstTimers.current[upperKey] = { count: 0, timer: null };
      }
      const st = burstTimers.current[upperKey];
      st.count += 1;

      if (st.timer) clearTimeout(st.timer);

      // Trigger 1st note immediately for zero latency
      if (st.count === 1) {
        const step = mapping.currentStep % mapping.notes.length;
        playNoteAtStep(mapping.notes[step], mapping, step);
        const next = (step + 1) % mapping.notes.length;
        setMappings(prev => prev.map(m => m.id === mapping.id ? { ...m, currentStep: next } : m));
      }

      // Collect multiple taps
      st.timer = setTimeout(() => {
        const taps = st.count;
        st.count = 0;
        st.timer = null;

        if (taps > 1) {
          for (let i = 1; i < taps; i++) {
            setTimeout(() => {
              setMappings(currentList => {
                const cur = currentList.find(m => m.id === mapping.id);
                if (!cur || cur.notes.length === 0) return currentList;
                const s = cur.currentStep % cur.notes.length;
                playNoteAtStep(cur.notes[s], cur, s);
                const nxt = (s + 1) % cur.notes.length;
                return currentList.map(m => m.id === cur.id ? { ...m, currentStep: nxt } : m);
              });
            }, i * 160);
          }
        }
      }, 300);

    } else if (playMode === 'hold_stream') {
      // Stream step on each trigger
      const currentStep = mapping.currentStep % mapping.notes.length;
      playNoteAtStep(mapping.notes[currentStep], mapping, currentStep);
      const nextStep = (currentStep + 1) % mapping.notes.length;
      setMappings(prev => prev.map(m => m.id === mapping.id ? { ...m, currentStep: nextStep } : m));
    }
  }, [mappings, playMode, playNoteAtStep]);

  // Global Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore typing in input fields
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Key capture for modal binding
      if (listeningForKey) {
        e.preventDefault();
        const rawKey = e.key.toUpperCase();
        if ((rawKey.length === 1 && rawKey >= 'A' && rawKey <= 'Z') || (rawKey >= '0' && rawKey <= '9')) {
          setEditKey(rawKey);
          setListeningForKey(false);
        }
        return;
      }

      // Escape resets all sequences to beginning (Note 1)
      if (e.key === 'Escape') {
        handleResetAll();
        return;
      }

      const pressedKey = e.key.toUpperCase();

      // Prevent repeated key triggering if user is holding the key down and repeat is disabled
      if (preventKeyRepeat && e.repeat) {
        e.preventDefault();
        return;
      }

      const hasMapping = mappings.some(m => m.key.toUpperCase() === pressedKey);
      if (hasMapping) {
        e.preventDefault();
        handleKeyTrigger(pressedKey);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.key.toUpperCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mappings, listeningForKey, preventKeyRepeat, handleKeyTrigger]);

  // Reset a specific mapping back to Note 1 (step 0)
  const handleResetSingle = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMappings(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, currentStep: 0 };
      }
      return m;
    }));
  };

  // Reset ALL sequence positions back to Note 1 (step 0)
  const handleResetAll = () => {
    setMappings(prev => prev.map(m => ({ ...m, currentStep: 0 })));
    setLastPlayedNote(null);
    setLastPlayedMapping(null);
    setLastPlayedStepNumber(null);
    setActiveKey(null);
    onNoteTrigger(null);
  };

  // Open Edit Modal for a mapping
  const handleOpenEdit = (mapping: LiveKeyMapping, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingMappingId(mapping.id);
    setEditKey(mapping.key);
    setEditName(mapping.name);
    setEditPresetId(mapping.presetId || 'custom');
    setEditSequence(mapping.aminoSequence);
    setEditAlgorithm(mapping.algorithm);
    setEditOctave(mapping.octave);
    setEditColor(mapping.color);
    setIsEditModalOpen(true);
  };

  // Open New Mapping Modal
  const handleOpenNew = () => {
    const usedKeys = new Set(mappings.map(m => m.key.toUpperCase()));
    const candidateKeys = ['Q', 'W', 'E', 'A', 'S', 'D', 'F', 'Z', 'X', 'V', 'B', 'N', 'M', '1', '2', '3', '4'];
    const nextKey = candidateKeys.find(k => !usedKeys.has(k)) || 'T';

    setEditingMappingId(null);
    setEditKey(nextKey);
    setEditName('Oxytocin Fragment');
    setEditPresetId('oxytocin');
    setEditSequence('CYIQNCPLG');
    setEditAlgorithm('sternheimer_mass_5just');
    setEditOctave(4);
    setEditColor('emerald');
    setIsEditModalOpen(true);
  };

  // Save Mapping
  const handleSaveMapping = () => {
    const cleanKey = editKey.toUpperCase().trim() || 'A';
    const translatedNotes = translateSequenceToProteody(editSequence, editOctave, 0.75, editAlgorithm);

    if (editingMappingId) {
      setMappings(prev => prev.map(m => {
        if (m.id === editingMappingId) {
          return {
            ...m,
            key: cleanKey,
            name: editName.trim() || 'Proteody',
            presetId: editPresetId,
            aminoSequence: editSequence,
            algorithm: editAlgorithm,
            octave: editOctave,
            color: editColor,
            notes: translatedNotes,
            currentStep: 0
          };
        }
        return m;
      }));
    } else {
      const newMapping: LiveKeyMapping = {
        id: `map-custom-${Date.now()}`,
        key: cleanKey,
        name: editName.trim() || 'Proteody',
        presetId: editPresetId,
        aminoSequence: editSequence,
        algorithm: editAlgorithm,
        octave: editOctave,
        color: editColor,
        notes: translatedNotes,
        currentStep: 0
      };
      setMappings(prev => [...prev, newMapping]);
    }

    setIsEditModalOpen(false);
  };

  // Delete Mapping
  const handleDeleteMapping = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMappings(prev => prev.filter(m => m.id !== id));
  };

  // Handle preset selection in modal
  const handlePresetSelectInModal = (presetId: string) => {
    setEditPresetId(presetId);
    const p = PROTEODY_PRESETS.find(x => x.id === presetId);
    if (p) {
      setEditName(p.name);
      setEditSequence(p.aminoSequence);
      setEditOctave(p.defaultOctave);
    }
  };

  // Color theme helper
  const getColorClasses = (color: string, isActive: boolean) => {
    switch (color) {
      case 'emerald':
        return isActive 
          ? 'bg-emerald-950/90 border-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.7)] ring-2 ring-emerald-400 scale-[1.02]' 
          : 'bg-slate-950/90 border-slate-800 hover:border-emerald-500/60 text-slate-200';
      case 'cyan':
        return isActive 
          ? 'bg-cyan-950/90 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.7)] ring-2 ring-cyan-400 scale-[1.02]' 
          : 'bg-slate-950/90 border-slate-800 hover:border-cyan-500/60 text-slate-200';
      case 'amber':
        return isActive 
          ? 'bg-amber-950/90 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.7)] ring-2 ring-amber-400 scale-[1.02]' 
          : 'bg-slate-950/90 border-slate-800 hover:border-amber-500/60 text-slate-200';
      case 'purple':
        return isActive 
          ? 'bg-purple-950/90 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.7)] ring-2 ring-purple-400 scale-[1.02]' 
          : 'bg-slate-950/90 border-slate-800 hover:border-purple-500/60 text-slate-200';
      case 'rose':
        return isActive 
          ? 'bg-rose-950/90 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.7)] ring-2 ring-rose-400 scale-[1.02]' 
          : 'bg-slate-950/90 border-slate-800 hover:border-rose-500/60 text-slate-200';
      case 'indigo':
        return isActive 
          ? 'bg-indigo-950/90 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.7)] ring-2 ring-indigo-400 scale-[1.02]' 
          : 'bg-slate-950/90 border-slate-800 hover:border-indigo-500/60 text-slate-200';
      case 'coffee':
        return isActive 
          ? 'bg-amber-950 border-amber-400 text-white shadow-[0_0_25px_rgba(245,158,11,0.8)] ring-2 ring-amber-400 scale-[1.02]' 
          : 'bg-amber-950/40 border-amber-700/60 hover:border-amber-400 text-slate-200';
      default:
        return isActive 
          ? 'bg-cyan-950/90 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.7)] ring-2 ring-cyan-400 scale-[1.02]' 
          : 'bg-slate-950/90 border-slate-800 hover:border-slate-600 text-slate-200';
    }
  };

  return (
    <div id="live-performance-module" className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 shadow-xl backdrop-blur-md space-y-4 font-mono">
      {/* Module Title & Quick Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 via-emerald-500/20 to-amber-500/20 border border-cyan-500/40 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Keyboard className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-white tracking-wide">
                LIVE PROTEODY KEYBOARD &bull; STEP-BY-STEP
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                PRESS KEY TO PLAY NEXT NOTE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Each keypress advances to the next note of the protein melody &bull; Loops back to start when finished &bull; Real Eurorack CV output
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSternheimerModal}
            className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-600/50 text-xs text-amber-300 hover:text-amber-100 flex items-center gap-1.5 transition-all shadow"
            title="Inspect Joël Sternheimer Mass-to-Sound Conversion formulas"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-bold">Sternheimer Theory</span>
          </button>

          <button
            onClick={handleResetAll}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition-all"
            title="Reset all sequence playheads to Note 1 (Esc)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Reset All to Note 1</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Map New Key</span>
          </button>
        </div>
      </div>

      {/* Mode & Performance Parameters Ribbon */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Advance Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-bold">MODE:</span>
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setPlayMode('step_advance')}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                playMode === 'step_advance'
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Press mapped letter -> plays next note -> loops back to note 1 when finished"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Step-by-Step Loop (Default)</span>
            </button>

            <button
              onClick={() => setPlayMode('burst_multi_tap')}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                playMode === 'burst_multi_tap'
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Rapid multi-tap plays corresponding number of notes"
            >
              <Zap className="w-3 h-3" />
              <span>Multi-Tap Burst</span>
            </button>

            <button
              onClick={() => setPlayMode('hold_stream')}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1 ${
                playMode === 'hold_stream'
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Continuous streaming sequence"
            >
              <Repeat className="w-3 h-3" />
              <span>Continuous</span>
            </button>
          </div>
        </div>

        {/* CV & Note Parameters: Note Length & Key Repeat Guard */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Note Duration */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px]">NOTE GATE:</span>
            <input
              type="range"
              min="0.08"
              max="0.8"
              step="0.02"
              value={noteDuration}
              onChange={e => setNoteDuration(parseFloat(e.target.value))}
              className="w-20 accent-emerald-400 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer"
            />
            <span className="font-bold text-emerald-400 w-12 text-right">{(noteDuration * 1000).toFixed(0)} ms</span>
          </div>

          {/* Gate Sustain Ratio */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <span className="text-slate-400 text-[10px]">SUSTAIN:</span>
            <input
              type="range"
              min="0.3"
              max="0.95"
              step="0.05"
              value={liveGateRatio}
              onChange={e => setLiveGateRatio(parseFloat(e.target.value))}
              className="w-16 accent-amber-400 bg-slate-800 h-1.5 rounded appearance-none cursor-pointer"
            />
            <span className="text-amber-300 w-8 text-right">{(liveGateRatio * 100).toFixed(0)}%</span>
          </div>

          {/* OS Key Repeat Filter */}
          <label className="flex items-center gap-1.5 cursor-pointer border-l border-slate-800 pl-3 select-none text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={preventKeyRepeat}
              onChange={e => setPreventKeyRepeat(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span>Clean 1-press = 1-note</span>
          </label>
        </div>
      </div>

      {/* Rich Note Harmonics & Multi-Octave Voice Layering Section */}
      {profile && onProfileChange && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setShowRichHarmonics(!showRichHarmonics)}
              className="text-xs text-amber-400/90 hover:text-amber-300 font-bold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>RICHER NOTES (OCTAVE UP & DOWN VOICE LAYERS)</span>
              {showRichHarmonics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className={`px-2 py-0.5 rounded font-bold border ${
                profile.richHarmonics?.enabled
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}>
                {profile.richHarmonics?.enabled ? 'OCTAVES ACTIVE' : 'MUTED'}
              </span>
              <span className="hidden sm:inline text-slate-500">
                -1 Oct: {Math.round((profile.richHarmonics?.subOctave1Gain || 0) * 100)}% &bull; +1 Oct: {Math.round((profile.richHarmonics?.superOctave1Gain || 0) * 100)}%
              </span>
            </div>
          </div>

          {showRichHarmonics && (
            <RichHarmonicsPanel
              profile={profile}
              onChange={onProfileChange}
              engine={engine}
            />
          )}
        </div>
      )}

      {/* Live Signal HUD - Real-Time Feedback of the Note Triggered */}
      <div className={`p-3 rounded-xl border transition-all ${
        activeKey 
          ? 'bg-slate-950 border-cyan-400/90 shadow-[0_0_25px_rgba(6,182,212,0.3)]' 
          : 'bg-slate-950/70 border-slate-800'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-extrabold text-xl transition-all ${
              activeKey 
                ? 'bg-cyan-400 text-slate-950 border-white shadow-[0_0_15px_#06b6d4] scale-105' 
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}>
              {activeKey || '—'}
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>{lastPlayedMapping ? lastPlayedMapping.name : 'READY &bull; PRESS ANY MAPPED KEY (O, I, C, G, R, H, S, Y)'}</span>
                {justLoopedKey && (
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 text-[9px] font-bold animate-pulse">
                    &circlearrowright; COMPLETED & RETURNED TO NOTE 1
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-black text-white">
                  {lastPlayedNote ? `${lastPlayedNote.symbol}${lastPlayedNote.octave}` : 'Waiting for keyboard trigger'}
                </span>

                {lastPlayedStepNumber !== null && lastPlayedMapping && (
                  <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-bold">
                    Note {lastPlayedStepNumber} {lastPlayedMapping.isMeta ? `(Parallel Chord)` : `of ${lastPlayedMapping.notes.length}`}
                  </span>
                )}

                {lastPlayedNote?.aminoAcid && !lastPlayedChord && (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold">
                    {lastPlayedNote.aminoAcid} ({lastPlayedNote.aminoName})
                  </span>
                )}

                {lastPlayedNote?.interval && !lastPlayedChord && (
                  <span className="text-amber-400 text-xs font-medium">
                    {lastPlayedNote.interval.name} ({lastPlayedNote.interval.numerator}/{lastPlayedNote.interval.denominator})
                  </span>
                )}
              </div>

              {/* Biological Meta-Proteody Pharmacokinetic Cascade & Counterpoint Breakdown */}
              {lastPlayedChord && (
                <div className="space-y-1.5 mt-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      PK/PD Cascade:
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      (lastPlayedMapping?.metaConfig?.pkMode ?? 'pk_cascade') === 'pk_cascade'
                        ? 'bg-amber-950/80 border border-amber-600 text-amber-300'
                        : 'bg-cyan-950/80 border border-cyan-700 text-cyan-300'
                    }`}>
                      {(lastPlayedMapping?.metaConfig?.pkMode ?? 'pk_cascade') === 'pk_cascade'
                        ? 'Active Cascade (+0ms, +45ms, +90ms, +140ms)'
                        : 'Simultaneous Block Chord (0ms)'}
                    </span>
                    {lastPlayedMapping?.metaConfig?.enableSecondaryStructureArticulation !== false && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-mono">
                        Folding Articulation: Active
                      </span>
                    )}
                    {lastPlayedMapping?.metaConfig && (
                      <button
                        type="button"
                        onClick={() => setActiveMetaModal(lastPlayedMapping.metaConfig!)}
                        className="text-[10px] text-slate-400 hover:text-white underline font-mono ml-auto"
                      >
                        Adjust PK Kinetics &rarr;
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {lastPlayedChord.map((item, ci) => {
                      const secBadge = item.note.structureLabel;
                      const delayMs = item.pkOnsetDelayMs ?? 0;
                      return (
                        <div 
                          key={ci} 
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-mono flex items-center gap-1.5 shadow-sm"
                        >
                          <span className="text-slate-400 font-bold">{item.layerName.split(' ')[0]}:</span>
                          <strong className="text-cyan-300">{item.note.aminoAcid} ({item.note.symbol}{item.note.octave})</strong>
                          <span className="text-slate-500 text-[9px]">{formatHz(item.note.frequency)}</span>
                          {delayMs > 0 && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              +{delayMs}ms
                            </span>
                          )}
                          {secBadge && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                              {secBadge.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Sound Card CV Telemetry */}
          {lastPlayedNote && (
            <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 px-3.5 py-2 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 text-[9px] block">5-JUST FREQ:</span>
                <span className="text-slate-200 font-bold">{formatHz(lastPlayedNote.frequency)}</span>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <span className="text-slate-500 text-[9px] block">PITCH CV (L):</span>
                <span className="text-cyan-300 font-extrabold">{formatVolts(lastPlayedNote.targetVoltage, 3)}</span>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <span className="text-slate-500 text-[9px] block">ENV CV (R):</span>
                <span className="text-amber-400 font-bold">+5.000 V</span>
              </div>
              {lastPlayedNote.molecularWeight && (
                <div className="border-l border-slate-800 pl-3">
                  <span className="text-slate-500 text-[9px] block">MASS:</span>
                  <span className="text-emerald-400 font-bold">{lastPlayedNote.molecularWeight.toFixed(2)} Da</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Sequence Progression Ribbon for the Active Mapping */}
        {lastPlayedMapping && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
              <span>PROTEIN SEQUENCE POSITION:</span>
              <span className="text-cyan-400 font-bold">
                Next keypress plays: Step {lastPlayedMapping.currentStep + 1} of {lastPlayedMapping.notes.length}
                {lastPlayedMapping.currentStep === 0 && ' (Beginning)'}
              </span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
              {lastPlayedMapping.notes.slice(0, 32).map((n, idx) => {
                // Just played note
                const isJustPlayed = lastPlayedStepNumber === idx + 1;
                // Next upcoming note
                const isNextToPlay = lastPlayedMapping.currentStep === idx;

                return (
                  <div
                    key={n.id}
                    className={`flex-shrink-0 px-2 py-1 rounded text-center border text-[10px] transition-all ${
                      isJustPlayed
                        ? 'bg-cyan-400 text-slate-950 font-black border-white shadow-[0_0_12px_#06b6d4] scale-110'
                        : isNextToPlay
                        ? 'bg-slate-800 text-emerald-300 border-emerald-500 ring-1 ring-emerald-400'
                        : idx < lastPlayedMapping.currentStep
                        ? 'bg-slate-900/90 text-slate-400 border-slate-700'
                        : 'bg-slate-950 text-slate-600 border-slate-850'
                    }`}
                  >
                    <div className="text-[9px] font-bold">{n.aminoAcid}</div>
                    <div className="font-mono text-[10px]">{n.symbol}{n.octave}</div>
                  </div>
                );
              })}
              {lastPlayedMapping.notes.length > 32 && (
                <span className="text-[10px] text-slate-500 ml-1">+{lastPlayedMapping.notes.length - 32} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid of Mapped Performance Trigger Pads */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>MAPPED KEYBOARD PADS ({mappings.length})</span>
          </h3>
          <span className="text-[10px] text-slate-500">
            Press mapped key or click pad &bull; Each press plays next note &bull; Loops when finished
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {mappings.map(m => {
            const isThisKeyActive = activeKey === m.key.toUpperCase();
            const colorClass = getColorClasses(m.color, isThisKeyActive);
            const totalNotes = m.notes.length;
            const nextStepToPlay = m.currentStep; // 0-indexed next note to play
            const nextNoteObj = m.notes[nextStepToPlay];
            const isAtEnd = nextStepToPlay === 0 && totalNotes > 0;
            const progressPercent = totalNotes > 0 ? Math.round(((nextStepToPlay) / totalNotes) * 100) : 0;

            return (
              <div
                key={m.id}
                onClick={() => handleKeyTrigger(m.key)}
                className={`rounded-xl border p-3 cursor-pointer transition-all flex flex-col justify-between select-none relative group ${colorClass}`}
              >
                {/* Top Row: Key Letter Badge, Name & Action Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-9 h-9 rounded-lg border flex items-center justify-center font-black text-base shadow-sm transition-all ${
                      isThisKeyActive
                        ? 'bg-white text-slate-950 border-white scale-110 shadow-[0_0_12px_#fff]'
                        : 'bg-slate-900 border-slate-700 text-white group-hover:border-slate-500'
                    }`}>
                      {m.key}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white leading-tight truncate max-w-[125px]">
                          {m.name}
                        </h4>
                        {m.isMeta && (
                          <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider">
                            META
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {m.isMeta ? '4 Parallel Proteins &bull; Chord' : `${totalNotes} residues \u2022 Octave ${m.octave}`}
                      </span>
                    </div>
                  </div>

                  {/* Settings / Reset / Edit / Info Buttons */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {/* If Meta-Proteody: Biological Reasoning Button */}
                    {m.isMeta && m.metaConfig && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMetaModal(m.metaConfig!);
                        }}
                        className="p-1 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 hover:text-white border border-amber-700/60 transition-colors"
                        title="Why Coffee? Read Biological Reasoning & Protein Cascade"
                      >
                        <Coffee className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    )}

                    {/* Reset just this pad back to Note 1 */}
                    <button
                      onClick={(e) => handleResetSingle(m.id, e)}
                      className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors"
                      title="Reset this sequence to Note 1"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>

                    <button
                      onClick={(e) => handleOpenEdit(m, e)}
                      className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="Edit key binding, sequence or algorithm"
                    >
                      <Settings2 className="w-3 h-3" />
                    </button>

                    {mappings.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteMapping(m.id, e)}
                        className="p-1 rounded bg-slate-800/80 hover:bg-rose-900 text-slate-400 hover:text-rose-300 transition-colors"
                        title="Remove mapping"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sequence String Preview */}
                <div className="my-2 py-1.5 px-2 bg-slate-950/80 rounded border border-slate-800/80 text-[10px]">
                  <div className="flex items-center justify-between text-slate-400 mb-0.5">
                    <span>{m.isMeta ? 'NEXT CHORD STEP:' : 'NEXT NOTE:'}</span>
                    <span className="text-cyan-400 font-extrabold">
                      {nextStepToPlay === 0 
                        ? `Step 1 of ${totalNotes} (Start)`
                        : `Step ${nextStepToPlay + 1} of ${totalNotes}`}
                    </span>
                  </div>
                  {m.isMeta && m.metaConfig ? (
                    <div className="text-[10px] text-amber-300 font-mono flex items-center justify-between">
                      <span className="truncate">ADORA2A + RYR1 + DRD2 + CYP1A2</span>
                      <span className="text-[9px] text-slate-400 ml-1">4 notes</span>
                    </div>
                  ) : (
                    <div className="truncate font-mono tracking-wider text-slate-300">
                      {m.aminoSequence}
                    </div>
                  )}
                </div>

                {/* Step Progress Bar & Note Details */}
                <div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="bg-cyan-400 h-full transition-all duration-150"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    {m.isMeta && m.metaConfig ? (
                      <>
                        <span className="truncate">
                          Chord: <strong className="text-amber-300">
                            {m.metaConfig.layers.map(l => l.notes[nextStepToPlay % l.notes.length]?.aminoAcid).join(' + ')}
                          </strong>
                        </span>
                        <span className="text-amber-400 font-bold ml-1">
                          Simultaneous
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          Plays: <strong className="text-slate-200">{nextNoteObj?.symbol || 'C'}{nextNoteObj?.octave || 4}</strong> ({nextNoteObj?.aminoAcid || '?'})
                        </span>
                        <span className="text-cyan-400 font-bold">
                          {formatVolts(nextNoteObj?.targetVoltage || 2.0, 2)}
                        </span>
                      </>
                    )}
                  </div>


                  {nextStepToPlay === totalNotes - 1 && (
                    <div className="mt-1 text-[8px] text-amber-400/90 font-bold flex items-center gap-1">
                      <Repeat className="w-2.5 h-2.5" />
                      <span>Next press will loop back to Note 1</span>
                    </div>
                  )}
                </div>

                {/* Active Indicator Light */}
                {isThisKeyActive && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-ping" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info & Performance Instructions Footer */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            <strong>Sequential Playback:</strong> Each time you press a mapped key (e.g. <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-bold">O</kbd> for Oxytocin), it plays the next note in the sequence. Once the end of the peptide chain is reached, it seamlessly returns to Note 1 on the following press!
          </span>
        </div>
        <div className="text-slate-500 text-[10px]">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Esc</kbd> anytime to reset all sequence positions back to Note 1.
        </div>
      </div>

      {/* Add / Edit Key Mapping Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full shadow-2xl font-mono text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Keyboard className="w-4 h-4" />
                <span>{editingMappingId ? 'EDIT KEY MAPPING' : 'MAP NEW KEYBOARD KEY'}</span>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              {/* Keyboard Key Bind */}
              <div>
                <label className="block text-slate-300 text-[11px] mb-1">
                  KEYBOARD KEY TO TRIGGER
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={1}
                    value={editKey}
                    onChange={e => setEditKey(e.target.value.toUpperCase())}
                    className="w-16 bg-slate-950 border border-cyan-500 rounded-lg p-2 text-center text-lg font-extrabold text-cyan-300 focus:outline-none uppercase"
                  />
                  <button
                    onClick={() => setListeningForKey(true)}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                      listeningForKey
                        ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                    }`}
                  >
                    {listeningForKey ? 'Press any key now...' : 'Click to press key'}
                  </button>
                </div>
              </div>

              {/* Title / Name */}
              <div>
                <label className="block text-slate-300 text-[11px] mb-1">LABEL / TITLE</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. Oxytocin Neuropeptide"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Preset Quick Loader */}
              <div>
                <label className="block text-slate-300 text-[11px] mb-1">LOAD FROM PROTEIN LIBRARY</label>
                <select
                  value={editPresetId}
                  onChange={e => handlePresetSelectInModal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-emerald-400 focus:outline-none focus:border-emerald-500"
                >
                  <option value="custom">-- Custom Peptide Sequence --</option>
                  {PROTEODY_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.aminoSequence.length} residues)
                    </option>
                  ))}
                </select>
              </div>

              {/* Amino Acid Sequence */}
              <div>
                <label className="block text-slate-300 text-[11px] mb-1">
                  AMINO ACID CHAIN (Single-letter code)
                </label>
                <textarea
                  rows={3}
                  value={editSequence}
                  onChange={e => setEditSequence(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                  placeholder="e.g. CYIQNCPLG"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-emerald-300 font-mono tracking-widest uppercase focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              {/* Algorithm & Octave */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">ALGORITHM</label>
                  <select
                    value={editAlgorithm}
                    onChange={e => setEditAlgorithm(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="sternheimer_mass_5just">Sternheimer 5-Just (C4=256Hz)</option>
                    <option value="sternheimer_mass_continuous">Continuous Quantum Microtonal</option>
                    <option value="sternheimer_canonical">Canonical Codon Scale</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 text-[11px] mb-1">BASE OCTAVE</label>
                  <select
                    value={editOctave}
                    onChange={e => setEditOctave(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value={2}>Octave 2 (Low Bass)</option>
                    <option value={3}>Octave 3 (Mid Bass)</option>
                    <option value={4}>Octave 4 (Tenor / Standard C4=256Hz)</option>
                    <option value={5}>Octave 5 (Lead / Treble)</option>
                  </select>
                </div>
              </div>

              {/* Color Tag */}
              <div>
                <label className="block text-slate-300 text-[11px] mb-1">ACCENT COLOR</label>
                <div className="flex items-center gap-2">
                  {['emerald', 'cyan', 'amber', 'purple', 'rose', 'indigo'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        editColor === c ? 'border-white scale-110 shadow' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: 
                          c === 'emerald' ? '#10b981' :
                          c === 'cyan' ? '#06b6d4' :
                          c === 'amber' ? '#f59e0b' :
                          c === 'purple' ? '#a855f7' :
                          c === 'rose' ? '#f43f5e' : '#6366f1'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMapping}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Mapping</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meta-Proteody Biological Modal Dialog */}
      {activeMetaModal && (
        <MetaProteodyModal
          isOpen={!!activeMetaModal}
          onClose={() => setActiveMetaModal(null)}
          config={activeMetaModal}
          onUpdateConfig={(newConfig) => {
            setActiveMetaModal(newConfig);
            setMappings(prev => prev.map(m => {
              if (m.metaConfig?.id === newConfig.id) {
                return { ...m, metaConfig: newConfig };
              }
              return m;
            }));
            if (lastPlayedMapping?.metaConfig?.id === newConfig.id) {
              setLastPlayedMapping(prev => prev ? { ...prev, metaConfig: newConfig } : null);
            }
          }}
        />
      )}
    </div>
  );
};

