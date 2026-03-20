import { useState, useEffect } from 'react';
import { getRebalanceSuggestion } from '@/services/gemini';
import type { RebalanceSuggestion } from '@/services/gemini';
import { getArchetype, INSTRUMENT_CATEGORY } from '@/shared/types/domain';

interface Props {
  archetype: string;
  currentAllocation: Record<string, number>;
  round: number;
  scenarioTitle: string;
  scenarioDescription: string;
  headlines: { id: string; text: string; category: string; isSignal: boolean }[];
  onConfirm: (categoryAllocation: Record<string, number>) => void;
  onCancel: () => void;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  equities: { label: 'Equities', color: '#3b82f6' },
  bonds: { label: 'Bonds', color: '#a78bfa' },
  gold: { label: 'Gold', color: '#eab308' },
  fx: { label: 'FX', color: '#06b6d4' },
};

function aggregateToCategories(alloc: Record<string, number>): Record<string, number> {
  const cats: Record<string, number> = {};
  for (const [symbol, weight] of Object.entries(alloc)) {
    const cat = INSTRUMENT_CATEGORY[symbol] ?? symbol;
    cats[cat] = (cats[cat] ?? 0) + weight;
  }
  return cats;
}

export default function RebalanceModal({
  archetype, currentAllocation, round,
  scenarioTitle, scenarioDescription, headlines,
  onConfirm, onCancel,
}: Props) {
  const [suggestion, setSuggestion] = useState<RebalanceSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  const arch = getArchetype(archetype);
  const currentByCategory = aggregateToCategories(currentAllocation);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getRebalanceSuggestion({
      archetype,
      archetypeAllocation: arch.allocation,
      currentAllocationByCategory: currentByCategory,
      round,
      scenarioTitle,
      scenarioDescription,
      headlines: headlines.map(h => ({ text: h.text, category: h.category })),
    }).then((result) => {
      if (!cancelled) {
        setSuggestion(result);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allCategories = Object.keys(CATEGORY_META);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-arena-surface border border-arena-border rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-arena-accent/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-arena-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" /></svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">AI Rebalance Suggestion</h2>
            <p className="text-xs text-arena-text-dim">
              Based on <span className="text-arena-accent">{arch.name}</span> strategy for Round {round}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-arena-accent border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-arena-text-dim">Analyzing scenario & headlines…</p>
          </div>
        ) : suggestion ? (
          <>
            {/* Explanation */}
            <div className="bg-arena-bg border border-arena-border rounded-xl p-4 mb-4">
              <p className="text-sm text-white leading-relaxed">{suggestion.explanation}</p>
            </div>

            {/* Before → After comparison */}
            <div className="space-y-2 mb-5">
              <div className="grid grid-cols-[1fr_60px_20px_60px] gap-2 text-[10px] text-arena-text-dim font-semibold uppercase px-1">
                <span>Category</span>
                <span className="text-right">Current</span>
                <span />
                <span className="text-right">Suggested</span>
              </div>
              {allCategories.map((cat) => {
                const meta = CATEGORY_META[cat];
                const current = Math.round(currentByCategory[cat] ?? 0);
                const suggested = Math.round(suggestion.allocation[cat] ?? 0);
                const diff = suggested - current;
                return (
                  <div
                    key={cat}
                    className="grid grid-cols-[1fr_60px_20px_60px] gap-2 items-center bg-arena-bg/50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta?.color }} />
                      <span className="text-sm text-white font-medium">{meta?.label ?? cat}</span>
                    </div>
                    <span className="text-right text-sm text-arena-text-dim font-mono">{current}%</span>
                    <span className="text-center text-xs">→</span>
                    <div className="text-right">
                      <span className="text-sm text-white font-mono font-semibold">{suggested}%</span>
                      {diff !== 0 && (
                        <span className={`ml-1 text-[10px] font-mono ${diff > 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 bg-arena-bg border border-arena-border text-white font-semibold py-2.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(suggestion.allocation)}
                className="flex-1 bg-arena-accent text-black font-bold py-2.5 rounded-lg hover:bg-arena-accent/90 transition-colors"
              >
                Apply Rebalance
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
