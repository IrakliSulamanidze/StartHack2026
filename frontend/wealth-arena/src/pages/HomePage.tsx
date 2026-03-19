import { useGame } from '../context/GameContext';
import { MARKET_INDICES, computeIndexValue } from '../data/assets';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const ALLOC_COLORS = ['#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#94a3b8'];

const TIME_RANGES: Array<{ label: string; value: '1Y' | '1Q' | '1M' | '1W' }> = [
  { label: '1 YEAR', value: '1Y' }, { label: '1 Q', value: '1Q' },
  { label: '1 M', value: '1M' }, { label: '1 W', value: '1W' },
];

export default function HomePage() {
  const { state, dispatch, netWorth, unrealizedPL, navigate } = useGame();

  // Allocation data
  const allocMap: Record<string, number> = {};
  state.holdings.forEach(h => {
    const cat = h.type === 'stock' ? 'Stocks' : h.type === 'indexFund' ? 'Index Funds' : h.type === 'bond' ? 'Bonds' : 'ETFs';
    allocMap[cat] = (allocMap[cat] || 0) + h.quantity * (state.prices[h.ticker] ?? h.avgCost);
  });
  if (state.cash > 0) allocMap['Cash'] = state.cash;
  const total = Object.values(allocMap).reduce((s, v) => s + v, 0);
  const donutData = Object.entries(allocMap).map(([name, value], i) => ({
    name, value: Math.round(value), pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0', color: ALLOC_COLORS[i % ALLOC_COLORS.length],
  }));

  // Equity curve
  const eqData = state.portfolioHistory.map(s => ({
    label: s.round === 0 ? 'Start' : `R${s.round}`,
    value: s.value,
  }));

  // Indices
  const lastNews = state.newsItems[0];
  const impact = lastNews?.impactDirection ?? 'mixed';
  const indices = MARKET_INDICES.map(idx => {
    const val = computeIndexValue(idx, impact, state.currentRound * 31);
    const chg = ((val - idx.baseValue) / idx.baseValue) * 100;
    return { ...idx, val, chg };
  });

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Market Indices ticker */}
      <div className="flex flex-wrap gap-3 text-xs">
        {indices.map(idx => (
          <div key={idx.ticker} className="flex items-center gap-2 bg-arena-surface border border-arena-border rounded-lg px-3 py-1.5 shadow-md">
            <span className="text-arena-text-dim font-semibold">{idx.name}</span>
            <span className="text-white font-mono">{idx.val.toLocaleString()}</span>
            <span className={`font-mono ${idx.chg >= 0 ? 'text-arena-accent' : 'text-red-400'}`}>{idx.chg >= 0 ? '+' : ''}{idx.chg.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      {/* Net Worth Panel */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-1">Net Worth</p>
            <p className={`text-4xl font-bold font-mono ${netWorth >= state.startingCash ? 'text-arena-accent' : 'text-red-400'}`}>
              ${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm">
              <div><span className="text-arena-text-dim">Starting: </span><span className="text-white font-mono">${state.startingCash.toLocaleString()}</span></div>
              <div><span className="text-arena-text-dim">Cash: </span><span className="text-arena-accent font-mono">${state.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
              <div>
                <span className="text-arena-text-dim">P/L: </span>
                <span className={`font-mono font-bold ${unrealizedPL >= 0 ? 'text-arena-accent' : 'text-red-400'}`}>
                  {unrealizedPL >= 0 ? '+' : ''}${unrealizedPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {TIME_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => dispatch({ type: 'SET_TIME_RANGE', range: r.value })}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                  state.settings.timeRange === r.value
                    ? 'bg-arena-accent/20 text-arena-accent'
                    : 'bg-arena-bg text-arena-text-dim hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Allocation Donut */}
        <div className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md">
          <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-3 font-semibold">Portfolio Allocation</p>
          {donutData.length === 0 ? (
            <p className="text-arena-text-dim text-sm text-center py-8">No investments yet. Go to Trading to get started!</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                    {donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#e5e7eb', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded" style={{ background: d.color }} />
                    <span className="text-white">{d.name}</span>
                    <span className="text-arena-text-dim">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Equity Curve */}
        <div className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md">
          <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-3 font-semibold">Performance</p>
          {eqData.length < 2 ? (
            <p className="text-arena-text-dim text-sm text-center py-8">Make trades to see your performance chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={eqData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="gPerf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#e5e7eb', fontSize: 11 }} formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Value']} />
                <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} fill="url(#gPerf)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-3 font-semibold">Current Holdings</p>
        {state.holdings.length === 0 ? (
          <p className="text-arena-text-dim text-sm text-center py-4">No holdings. Visit the <button onClick={() => navigate('trading')} className="text-arena-accent hover:underline">Trading Center</button> to buy your first asset.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase text-arena-text-dim border-b border-arena-border">
                  <th className="text-left py-2 px-2">Ticker</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-right py-2 px-2">Qty</th>
                  <th className="text-right py-2 px-2">Avg Cost</th>
                  <th className="text-right py-2 px-2">Price</th>
                  <th className="text-right py-2 px-2">Mkt Value</th>
                  <th className="text-right py-2 px-2">P/L</th>
                </tr>
              </thead>
              <tbody>
                {state.holdings.map(h => {
                  const price = state.prices[h.ticker] ?? h.avgCost;
                  const mv = h.quantity * price;
                  const pl = mv - h.quantity * h.avgCost;
                  return (
                    <tr key={h.ticker} className="border-b border-arena-border/30 hover:bg-arena-bg/50">
                      <td className="py-2 px-2 font-mono font-bold text-arena-accent">{h.ticker}</td>
                      <td className="py-2 px-2 text-white">{h.name}</td>
                      <td className="py-2 px-2 text-right font-mono">{h.quantity.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-mono text-arena-text-dim">${h.avgCost.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-mono text-white">${price.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-mono text-white">${mv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className={`py-2 px-2 text-right font-mono font-bold ${pl >= 0 ? 'text-arena-accent' : 'text-red-400'}`}>
                        {pl >= 0 ? '+' : ''}${pl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade Log */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-5 shadow-md">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-3 font-semibold">Transaction Log</p>
        {state.trades.length === 0 ? (
          <p className="text-arena-text-dim text-sm text-center py-4">No trades yet.</p>
        ) : (
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {state.trades.slice().reverse().map(t => (
              <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-arena-bg/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${t.side === 'buy' ? 'bg-arena-accent/20 text-arena-accent' : 'bg-red-500/20 text-red-400'}`}>{t.side.toUpperCase()}</span>
                  <span className="text-white">{t.quantity.toLocaleString()} {t.ticker} at ${t.price.toFixed(2)}</span>
                </div>
                <span className="text-arena-text-dim">Year {t.year}, Round {t.round}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Game Modes */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-6 shadow-md">
        <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-4 font-semibold">Game Modes</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-arena-bg border border-arena-accent/30 rounded-xl p-5 text-center">
            <p className="text-lg font-bold text-white mb-1">Solo Learning</p>
            <p className="text-xs text-arena-text-dim mb-4">Practice investing with AI guidance and educational hints</p>
            <button onClick={() => { dispatch({ type: 'ADVANCE_ROUND' }); navigate('trading'); }} className="bg-arena-accent hover:bg-arena-accent-dim text-white font-bold py-2.5 px-8 rounded-xl transition-colors shadow-lg shadow-arena-accent/25 text-sm">
              Start Solo
            </button>
          </div>
          <div className="bg-arena-bg border border-arena-border rounded-xl p-5 text-center">
            <p className="text-lg font-bold text-white mb-1">Play vs Opponent</p>
            <p className="text-xs text-arena-text-dim mb-3">Compete head-to-head in timed rounds</p>
            <div className="flex gap-2 justify-center mb-3">
              {[5, 10, 15, 20].map(n => (
                <span key={n} className="bg-arena-surface border border-arena-border text-arena-text-dim text-[10px] px-2 py-1 rounded-lg font-mono">{n}R</span>
              ))}
            </div>
            <button onClick={() => { dispatch({ type: 'ADVANCE_ROUND' }); navigate('trading'); }} className="bg-arena-gold/90 hover:bg-arena-gold text-arena-bg font-bold py-2.5 px-8 rounded-xl transition-colors shadow-lg shadow-arena-gold/25 text-sm">
              Find Match
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
