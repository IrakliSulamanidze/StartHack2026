import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameState, PartyRoom } from '@/shared/types/domain';
import { createGame, getRoundTemplate, advanceRound } from '@/services/gameAdapter';
import { askGemini } from '@/services/gemini';
import { load, save } from '@/services/persistence';
import { useAuth } from '@/features/auth/AuthContext';
import HeadlineBundle from '@/shared/components/HeadlineBundle';
import AllocationEditor from '@/shared/components/AllocationEditor';
import AllocationDonutChart from '@/shared/components/AllocationDonutChart';
import AIPanel from '@/shared/components/AIPanel';
import RoundProgressBar from '@/shared/components/RoundProgressBar';
import { PartySocket } from '@/services/partyApi';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type RankEntry = { name: string; isYou: boolean; movement: number };

export default function PartyPlayPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState<GameState | null>(null);
  const [room, setRoom] = useState<PartyRoom | null>(null);
  const [selectedHeadlines, setSelectedHeadlines] = useState<string[]>([]);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [roundRankings, setRoundRankings] = useState<RankEntry[]>([]);
  const prevRankMapRef = useRef<Map<string, number>>(new Map());
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    const r = load<PartyRoom>('party_room');
    if (!r) {
      navigate('/party');
      return;
    }
    setRoom(r);
    const g = createGame('party', r.archetype, 'balanced-growth', 'terminal');
    setGame(g);
  }, [navigate]);

  // WebSocket connection
  useEffect(() => {
    if (!room) return;
    const socket = new PartySocket(room.roomCode);
    socketRef.current = socket;

    socket.connect().catch(() => {
      // If WS fails, game still works locally (no real-time rankings)
    });

    const unsub = socket.onMessage((msg) => {
      if (msg.type === 'rankings') {
        const newRankings: RankEntry[] = msg.rankings.map((r, idx) => {
          const isYou = r.userId === String(user?.id ?? '');
          const prevRank = prevRankMapRef.current.get(r.userId) ?? (idx + 1);
          const movement = prevRank - (idx + 1);
          return { name: r.name, isYou, movement };
        });
        const newRankMap = new Map<string, number>();
        msg.rankings.forEach((r, idx) => newRankMap.set(r.userId, idx + 1));
        prevRankMapRef.current = newRankMap;
        setRoundRankings(newRankings);
      }
    });

    return () => {
      unsub();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [room, user]);

  // Timer
  useEffect(() => {
    if (!game || game.isComplete || showRoundSummary) return;
    if (timeLeft <= 0) {
      submitAction('keep');
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, game, showRoundSummary]);

  function toggleHeadline(id: string) {
    setSelectedHeadlines((prev) => prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]);
  }

  function submitAction(action: 'keep' | 'custom') {
    if (!game || !room) return;
    const alloc = action === 'custom' ? game.allocation : null;
    const next = advanceRound(game, action, alloc, selectedHeadlines);
    setGame(next);
    setSelectedHeadlines([]);

    const playerReturn = ((next.portfolioValue - next.initialCapital) / next.initialCapital) * 100;
    const completedRound = next.roundHistory[next.roundHistory.length - 1]?.round ?? 1;

    // Send round data to backend via WebSocket
    if (next.isComplete) {
      socketRef.current?.sendGameComplete(next.portfolioValue, playerReturn, completedRound);
      socketRef.current?.requestRankings();
      // Wait briefly for rankings to arrive, then navigate
      setTimeout(() => {
        save('party_result', next);
        save('party_final_rankings', roundRankings);
        navigate('/party/result');
      }, 800);
    } else {
      socketRef.current?.sendRoundComplete(completedRound, next.portfolioValue, playerReturn, action, next.allocation);
      socketRef.current?.requestRankings();
      // Show summary immediately — rankings will update via WS callback
      // Set a basic "you" entry as placeholder until real rankings arrive
      if (roundRankings.length === 0) {
        setRoundRankings([{ name: user?.name ?? 'You', isYou: true, movement: 0 }]);
      }
      setShowRoundSummary(true);
    }
  }

  function dismissSummary() {
    setShowRoundSummary(false);
    setTimeLeft(120);
  }

  const handleAllocationChange = useCallback((asset: string, value: number) => {
    setGame((prev) => prev ? { ...prev, allocation: { ...prev.allocation, [asset]: value } } : prev);
  }, []);

  const handleAIAsk = useCallback((question: string): Promise<string> => {
    if (!game) return Promise.resolve('');
    const t = getRoundTemplate(game.currentRound);
    return askGemini('terminal', game.currentRound, question, {
      portfolioValue: game.portfolioValue,
      allocation: game.allocation,
      archetype: game.archetype,
      scenarioTitle: t.title,
      scenarioDescription: t.description,
      headlines: t.headlines,
      selectedHeadlines,
      gameMode: 'party',
    });
  }, [game, selectedHeadlines]);

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-arena-text-dim animate-pulse">Loading party game…</div>
      </div>
    );
  }

  const template = getRoundTemplate(game.currentRound);
  const returnSoFar = ((game.portfolioValue - game.initialCapital) / game.initialCapital) * 100;
  const lastRound = game.roundHistory[game.roundHistory.length - 1];
  const heavyLoss = lastRound && lastRound.returnPct <= -2;

  // Chart data
  const chartData = [
    { round: 0, portfolio: game.initialCapital, benchmark: game.initialCapital },
    ...game.roundHistory.map((r) => ({
      round: r.round,
      portfolio: Math.round(r.portfolioValueAfter),
      benchmark: Math.round(game.initialCapital * (1 + 0.005 * r.round)),
    })),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 relative">
      {/* Red screen flash for heavy losses */}
      {heavyLoss && (
        <div className="fixed inset-0 pointer-events-none z-40 bg-red-900/20 border-4 border-red-500/40 animate-pulse" />
      )}

      {/* Progress Bar + Timer */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <RoundProgressBar
            current={game.currentRound}
            total={game.totalRounds}
            titles={Array.from({ length: 10 }, (_, i) => getRoundTemplate(i + 1).title)}
          />
        </div>
        <div className={`text-2xl font-mono font-bold shrink-0 ${timeLeft <= 30 ? 'text-arena-danger animate-pulse' : 'text-white'}`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Room badge */}
      {room && (
        <div className="mt-2 flex items-center gap-2 text-xs text-arena-text-dim">
          <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded-full font-mono font-bold">{room.roomCode}</span>
          <span>{room.roomName}</span>
        </div>
      )}

      {/* Round Summary Overlay */}
      {showRoundSummary && lastRound && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-arena-surface border border-arena-border rounded-2xl p-8 max-w-lg w-full">
            <h2 className="text-xl font-bold text-white mb-2">Round {lastRound.round} Complete</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-arena-text-dim">Action</span>
                <span className="text-white font-medium capitalize">{lastRound.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-arena-text-dim">Return</span>
                <span className={lastRound.returnPct >= 0 ? 'text-arena-accent font-mono' : 'text-arena-danger font-mono'}>
                  {lastRound.returnPct >= 0 ? '+' : ''}{lastRound.returnPct.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-arena-text-dim">Portfolio Value</span>
                <span className="text-white font-mono">${lastRound.portfolioValueAfter.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Rankings */}
            {roundRankings.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-arena-text-dim uppercase tracking-wider mb-3">Current Standings</h3>
                <div className="space-y-1.5">
                  {roundRankings.map((entry, idx) => {
                    const rank = idx + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                    const movementIcon = entry.movement > 0 ? '▲' : entry.movement < 0 ? '▼' : '—';
                    const movementColor = entry.movement > 0 ? 'text-arena-accent' : entry.movement < 0 ? 'text-arena-danger' : 'text-arena-text-dim';
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                          entry.isYou ? 'bg-arena-accent/10 border border-arena-accent/30' : 'bg-white/[0.03]'
                        }`}
                      >
                        <span className="w-8 text-center font-bold text-white">{medal}</span>
                        <span className={`flex-1 font-medium ${entry.isYou ? 'text-arena-accent' : 'text-white'}`}>
                          {entry.name} {entry.isYou && <span className="text-xs opacity-60">(you)</span>}
                        </span>
                        <span className={`text-xs font-mono font-bold ${movementColor}`}>
                          {movementIcon} {entry.movement !== 0 && Math.abs(entry.movement)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={dismissSummary}
              className="w-full bg-arena-accent text-black font-bold py-2.5 rounded-lg hover:bg-arena-accent/90 transition-colors"
            >
              Continue to Round {game.currentRound} →
            </button>
          </div>
        </div>
      )}

      {/* Main Game Layout — same 3-col as Sandbox */}
      <div className="mt-4 grid lg:grid-cols-[280px_1fr_280px] gap-4">
        {/* Left Panel: Stats */}
        <div className="space-y-4">
          <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
            <h3 className="text-xs text-arena-text-dim font-semibold mb-1 uppercase">Portfolio Value</h3>
            <p className="text-3xl font-black text-white">${game.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className={`text-sm font-mono ${returnSoFar >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
              {returnSoFar >= 0 ? '+' : ''}{returnSoFar.toFixed(2)}%
            </p>
          </div>

          <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
            <h3 className="text-xs text-arena-text-dim font-semibold mb-2 uppercase">Allocation</h3>
            <AllocationDonutChart allocation={game.allocation} size={180} />
          </div>

          {/* Performance Chart */}
          {chartData.length > 1 && (
            <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
              <h3 className="text-xs text-arena-text-dim font-semibold mb-2 uppercase">Performance</h3>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData}>
                  <XAxis dataKey="round" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#6b7280' }} width={45} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                  />
                  <Line type="monotone" dataKey="portfolio" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="benchmark" stroke="#6b7280" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Center: Round Content */}
        <div className="space-y-4">
          <HeadlineBundle
            headlines={template.headlines}
            selectedIds={selectedHeadlines}
            onToggle={toggleHeadline}
          />

          <AllocationEditor
            allocation={game.allocation}
            onChange={handleAllocationChange}
            currentRound={game.currentRound}
          />

          {/* Action Buttons — Keep + Submit only (no rebalance in competition) */}
          <div className="flex gap-3">
            <button
              onClick={() => submitAction('keep')}
              className="flex-1 bg-arena-surface border border-arena-border text-white font-semibold py-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              Keep Current
            </button>
            <button
              onClick={() => submitAction('custom')}
              className="flex-1 bg-arena-accent text-black font-bold py-3 rounded-lg hover:bg-arena-accent/90 transition-colors"
            >
              Submit Allocation
            </button>
          </div>
        </div>

        {/* Right: AI Helper */}
        <div className="h-[650px]">
          <AIPanel mode="terminal" onAsk={handleAIAsk} />
        </div>
      </div>
    </div>
  );
}
