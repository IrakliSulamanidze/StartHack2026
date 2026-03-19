export interface AllocationMatrix {
  equities: number;
  bonds: number;
  gold: number;
  cash: number;
}

export interface HistoricalWindow {
  startYear: number;
  endYear: number;
}

export interface PortfolioSnapshot {
  date: string;
  portfolioValue: number;
  phase: MarketPhase | null;
}

export type MarketPhase =
  | "bull_start"
  | "crash_start"
  | "recovery_start";

export interface SimulationResult {
  snapshots: PortfolioSnapshot[];
  finalValue: number;
  maxDrawdown: number;
  volatility: number;
  diversificationScore: number;
}

export type NewsImpactDirection = "positive" | "negative" | "mixed";

export interface MarketNewsEvent {
  id: string;
  date: string;
  phase: MarketPhase;
  headline: string;
  details: string;
  impactDirection: NewsImpactDirection;
  simpleSummary?: string;
  explanationSource?: "ai" | "fallback";
}

export type MatchStatus =
  | "waiting"
  | "ready"
  | "simulating"
  | "finished";

export interface MatchState {
  matchId: string;
  status: MatchStatus;
  players: {
    [uid: string]: {
      displayName: string;
      allocation: AllocationMatrix | null;
      result: SimulationResult | null;
    };
  };
  historicalWindow: HistoricalWindow;
  createdAt: number;
}

export interface MatchScore {
  returnScore: number;
  diversificationBonus: number;
  volatilityPenalty: number;
  totalScore: number;
}

export interface GameService {
  joinLobby(uid: string, displayName: string): Promise<string>;
  submitAllocation(matchId: string, uid: string, alloc: AllocationMatrix): Promise<void>;
  observeMatchState(matchId: string, cb: (state: MatchState) => void): () => void;
  postMatchResult(matchId: string, uid: string, result: SimulationResult, score: MatchScore): Promise<void>;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  window: HistoricalWindow;
  highlights: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  avgDiversificationScore: number;
}

// ── Turn-based quarterly game types ──

export interface QuarterAllocation {
  stocks: number;
  indexFunds: number;
  bonds: number;
}

export interface Holdings {
  stocks: number;
  indexFunds: number;
  bonds: number;
  cash: number;
}

export interface TradeOrder {
  asset: keyof Holdings;
  action: "buy" | "sell";
  amount: number;
}

export interface QuarterSnapshot {
  quarter: number;
  year: number;
  label: string;
  portfolioValue: number;
  holdings: Holdings;
  returnPct: number;
}

export interface QuarterNewsEvent {
  id: string;
  quarter: number;
  rawHeadline: string;
  rawDetails: string;
  impactDirection: NewsImpactDirection;
  assetHint: {
    up: (keyof QuarterAllocation)[];
    down: (keyof QuarterAllocation)[];
  };
  aiTranslation?: string;
  aiAnalogy?: string;
  aiActionable?: string;
  explanationSource?: "ai" | "fallback";
}

export interface AITradeWarning {
  severity: "caution" | "danger";
  message: string;
  example: string;
  source: "ai" | "fallback";
}

export interface TurnBasedGameState {
  currentQuarter: number;
  totalQuarters: number;
  startingCapital: number;
  portfolioValue: number;
  holdings: Holdings;
  pendingTrades: TradeOrder[];
  history: QuarterSnapshot[];
  newsLog: QuarterNewsEvent[];
  recapNews: QuarterNewsEvent[];
  scenarioId: string;
  phase: "news" | "trading" | "recap" | "finished";
  timerDeadline: number | null;
  isSoloMode: boolean;
  tradeWarning: AITradeWarning | null;
  opponentHistory: QuarterSnapshot[];
  opponentHoldings: Holdings;
}
