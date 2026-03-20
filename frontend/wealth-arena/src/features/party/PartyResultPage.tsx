import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { load } from '@/services/persistence';
import { getRoundTemplate } from '@/services/gameAdapter';
import type { GameState, PartyRoom } from '@/shared/types/domain';
import { getArchetype } from '@/shared/types/domain';
import AIGradeCard from '@/shared/components/AIGradeCard';
import AllocationDonutChart from '@/shared/components/AllocationDonutChart';
import { getRankings } from '@/services/partyApi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function PartyResultPage() {
  const state = load<GameState>('party_result');
  const room = load<PartyRoom>('party_room');
  const savedRankings = load<{ name: string; isYou: boolean; movement: number }[]>('party_final_rankings');

  // Fetch real rankings from backend
  type LeaderboardEntry = { name: string; rank: number; isYou: boolean };
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!room) return;
    getRankings(room.roomCode)
      .then((data) => {
        setLeaderboard(data.map((r, i) => ({
          name: r.name,
          rank: r.rank ?? i + 1,
          isYou: savedRankings?.find((s) => s.isYou)?.name === r.name || false,
        })));
      })
      .catch(() => {
        // Fallback to saved local rankings
        if (savedRankings) {
          setLeaderboard(savedRankings.map((r, i) => ({ name: r.name, rank: i + 1, isYou: r.isYou })));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.roomCode]);

  if (!state) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">No Party Result</h1>
        <Link to="/party" className="text-arena-accent hover:underline">Back to Party →</Link>
      </div>
    );
  }

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
        <h1 className="text-3xl font-black text-white">Party Results</h1>
        <p className="text-arena-text-dim mt-1">{room?.roomName ?? 'Party Game'}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: arch.color }} />
          <span className="font-bold" style={{ color: arch.color }}>{arch.name}</span>
          <span className="text-arena-text-dim">•</span>
          <span className={`font-mono ${totalReturn >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Leaderboard + AI Grade */}
        <div className="space-y-6">
          {/* Leaderboard */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-6">
            <h3 className="font-bold text-white mb-4">Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <p className="text-arena-text-dim text-sm">Loading rankings…</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((p) => {
                  const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`;
                  return (
                    <div
                      key={p.name}
                      className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                        p.isYou ? 'bg-arena-accent/10 border border-arena-accent/30' : 'bg-arena-bg'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-white">{medal}</span>
                        <span className={`font-medium ${p.isYou ? 'text-arena-accent' : 'text-white'}`}>
                          {p.name} {p.isYou && <span className="text-xs opacity-60">(you)</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Grade */}
          <AIGradeCard
            archetype={state.archetype}
            totalReturnPct={totalReturn}
            finalValue={state.portfolioValue}
            initialCapital={state.initialCapital}
            roundHistory={state.roundHistory.map((r) => ({
              round: r.round,
              action: r.action,
              returnPct: r.returnPct,
              driftFromArchetype: r.driftFromArchetype,
              selectedHeadlines: r.selectedHeadlines,
            }))}
          />
        </div>

        {/* Right: Charts + History */}
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

          {/* Decision History Table */}
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
        <Link to="/party" className="px-6 py-2.5 bg-arena-accent text-black font-bold rounded-lg hover:bg-arena-accent/90 transition-colors">
          Play Again
        </Link>
        <Link to="/dashboard" className="px-6 py-2.5 bg-arena-surface border border-arena-border rounded-lg text-white font-medium hover:bg-white/5 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
