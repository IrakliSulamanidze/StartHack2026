import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ARCHETYPES } from '@/shared/types/domain';
import type { ArchetypeId, AIMode } from '@/shared/types/domain';
import { getRoundTemplate } from '@/services/gameAdapter';
import { askGemini } from '@/services/gemini';
import { getArchetype, expandArchetypeAllocation, INSTRUMENT_CATEGORY } from '@/shared/types/domain';
import ArchetypeCard from '@/shared/components/ArchetypeCard';
import HeadlineBundle from '@/shared/components/HeadlineBundle';
import AllocationEditor from '@/shared/components/AllocationEditor';
import AllocationDonutChart from '@/shared/components/AllocationDonutChart';
import AIPanel from '@/shared/components/AIPanel';
import { saveDailyResult, loadDailyStreak, saveDailyStreak } from '@/services/persistence';

// Daily puzzle uses a single scenario round — pick one based on date
function getDailyRoundIndex(): number {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return ((dayOfYear + now.getFullYear()) % 10) + 1; // 1-10
}

// Hidden next-year impacts for scoring the single allocation
const DAILY_IMPACTS: Record<string, number> = {
  equities: 3.2, bonds: 0.8, gold: 2.5, fx: -0.4,
};

export default function DailyPage() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const roundIdx = getDailyRoundIndex();
  const template = getRoundTemplate(roundIdx);
  const aiMode: AIMode = 'terminal';

  const [archetype, setArchetype] = useState<ArchetypeId>('balanced-core');
  const [allocation, setAllocation] = useState<Record<string, number>>(
    () => expandArchetypeAllocation(getArchetype('balanced-core').allocation)
  );
  const [selectedHeadlines, setSelectedHeadlines] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const streak = loadDailyStreak();
  const total = Object.values(allocation).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(total - 100) < 0.5;

  function handleAllocationChange(asset: string, value: number) {
    setAllocation((prev) => ({ ...prev, [asset]: value }));
  }

  function selectArchetype(id: ArchetypeId) {
    setArchetype(id);
    setAllocation(expandArchetypeAllocation(getArchetype(id).allocation));
  }

  function resetAllocation() {
    setAllocation(expandArchetypeAllocation(getArchetype(archetype).allocation));
  }

  function toggleHeadline(id: string) {
    setSelectedHeadlines((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  }

  function handleSubmit() {
    if (!isValid || submitted) return;
    setSubmitted(true);

    // Evaluate hidden next-year scenario
    let portfolioReturn = 0;
    for (const [symbol, weight] of Object.entries(allocation)) {
      const cat = INSTRUMENT_CATEGORY[symbol] ?? symbol;
      portfolioReturn += (weight / 100) * (DAILY_IMPACTS[cat] ?? 0);
    }

    const initialCapital = 100_000;
    const finalValue = initialCapital * (1 + portfolioReturn / 100);

    // Compute simple score
    const resilience = Math.max(0, Math.min(100, 50 + portfolioReturn * 5));
    const diversification = computeDiversification(allocation);
    const signalQuality = computeSignalScore(selectedHeadlines, template.headlines);

    const totalScore = Math.round(
      portfolioReturn * 0.45 + resilience * 0.30 + signalQuality * 0.25
    );

    // Update streak
    saveDailyStreak(streak + 1);

    // Save result
    saveDailyResult({
      date: todayStr,
      archetype,
      allocation,
      selectedHeadlines,
      scenarioTitle: template.title,
      portfolioReturn,
      finalValue,
      initialCapital,
      resilience: Math.round(resilience),
      diversification: Math.round(diversification),
      signalQuality: Math.round(signalQuality),
      totalScore: Math.max(0, Math.min(100, totalScore)),
      streak: streak + 1,
    });

    navigate('/daily/result');
  }

  const handleAIAsk = useCallback(
    (question: string): Promise<string> => askGemini(aiMode, roundIdx, question, {
      portfolioValue: 100_000,
      allocation,
      archetype,
      scenarioTitle: template.title,
      scenarioDescription: template.description,
      headlines: template.headlines,
      selectedHeadlines,
      gameMode: 'daily',
      totalRounds: 1,
    }),
    [aiMode, roundIdx, allocation, archetype, template, selectedHeadlines]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-2xl font-black text-white">Daily Puzzle</h1>
          <span className="px-3 py-1 bg-arena-accent/15 text-arena-accent text-xs font-bold rounded-full">
            {todayStr}
          </span>
          {streak > 0 && (
            <span className="px-3 py-1 bg-arena-gold/15 text-arena-gold text-xs font-bold rounded-full">
              {streak} day streak
            </span>
          )}
        </div>
        <p className="text-sm text-arena-text-dim">
          One allocation. One hidden scenario. Make it count.
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr_300px] gap-5">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Mission */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-arena-text-dim mb-2 uppercase tracking-wider">Mission</h3>
            <p className="text-sm text-white font-semibold">{template.title}</p>
            <p className="text-xs text-arena-text-dim mt-1">{template.description}</p>
          </div>

          {/* Archetype selector */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-arena-text-dim mb-3 uppercase tracking-wider">
              Investor Profile
            </h3>
            <div className="space-y-2">
              {ARCHETYPES.map((a) => (
                <ArchetypeCard
                  key={a.id}
                  archetype={a}
                  selected={archetype === a.id}
                  compact
                  onClick={() => selectArchetype(a.id)}
                />
              ))}
            </div>
          </div>

          {/* Donut */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-4 flex flex-col items-center">
            <h3 className="text-xs font-semibold text-arena-text-dim mb-2 uppercase tracking-wider self-start">
              Allocation Preview
            </h3>
            <AllocationDonutChart allocation={allocation} size={160} />
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="space-y-4">
          {/* Headlines */}
          <HeadlineBundle
            headlines={template.headlines}
            selectedIds={selectedHeadlines}
            onToggle={toggleHeadline}
          />

          {/* Allocation Editor */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-5">
            <AllocationEditor allocation={allocation} onChange={handleAllocationChange} />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={resetAllocation}
              className="flex-1 bg-arena-surface border border-arena-border text-white font-semibold py-2.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Reset Allocation
            </button>
            <button
              onClick={() => setAllocation(expandArchetypeAllocation(getArchetype(archetype).allocation))}
              className="flex-1 bg-arena-surface border border-arena-accent/30 text-arena-accent font-semibold py-2.5 rounded-lg hover:bg-arena-accent/10 transition-colors"
            >
              Fill Profile Template
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitted}
              className="flex-1 bg-arena-accent text-black font-bold py-2.5 rounded-lg hover:bg-arena-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Puzzle →
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN — Terminal AI */}
        <div className="h-[700px]">
          <AIPanel mode={aiMode} onAsk={handleAIAsk} />
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function computeDiversification(alloc: Record<string, number>): number {
  const nonZero = Object.values(alloc).filter((v) => v > 0);
  if (nonZero.length === 0) return 0;
  const max = Math.max(...nonZero);
  // More spread = higher score. Penalize concentration.
  const spread = nonZero.length / 5; // 5 possible assets
  const concentration = 1 - max / 100;
  return Math.round((spread * 50 + concentration * 50));
}

function computeSignalScore(
  selected: string[],
  headlines: { id: string; isSignal: boolean }[]
): number {
  if (headlines.length === 0) return 50;
  const signals = headlines.filter((h) => h.isSignal);
  const noise = headlines.filter((h) => !h.isSignal);
  let correct = 0;
  let total = 0;
  for (const s of signals) {
    total++;
    if (selected.includes(s.id)) correct++;
  }
  for (const n of noise) {
    total++;
    if (!selected.includes(n.id)) correct++;
  }
  return total > 0 ? Math.round((correct / total) * 100) : 50;
}
