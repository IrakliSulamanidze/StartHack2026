/**
 * Domain types for Last Portfolio Standing.
 * Core game concepts: archetypes, objectives, rounds, headlines, game state.
 */

// ── Archetypes ──

export type ArchetypeId = 'fortress' | 'balanced-core' | 'tactician' | 'hunter';

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
    icon: '🏰',
    tagline: 'Defend first. Grow later.',
    description: 'A defensive, capital-preservation strategy. High bonds, some gold, low equities. Built to lose less in shocks and accepts lower upside.',
    strengths: ['Minimal drawdowns in crashes', 'Steady income from bonds', 'Sleeps well at night'],
    weaknesses: ['Misses big equity rallies', 'Inflation erodes real returns', 'Slow compounding over decades'],
    allocation: { bonds: 50, gold: 20, equities: 20, fx: 10 },
    color: '#3b82f6',
  },
  {
    id: 'balanced-core',
    name: 'Balanced Core',
    icon: '⚖️',
    tagline: 'The classic. Diversified. Resilient.',
    description: 'A classic diversified long-term investor. Equities plus bonds plus a small gold allocation. Built for steady growth across all market regimes.',
    strengths: ['Works in most environments', 'Natural diversification', 'Time-tested approach'],
    weaknesses: ['Never the top performer', 'Moderate drawdowns still happen', 'Requires patience'],
    allocation: { equities: 45, bonds: 35, gold: 10, fx: 10 },
    color: '#22c55e',
  },
  {
    id: 'tactician',
    name: 'Tactician',
    icon: '🎯',
    tagline: 'Read the field. Adapt. Execute.',
    description: 'A flexible diversified investor with a balanced base and more room to rebalance. Built to adapt to changing conditions without becoming extreme.',
    strengths: ['Flexibility to shift exposure', 'Can exploit mispricings', 'Balanced risk/reward'],
    weaknesses: ['Requires active decisions', 'Overtrading risk', 'Analysis paralysis possible'],
    allocation: { equities: 35, bonds: 25, gold: 15, fx: 15, crypto: 10 },
    color: '#eab308',
  },
  {
    id: 'hunter',
    name: 'Hunter',
    icon: '🦅',
    tagline: 'Chase growth. Accept the bruises.',
    description: 'A growth-seeking investor with high equities, low bonds, and little defense. Built to capture upside but vulnerable under stress.',
    strengths: ['Highest long-run returns potential', 'Captures bull markets fully', 'Compounding power'],
    weaknesses: ['Deep drawdowns in crashes', 'Needs strong conviction', 'Painful in prolonged bears'],
    allocation: { equities: 65, bonds: 10, gold: 5, crypto: 15, fx: 5 },
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
  { id: 'balanced-growth', name: 'Balanced Growth', description: 'Grow steadily without excessive risk.', icon: '📈' },
  { id: 'max-resilience', name: 'Maximum Resilience', description: 'Survive all shocks with minimal damage.', icon: '🛡️' },
  { id: 'outperform-benchmark', name: 'Outperform Benchmark', description: 'Beat the market reference portfolio.', icon: '🏆' },
  { id: 'capital-preservation', name: 'Capital Preservation', description: 'Protect your starting capital at all costs.', icon: '🔒' },
  { id: 'inflation-survival', name: 'Inflation Survival', description: 'Maintain purchasing power against inflation.', icon: '🔥' },
  { id: 'shock-resistance', name: 'Shock Resistance', description: 'Withstand the worst market events.', icon: '⚡' },
];

// ── AI Mode ──

export type AIMode = 'coach' | 'assistant' | 'terminal';

export const AI_MODES: { id: AIMode; name: string; description: string; icon: string }[] = [
  { id: 'coach', name: 'Coach', description: 'Filters headlines, explains archetype fit, educational suggestions.', icon: '🎓' },
  { id: 'assistant', name: 'Assistant', description: 'Summarizes & clusters headlines. You must ask for inference.', icon: '🤖' },
  { id: 'terminal', name: 'Terminal', description: 'Raw headlines, raw exposure, concise implications only.', icon: '💻' },
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
  mode: 'daily' | 'sandbox' | 'classroom';
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

  'Steady Hand',
  'Momentum Rider',
  'Overexposed',
] as const;

// ── Classroom ──

export type TimingPreset = 'fast' | 'standard' | 'extended';

export const TIMING_PRESETS: Record<TimingPreset, { round1: number; laterRounds: number; label: string }> = {
  fast: { round1: 120, laterRounds: 90, label: 'Fast' },
  standard: { round1: 180, laterRounds: 120, label: 'Standard' },
  extended: { round1: 300, laterRounds: 180, label: 'Extended' },
};

export interface ClassroomRoom {
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

export const ASSET_CLASSES = ['equities', 'bonds', 'gold', 'fx', 'crypto'] as const;

export const ASSET_META: Record<string, { name: string; icon: string; color: string }> = {
  equities: { name: 'Equities', icon: '📈', color: '#3b82f6' },
  bonds: { name: 'Bonds', icon: '🏦', color: '#22c55e' },
  gold: { name: 'Gold', icon: '🥇', color: '#eab308' },
  fx: { name: 'FX', icon: '💱', color: '#a855f7' },
  crypto: { name: 'Crypto', icon: '₿', color: '#f97316' },
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
    key: 'equity_indices', label: 'Equity Indices', icon: '📊', color: '#3b82f6',
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
    key: 'djia_stocks', label: 'US Stocks', icon: '🇺🇸', color: '#60a5fa',
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
    key: 'smi_stocks', label: 'Swiss Stocks', icon: '🇨🇭', color: '#818cf8',
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
    key: 'bonds', label: 'Bonds', icon: '🏦', color: '#22c55e',
    scoringCategory: 'bonds',
    instruments: [
      { symbol: 'CH-BOND-TR', name: 'Swiss Bond AAA-BBB' },
      { symbol: 'GLOBAL-AGG-TR-CHF', name: 'Bloomberg Global Agg' },
      { symbol: 'CH-GOV-10Y-YIELD', name: 'Swiss Gov 10Y' },
    ],
  },
  {
    key: 'gold', label: 'Gold', icon: '🥇', color: '#eab308',
    scoringCategory: 'gold',
    instruments: [
      { symbol: 'GOLD-USD', name: 'Gold (USD)' },
      { symbol: 'GOLD-CHF', name: 'Gold (CHF)' },
    ],
  },
  {
    key: 'fx', label: 'Foreign Exchange', icon: '💱', color: '#a855f7',
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
  crypto: [], // no crypto instruments in catalog
};

/** Expand an abstract archetype allocation (equities/bonds/gold/fx/crypto)
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

  // Redistribute unassigned weight (e.g. crypto with no instruments) to equities
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
