import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameState, ClassroomRoom } from '@/shared/types/domain';
import { createGame, getRoundTemplate, advanceRound } from '@/services/gameAdapter';
import { askGemini } from '@/services/gemini';
import { load, save } from '@/services/persistence';
import HeadlineBundle from '@/shared/components/HeadlineBundle';
import AllocationEditor from '@/shared/components/AllocationEditor';
import RoundProgressBar from '@/shared/components/RoundProgressBar';

export default function ClassroomPlayPage() {
  const navigate = useNavigate();
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedHeadlines, setSelectedHeadlines] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(180);

  useEffect(() => {
    const room = load<ClassroomRoom>('classroom_room');
    if (!room) {
      navigate('/classroom');
      return;
    }
    const g = createGame('classroom', room.archetype, 'balanced-growth', 'assistant');
    setGame(g);
  }, [navigate]);

  // Timer
  useEffect(() => {
    if (!game || game.isComplete) return;
    if (timeLeft <= 0) {
      submitAction('keep');
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, game]);

  function toggleHeadline(id: string) {
    setSelectedHeadlines((prev) => prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]);
  }

  function submitAction(action: 'keep' | 'rebalance' | 'custom') {
    if (!game) return;
    const alloc = action === 'custom' ? game.allocation : null;
    const next = advanceRound(game, action, alloc, selectedHeadlines);
    setGame(next);
    setSelectedHeadlines([]);
    setTimeLeft(120);

    if (next.isComplete) {
      save('classroom_result', next);
      navigate('/classroom/result');
    }
  }

  const handleAllocationChange = useCallback((asset: string, value: number) => {
    setGame((prev) => prev ? { ...prev, allocation: { ...prev.allocation, [asset]: value } } : prev);
  }, []);

  const handleAIAsk = useCallback((question: string): Promise<string> => {
    if (!game) return Promise.resolve('');
    const t = getRoundTemplate(game.currentRound);
    return askGemini('assistant', game.currentRound, question, {
      portfolioValue: game.portfolioValue,
      allocation: game.allocation,
      archetype: game.archetype,
      scenarioTitle: t.title,
      scenarioDescription: t.description,
      headlines: t.headlines,
      selectedHeadlines,
      gameMode: 'classroom',
    });
  }, [game, selectedHeadlines]);

  // Suppress unused - will be used when AI panel is added to classroom
  void handleAIAsk;

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-arena-text-dim animate-pulse">Loading classroom game…</div>
      </div>
    );
  }

  const template = getRoundTemplate(game.currentRound);
  const returnSoFar = ((game.portfolioValue - game.initialCapital) / game.initialCapital) * 100;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {/* Timer & Progress */}
      <div className="flex items-center justify-between mb-4">
        <RoundProgressBar
          current={game.currentRound}
          total={game.totalRounds}
          titles={Array.from({ length: 10 }, (_, i) => getRoundTemplate(i + 1).title)}
        />
        <div className={`ml-4 text-2xl font-mono font-bold ${timeLeft <= 30 ? 'text-arena-danger animate-pulse' : 'text-white'}`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Portfolio Stats Bar */}
      <div className="flex items-center gap-6 bg-arena-surface border border-arena-border rounded-xl px-6 py-3 mb-4">
        <div>
          <span className="text-xs text-arena-text-dim">Portfolio</span>
          <p className="text-xl font-black text-white">${game.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div>
          <span className="text-xs text-arena-text-dim">Return</span>
          <p className={`text-lg font-mono font-bold ${returnSoFar >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
            {returnSoFar >= 0 ? '+' : ''}{returnSoFar.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Round Content */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-4 mb-4">
        <h2 className="text-lg font-bold text-white">{template.title}</h2>
        <p className="text-sm text-arena-text-dim mt-1">{template.description}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
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
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => submitAction('keep')}
          className="flex-1 bg-arena-surface border border-arena-border text-white font-semibold py-3 rounded-lg hover:bg-white/5"
        >
          🔒 Keep
        </button>
        <button
          onClick={() => submitAction('rebalance')}
          className="flex-1 bg-arena-surface border border-arena-accent/30 text-arena-accent font-semibold py-3 rounded-lg hover:bg-arena-accent/10"
        >
          ⚖️ Rebalance
        </button>
        <button
          onClick={() => submitAction('custom')}
          className="flex-1 bg-arena-accent text-black font-bold py-3 rounded-lg hover:bg-arena-accent/90"
        >
          ✅ Submit
        </button>
      </div>
    </div>
  );
}
