import { useState, useEffect } from 'react';
import type { AIGrading } from '@/services/gemini';
import { getAIGrading } from '@/services/gemini';

interface Props {
  archetype: string;
  totalReturnPct: number;
  finalValue: number;
  initialCapital: number;
  roundHistory: {
    round: number;
    action: string;
    returnPct: number;
    driftFromArchetype: number;
    selectedHeadlines: string[];
  }[];
}

const SCORE_ROWS = [
  { key: 'returnScore' as const, label: 'Return', max: 40, desc: 'Portfolio performance', color: '#22c55e' },
  { key: 'resilienceScore' as const, label: 'Resilience', max: 25, desc: 'Drawdown control & consistency', color: '#3b82f6' },
  { key: 'signalScore' as const, label: 'Signal Filtering', max: 20, desc: 'Signal vs noise detection', color: '#a855f7' },
  { key: 'fidelityScore' as const, label: 'Strategy Fidelity', max: 15, desc: 'Alignment with chosen archetype', color: '#f59e0b' },
];

function scoreColor(total: number): string {
  if (total >= 80) return '#22c55e';
  if (total >= 60) return '#3b82f6';
  if (total >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function AIGradeCard(props: Props) {
  const [grading, setGrading] = useState<AIGrading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAIGrading(props).then((g) => {
      if (!cancelled) {
        setGrading(g);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="bg-arena-surface border border-arena-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          AI Performance Review
        </h3>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-8 h-8 border-2 border-arena-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-arena-text-dim text-sm">AI is analyzing your game…</p>
        </div>
      </div>
    );
  }

  if (!grading) return null;

  return (
    <div className="bg-arena-surface border border-arena-border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        AI Performance Review
      </h3>

      {/* Big Total Score */}
      <div className="text-center mb-6">
        <p className="text-5xl font-black" style={{ color: scoreColor(grading.totalScore) }}>
          {grading.totalScore}
        </p>
        <p className="text-sm text-arena-text-dim mt-1">Total Score / 100</p>
        <p className="text-lg font-bold text-white mt-2">{grading.behaviorLabel}</p>
      </div>

      {/* Score Bars */}
      <div className="space-y-4 mb-6">
        {SCORE_ROWS.map((row) => {
          const value = grading[row.key];
          const pct = (value / row.max) * 100;
          return (
            <div key={row.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white font-medium">{row.label}</span>
                <span className="font-mono" style={{ color: row.color }}>
                  {value} / {row.max}
                </span>
              </div>
              <div className="h-2.5 bg-arena-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: row.color }}
                />
              </div>
              <p className="text-[10px] text-arena-text-dim mt-0.5">{row.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Final Stats */}
      <div className="border-t border-arena-border pt-3 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-arena-text-dim">Final Portfolio Value</span>
          <span className="text-white font-mono">${grading.totalScore >= 0 ? props.finalValue.toLocaleString() : props.finalValue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-arena-text-dim">Total Return</span>
          <span className={props.totalReturnPct >= 0 ? 'text-arena-accent' : 'text-arena-danger'}>
            {props.totalReturnPct >= 0 ? '+' : ''}{props.totalReturnPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* AI Comment */}
      <div className="bg-arena-bg/60 border border-arena-border rounded-lg p-4">
        <p className="text-xs text-arena-text-dim mb-1 font-semibold">AI Commentary</p>
        <p className="text-sm text-white leading-relaxed">{grading.comment}</p>
      </div>
    </div>
  );
}
