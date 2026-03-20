import { Link } from 'react-router-dom';
import { load } from '@/services/persistence';
import { computeScore, getRoundTemplate } from '@/services/gameAdapter';
import type { GameState, ClassroomRoom } from '@/shared/types/domain';
import { getArchetype } from '@/shared/types/domain';
import ScoreBreakdown from '@/shared/components/ScoreBreakdown';

export default function ClassroomResultPage() {
  const state = load<GameState>('classroom_result');
  const room = load<ClassroomRoom>('classroom_room');

  if (!state) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">No Classroom Result</h1>
        <Link to="/classroom" className="text-arena-accent hover:underline">Back to Classroom →</Link>
      </div>
    );
  }

  const score = computeScore(state);
  const arch = getArchetype(state.archetype);

  // Mock leaderboard with some pseudo-random entries
  const mockPlayers = (room?.players ?? [{ id: '1', name: 'You', isHost: false }]).map((p, i) => ({
    name: p.name,
    score: i === 0 ? score.totalReturnPct : Math.round(Math.random() * 30 - 5),
    rank: 0,
  }));
  mockPlayers.sort((a, b) => b.score - a.score);
  mockPlayers.forEach((p, i) => { p.rank = i + 1; });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white">🏫 Classroom Results</h1>
        <p className="text-arena-text-dim mt-1">{room?.roomName ?? 'Classroom Game'}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span>{arch.icon}</span>
          <span className="font-bold" style={{ color: arch.color }}>{arch.name}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="bg-arena-surface border border-arena-border rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">🏆 Leaderboard</h3>
          <div className="space-y-2">
            {mockPlayers.map((p) => (
              <div
                key={p.name}
                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  p.rank === 1 ? 'bg-arena-accent/10 border border-arena-accent/30' : 'bg-arena-bg'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${p.rank <= 3 ? 'text-arena-accent' : 'text-arena-text-dim'}`}>
                    #{p.rank}
                  </span>
                  <span className="text-white font-medium">{p.name}</span>
                </div>
                <span className={`font-mono ${p.score >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
                  {p.score >= 0 ? '+' : ''}{p.score.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Your Score */}
        <div className="bg-arena-surface border border-arena-border rounded-xl p-6">
          <h3 className="font-bold text-white mb-4">Your Performance</h3>
          <ScoreBreakdown score={score} />
        </div>
      </div>

      {/* Round History */}
      <div className="mt-6 bg-arena-surface border border-arena-border rounded-xl p-6">
        <h3 className="font-bold text-white mb-4">Round History</h3>
        <div className="space-y-2">
          {state.roundHistory.map((r) => (
            <div key={r.round} className="flex items-center justify-between text-sm bg-arena-bg rounded-lg px-4 py-2">
              <span className="text-arena-text-dim">R{r.round}: {getRoundTemplate(r.round).title}</span>
              <span className="text-xs text-arena-text-dim capitalize">{r.action}</span>
              <span className={r.returnPct >= 0 ? 'text-arena-accent font-mono' : 'text-arena-danger font-mono'}>
                {r.returnPct >= 0 ? '+' : ''}{r.returnPct.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 mt-8 justify-center">
        <Link to="/classroom" className="px-6 py-2.5 bg-arena-accent text-black font-bold rounded-lg hover:bg-arena-accent/90">
          Play Again
        </Link>
        <Link to="/dashboard" className="px-6 py-2.5 bg-arena-surface border border-arena-border rounded-lg text-white font-medium hover:bg-white/5">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
