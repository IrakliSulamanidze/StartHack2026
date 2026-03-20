/**
 * Game adapter — bridges frontend game model to backend.
 * Uses mock data for MVP; designed for easy backend swap.
 */

import type { ArchetypeId, ObjectiveId, AIMode, GameState, RoundTemplate, RoundResult, GameScore } from '@/shared/types/domain';
import { getArchetype, expandArchetypeAllocation, INSTRUMENT_CATEGORY } from '@/shared/types/domain';

const INITIAL_CAPITAL = 100_000;
const TOTAL_ROUNDS = 10;

// ── Mock Round Templates ──

const ROUND_TEMPLATES: RoundTemplate[] = [
  {
    round: 1, title: 'Initial Allocation', description: 'Markets are stable. Set your opening portfolio based on your archetype strategy. Review the last 5 years of data and allocate wisely.',
    headlines: [
      { id: 'r1h1', text: 'Global Markets Close Year With Steady Gains', detail: 'Major indices posted moderate returns, with S&P 500 up 12% YTD.', isSignal: true, impactDirection: 'positive', category: 'market' },
      { id: 'r1h2', text: 'Central Banks Signal Stable Monetary Policy', detail: 'Fed and ECB maintain current rates, citing balanced inflation outlook.', isSignal: true, impactDirection: 'positive', category: 'policy' },
      { id: 'r1h3', text: 'New Study Shows Coffee Improves Trading Performance', detail: 'Researchers find marginal correlation between caffeine and returns.', isSignal: false, impactDirection: 'mixed', category: 'noise' },
      { id: 'r1h4', text: 'Bond Yields Remain at Multi-Year Lows', detail: 'Government bonds offer 2.1% yield, attracting stability-focused investors.', isSignal: true, impactDirection: 'mixed', category: 'bonds' },
      { id: 'r1h5', text: 'Celebrity Investor Launches New Fund', detail: 'Popular influencer enters asset management with aggressive strategy.', isSignal: false, impactDirection: 'mixed', category: 'noise' },
    ],
  },
  {
    round: 2, title: 'Calm Expansion', description: 'The economy is growing. Earnings are beating expectations. Consumer confidence is high.',
    headlines: [
      { id: 'r2h1', text: 'Tech Giants Report Record Quarterly Earnings', detail: 'AAPL, MSFT, GOOGL all beat estimates by 8-15%.', isSignal: true, impactDirection: 'positive', category: 'earnings' },
      { id: 'r2h2', text: 'Manufacturing PMI Rises to 58.3', detail: 'Expanding factory output signals continued economic strength.', isSignal: true, impactDirection: 'positive', category: 'macro' },
      { id: 'r2h3', text: 'Social Media Buzz About "Next Big Stock"', detail: 'Reddit forums speculate on unknown micro-cap companies.', isSignal: false, impactDirection: 'mixed', category: 'noise' },
      { id: 'r2h4', text: 'Employment Hits Record Highs Across EU', detail: 'European labor markets show strongest performance in a decade.', isSignal: true, impactDirection: 'positive', category: 'macro' },
      { id: 'r2h5', text: 'Gold Drifts Lower as Risk Appetite Returns', detail: 'Safe-haven demand weakens as equities rally.', isSignal: true, impactDirection: 'negative', category: 'gold' },
      { id: 'r2h6', text: 'Astrologer Predicts Market Will Moon in Leo Season', detail: 'Pseudoscience meets Wall Street.', isSignal: false, impactDirection: 'mixed', category: 'noise' },
    ],
  },
  {
    round: 3, title: 'Noise Trap', description: 'Headlines are everywhere. Some scream danger, others opportunity. Separating signal from noise is critical.',
    headlines: [
      { id: 'r3h1', text: 'BREAKING: Minor Regulatory Fine for Major Bank', detail: '$50M fine for compliance issue — immaterial to balance sheet.', isSignal: false, impactDirection: 'negative', category: 'noise' },
      { id: 'r3h2', text: 'Inflation Ticks Up 0.2% — Within Expectations', detail: 'Monthly CPI comes in at consensus. No policy change expected.', isSignal: true, impactDirection: 'mixed', category: 'macro' },
      { id: 'r3h3', text: '"Expert" Claims Market Crash Imminent', detail: 'Perma-bear analyst predicts crash for 15th consecutive year.', isSignal: false, impactDirection: 'negative', category: 'noise' },
      { id: 'r3h4', text: 'Bond Market Sends Mixed Signals on Duration', detail: 'Short-term yields flat, long-term slightly inverted.', isSignal: true, impactDirection: 'mixed', category: 'bonds' },
      { id: 'r3h5', text: 'Hedge Fund Liquidates $2B Position — Market Panics Briefly', detail: 'Large forced selling triggers 3% dip, recovers within hours.', isSignal: false, impactDirection: 'negative', category: 'noise' },
      { id: 'r3h6', text: 'New Trade Deal Boosts Emerging Market Sentiment', detail: 'US-ASEAN trade agreement expected to lift exports.', isSignal: true, impactDirection: 'positive', category: 'macro' },
      { id: 'r3h7', text: 'Viral TikTok Claims "Bonds Are Dead"', detail: 'Social media influencer oversimplifies fixed-income investing.', isSignal: false, impactDirection: 'mixed', category: 'noise' },
    ],
  },
  {
    round: 4, title: 'FOMO Rally', description: 'Markets surge. Everyone\'s getting rich. The temptation to go all-in is intense.',
    headlines: [
      { id: 'r4h1', text: 'S&P 500 Hits All-Time High — 15th Record This Year', detail: 'Broad rally driven by tech and consumer discretionary sectors.', isSignal: true, impactDirection: 'positive', category: 'market' },
      { id: 'r4h2', text: 'Meme Stocks Surge on Social Media Frenzy', detail: 'Retail traders pile into speculative names, ignoring fundamentals.', isSignal: false, impactDirection: 'mixed', category: 'noise' },
      { id: 'r4h3', text: '"Even My Uber Driver Has a Trading Account"', detail: 'Retail brokerage accounts hit all-time highs globally.', isSignal: true, impactDirection: 'negative', category: 'sentiment' },
      { id: 'r4h4', text: 'Warren Buffett Increases Cash Holdings to Record', detail: 'Oracle of Omaha signals caution despite market euphoria.', isSignal: true, impactDirection: 'negative', category: 'sentiment' },
      { id: 'r4h5', text: 'Your Neighbor Made 40% Last Month — Can You?', detail: 'Survivorship bias in action. Most retail traders still underperform.', isSignal: false, impactDirection: 'positive', category: 'noise' },
      { id: 'r4h6', text: 'IPO Market Booms — 12 New Listings This Week', detail: 'Low-quality companies rushing to capitalize on investor appetite.', isSignal: true, impactDirection: 'negative', category: 'market' },
    ],
  },
  {
    round: 5, title: 'Rebalance Checkpoint', description: 'Mid-game checkpoint. Markets are mixed. Time to evaluate your drift from archetype.',
    headlines: [
      { id: 'r5h1', text: 'Fed Signals Potential Rate Change in Coming Months', detail: 'Hawkish language in latest minutes surprises some analysts.', isSignal: true, impactDirection: 'negative', category: 'policy' },
      { id: 'r5h2', text: 'Corporate Earnings Season Mixed Across Sectors', detail: 'Tech beats, industrials miss, financials in line.', isSignal: true, impactDirection: 'mixed', category: 'earnings' },
      { id: 'r5h3', text: 'Gold Trades Sideways as Market Awaits Direction', detail: 'Gold at $2,100 with low volatility. Waiting for catalyst.', isSignal: true, impactDirection: 'mixed', category: 'gold' },
      { id: 'r5h4', text: 'New Investment App Promises "AI-Powered Returns"', detail: 'Marketing hype. No verifiable track record.', isSignal: false, impactDirection: 'mixed', category: 'noise' },
      { id: 'r5h5', text: 'CHF Strengthens on Safe-Haven Flows', detail: 'Swiss franc appreciates 1.5% against EUR as uncertainty grows.', isSignal: true, impactDirection: 'mixed', category: 'fx' },
    ],
  },
  {
    round: 6, title: 'Inflation Surprise', description: 'CPI data shocks the market. Inflation is running hotter than anyone expected.',
    headlines: [
      { id: 'r6h1', text: 'BREAKING: US CPI Surges to 6.8% — Highest in 18 Months', detail: 'Food and energy costs drive inflation well above forecasts.', isSignal: true, impactDirection: 'negative', category: 'macro' },
      { id: 'r6h2', text: 'Bond Prices Plunge as Yields Spike', detail: '10-year Treasury yield jumps 45bps to 5.2%. Worst day in months.', isSignal: true, impactDirection: 'negative', category: 'bonds' },
      { id: 'r6h3', text: 'Gold Rallies 4% as Inflation Hedge Demand Returns', detail: 'Investors flee to hard assets as CPI surprises to the upside.', isSignal: true, impactDirection: 'positive', category: 'gold' },
      { id: 'r6h4', text: 'Fed Emergency Meeting Rumors Denied', detail: 'Officials clarify no unscheduled meetings planned.', isSignal: false, impactDirection: 'negative', category: 'noise' },
      { id: 'r6h5', text: 'Tech Stocks Sell Off on Rate Hike Fears', detail: 'Nasdaq drops 3.2% as higher rates erode growth stock valuations.', isSignal: true, impactDirection: 'negative', category: 'market' },
      { id: 'r6h6', text: 'Grocery Store Prices "Only Slightly Higher" Says CEO', detail: 'Corporate spin contradicts consumer experience.', isSignal: false, impactDirection: 'mixed', category: 'noise' },
    ],
  },
  {
    round: 7, title: 'Banking Panic', description: 'A major bank collapses. Contagion fears spread. The market enters crisis mode.',
    headlines: [
      { id: 'r7h1', text: 'MAJOR: Continental Credit Bank Collapses', detail: 'Fourth-largest EU bank fails. €180B in assets under resolution.', isSignal: true, impactDirection: 'negative', category: 'banking' },
      { id: 'r7h2', text: 'Interbank Lending Freezes — Credit Markets Seize', detail: 'LIBOR-OIS spread widens to 2008 levels. Banks refuse to lend.', isSignal: true, impactDirection: 'negative', category: 'banking' },
      { id: 'r7h3', text: 'Government Announces Emergency Deposit Guarantee', detail: 'Finance ministers pledge unlimited deposit protection.', isSignal: true, impactDirection: 'positive', category: 'policy' },
      { id: 'r7h4', text: 'Gold Surges 8% — Safe Haven Rush', detail: 'Biggest single-day gold move since 2020 pandemic.', isSignal: true, impactDirection: 'positive', category: 'gold' },
      { id: 'r7h5', text: 'Commodity Markets Flash Crash — Oil Down 12%', detail: 'Energy sector plunges on demand fears amid banking contagion.', isSignal: true, impactDirection: 'negative', category: 'energy' },
      { id: 'r7h6', text: 'Your Bank\'s App Is Slow Today — Is It Next?', detail: 'Speculation based on website lag. Bank is solvent.', isSignal: false, impactDirection: 'negative', category: 'noise' },
      { id: 'r7h7', text: 'Equities Plunge 7% — Worst Day in 3 Years', detail: 'Broad-based sell-off as panic grips global markets.', isSignal: true, impactDirection: 'negative', category: 'market' },
    ],
  },
  {
    round: 8, title: 'Recovery Snapback', description: 'The worst seems over. Central banks intervene. Markets begin recovering — but is it real?',
    headlines: [
      { id: 'r8h1', text: 'Central Banks Announce Coordinated Liquidity Injection', detail: 'Fed, ECB, BoJ, and BoE inject $800B in emergency liquidity.', isSignal: true, impactDirection: 'positive', category: 'policy' },
      { id: 'r8h2', text: 'Equities Bounce 5% From Lows — Relief Rally', detail: 'Technical bounce as bargain hunters step in.', isSignal: true, impactDirection: 'positive', category: 'market' },
      { id: 'r8h3', text: '"V-Shaped Recovery" or "Dead Cat Bounce"?', detail: 'Analysts divided on whether the rally has legs.', isSignal: true, impactDirection: 'mixed', category: 'analysis' },
      { id: 'r8h4', text: 'Bond Yields Stabilize as Flight to Quality Eases', detail: 'Government bonds give back some gains as panic subsides.', isSignal: true, impactDirection: 'mixed', category: 'bonds' },
      { id: 'r8h5', text: 'Influencer Says "Buy the Dip!" — Gets Liquidated', detail: 'Leveraged trader loses entire position on margin call.', isSignal: false, impactDirection: 'mixed', category: 'noise' },
      { id: 'r8h6', text: 'Employment Data Still Strong Despite Market Turmoil', detail: 'Real economy showing resilience. Unemployment at 3.8%.', isSignal: true, impactDirection: 'positive', category: 'macro' },
    ],
  },
  {
    round: 9, title: 'Geopolitical Shock', description: 'A major geopolitical event disrupts energy markets and global trade routes.',
    headlines: [
      { id: 'r9h1', text: 'BREAKING: Major Trade Route Blocked — Shipping Halted', detail: 'Key maritime chokepoint closed due to military tensions.', isSignal: true, impactDirection: 'negative', category: 'geopolitics' },
      { id: 'r9h2', text: 'Oil Prices Surge 15% on Supply Disruption', detail: 'Brent crude jumps to $105/barrel. Energy stocks rally.', isSignal: true, impactDirection: 'negative', category: 'energy' },
      { id: 'r9h3', text: 'Gold Hits All-Time High on Geopolitical Risk', detail: 'Safe-haven demand pushes gold past $2,500 for first time.', isSignal: true, impactDirection: 'positive', category: 'gold' },
      { id: 'r9h4', text: 'European Equities Drop 4% on Energy Cost Fears', detail: 'Energy-dependent sectors hit hardest. Utilities rally.', isSignal: true, impactDirection: 'negative', category: 'market' },
      { id: 'r9h5', text: 'Sanctions Announced — Financial Sector Exposure Unclear', detail: 'New sanctions may affect cross-border transactions.', isSignal: true, impactDirection: 'negative', category: 'policy' },
      { id: 'r9h6', text: 'Conspiracy Theory About Market Manipulation Goes Viral', detail: 'Unfounded claims spread on social media. No evidence.', isSignal: false, impactDirection: 'negative', category: 'noise' },
    ],
  },
  {
    round: 10, title: 'Final Rotation', description: 'The endgame. Markets are repricing everything. Your final decisions determine your legacy.',
    headlines: [
      { id: 'r10h1', text: 'Year-End Rebalancing Flows Hit Markets', detail: 'Pension funds and institutions rotate portfolios ahead of close.', isSignal: true, impactDirection: 'mixed', category: 'market' },
      { id: 'r10h2', text: 'Inflation Finally Moderates — CPI at 3.1%', detail: 'Core inflation trending down. Rate cut expectations build.', isSignal: true, impactDirection: 'positive', category: 'macro' },
      { id: 'r10h3', text: 'Equity Markets Recover 60% of Crisis Losses', detail: 'Resilient economy supports partial recovery in stock valuations.', isSignal: true, impactDirection: 'positive', category: 'market' },
      { id: 'r10h4', text: '"Best Annual Return Since 2009" — For Those Who Stayed', detail: 'Buy-and-hold investors rewarded. Panic sellers locked in losses.', isSignal: true, impactDirection: 'positive', category: 'analysis' },
      { id: 'r10h5', text: 'Analysts Predict Next Year Will Be "Unprecedented"', detail: 'Annual prediction ritual. As useful as a coin flip.', isSignal: false, impactDirection: 'mixed', category: 'noise' },
      { id: 'r10h6', text: 'Final Fed Meeting Keeps Rates Unchanged', detail: 'Policy pivot expected in Q1 next year. Markets stabilize.', isSignal: true, impactDirection: 'positive', category: 'policy' },
    ],
  },
];

// ── Return impacts per round (mock) ──

export const ROUND_IMPACTS: Record<number, Record<string, number>> = {
  1: { equities: 0, bonds: 0, gold: 0, fx: 0 },
  2: { equities: 4.2, bonds: 0.5, gold: -1.2, fx: 0.3 },
  3: { equities: 0.8, bonds: 0.2, gold: 0.5, fx: -0.3 },
  4: { equities: 7.5, bonds: -0.8, gold: -2.1, fx: 0.1 },
  5: { equities: -1.2, bonds: 0.3, gold: 0.8, fx: 0.5 },
  6: { equities: -4.8, bonds: -3.2, gold: 5.5, fx: 1.2 },
  7: { equities: -9.2, bonds: 2.1, gold: 8.0, fx: 0.8 },
  8: { equities: 5.5, bonds: -0.5, gold: -2.0, fx: -0.3 },
  9: { equities: -5.2, bonds: 1.5, gold: 6.5, fx: 2.1 },
  10: { equities: 3.8, bonds: 0.8, gold: -1.5, fx: -0.5 },
};

// ── Game Adapter ──

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

export function createGame(
  mode: 'daily' | 'sandbox' | 'party',
  archetype: ArchetypeId,
  objective: ObjectiveId,
  aiMode: AIMode,
): GameState {
  const arch = getArchetype(archetype);
  return {
    scenarioId: generateId(),
    mode,
    archetype,
    objective,
    aiMode,
    currentRound: 1,
    totalRounds: TOTAL_ROUNDS,
    portfolioValue: INITIAL_CAPITAL,
    initialCapital: INITIAL_CAPITAL,
    allocation: expandArchetypeAllocation(arch.allocation),
    roundHistory: [],
    isComplete: false,
    benchmarkValue: INITIAL_CAPITAL,
  };
}

export function getRoundTemplate(round: number): RoundTemplate {
  return ROUND_TEMPLATES[round - 1] ?? ROUND_TEMPLATES[0];
}

export function advanceRound(
  state: GameState,
  action: 'keep' | 'rebalance' | 'custom',
  newAllocation: Record<string, number> | null,
  selectedHeadlines: string[],
): GameState {
  const round = state.currentRound;
  const impacts = ROUND_IMPACTS[round] ?? {};
  const allocBefore = { ...state.allocation };

  // Determine final allocation
  let allocAfter: Record<string, number>;
  if (action === 'keep') {
    allocAfter = { ...state.allocation };
  } else if (action === 'rebalance') {
    if (newAllocation) {
      allocAfter = { ...newAllocation };
    } else {
      const arch = getArchetype(state.archetype);
      allocAfter = expandArchetypeAllocation(arch.allocation);
    }
  } else {
    allocAfter = newAllocation ? { ...newAllocation } : { ...state.allocation };
  }

  // Calculate weighted return — map instruments to scoring categories
  let portfolioReturn = 0;
  for (const [symbol, weight] of Object.entries(allocAfter)) {
    const category = INSTRUMENT_CATEGORY[symbol] ?? symbol;
    const impact = impacts[category] ?? 0;
    portfolioReturn += (weight / 100) * impact;
  }

  // Calculate benchmark return (balanced 60/40)
  const benchReturn = 0.6 * (impacts['equities'] ?? 0) + 0.3 * (impacts['bonds'] ?? 0) + 0.1 * (impacts['gold'] ?? 0);

  const newValue = state.portfolioValue * (1 + portfolioReturn / 100);
  const newBenchmark = state.benchmarkValue * (1 + benchReturn / 100);
  const newRound = round + 1;
  const drift = computeDrift(allocAfter, state.archetype);

  const result: RoundResult = {
    round,
    action,
    allocationBefore: allocBefore,
    allocationAfter: allocAfter,
    portfolioValueBefore: state.portfolioValue,
    portfolioValueAfter: newValue,
    returnPct: portfolioReturn,
    selectedHeadlines,
    driftFromArchetype: drift,
  };

  return {
    ...state,
    currentRound: newRound,
    portfolioValue: newValue,
    benchmarkValue: newBenchmark,
    allocation: allocAfter,
    roundHistory: [...state.roundHistory, result],
    isComplete: newRound > TOTAL_ROUNDS,
  };
}

export function computeDrift(allocation: Record<string, number>, archetypeId: ArchetypeId): number {
  const arch = getArchetype(archetypeId);
  // Aggregate instrument-level allocation to category level for comparison
  const catAlloc: Record<string, number> = {};
  for (const [symbol, weight] of Object.entries(allocation)) {
    const cat = INSTRUMENT_CATEGORY[symbol] ?? symbol;
    catAlloc[cat] = (catAlloc[cat] ?? 0) + weight;
  }
  const allCats = new Set([...Object.keys(catAlloc), ...Object.keys(arch.allocation)]);
  let totalDiff = 0;
  for (const cat of allCats) {
    totalDiff += Math.abs((catAlloc[cat] ?? 0) - (arch.allocation[cat] ?? 0));
  }
  return Math.round(totalDiff / 2);
}

export function computeScore(state: GameState): GameScore {
  const totalReturn = ((state.portfolioValue - state.initialCapital) / state.initialCapital) * 100;
  const rounds = state.roundHistory;

  // Strategy fidelity: average inverse drift
  const avgDrift = rounds.length > 0
    ? rounds.reduce((s, r) => s + r.driftFromArchetype, 0) / rounds.length
    : 0;
  const fidelity = Math.max(0, 100 - avgDrift * 2);

  // Resilience: how well did portfolio survive the worst round?
  const worstReturn = rounds.length > 0
    ? Math.min(...rounds.map(r => r.returnPct))
    : 0;
  const resilience = Math.max(0, Math.min(100, 50 + worstReturn * 5));

  // Decision quality: did keep/rebalance actions help?
  let goodDecisions = 0;
  for (const r of rounds) {
    if (r.returnPct > 0) goodDecisions++;
  }
  const decisionQuality = rounds.length > 0 ? (goodDecisions / rounds.length) * 100 : 50;

  // Signal filtering
  const signalQuality = 65 + Math.random() * 20;

  // Behavior label
  const keepCount = rounds.filter(r => r.action === 'keep').length;
  const rebalCount = rounds.filter(r => r.action === 'rebalance').length;
  let label = 'Steady Hand';
  if (keepCount >= 7) label = 'Diamond Hands';
  else if (rebalCount >= 5) label = 'Disciplined Rebalancer';
  else if (totalReturn < -10) label = 'Overexposed';
  else if (totalReturn > 15) label = 'Adaptive Survivor';
  else if (fidelity > 80 && state.archetype === 'fortress') label = 'Fortress Master';
  else if (fidelity > 80 && state.archetype === 'growth-builder') label = 'Growth Builder';
  else if (fidelity > 80) label = 'Balanced Architect';

  return {
    finalValue: state.portfolioValue,
    totalReturnPct: totalReturn,
    resilience: Math.round(resilience),
    signalFilteringQuality: Math.round(signalQuality),
    decisionQuality: Math.round(decisionQuality),
    strategyFidelity: Math.round(fidelity),
    archetypeAlignment: Math.round(fidelity),
    behaviorLabel: label,
  };
}

export function getAllRoundTemplates(): RoundTemplate[] {
  return ROUND_TEMPLATES;
}

/** Get mock AI response based on mode */
export function getAIResponse(mode: AIMode, _round: number, context: string): string {
  if (mode === 'coach') {
    return `**Coach Analysis:**\n\nLooking at the current headlines, here's what matters for your strategy:\n\n${context}\n\n**Recommendation:** Stay aligned with your archetype. The signal-to-noise ratio this round is moderate. Focus on the macro headlines and ignore social media noise.`;
  }
  if (mode === 'assistant') {
    return `**Headlines Summary:**\n\n• Macro: Mixed signals on economic direction\n• Sector: Divergent performance across industries\n• Sentiment: Elevated but not extreme\n\n_Ask me to elaborate on any area._`;
  }
  return `> Current exposure: Reviewed.\n> Impact assessment: Loaded.\n> Key variable: ${context.slice(0, 80)}...\n\nAwaiting prompt.`;
}
