import { useState } from 'react';
import { useGame } from '../context/GameContext';
import type { BackendAllocation } from '../types/backend';

const ASSET_ICONS: Record<string, string> = {
  equities: '📈', bonds: '🏦', fx: '💱', gold: '🥇', crypto: '₿',
};
const ASSET_COLORS: Record<string, string> = {
  equities: '#3b82f6', bonds: '#22c55e', fx: '#f59e0b', gold: '#eab308', crypto: '#a855f7',
};

const INITIAL_CAPITAL = 100_000;

export default function TradingPage() {
  const { state, dispatch, setAllocations } = useGame();
  const bs = state.backendState;

  const [draftWeights, setDraftWeights] = useState<Record<string, number>>({});
  const [initialized, setInitialized] = useState(false);
  const [success, setSuccess] = useState('');

  // No active game — prompt user to start one
  if (!bs) {
    return (
      <div className="p-6 text-center">
        <p className="text-arena-text-dim">No active game. Start a scenario first.</p>
        <button onClick={() => dispatch({ type: 'SET_PAGE', page: 'home' })} className="mt-4 text-arena-accent hover:underline text-sm">
          ← Back to Home
        </button>
      </div>
    );
  }

  // Initialize draft from current allocations (once)
  if (!initialized) {
    const existing: Record<string, number> = {};
    const portfolio = bs.portfolios?.['player1'];
    if (portfolio) {
      for (const a of portfolio.allocations) {
        if (a.weight > 0) existing[a.asset_class] = Math.round(a.weight * 100);
      }
    }
    setDraftWeights(existing);
    setInitialized(true);
  }

  const portfolioValue = state.lastTurnResult?.portfolio_value ?? (bs.portfolios?.['player1']?.current_value ?? INITIAL_CAPITAL);
  const currentCash = bs.portfolios?.['player1']?.cash ?? INITIAL_CAPITAL;
  const currentAllocations = bs.portfolios?.['player1']?.allocations ?? [];
  const hasExisting = currentAllocations.some(a => a.weight > 0);

  const draftTotal = Object.values(draftWeights).reduce((s, w) => s + w, 0);
  const draftCashPct = Math.max(0, 100 - draftTotal);
  const draftCashDollars = Math.round(portfolioValue * draftCashPct / 100);
  const isValid = draftTotal <= 100;

  // Check if draft differs from current
  const currentWeightMap: Record<string, number> = {};
  for (const a of currentAllocations) currentWeightMap[a.asset_class] = Math.round(a.weight * 100);
  const hasChanges = bs.asset_classes.some(ac =>
    (draftWeights[ac] ?? 0) !== (currentWeightMap[ac] ?? 0)
  );

  async function handleSubmit() {
    const allocs: BackendAllocation[] = [];
    for (const [ac, pct] of Object.entries(draftWeights)) {
      if (pct > 0) allocs.push({ asset_class: ac, weight: pct / 100 });
    }
    await setAllocations(allocs);
    setSuccess('Allocations updated! Your portfolio has been rebalanced.');
    window.setTimeout(() => setSuccess(''), 3000);
  }

  const turnLabel = bs.time_mode === 'monthly' ? 'Month' : bs.time_mode === 'quarterly' ? 'Quarter' : 'Year';

  return (
    <div className="p-4 sm:p-6 max-w-[900px] mx-auto space-y-5">
      {/* Success toast */}
      {success && (
        <div className="fixed right-4 top-4 z-40 rounded-xl border border-green-500/40 bg-green-500/15 px-4 py-3 text-sm font-medium text-green-300 shadow-md">
          {success}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{hasExisting ? 'Rebalance Portfolio' : 'Invest Your Capital'}</h1>
          <p className="text-xs text-arena-text-dim mt-0.5">
            {turnLabel} {bs.current_turn} of {bs.num_turns} · Portfolio: <span className="font-mono text-white">${portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> · Cash: <span className="font-mono text-arena-accent">${currentCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_PAGE', page: 'game' })}
          className="text-xs text-arena-text-dim hover:text-white bg-arena-bg border border-arena-border px-3 py-2 rounded-xl transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>

      {state.backendError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
          {state.backendError}
        </div>
      )}

      {/* Explanation */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-300">
        Set the percentage of your portfolio to allocate to each asset class. The remainder stays as cash (earning 0% return). After applying, go back to the Dashboard and advance the turn to see market returns.
      </div>

      {/* Allocation sliders */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md space-y-4">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim font-semibold">Asset Allocations</p>

        <div className="space-y-3">
          {bs.asset_classes.map(ac => {
            const sel = bs.selected_assets[ac];
            const pct = draftWeights[ac] ?? 0;
            const assetState = bs.asset_states[ac];
            const currentPct = currentWeightMap[ac] ?? 0;
            const changed = pct !== currentPct;

            return (
              <div key={ac} className={`flex items-center gap-3 bg-arena-bg border rounded-lg px-4 py-3 transition-colors ${changed ? 'border-blue-500/40' : 'border-arena-border'}`}>
                <span className="text-lg shrink-0">{ASSET_ICONS[ac] ?? '📊'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate">{sel?.symbol ?? ac}</p>
                    <span className="w-2 h-2 rounded-full" style={{ background: ASSET_COLORS[ac] ?? '#6b7280' }} />
                    {assetState && (
                      <span className={`text-[10px] font-mono ${assetState.cumulative_return_pct >= 0 ? 'text-arena-accent' : 'text-red-400'}`}>
                        {assetState.cumulative_return_pct >= 0 ? '+' : ''}{assetState.cumulative_return_pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-arena-text-dim truncate">{sel?.name ?? ac}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0} max={100} step={5}
                    value={pct}
                    onChange={e => setDraftWeights(prev => ({ ...prev, [ac]: Number(e.target.value) }))}
                    className="w-28 accent-blue-500"
                  />
                  <span className={`text-sm font-mono w-12 text-right ${changed ? 'text-blue-400 font-bold' : 'text-white'}`}>{pct}%</span>
                  <span className="text-xs font-mono text-arena-text-dim w-20 text-right">${Math.round(portfolioValue * pct / 100).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Allocation bar preview */}
        <div className="flex h-3 rounded-full overflow-hidden">
          {draftCashPct > 0 && (
            <div className="h-full bg-gray-600" style={{ width: `${draftCashPct}%` }} title={`Cash ${draftCashPct}%`} />
          )}
          {bs.asset_classes.map(ac => {
            const pct = draftWeights[ac] ?? 0;
            if (pct <= 0) return null;
            return (
              <div
                key={ac}
                className="h-full"
                style={{ width: `${pct}%`, background: ASSET_COLORS[ac] ?? '#6b7280' }}
                title={`${ac} ${pct}%`}
              />
            );
          })}
        </div>

        {/* Summary + submit */}
        <div className="flex flex-wrap items-center justify-between bg-arena-bg border border-arena-border rounded-lg px-4 py-3 gap-3">
          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-arena-text-dim">Invested: </span>
              <span className={`font-bold font-mono ${draftTotal > 100 ? 'text-red-400' : 'text-white'}`}>{draftTotal}%</span>
            </div>
            <div>
              <span className="text-arena-text-dim">Cash: </span>
              <span className="font-bold font-mono text-arena-accent">{draftCashPct}%</span>
            </div>
            <div>
              <span className="text-arena-text-dim">≈ $</span>
              <span className="font-bold font-mono text-white">{draftCashDollars.toLocaleString()}</span>
              <span className="text-arena-text-dim"> cash</span>
            </div>
          </div>
          <button
            disabled={!isValid || !hasChanges || state.backendLoading}
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm disabled:opacity-40 transition-colors"
          >
            {state.backendLoading ? 'Saving...' : 'Apply Allocations'}
          </button>
        </div>

        {!isValid && (
          <p className="text-[10px] text-red-400 text-center">Total allocation cannot exceed 100%.</p>
        )}
        {!hasChanges && isValid && (
          <p className="text-[10px] text-arena-text-dim text-center">No changes to apply. Adjust the sliders to rebalance.</p>
        )}
      </div>

      {/* Current positions summary */}
      {hasExisting && (
        <div className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md">
          <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-3 font-semibold">Current Positions</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-arena-bg border border-arena-border rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span>💵</span>
                <span className="text-sm text-white font-bold">Cash</span>
              </div>
              <span className="text-sm font-mono text-arena-accent">${currentCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            {currentAllocations.filter(a => a.weight > 0).map(a => {
              const sel = bs.selected_assets[a.asset_class];
              const exposure = a.weight * portfolioValue;
              return (
                <div key={a.asset_class} className="flex items-center justify-between bg-arena-bg border border-arena-border rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span>{ASSET_ICONS[a.asset_class] ?? '📊'}</span>
                    <span className="text-sm text-white font-bold">{sel?.symbol ?? a.asset_class}</span>
                    <span className="text-[10px] text-arena-text-dim">{(a.weight * 100).toFixed(0)}%</span>
                  </div>
                  <span className="text-sm font-mono text-white">${exposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
