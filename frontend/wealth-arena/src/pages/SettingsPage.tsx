import { useState } from 'react';
import { useGame, type DifficultyMode } from '../context/GameContext';

const MODES: { id: DifficultyMode; label: string; desc: string; color: string }[] = [
  { id: 'beginner', label: 'Beginner', desc: 'Simple market orders, educational hints, basic instruments', color: 'green' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Limit orders, sector analytics, dividend yields visible', color: 'yellow' },
  { id: 'advanced', label: 'Advanced', desc: 'Full analytics, stop orders, all asset classes, minimal hints', color: 'red' },
];

const STARTING_CASH_OPTIONS = [50_000, 100_000, 250_000, 500_000, 1_000_000];

export default function SettingsPage() {
  const { state, dispatch } = useGame();
  const [confirmReset, setConfirmReset] = useState(false);

  function handleExport() {
    const csv = [
      'Side,Ticker,Name,Quantity,Price,Total,Round,Year,Timestamp',
      ...state.trades.map(t =>
        `${t.side},${t.ticker},"${t.name}",${t.quantity},${t.price.toFixed(2)},${t.total.toFixed(2)},${t.round},${t.year},${new Date(t.timestamp).toISOString()}`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth-arena-trades-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    dispatch({ type: 'RESET_GAME' });
    setConfirmReset(false);
  }

  return (
    <div className="p-4 sm:p-6 max-w-[760px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-xs text-arena-text-dim mt-0.5">Customize your experience</p>
      </div>

      {/* Profile */}
      <section className="bg-arena-surface border border-arena-border rounded-xl p-4 sm:p-6 shadow-md space-y-4">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim font-semibold">User Profile</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase text-arena-text-dim font-semibold mb-1 block">Display Name</label>
            <input
              type="text"
              value={state.settings.displayName}
              onChange={e => dispatch({ type: 'UPDATE_SETTINGS', settings: { displayName: e.target.value } })}
              className="w-full bg-arena-bg border border-arena-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-arena-accent/50"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-arena-text-dim font-semibold mb-1 block">School / Organization</label>
            <input
              type="text"
              value={state.settings.school}
              onChange={e => dispatch({ type: 'UPDATE_SETTINGS', settings: { school: e.target.value } })}
              placeholder="Optional"
              className="w-full bg-arena-bg border border-arena-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-arena-text-dim focus:outline-none focus:ring-1 focus:ring-arena-accent/50"
            />
          </div>
        </div>
      </section>

      {/* Difficulty Mode */}
      <section className="bg-arena-surface border border-arena-border rounded-xl p-4 sm:p-6 shadow-md space-y-4">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim font-semibold">Game Configuration</p>

        <div>
          <label className="text-[10px] uppercase text-arena-text-dim font-semibold mb-2 block">Difficulty Mode</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MODES.map(m => {
              const active = state.mode === m.id;
              const ring = m.color === 'green' ? 'ring-green-500/50' : m.color === 'yellow' ? 'ring-yellow-500/50' : 'ring-red-500/50';
              const bg = m.color === 'green' ? 'bg-green-500/10 border-green-500/30' : m.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30';
              const text = m.color === 'green' ? 'text-green-400' : m.color === 'yellow' ? 'text-yellow-400' : 'text-red-400';
              return (
                <button
                  key={m.id}
                  onClick={() => dispatch({ type: 'SET_MODE', mode: m.id })}
                  className={`p-3 rounded-xl border text-left transition-all ${active ? `${bg} ${ring} ring-2` : 'bg-arena-bg border-arena-border hover:border-arena-border/80'}`}
                >
                  <p className={`text-sm font-bold ${active ? text : 'text-white'}`}>{m.label}</p>
                  <p className="text-[10px] text-arena-text-dim mt-0.5">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase text-arena-text-dim font-semibold mb-2 block">Starting Cash (new games)</label>
          <div className="flex gap-2 flex-wrap">
            {STARTING_CASH_OPTIONS.map(amt => (
              <button
                key={amt}
                onClick={() => dispatch({ type: 'UPDATE_SETTINGS', settings: { startingCash: amt } })}
                className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-colors ${
                  state.settings.startingCash === amt
                    ? 'bg-arena-accent/20 text-arena-accent border border-arena-accent/30'
                    : 'bg-arena-bg text-arena-text-dim border border-arena-border hover:text-white'
                }`}
              >
                ${(amt / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-arena-surface border border-arena-border rounded-xl p-4 sm:p-6 shadow-md space-y-3">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim font-semibold">Notifications</p>
        {([
          { key: 'hintsEnabled' as const, label: 'Educational Hints', desc: 'Show tips when making trades' },
          { key: 'riskWarnings' as const, label: 'Risk Warnings', desc: 'Warn about concentrated positions' },
          { key: 'plAlerts' as const, label: 'P/L Alerts', desc: 'Notify on significant portfolio changes' },
        ]).map(opt => (
          <div key={opt.key} className="flex items-center justify-between gap-3 bg-arena-bg border border-arena-border/70 rounded-xl p-4">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-sm text-white font-medium">{opt.label}</p>
              <p className="text-[11px] text-arena-text-dim leading-relaxed">{opt.desc}</p>
            </div>
            <button
              onClick={() => dispatch({ type: 'UPDATE_SETTINGS', settings: { [opt.key]: !state.settings[opt.key] } })}
              className={`w-11 h-6 shrink-0 rounded-full transition-colors relative ${state.settings[opt.key] ? 'bg-arena-accent' : 'bg-arena-border'}`}
              aria-label={`Toggle ${opt.label}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 bg-white rounded-full transition-transform shadow ${state.settings[opt.key] ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </section>

      {/* Data Control */}
      <section className="bg-arena-surface border border-arena-border rounded-xl p-4 sm:p-6 shadow-md space-y-3">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim font-semibold">Data Control</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={state.trades.length === 0}
            className="text-xs font-semibold bg-arena-bg border border-arena-border text-white hover:bg-arena-accent/10 hover:border-arena-accent/30 px-5 py-2.5 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Export Transaction History
          </button>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-5 py-2.5 rounded-xl transition-colors"
            >
              Reset Game / Portfolio
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
              <span className="text-xs text-red-400">Are you sure? This cannot be undone.</span>
              <button onClick={handleReset} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg">Yes, Reset</button>
              <button onClick={() => setConfirmReset(false)} className="text-xs text-arena-text-dim hover:text-white">Cancel</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
