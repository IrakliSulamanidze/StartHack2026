import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameState, AIMode } from '@/shared/types/domain';
import { createGame, getRoundTemplate, advanceRound } from '@/services/gameAdapter';
import { askGemini } from '@/services/gemini';
import { load, saveSandboxState } from '@/services/persistence';
import HeadlineBundle from '@/shared/components/HeadlineBundle';
import AllocationEditor from '@/shared/components/AllocationEditor';
import AllocationDonutChart from '@/shared/components/AllocationDonutChart';
import AIPanel from '@/shared/components/AIPanel';
import RoundProgressBar from '@/shared/components/RoundProgressBar';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SandboxConfig {
  archetype: string;
  aiMode: string;
}

export default function SandboxPlayPage() {
  const navigate = useNavigate();
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedHeadlines, setSelectedHeadlines] = useState<string[]>([]);
  const [showRoundSummary, setShowRoundSummary] = useState(false);

  // Initialize game from config
  useEffect(() => {
    const config = load<SandboxConfig>('sandbox_config');
    if (!config) {
      navigate('/sandbox/setup');
      return;
    }
    const g = createGame(
      'sandbox',
      config.archetype as GameState['archetype'],
      'balanced-growth',
      config.aiMode as AIMode,
    );
    setGame(g);
  }, [navigate]);

  function toggleHeadline(id: string) {
    setSelectedHeadlines((prev) => prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]);
  }

  function submitAction(action: 'keep' | 'rebalance' | 'custom') {
    if (!game) return;
    const alloc = action === 'custom' ? game.allocation : null;
    const next = advanceRound(game, action, alloc, selectedHeadlines);
    setGame(next);
    setSelectedHeadlines([]);

    if (next.isComplete) {
      saveSandboxState(next);
      navigate('/sandbox/result');
    } else {
      setShowRoundSummary(true);
    }
  }

  function dismissSummary() {
    setShowRoundSummary(false);
  }

  const handleAllocationChange = useCallback((asset: string, value: number) => {
    setGame((prev) => prev ? { ...prev, allocation: { ...prev.allocation, [asset]: value } } : prev);
  }, []);

  const handleAIAsk = useCallback((question: string): Promise<string> => {
    if (!game) return Promise.resolve('');
    const t = getRoundTemplate(game.currentRound);
    return askGemini(game.aiMode, game.currentRound, question, {
      portfolioValue: game.portfolioValue,
      allocation: game.allocation,
      archetype: game.archetype,
      scenarioTitle: t.title,
      scenarioDescription: t.description,
      headlines: t.headlines,
      selectedHeadlines,
      gameMode: 'sandbox',
    });
  }, [game, selectedHeadlines]);

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-arena-text-dim animate-pulse">Loading game…</div>
      </div>
    );
  }

  const template = getRoundTemplate(game.currentRound);
  const returnSoFar = ((game.portfolioValue - game.initialCapital) / game.initialCapital) * 100;
  const lastRound = game.roundHistory[game.roundHistory.length - 1];

  // Chart data
  const chartData = [
    { round: 0, portfolio: game.initialCapital, benchmark: game.initialCapital },
    ...game.roundHistory.map((r) => ({
      round: r.round,
      portfolio: Math.round(r.portfolioValueAfter),
      benchmark: Math.round(game.initialCapital * (1 + 0.005 * r.round)), // simple mock benchmark
    })),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Progress Bar */}
      <RoundProgressBar
        current={game.currentRound}
        total={game.totalRounds}
        titles={Array.from({ length: 10 }, (_, i) => getRoundTemplate(i + 1).title)}
      />

      {/* Round Summary Overlay */}
      {showRoundSummary && lastRound && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-arena-surface border border-arena-border rounded-2xl p-8 max-w-md w-full">
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
              <div className="flex justify-between">
                <span className="text-arena-text-dim">Archetype Drift</span>
                <span className={`font-mono ${lastRound.driftFromArchetype <= 10 ? 'text-arena-accent' : 'text-arena-danger'}`}>
                  {lastRound.driftFromArchetype}%
                </span>
              </div>
            </div>
            <button
              onClick={dismissSummary}
              className="w-full bg-arena-accent text-black font-bold py-2.5 rounded-lg hover:bg-arena-accent/90 transition-colors"
            >
              Continue to Round {game.currentRound} →
            </button>
          </div>
        </div>
      )}

      {/* Main Game Layout */}
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
          <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{template.title}</h2>
                <p className="text-sm text-arena-text-dim mt-1">{template.description}</p>
              </div>
              <span className="text-3xl">{game.currentRound <= 3 ? '🟢' : game.currentRound <= 6 ? '🟡' : '🔴'}</span>
            </div>
          </div>

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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => submitAction('keep')}
              className="flex-1 bg-arena-surface border border-arena-border text-white font-semibold py-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              🔒 Keep Current
            </button>
            <button
              onClick={() => submitAction('rebalance')}
              className="flex-1 bg-arena-surface border border-arena-accent/30 text-arena-accent font-semibold py-3 rounded-lg hover:bg-arena-accent/10 transition-colors"
            >
              ⚖️ Rebalance
            </button>
            <button
              onClick={() => submitAction('custom')}
              className="flex-1 bg-arena-accent text-black font-bold py-3 rounded-lg hover:bg-arena-accent/90 transition-colors"
            >
              ✅ Submit Custom
            </button>
          </div>
        </div>

        {/* Right: AI Panel */}
        <div className="h-[650px]">
          <AIPanel mode={game.aiMode} onAsk={handleAIAsk} />
        </div>
      </div>
    </div>
  );
}
