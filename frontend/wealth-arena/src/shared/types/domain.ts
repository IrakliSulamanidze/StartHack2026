/**
 * Domain types for Endgame Securities.
 * Core game concepts: archetypes, objectives, rounds, headlines, game state.
 */

// ── Archetypes ──

export type ArchetypeId = 'fortress' | 'balanced-core' | 'growth-builder';

export interface Archetype {
  id: ArchetypeId;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  allocation: Record<string, number>;
  color: string;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'fortress',
    name: 'Fortress',
    icon: '',
    tagline: 'Protect first. Grow steady.',
    description: 'A conservative, capital-preservation strategy. High bonds, some gold, low equities. Built to protect your money during market shocks and keep drawdowns small.',
    strengths: ['Smallest losses in market crashes', 'Steady income from bonds', 'Low stress — designed for peace of mind'],
    weaknesses: ['Misses out when markets rally', 'Inflation can reduce real value over time', 'Slower long-term growth'],
    allocation: { bonds: 50, gold: 20, equities: 20, fx: 10 },
    color: '#3b82f6',
  },
  {
    id: 'balanced-core',
    name: 'Balanced Core',
    icon: '',
    tagline: 'The classic. Diversified. Recommended.',
    description: 'The most popular starting point for long-term investors. A diversified mix of equities and bonds with some gold for stability. Built for steady growth through all market conditions.',
    strengths: ['Works in most market environments', 'Natural diversification across assets', 'Time-tested and beginner-friendly'],
    weaknesses: ['Never the top performer in any single year', 'Moderate losses can still happen', 'Requires patience over many years'],
    allocation: { equities: 45, bonds: 35, gold: 10, fx: 10 },
    color: '#22c55e',
  },
  {
    id: 'growth-builder',
    name: 'Growth Builder',
    icon: '',
    tagline: 'Build wealth. Stay diversified.',
    description: 'A higher-equity strategy for investors who accept more volatility in exchange for stronger long-term growth. Still diversified — not speculative. Built for patient investors with a long time horizon.',
    strengths: ['Strongest long-term growth potential', 'Benefits most from compound returns', 'Captures equity market upside'],
    weaknesses: ['Larger drops during market downturns', 'Requires discipline to stay the course', 'Short-term swings can feel uncomfortable'],
    allocation: { equities: 65, bonds: 20, gold: 10, fx: 5 },
    color: '#f97316',
  },
];

export function getArchetype(id: ArchetypeId): Archetype {
  return ARCHETYPES.find(a => a.id === id)!;
}

// ── Mission Objectives ──

export type ObjectiveId =
  | 'balanced-growth'
  | 'max-resilience'
  | 'outperform-benchmark'
  | 'capital-preservation'
  | 'inflation-survival'
  | 'shock-resistance';

export interface MissionObjective {
  id: ObjectiveId;
  name: string;
  description: string;
  icon: string;
}

export const OBJECTIVES: MissionObjective[] = [
  { id: 'balanced-growth', name: 'Balanced Growth', description: 'Grow steadily without excessive risk.', icon: '' },
  { id: 'max-resilience', name: 'Maximum Resilience', description: 'Survive all shocks with minimal damage.', icon: '' },
  { id: 'outperform-benchmark', name: 'Outperform Benchmark', description: 'Beat the market reference portfolio.', icon: '' },
  { id: 'capital-preservation', name: 'Capital Preservation', description: 'Protect your starting capital at all costs.', icon: '' },
  { id: 'inflation-survival', name: 'Inflation Survival', description: 'Maintain purchasing power against inflation.', icon: '' },
  { id: 'shock-resistance', name: 'Shock Resistance', description: 'Withstand the worst market events.', icon: '' },
];

// ── AI Mode ──

export type AIMode = 'coach' | 'assistant' | 'terminal';

export const AI_MODES: { id: AIMode; name: string; description: string; icon: string }[] = [
  { id: 'coach', name: 'Coach', description: 'Filters headlines, explains archetype fit, educational suggestions.', icon: '' },
  { id: 'assistant', name: 'Assistant', description: 'Summarizes & clusters headlines. You must ask for inference.', icon: '' },
  { id: 'terminal', name: 'AI Helper', description: 'A straightforward AI assistant. Ask anything, get helpful answers.', icon: '' },
];

// ── Round Actions ──

export type RoundAction = 'keep' | 'rebalance' | 'custom';

// ── Headlines ──

export interface Headline {
  id: string;
  text: string;
  detail: string;
  isSignal: boolean;
  impactDirection: 'positive' | 'negative' | 'mixed';
  category: string;
}

// ── Round Template ──

export interface RoundTemplate {
  round: number;
  title: string;
  description: string;
  headlines: Headline[];
}

// ── Round Result ──

export interface RoundResult {
  round: number;
  action: RoundAction;
  allocationBefore: Record<string, number>;
  allocationAfter: Record<string, number>;
  portfolioValueBefore: number;
  portfolioValueAfter: number;
  returnPct: number;
  selectedHeadlines: string[];
  driftFromArchetype: number;
}

// ── Game State ──

export interface GameState {
  scenarioId: string;
  mode: 'daily' | 'sandbox' | 'party';
  archetype: ArchetypeId;
  objective: ObjectiveId;
  aiMode: AIMode;
  currentRound: number;
  totalRounds: number;
  portfolioValue: number;
  initialCapital: number;
  allocation: Record<string, number>;
  roundHistory: RoundResult[];
  isComplete: boolean;
  benchmarkValue: number;
}

// ── Scoring ──

export interface GameScore {
  finalValue: number;
  totalReturnPct: number;
  resilience: number;
  signalFilteringQuality: number;
  decisionQuality: number;
  strategyFidelity: number;
  archetypeAlignment: number;
  behaviorLabel: string;
}

export const BEHAVIOR_LABELS = [
  'Disciplined Rebalancer',
  'Panic Seller',
  'FOMO Chaser',
  'Adaptive Survivor',
  'Fortress Master',
  'Growth Builder',
  'Steady Hand',
  'Momentum Rider',
  'Overexposed',
] as const;

// ── Party ──

export type TimingPreset = 'fast' | 'standard' | 'extended';

export const TIMING_PRESETS: Record<TimingPreset, { round1: number; laterRounds: number; label: string }> = {
  fast: { round1: 120, laterRounds: 90, label: 'Fast' },
  standard: { round1: 180, laterRounds: 120, label: 'Standard' },
  extended: { round1: 300, laterRounds: 180, label: 'Extended' },
};

export interface PartyRoom {
  roomCode: string;
  roomName: string;
  archetype: ArchetypeId;
  objective: ObjectiveId | null;
  timing: TimingPreset;
  hostId: string;
  players: { id: string; name: string; isHost: boolean }[];
  started: boolean;
}

// ── Asset display helpers ──

export const ASSET_CLASSES = ['equities', 'bonds', 'gold', 'fx'] as const;

export const ASSET_META: Record<string, { name: string; icon: string; color: string }> = {
  equities: { name: 'Equities', icon: '', color: '#3b82f6' },
  bonds: { name: 'Bonds', icon: '', color: '#22c55e' },
  gold: { name: 'Gold', icon: '', color: '#eab308' },
  fx: { name: 'FX', icon: '', color: '#a855f7' },
};

// ── Per-instrument allocation system ──

export interface AllocationInstrument {
  symbol: string;
  name: string;
}

export interface AllocationCategory {
  key: string;
  label: string;
  icon: string;
  color: string;
  scoringCategory: string; // maps to equities | bonds | gold | fx for return scoring
  instruments: AllocationInstrument[];
}

export const ALLOCATION_CATEGORIES: AllocationCategory[] = [
  {
    key: 'equity_indices', label: 'Equity Indices', icon: '', color: '#3b82f6',
    scoringCategory: 'equities',
    instruments: [
      { symbol: 'SMI', name: 'Swiss Market Index' },
      { symbol: 'EUROSTOXX50', name: 'Euro Stoxx 50' },
      { symbol: 'DJIA', name: 'Dow Jones' },
      { symbol: 'NIKKEI225', name: 'Nikkei 225' },
      { symbol: 'DAX', name: 'DAX' },
    ],
  },
  {
    key: 'djia_stocks', label: 'US Stocks', icon: '', color: '#60a5fa',
    scoringCategory: 'equities',
    instruments: [
      { symbol: 'AAPL-US', name: 'Apple' },
      { symbol: 'MSFT-US', name: 'Microsoft' },
      { symbol: 'AMZN-US', name: 'Amazon' },
      { symbol: 'NVDA-US', name: 'NVIDIA' },
      { symbol: 'GOOGL-US', name: 'Alphabet' },
      { symbol: 'TSLA-US', name: 'Tesla' },
      { symbol: 'JPM-US', name: 'JPMorgan' },
      { symbol: 'META-US', name: 'Meta' },
      { symbol: 'V-US', name: 'Visa' },
      { symbol: 'JNJ-US', name: 'Johnson & Johnson' },
      { symbol: 'WMT-US', name: 'Walmart' },
      { symbol: 'DIS-US', name: 'Disney' },
      { symbol: 'KO-US', name: 'Coca-Cola' },
      { symbol: 'MCD-US', name: "McDonald's" },
      { symbol: 'NFLX-US', name: 'Netflix' },
      { symbol: 'PFE-US', name: 'Pfizer' },
      { symbol: 'XOM-US', name: 'Exxon Mobil' },
      { symbol: 'CVX-US', name: 'Chevron' },
      { symbol: 'INTC-US', name: 'Intel' },
      { symbol: 'IBM-US', name: 'IBM' },
    ],
  },
  {
    key: 'smi_stocks', label: 'Swiss Stocks', icon: '', color: '#818cf8',
    scoringCategory: 'equities',
    instruments: [
      { symbol: 'NESN-CH', name: 'Nestlé' },
      { symbol: 'NOVN-CH', name: 'Novartis' },
      { symbol: 'ROG-CH', name: 'Roche' },
      { symbol: 'UBSG-CH', name: 'UBS' },
      { symbol: 'ABBN-CH', name: 'ABB' },
      { symbol: 'ZURN-CH', name: 'Zurich Insurance' },
      { symbol: 'SREN-CH', name: 'Swiss Re' },
      { symbol: 'SIKA-CH', name: 'Sika' },
      { symbol: 'CFR-CH', name: 'Richemont' },
      { symbol: 'LOGN-CH', name: 'Logitech' },
    ],
  },
  {
    key: 'bonds', label: 'Bonds', icon: '', color: '#22c55e',
    scoringCategory: 'bonds',
    instruments: [
      { symbol: 'CH-BOND-TR', name: 'Swiss Bond AAA-BBB' },
      { symbol: 'GLOBAL-AGG-TR-CHF', name: 'Bloomberg Global Agg' },
      { symbol: 'CH-GOV-10Y-YIELD', name: 'Swiss Gov 10Y' },
    ],
  },
  {
    key: 'gold', label: 'Gold', icon: '', color: '#eab308',
    scoringCategory: 'gold',
    instruments: [
      { symbol: 'GOLD-USD', name: 'Gold (USD)' },
      { symbol: 'GOLD-CHF', name: 'Gold (CHF)' },
    ],
  },
  {
    key: 'fx', label: 'Foreign Exchange', icon: '', color: '#a855f7',
    scoringCategory: 'fx',
    instruments: [
      { symbol: 'USDCHF', name: 'USD/CHF' },
      { symbol: 'EURCHF', name: 'EUR/CHF' },
    ],
  },
];

// Build reverse lookup: instrument symbol → scoring category
export const INSTRUMENT_CATEGORY: Record<string, string> = {};
for (const cat of ALLOCATION_CATEGORIES) {
  for (const inst of cat.instruments) {
    INSTRUMENT_CATEGORY[inst.symbol] = cat.scoringCategory;
  }
}

// Build instrument name lookup
export const INSTRUMENT_NAME: Record<string, string> = {};
for (const cat of ALLOCATION_CATEGORIES) {
  for (const inst of cat.instruments) {
    INSTRUMENT_NAME[inst.symbol] = inst.name;
  }
}

// Build instrument → category color lookup
export const INSTRUMENT_COLOR: Record<string, string> = {};
for (const cat of ALLOCATION_CATEGORIES) {
  for (const inst of cat.instruments) {
    INSTRUMENT_COLOR[inst.symbol] = cat.color;
  }
}

// Default representative instruments per abstract class (for archetype expansion)
const DEFAULT_INSTRUMENTS: Record<string, string[]> = {
  equities: ['SMI', 'DJIA', 'AAPL-US', 'MSFT-US', 'NESN-CH'],
  bonds: ['CH-BOND-TR', 'GLOBAL-AGG-TR-CHF'],
  gold: ['GOLD-USD'],
  fx: ['USDCHF', 'EURCHF'],
};

/** Expand an abstract archetype allocation (equities/bonds/gold/fx)
 *  into individual instrument allocations that sum to 100. */
export function expandArchetypeAllocation(abstract: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  let remaining = 0;

  for (const [cat, weight] of Object.entries(abstract)) {
    const instruments = DEFAULT_INSTRUMENTS[cat] ?? [];
    if (instruments.length === 0 || weight === 0) {
      remaining += weight;
      continue;
    }
    const per = Math.floor(weight / instruments.length);
    let leftover = weight - per * instruments.length;
    for (const inst of instruments) {
      result[inst] = per + (leftover > 0 ? 1 : 0);
      if (leftover > 0) leftover--;
    }
  }

  // Redistribute unassigned weight to equities
  if (remaining > 0) {
    const eqInst = DEFAULT_INSTRUMENTS.equities;
    const per = Math.floor(remaining / eqInst.length);
    let leftover = remaining - per * eqInst.length;
    for (const inst of eqInst) {
      result[inst] = (result[inst] ?? 0) + per + (leftover > 0 ? 1 : 0);
      if (leftover > 0) leftover--;
    }
  }

  return result;
}
