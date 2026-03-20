import type { GameScore } from '@/shared/types/domain';

interface Props {
  score: GameScore;
}

export default function ScoreBreakdown({ score }: Props) {
  const totalScore = Math.round(
    score.totalReturnPct * 0.4
    + score.resilience * 25
    + score.signalFilteringQuality * 20
    + score.archetypeAlignment * 15
  );

  const rows = [
    { label: 'Return', value: Math.round(score.totalReturnPct * 0.4), max: 40, desc: 'Portfolio performance' },
    { label: 'Resilience', value: Math.round(score.resilience * 25), max: 25, desc: 'Drawdown control & consistency' },
    { label: 'Signal Filtering', value: Math.round(score.signalFilteringQuality * 20), max: 20, desc: 'Signal vs noise detection' },
    { label: 'Strategy Fidelity', value: Math.round(score.archetypeAlignment * 15), max: 15, desc: 'Alignment with chosen archetype' },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-5xl font-black text-arena-accent">{Math.max(0, Math.min(100, totalScore))}</p>
        <p className="text-sm text-arena-text-dim mt-1">Total Score / 100</p>
        <p className="text-lg font-bold text-white mt-2">{score.behaviorLabel}</p>
      </div>

      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white font-medium">{row.label}</span>
            <span className="text-arena-accent font-mono">{row.value} / {row.max}</span>
          </div>
          <div className="h-2 bg-arena-border rounded-full overflow-hidden">
            <div
              className="h-full bg-arena-accent rounded-full transition-all duration-500"
              style={{ width: `${(row.value / row.max) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-arena-text-dim mt-0.5">{row.desc}</p>
        </div>
      ))}

      <div className="border-t border-arena-border pt-3 mt-4">
        <div className="flex justify-between text-xs">
          <span className="text-arena-text-dim">Final Portfolio Value</span>
          <span className="text-white font-mono">${score.finalValue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-arena-text-dim">Total Return</span>
          <span className={score.totalReturnPct >= 0 ? 'text-arena-accent' : 'text-arena-danger'}>
            {score.totalReturnPct >= 0 ? '+' : ''}{score.totalReturnPct.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
