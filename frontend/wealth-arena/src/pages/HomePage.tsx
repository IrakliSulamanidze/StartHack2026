import { useState } from 'react';
import { useGame } from '../context/GameContext';
import type { BackendAssetClass, BackendDifficulty, BackendTimeMode } from '../types/backend';

const DIFFICULTIES: { id: BackendDifficulty; label: string; desc: string; color: string }[] = [
  { id: 'beginner', label: 'Beginner', desc: 'Fewer turns, gentler regimes, AI coach hints', color: 'green' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Moderate turns, wider regimes, analyst-level hints', color: 'yellow' },
  { id: 'advanced', label: 'Advanced', desc: 'Full-length, all regimes, no hints', color: 'red' },
];

const TIME_MODES: { id: BackendTimeMode; label: string; desc: string }[] = [
  { id: 'monthly', label: 'Monthly', desc: 'One turn = one month' },
  { id: 'quarterly', label: 'Quarterly', desc: 'One turn = one quarter' },
  { id: 'yearly', label: 'Yearly', desc: 'One turn = one year' },
];

const ASSET_OPTIONS: { id: BackendAssetClass; label: string; icon: string }[] = [
  { id: 'equities', label: 'Equities', icon: '📈' },
  { id: 'bonds', label: 'Bonds', icon: '🏦' },
  { id: 'fx', label: 'Currencies', icon: '💱' },
  { id: 'gold', label: 'Gold', icon: '🥇' },
  { id: 'crypto', label: 'Crypto', icon: '₿' },
];

const DEFAULT_TURNS: Record<string, Record<string, number>> = {
  beginner:     { monthly: 24, quarterly: 8, yearly: 10 },
  intermediate: { monthly: 36, quarterly: 12, yearly: 15 },
  advanced:     { monthly: 60, quarterly: 20, yearly: 20 },
};

export default function HomePage() {
  const { state, startBackendGame } = useGame();

  const [difficulty, setDifficulty] = useState<BackendDifficulty>('beginner');
  const [timeMode, setTimeMode] = useState<BackendTimeMode>('monthly');
  const [selectedAssets, setSelectedAssets] = useState<BackendAssetClass[]>(['equities', 'bonds', 'gold']);

  function toggleAsset(ac: BackendAssetClass) {
    setSelectedAssets(prev =>
      prev.includes(ac) ? prev.filter(a => a !== ac) : [...prev, ac]
    );
  }

  const turns = DEFAULT_TURNS[difficulty]?.[timeMode] ?? 24;

  return (
    <div className="p-4 sm:p-6 max-w-[760px] mx-auto space-y-6">
      {/* Hero */}
      <div className="text-center py-6">
        <p className="text-4xl mb-2">⚔️</p>
        <h1 className="text-2xl font-bold text-white">Wealth<span className="text-arena-accent">Arena</span></h1>
        <p className="text-sm text-arena-text-dim mt-1">Build your portfolio. Beat the benchmark. Learn by doing.</p>
      </div>

      {state.backendError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
          {state.backendError}
        </div>
      )}

      {/* Step 1: Difficulty */}
      <section className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md space-y-3">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim font-semibold">1 · Difficulty</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DIFFICULTIES.map(d => {
            const active = difficulty === d.id;
            const ring = d.color === 'green' ? 'ring-green-500/50 border-green-500/30 bg-green-500/10'
              : d.color === 'yellow' ? 'ring-yellow-500/50 border-yellow-500/30 bg-yellow-500/10'
              : 'ring-red-500/50 border-red-500/30 bg-red-500/10';
            const textColor = d.color === 'green' ? 'text-green-400' : d.color === 'yellow' ? 'text-yellow-400' : 'text-red-400';
            return (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`p-4 rounded-xl border text-left transition-all ${active ? `${ring} ring-2` : 'bg-arena-bg border-arena-border hover:border-arena-border/80'}`}
              >
                <p className={`text-sm font-bold ${active ? textColor : 'text-white'}`}>{d.label}</p>
                <p className="text-[10px] text-arena-text-dim mt-0.5">{d.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Time Mode */}
      <section className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md space-y-3">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim font-semibold">2 · Turn Frequency</p>
        <div className="grid grid-cols-3 gap-3">
          {TIME_MODES.map(t => {
            const active = timeMode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTimeMode(t.id)}
                className={`p-4 rounded-xl border text-center transition-all ${active ? 'bg-arena-accent/10 border-arena-accent/30 ring-2 ring-arena-accent/50' : 'bg-arena-bg border-arena-border hover:border-arena-border/80'}`}
              >
                <p className={`text-sm font-bold ${active ? 'text-arena-accent' : 'text-white'}`}>{t.label}</p>
                <p className="text-[10px] text-arena-text-dim mt-0.5">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 3: Asset Classes */}
      <section className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md space-y-3">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim font-semibold">3 · Asset Classes</p>
        <p className="text-[10px] text-arena-text-dim">Select at least 2 asset classes to trade</p>
        <div className="flex flex-wrap gap-2">
          {ASSET_OPTIONS.map(a => {
            const active = selectedAssets.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggleAsset(a.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  active
                    ? 'bg-arena-accent/10 border-arena-accent/30 text-arena-accent font-bold'
                    : 'bg-arena-bg border-arena-border text-arena-text-dim hover:text-white hover:border-arena-border/80'
                }`}
              >
                <span>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Summary + Start */}
      <section className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-arena-text-dim">Difficulty: </span>
            <span className="text-white font-bold capitalize">{difficulty}</span>
          </div>
          <div>
            <span className="text-arena-text-dim">Turns: </span>
            <span className="text-white font-bold">{turns} {timeMode}</span>
          </div>
          <div>
            <span className="text-arena-text-dim">Assets: </span>
            <span className="text-white font-bold">{selectedAssets.length} classes</span>
          </div>
          <div>
            <span className="text-arena-text-dim">Capital: </span>
            <span className="text-arena-accent font-bold font-mono">$100,000</span>
          </div>
        </div>
        <button
          disabled={state.backendLoading || selectedAssets.length < 2}
          onClick={() => startBackendGame({
            game_mode: 'sandbox',
            time_mode: timeMode,
            ai_level: difficulty === 'beginner' ? 1 : difficulty === 'intermediate' ? 2 : 3,
            difficulty,
            asset_classes: selectedAssets,
          })}
          className="w-full bg-arena-accent hover:bg-arena-accent-dim text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-arena-accent/25 text-base disabled:opacity-50"
        >
          {state.backendLoading ? 'Creating scenario...' : '⚔️ Start Sandbox Game'}
        </button>
        {selectedAssets.length < 2 && (
          <p className="text-[10px] text-red-400 text-center">Select at least 2 asset classes</p>
        )}
      </section>
    </div>
  );
}
