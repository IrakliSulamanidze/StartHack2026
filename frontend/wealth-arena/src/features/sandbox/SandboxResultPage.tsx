import { Link } from 'react-router-dom';
import { loadSandboxState } from '@/services/persistence';
import { computeScore, getRoundTemplate } from '@/services/gameAdapter';
import type { GameState } from '@/shared/types/domain';
import { getArchetype } from '@/shared/types/domain';
import ScoreBreakdown from '@/shared/components/ScoreBreakdown';
import AllocationDonutChart from '@/shared/components/AllocationDonutChart';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function SandboxResultPage() {
  const state = loadSandboxState<GameState>();

  if (!state) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-black text-white mb-4">No Sandbox Result</h1>
        <p className="text-arena-text-dim mb-6">Start a sandbox run first.</p>
        <Link to="/sandbox/setup" className="text-arena-accent hover:underline font-semibold">Go to Sandbox Setup →</Link>
      </div>
    );
  }

  const score = computeScore(state);
  const arch = getArchetype(state.archetype);
  const totalReturn = ((state.portfolioValue - state.initialCapital) / state.initialCapital) * 100;

  // Chart data - portfolio growth
  const growthData = [
    { round: 0, value: state.initialCapital },
    ...state.roundHistory.map((r) => ({ round: r.round, value: Math.round(r.portfolioValueAfter) })),
  ];

  // Bar chart - per round returns
  const returnData = state.roundHistory.map((r) => ({
    round: `R${r.round}`,
    return: Number(r.returnPct.toFixed(2)),
    title: getRoundTemplate(r.round).title,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black text-white">🏗️ Sandbox Result</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-2xl">{arch.icon}</span>
          <span className="font-bold" style={{ color: arch.color }}>{arch.name}</span>
          <span className="text-arena-text-dim">•</span>
          <span className={`font-mono ${totalReturn >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Score */}
        <div className="bg-arena-surface border border-arena-border rounded-xl p-6">
          <ScoreBreakdown score={score} />
        </div>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Growth Chart */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Portfolio Growth</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={growthData}>
                <XAxis dataKey="round" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  width={60}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8 }}
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Portfolio']}
                />
                <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Per-Round Returns */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Per-Round Returns</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={returnData}>
                <XAxis dataKey="round" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={45} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8 }}
                  formatter={(value) => [`${value}%`, '']}
                />
                <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                  {returnData.map((entry, i) => (
                    <Cell key={i} fill={entry.return >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Round History Table */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Decision History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-arena-text-dim text-xs">
                    <th className="text-left pb-2">Round</th>
                    <th className="text-left pb-2">Theme</th>
                    <th className="text-left pb-2">Action</th>
                    <th className="text-right pb-2">Return</th>
                    <th className="text-right pb-2">Drift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena-border">
                  {state.roundHistory.map((r) => (
                    <tr key={r.round}>
                      <td className="py-2 text-white">{r.round}</td>
                      <td className="py-2 text-arena-text-dim">{getRoundTemplate(r.round).title}</td>
                      <td className="py-2 text-arena-text-dim capitalize">{r.action}</td>
                      <td className={`py-2 text-right font-mono ${r.returnPct >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
                        {r.returnPct >= 0 ? '+' : ''}{r.returnPct.toFixed(2)}%
                      </td>
                      <td className="py-2 text-right text-arena-text-dim">{r.driftFromArchetype}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Final Allocation */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-6 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-white mb-4">Final Allocation</h3>
            <AllocationDonutChart allocation={state.allocation} size={250} />
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-8 justify-center">
        <Link to="/sandbox/setup" className="px-6 py-2.5 bg-arena-accent text-black font-bold rounded-lg hover:bg-arena-accent/90 transition-colors">
          Play Again
        </Link>
        <Link to="/dashboard" className="px-6 py-2.5 bg-arena-surface border border-arena-border rounded-lg text-white font-medium hover:bg-white/5 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
