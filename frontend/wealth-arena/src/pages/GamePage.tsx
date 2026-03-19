import { useGame } from '../context/GameContext';
import type { BackendAssetState, BackendAllocation } from '../types/backend';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Visual config ──

const ASSET_COLORS: Record<string, string> = {
  equities: '#3b82f6',
  bonds: '#22c55e',
  fx: '#f59e0b',
  gold: '#eab308',
  crypto: '#a855f7',
};

const ASSET_ICONS: Record<string, string> = {
  equities: '📈', bonds: '🏦', fx: '💱', gold: '🥇', crypto: '₿',
};

// ── Derived holding row — presentation layer ──
// Assumptions:
//   1. weight = fraction of TOTAL portfolio (not just invested portion)
//   2. exposure = weight × portfolio_value
//   3. cash is tracked separately by backend
//   4. P/L = exposure_now - (weight × initial_capital)

interface HoldingRow {
  assetClass: string;
  symbol: string;
  name: string;
  weight: number;
  exposure: number;
  initialExposure: number;
  priceIndex: number;
  turnReturnPct: number;
  cumReturnPct: number;
  plDollars: number;
  isInShock: boolean;
  priceHistory: number[];
}

const INITIAL_CAPITAL = 100_000;

function buildHoldings(
  assetStates: Record<string, BackendAssetState>,
  allocations: BackendAllocation[],
  portfolioValue: number,
): HoldingRow[] {
  return allocations
    .filter(a => a.weight > 0)
    .map(alloc => {
      const ac = alloc.asset_class;
      const a = assetStates[ac];
      if (!a) return null;
      const exposure = alloc.weight * portfolioValue;
      const initialExposure = alloc.weight * INITIAL_CAPITAL;
      return {
        assetClass: ac,
        symbol: a.symbol ?? ac,
        name: a.name ?? ac,
        weight: alloc.weight,
        exposure,
        initialExposure,
        priceIndex: a.current_price,
        turnReturnPct: a.turn_return_pct,
        cumReturnPct: a.cumulative_return_pct,
        plDollars: exposure - initialExposure,
        isInShock: a.is_in_shock,
        priceHistory: a.price_history,
      } satisfies HoldingRow;
    }).filter((h): h is HoldingRow => h !== null);
}

export default function GamePage() {
  const { state, dispatch, advanceBackendTurn } = useGame();
  const bs = state.backendState;
  const tr = state.lastTurnResult;

  if (!bs) {
    return (
      <div className="p-6 text-center">
        <p className="text-arena-text-dim">No active game. Go to Home to start a new scenario.</p>
        <button onClick={() => dispatch({ type: 'SET_PAGE', page: 'home' })} className="mt-4 text-arena-accent hover:underline text-sm">
          ← Back to Home
        </button>
      </div>
    );
  }

  // ── Core values ──
  const portfolioValue = tr?.portfolio_value ?? INITIAL_CAPITAL;
  const portfolioCash = tr?.portfolio_cash ?? (bs.portfolios?.['player1']?.cash ?? INITIAL_CAPITAL);
  const portfolioReturn = portfolioValue - INITIAL_CAPITAL;
  const portfolioReturnPct = ((portfolioValue / INITIAL_CAPITAL) - 1) * 100;
  const benchmarkReturnPct = bs.benchmark_state.cumulative_return_pct;
  const alphaPct = portfolioReturnPct - benchmarkReturnPct;
  const turnLabel = bs.time_mode === 'monthly' ? 'Month' : bs.time_mode === 'quarterly' ? 'Quarter' : 'Year';

  // ── Player allocations (only non-zero invested positions) ──
  const playerPortfolio = bs.portfolios?.['player1'] ?? null;
  const allocations: BackendAllocation[] = (playerPortfolio?.allocations ?? []).filter(a => a.weight > 0);
  const investedWeight = allocations.reduce((s, a) => s + a.weight, 0);
  const cashWeight = 1 - investedWeight;
  const hasInvested = allocations.length > 0;

  // ── Holdings rows (only invested assets) ──
  const holdings = buildHoldings(bs.asset_states, allocations, portfolioValue);
  const totalPL = holdings.reduce((s, h) => s + h.plDollars, 0);

  // ── Performance chart ──
  const perfData = state.portfolioHistory.map((s, i) => ({
    label: s.round === 0 ? 'Start' : `T${s.round}`,
    portfolio: s.value,
    benchmark: bs.benchmark_state.value_history[i] != null
      ? (bs.benchmark_state.value_history[i] / 100) * INITIAL_CAPITAL
      : undefined,
  }));

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">{bs.regime_label}</h1>
          <p className="text-xs text-arena-text-dim mt-0.5">
            {turnLabel} {bs.current_turn} of {bs.num_turns} · {bs.time_mode} · Seed {bs.seed}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => dispatch({ type: 'SET_PAGE', page: 'trading' })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition-colors text-sm"
          >
            {hasInvested ? 'Rebalance' : 'Invest'} →
          </button>
          <button
            disabled={state.backendLoading || bs.is_complete}
            onClick={() => advanceBackendTurn()}
            className="bg-arena-accent hover:bg-arena-accent-dim text-white font-bold py-2 px-5 rounded-xl transition-colors shadow-lg shadow-arena-accent/25 text-sm disabled:opacity-50"
          >
            {state.backendLoading ? 'Processing...' : bs.is_complete ? 'Game Over' : `Next ${turnLabel} →`}
          </button>
          <button
            onClick={() => dispatch({ type: 'RESET_GAME' })}
            className="text-xs text-arena-text-dim hover:text-white bg-arena-bg border border-arena-border px-3 py-2 rounded-xl transition-colors"
          >
            End Game
          </button>
        </div>
      </div>

      {state.backendError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
          {state.backendError}
        </div>
      )}

      {/* ── Portfolio Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Portfolio Value"
          value={`$${portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${portfolioReturn >= 0 ? '+' : ''}$${portfolioReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          positive={portfolioReturn >= 0}
        />
        <SummaryCard
          label="Cash"
          value={`$${portfolioCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${(cashWeight * 100).toFixed(0)}% of portfolio`}
          positive={true}
          muted
        />
        <SummaryCard
          label="Benchmark"
          value={`${benchmarkReturnPct >= 0 ? '+' : ''}${benchmarkReturnPct.toFixed(2)}%`}
          sub={bs.benchmark_state.label}
          positive={benchmarkReturnPct >= 0}
          muted
        />
        <SummaryCard
          label="Alpha"
          value={`${alphaPct >= 0 ? '+' : ''}${alphaPct.toFixed(2)}%`}
          sub={alphaPct >= 0 ? 'Beating benchmark' : 'Trailing benchmark'}
          positive={alphaPct >= 0}
        />
      </div>

      {/* ── Performance Chart ── */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-3 font-semibold">Portfolio Performance</p>
        {perfData.length < 2 ? (
          <p className="text-arena-text-dim text-sm text-center py-8">Advance turns to see performance.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={perfData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="gPort" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#e5e7eb', fontSize: 11 }}
                formatter={(v, name) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name === 'portfolio' ? 'Portfolio' : 'Benchmark']}
              />
              <Area type="monotone" dataKey="portfolio" stroke="#22c55e" strokeWidth={2} fill="url(#gPort)" />
              {perfData.some(d => d.benchmark != null) && (
                <Area type="monotone" dataKey="benchmark" stroke="#3b82f6" strokeWidth={1.5} fill="none" strokeDasharray="5 5" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Holdings Panel ── */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-wider text-arena-text-dim font-semibold">Current Holdings</p>
          {hasInvested && (
            <div className="text-right">
              <span className="text-[10px] text-arena-text-dim mr-2">Invested P/L</span>
              <span className={`text-sm font-bold font-mono ${totalPL >= 0 ? 'text-arena-accent' : 'text-red-400'}`}>
                {totalPL >= 0 ? '+' : ''}${totalPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>

        {/* Cash row — always visible */}
        <div className="bg-arena-bg border border-arena-border rounded-xl px-4 py-3 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">💵</span>
              <div>
                <p className="text-sm font-bold text-white">Cash</p>
                <p className="text-[10px] text-arena-text-dim">Uninvested capital · 0% return</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold font-mono text-arena-accent">
                ${portfolioCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-arena-text-dim">{(cashWeight * 100).toFixed(0)}% of portfolio</p>
            </div>
          </div>
        </div>

        {/* Allocation bar (only if invested) */}
        {hasInvested && (
          <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
            {cashWeight > 0.005 && (
              <div className="h-full bg-gray-600" style={{ width: `${cashWeight * 100}%` }} title={`Cash ${(cashWeight * 100).toFixed(0)}%`} />
            )}
            {holdings.map(h => (
              <div
                key={h.assetClass}
                className="h-full"
                style={{ width: `${h.weight * 100}%`, background: ASSET_COLORS[h.assetClass] ?? '#6b7280' }}
                title={`${h.symbol} ${(h.weight * 100).toFixed(1)}%`}
              />
            ))}
          </div>
        )}

        {/* Invested holdings cards */}
        {holdings.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-arena-text-dim text-sm">No investments yet.</p>
            <button
              onClick={() => dispatch({ type: 'SET_PAGE', page: 'trading' })}
              className="text-blue-400 hover:text-blue-300 text-xs mt-1 underline"
            >
              Go to Invest tab to allocate capital →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {holdings.map(h => (
              <HoldingCard key={h.assetClass} holding={h} />
            ))}
          </div>
        )}
      </div>

      {/* ── Market Overview (always show available assets with prices) ── */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-3 font-semibold">Market Overview</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.values(bs.asset_states).map(a => {
            const isInvested = allocations.some(al => al.asset_class === a.asset_class);
            return (
              <div key={a.asset_class} className={`flex items-center justify-between bg-arena-bg border rounded-lg px-3 py-2.5 ${a.is_in_shock ? 'border-red-500/50' : 'border-arena-border'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: ASSET_COLORS[a.asset_class] ?? '#6b7280' }} />
                  <div>
                    <p className="text-xs font-bold text-white">{a.symbol ?? a.asset_class}</p>
                    <p className="text-[9px] text-arena-text-dim capitalize">
                      {a.asset_class}{isInvested ? ' · Held' : ''}{a.is_in_shock ? ' · SHOCK' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-white">{a.current_price.toFixed(2)}</p>
                  <span className={`text-[10px] font-mono ${a.turn_return_pct >= 0 ? 'text-arena-accent' : 'text-red-400'}`}>
                    {a.turn_return_pct >= 0 ? '+' : ''}{a.turn_return_pct.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Market Events ── */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-3 font-semibold">Market Events</p>
        {state.newsItems.length === 0 ? (
          <p className="text-arena-text-dim text-sm text-center py-4">No events yet. Advance turns to see market news.</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {state.newsItems.map(n => (
              <div key={n.id} className={`bg-arena-bg border rounded-lg p-3 ${
                n.impactDirection === 'positive' ? 'border-arena-accent/30' :
                n.impactDirection === 'negative' ? 'border-red-500/30' : 'border-arena-border'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">{n.title}</p>
                    <p className="text-xs text-arena-text-dim mt-0.5">{n.details}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      n.impactDirection === 'positive' ? 'bg-arena-accent/20 text-arena-accent' :
                      n.impactDirection === 'negative' ? 'bg-red-500/20 text-red-400' :
                      'bg-arena-border text-arena-text-dim'
                    }`}>{n.impactDirection}</span>
                    <p className="text-[10px] text-arena-text-dim mt-1">{turnLabel} {n.round}</p>
                  </div>
                </div>
                {n.tickers.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {n.tickers.map(t => (
                      <span key={t} className="text-[10px] bg-arena-surface border border-arena-border px-1.5 py-0.5 rounded text-arena-text-dim capitalize">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Game Complete Banner ── */}
      {bs.is_complete && (
        <div className="bg-arena-gold/10 border border-arena-gold/30 rounded-xl p-6 text-center">
          <p className="text-2xl font-bold text-arena-gold">Game Complete!</p>
          <p className="text-sm text-arena-text-dim mt-2">
            Final portfolio: <span className="text-white font-mono font-bold">${portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            {' · '}Return: <span className={`font-mono font-bold ${portfolioReturn >= 0 ? 'text-arena-accent' : 'text-red-400'}`}>
              {portfolioReturnPct >= 0 ? '+' : ''}{portfolioReturnPct.toFixed(2)}%
            </span>
            {' · '}Benchmark: <span className="text-arena-blue font-mono font-bold">{benchmarkReturnPct >= 0 ? '+' : ''}{benchmarkReturnPct.toFixed(2)}%</span>
          </p>
          <button
            onClick={() => dispatch({ type: 'RESET_GAME' })}
            className="mt-4 bg-arena-accent hover:bg-arena-accent-dim text-white font-bold py-2.5 px-8 rounded-xl transition-colors text-sm"
          >
            New Game
          </button>
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ──

function SummaryCard({ label, value, sub, positive, muted }: {
  label: string; value: string; sub: string; positive: boolean; muted?: boolean;
}) {
  const color = muted ? 'text-blue-400' : positive ? 'text-arena-accent' : 'text-red-400';
  return (
    <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
      <p className="text-[10px] uppercase text-arena-text-dim tracking-wider">{label}</p>
      <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-arena-text-dim mt-0.5 line-clamp-1">{sub}</p>
    </div>
  );
}

function HoldingCard({ holding: h }: { holding: HoldingRow }) {
  const color = ASSET_COLORS[h.assetClass] ?? '#6b7280';
  const isUp = h.turnReturnPct >= 0;
  const cumUp = h.cumReturnPct >= 0;

  return (
    <div className={`bg-arena-bg border rounded-xl px-4 py-3 transition-all ${h.isInShock ? 'border-red-500/50 shadow-red-500/10 shadow-md' : 'border-arena-border hover:border-arena-border/80'}`}>
      <div className="flex items-center justify-between gap-3">
        {/* Left: identity */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg shrink-0">{ASSET_ICONS[h.assetClass] ?? '📊'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white truncate">{h.symbol}</p>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              {h.isInShock && <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">SHOCK</span>}
            </div>
            <p className="text-[10px] text-arena-text-dim truncate">{h.name}</p>
          </div>
        </div>

        {/* Center: weight + exposure */}
        <div className="hidden sm:block text-center shrink-0 w-28">
          <p className="text-sm font-bold font-mono text-white">${h.exposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-arena-text-dim">{(h.weight * 100).toFixed(1)}% weight</p>
        </div>

        {/* Right: returns */}
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1.5">
            <span className={`text-sm font-bold font-mono ${isUp ? 'text-arena-accent' : 'text-red-400'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(h.turnReturnPct).toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 mt-0.5">
            <span className={`text-[10px] font-mono ${cumUp ? 'text-arena-accent' : 'text-red-400'}`}>
              {cumUp ? '+' : ''}{h.cumReturnPct.toFixed(2)}% total
            </span>
            <span className={`text-[10px] font-mono ${h.plDollars >= 0 ? 'text-arena-accent' : 'text-red-400'}`}>
              {h.plDollars >= 0 ? '+' : ''}${h.plDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile: weight row */}
      <div className="sm:hidden flex items-center justify-between mt-2 text-[10px] text-arena-text-dim">
        <span>{(h.weight * 100).toFixed(1)}% weight</span>
        <span className="font-mono text-white">${h.exposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </div>

      {/* Mini sparkline bar (price history) */}
      {h.priceHistory.length > 1 && (
        <div className="flex items-end gap-px mt-2 h-4">
          {h.priceHistory.map((p, i) => {
            const min = Math.min(...h.priceHistory);
            const max = Math.max(...h.priceHistory);
            const range = max - min || 1;
            const pct = ((p - min) / range) * 100;
            const prev = i > 0 ? h.priceHistory[i - 1] : p;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${Math.max(pct, 8)}%`,
                  background: p >= prev ? ASSET_COLORS[h.assetClass] ?? '#22c55e' : '#ef4444',
                  opacity: i === h.priceHistory.length - 1 ? 1 : 0.5,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
