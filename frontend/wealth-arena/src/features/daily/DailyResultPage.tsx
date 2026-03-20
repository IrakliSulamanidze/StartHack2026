import { Link } from 'react-router-dom';
import { loadDailyResult } from '@/services/persistence';
import AllocationDonutChart from '@/shared/components/AllocationDonutChart';
import { ARCHETYPES } from '@/shared/types/domain';

interface DailyResult {
  date: string;
  archetype: string;
  allocation: Record<string, number>;
  selectedHeadlines: string[];
  scenarioTitle: string;
  portfolioReturn: number;
  finalValue: number;
  initialCapital: number;
  resilience: number;
  diversification: number;
  signalQuality: number;
  fidelity: number;
  totalScore: number;
  streak: number;
}

export default function DailyResultPage() {
  const result = loadDailyResult<DailyResult>();

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-black text-white mb-4">No Daily Result</h1>
        <p className="text-arena-text-dim mb-6">You haven't completed today's puzzle yet.</p>
        <Link to="/daily" className="text-arena-accent hover:underline font-semibold">Play Today's Puzzle →</Link>
      </div>
    );
  }

  const arch = ARCHETYPES.find((a) => a.id === result.archetype);

  const scoreRows = [
    { label: 'Return',            value: Math.round(result.portfolioReturn * 0.4), max: 40, desc: 'Portfolio performance from hidden scenario' },
    { label: 'Resilience',        value: Math.round(result.resilience * 0.25),     max: 25, desc: 'How well your allocation handles stress' },
    { label: 'Signal Filtering',  value: Math.round(result.signalQuality * 0.20),  max: 20, desc: 'Correctly identified signals vs noise' },
    { label: 'Strategy Fidelity', value: Math.round(result.fidelity * 0.15),       max: 15, desc: 'Alignment with chosen archetype' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white">📅 Daily Puzzle Result</h1>
        <p className="text-arena-text-dim mt-1">{result.date} — {result.scenarioTitle}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Score Breakdown */}
        <div className="bg-arena-surface border border-arena-border rounded-xl p-6">
          <div className="text-center mb-6">
            <p className="text-5xl font-black text-arena-accent">{result.totalScore}</p>
            <p className="text-sm text-arena-text-dim mt-1">Total Score / 100</p>
          </div>

          {scoreRows.map((row) => (
            <div key={row.label} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white font-medium">{row.label}</span>
                <span className="text-arena-accent font-mono">{Math.max(0, row.value)} / {row.max}</span>
              </div>
              <div className="h-2 bg-arena-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-arena-accent rounded-full transition-all duration-500"
                  style={{ width: `${row.max > 0 ? Math.max(0, (row.value / row.max) * 100) : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-arena-text-dim mt-0.5">{row.desc}</p>
            </div>
          ))}

          <div className="border-t border-arena-border pt-3 mt-4 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-arena-text-dim">Final Portfolio Value</span>
              <span className="text-white font-mono">${result.finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-arena-text-dim">Return</span>
              <span className={result.portfolioReturn >= 0 ? 'text-arena-accent font-mono' : 'text-arena-danger font-mono'}>
                {result.portfolioReturn >= 0 ? '+' : ''}{result.portfolioReturn.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="space-y-4">
          {/* Allocation */}
          <div className="bg-arena-surface border border-arena-border rounded-xl p-6 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-arena-text-dim mb-3 self-start">YOUR ALLOCATION</h3>
            <AllocationDonutChart allocation={result.allocation} size={200} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
              <p className="text-xs text-arena-text-dim mb-1">Archetype</p>
              <p className="text-sm font-bold text-white">{arch?.icon} {arch?.name ?? result.archetype}</p>
            </div>
            <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
              <p className="text-xs text-arena-text-dim mb-1">Streak</p>
              <p className="text-sm font-bold text-arena-gold">🔥 {result.streak} day{result.streak !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
              <p className="text-xs text-arena-text-dim mb-1">Resilience</p>
              <p className="text-sm font-bold text-white">{result.resilience}/100</p>
            </div>
            <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
              <p className="text-xs text-arena-text-dim mb-1">Diversification</p>
              <p className="text-sm font-bold text-white">{result.diversification}/100</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mt-8 justify-center">
        <Link to="/dashboard" className="px-6 py-2.5 bg-arena-surface border border-arena-border rounded-lg text-white font-medium hover:bg-white/5 transition-colors">
          Back to Dashboard
        </Link>
        <Link to="/sandbox/setup" className="px-6 py-2.5 bg-arena-accent text-black font-bold rounded-lg hover:bg-arena-accent/90 transition-colors">
          Try Sandbox Mode
        </Link>
      </div>
    </div>
  );
}
