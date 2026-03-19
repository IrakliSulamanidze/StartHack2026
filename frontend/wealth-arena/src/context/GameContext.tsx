import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import { ASSET_UNIVERSE, computeAssetPrice, type Asset } from '../data/assets';
import { NEWS_BANK } from '../engine/quarterlyEngine';
import { createScenario, advanceTurn, getScenario, allocate, ApiError } from '../api/client';
import type {
  BackendScenarioState,
  BackendTurnResult,
  BackendScenarioCreateRequest,
  BackendAllocation,
} from '../types/backend';

// ── Types ──

export type DifficultyMode = 'beginner' | 'intermediate' | 'advanced';
export type GamePage = 'home' | 'game' | 'trading' | 'news' | 'settings';

export interface Holding {
  ticker: string;
  name: string;
  quantity: number;
  avgCost: number;
  type: Asset['type'];
  sector: string;
}

export interface TradeRecord {
  id: string;
  ticker: string;
  name: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: number;
  round: number;
  year: number;
}

export interface NewsItem {
  id: string;
  title: string;
  details: string;
  source: string;
  category: string;
  tickers: string[];
  impactDirection: 'positive' | 'negative' | 'mixed';
  aiTranslation?: string;
  aiAnalogy?: string;
  aiActionable?: string;
  aiSource?: 'ai' | 'fallback';
  round: number;
}

export interface PortfolioSnapshot {
  timestamp: number;
  value: number;
  round: number;
}

export interface GameSettings {
  displayName: string;
  school: string;
  startingCash: number;
  hintsEnabled: boolean;
  riskWarnings: boolean;
  plAlerts: boolean;
  timeRange: '1Y' | '1Q' | '1M' | '1W';
}

export interface GameState {
  page: GamePage;
  mode: DifficultyMode;
  cash: number;
  startingCash: number;
  holdings: Holding[];
  trades: TradeRecord[];
  newsItems: NewsItem[];
  portfolioHistory: PortfolioSnapshot[];
  currentRound: number;
  currentYear: number;
  settings: GameSettings;
  prices: Record<string, number>;
  gameStarted: boolean;

  // ── Backend integration (Phase 1) ──
  scenarioId: string | null;
  backendState: BackendScenarioState | null;
  lastTurnResult: BackendTurnResult | null;
  backendLoading: boolean;
  backendError: string | null;
}

// ── Actions ──

type Action =
  | { type: 'SET_PAGE'; page: GamePage }
  | { type: 'SET_MODE'; mode: DifficultyMode }
  | { type: 'EXECUTE_TRADE'; trade: Omit<TradeRecord, 'id' | 'timestamp'> }
  | { type: 'ADD_NEWS'; news: NewsItem }
  | { type: 'UPDATE_NEWS_AI'; id: string; translation: string; analogy: string; actionable: string; source: 'ai' | 'fallback' }
  | { type: 'ADVANCE_ROUND' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<GameSettings> }
  | { type: 'RESET_GAME' }
  | { type: 'SET_TIME_RANGE'; range: GameSettings['timeRange'] }
  | { type: 'REFRESH_PRICES' }
  // ── Backend integration actions ──
  | { type: 'BACKEND_SET_LOADING'; loading: boolean }
  | { type: 'BACKEND_SET_ERROR'; error: string | null }
  | { type: 'BACKEND_SCENARIO_LOADED'; scenario: BackendScenarioState }
  | { type: 'BACKEND_TURN_RESULT'; result: BackendTurnResult; scenario: BackendScenarioState }
  | { type: 'BACKEND_STATE_REFRESHED'; scenario: BackendScenarioState };

// ── Helpers ──

function generatePrices(seed: number, impact: 'positive' | 'negative' | 'mixed'): Record<string, number> {
  const prices: Record<string, number> = {};
  ASSET_UNIVERSE.forEach((a, i) => {
    prices[a.ticker] = computeAssetPrice(a, impact, seed + i * 7);
  });
  return prices;
}

function getMarketValue(holdings: Holding[], prices: Record<string, number>): number {
  return holdings.reduce((sum, h) => sum + h.quantity * (prices[h.ticker] ?? h.avgCost), 0);
}

function netWorth(state: GameState): number {
  return state.cash + getMarketValue(state.holdings, state.prices);
}

const DEFAULT_SETTINGS: GameSettings = {
  displayName: 'Player',
  school: '',
  startingCash: 100_000,
  hintsEnabled: true,
  riskWarnings: true,
  plAlerts: true,
  timeRange: '1Y',
};

function initialPrices(): Record<string, number> {
  const p: Record<string, number> = {};
  ASSET_UNIVERSE.forEach(a => { p[a.ticker] = a.basePrice; });
  return p;
}

function createInitialState(): GameState {
  const prices = initialPrices();
  const state: GameState = {
    page: 'home',
    mode: 'beginner',
    cash: 100_000,
    startingCash: 100_000,
    holdings: [],
    trades: [],
    newsItems: [],
    portfolioHistory: [{ timestamp: Date.now(), value: 100_000, round: 0 }],
    currentRound: 1,
    currentYear: 1,
    settings: DEFAULT_SETTINGS,
    prices,
    gameStarted: false,    // Backend integration defaults
    scenarioId: null,
    backendState: null,
    lastTurnResult: null,
    backendLoading: false,
    backendError: null,  };
  return state;
}

// ── Reducer ──

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, page: action.page };

    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'EXECUTE_TRADE': {
      const t = action.trade;
      const trade: TradeRecord = { ...t, id: `t${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now() };

      let newCash = state.cash;
      let newHoldings = [...state.holdings];

      if (t.side === 'buy') {
        newCash -= t.total;
        const existing = newHoldings.find(h => h.ticker === t.ticker);
        if (existing) {
          const totalQty = existing.quantity + t.quantity;
          const totalCost = existing.avgCost * existing.quantity + t.price * t.quantity;
          existing.avgCost = totalCost / totalQty;
          existing.quantity = totalQty;
        } else {
          const asset = ASSET_UNIVERSE.find(a => a.ticker === t.ticker);
          newHoldings.push({
            ticker: t.ticker,
            name: t.name,
            quantity: t.quantity,
            avgCost: t.price,
            type: asset?.type ?? 'stock',
            sector: asset?.sector ?? 'Unknown',
          });
        }
      } else {
        newCash += t.total;
        const existing = newHoldings.find(h => h.ticker === t.ticker);
        if (existing) {
          existing.quantity -= t.quantity;
          if (existing.quantity <= 0) {
            newHoldings = newHoldings.filter(h => h.ticker !== t.ticker);
          }
        }
      }

      const nw = newCash + getMarketValue(newHoldings, state.prices);

      return {
        ...state,
        cash: Math.round(newCash * 100) / 100,
        holdings: newHoldings,
        trades: [...state.trades, trade],
        portfolioHistory: [...state.portfolioHistory, { timestamp: Date.now(), value: Math.round(nw * 100) / 100, round: state.currentRound }],
        gameStarted: true,
      };
    }

    case 'ADD_NEWS':
      return { ...state, newsItems: [action.news, ...state.newsItems] };

    case 'UPDATE_NEWS_AI': {
      const updated = state.newsItems.map(n =>
        n.id === action.id ? { ...n, aiTranslation: action.translation, aiAnalogy: action.analogy, aiActionable: action.actionable, aiSource: action.source } : n
      );
      return { ...state, newsItems: updated };
    }

    case 'ADVANCE_ROUND': {
      const nextRound = state.currentRound + 1;
      const nextYear = Math.ceil(nextRound / 4);
      const newsTemplate = NEWS_BANK[(nextRound - 1) % NEWS_BANK.length];
      const impact = newsTemplate.impactDirection;
      const newPrices = generatePrices(nextRound * 9973, impact);
      const mv = getMarketValue(state.holdings, newPrices);
      const nw = state.cash + mv;

      const newsItem: NewsItem = {
        id: `news_r${nextRound}`,
        title: newsTemplate.rawHeadline,
        details: newsTemplate.rawDetails,
        source: 'Market Wire',
        category: impact === 'positive' ? 'Growth' : impact === 'negative' ? 'Risk' : 'Analysis',
        tickers: newsTemplate.assetHint.up.length > 0 ? ['SPY'] : ['BND'],
        impactDirection: impact,
        round: nextRound,
      };

      return {
        ...state,
        currentRound: nextRound,
        currentYear: nextYear,
        prices: newPrices,
        newsItems: [newsItem, ...state.newsItems],
        portfolioHistory: [...state.portfolioHistory, { timestamp: Date.now(), value: Math.round(nw * 100) / 100, round: nextRound }],
      };
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'RESET_GAME':
      return createInitialState();

    case 'SET_TIME_RANGE':
      return { ...state, settings: { ...state.settings, timeRange: action.range } };

    case 'REFRESH_PRICES': {
      const lastNews = state.newsItems[0];
      const impact = lastNews?.impactDirection ?? 'mixed';
      const newPrices = generatePrices(state.currentRound * 9973 + Date.now() % 1000, impact);
      return { ...state, prices: newPrices };
    }

    // ── Backend integration reducers ──

    case 'BACKEND_SET_LOADING':
      return { ...state, backendLoading: action.loading, backendError: action.loading ? null : state.backendError };

    case 'BACKEND_SET_ERROR':
      return { ...state, backendError: action.error, backendLoading: false };

    case 'BACKEND_SCENARIO_LOADED': {
      const s = action.scenario;
      // Map backend events into the legacy newsItems so NewsPage can display them
      const initialNews: NewsItem[] = [];
      return {
        ...state,
        scenarioId: s.scenario_id,
        backendState: s,
        lastTurnResult: null,
        backendLoading: false,
        backendError: null,
        currentRound: s.current_turn,
        gameStarted: true,
        newsItems: initialNews,
        portfolioHistory: [{ timestamp: Date.now(), value: 100_000, round: 0 }],
        page: 'game' as GamePage,
      };
    }

    case 'BACKEND_TURN_RESULT': {
      const r = action.result;
      const s = action.scenario;
      // Convert backend events into legacy NewsItem format for NewsPage
      const turnNews: NewsItem[] = r.events_this_turn.map(e => ({
        id: e.event_id,
        title: e.title,
        details: e.description,
        source: 'Market Wire',
        category: e.severity === 'major' ? 'Breaking' : e.severity === 'impactful' ? 'Risk' : 'Analysis',
        tickers: e.affected_assets,
        impactDirection: e.impacts.reduce((sum, i) => sum + i.delta_pct, 0) >= 0 ? 'positive' as const : 'negative' as const,
        round: r.turn_number,
      }));
      return {
        ...state,
        scenarioId: s.scenario_id,
        backendState: s,
        lastTurnResult: r,
        backendLoading: false,
        backendError: null,
        currentRound: r.turn_number,
        newsItems: [...turnNews, ...state.newsItems],
        portfolioHistory: [
          ...state.portfolioHistory,
          { timestamp: Date.now(), value: r.portfolio_value, round: r.turn_number },
        ],
      };
    }

    case 'BACKEND_STATE_REFRESHED': {
      return {
        ...state,
        backendState: action.scenario,
        backendLoading: false,
        backendError: null,
      };
    }

    default:
      return state;
  }
}

// ── Context ──

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  netWorth: number;
  marketValue: number;
  unrealizedPL: number;
  navigate: (page: GamePage) => void;
  // ── Backend integration helpers ──
  startBackendGame: (params: BackendScenarioCreateRequest) => Promise<void>;
  advanceBackendTurn: (allocations?: BackendAllocation[]) => Promise<void>;
  setAllocations: (allocations: BackendAllocation[]) => Promise<void>;
}

const GameCtx = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const mv = getMarketValue(state.holdings, state.prices);
  const nw = state.cash + mv;
  const upl = mv - state.holdings.reduce((s, h) => s + h.avgCost * h.quantity, 0);

  const navigate = useCallback((page: GamePage) => {
    dispatch({ type: 'SET_PAGE', page });
  }, []);

  // ── Backend integration: async helpers ──

  const startBackendGame = useCallback(async (params: BackendScenarioCreateRequest) => {
    dispatch({ type: 'BACKEND_SET_LOADING', loading: true });
    try {
      const scenario = await createScenario(params);
      dispatch({ type: 'BACKEND_SCENARIO_LOADED', scenario });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to connect to backend';
      dispatch({ type: 'BACKEND_SET_ERROR', error: msg });
    }
  }, []);

  const advanceBackendTurn = useCallback(async (allocations?: BackendAllocation[]) => {
    if (!state.scenarioId) return;
    dispatch({ type: 'BACKEND_SET_LOADING', loading: true });
    try {
      const result = await advanceTurn({
        scenario_id: state.scenarioId,
        player_id: 'player1',
        new_allocations: allocations ?? null,
      });
      // Re-fetch full scenario state for complete picture
      const scenario = await getScenario(state.scenarioId);
      dispatch({ type: 'BACKEND_TURN_RESULT', result, scenario });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to advance turn';
      dispatch({ type: 'BACKEND_SET_ERROR', error: msg });
    }
  }, [state.scenarioId]);

  const setAllocations = useCallback(async (allocations: BackendAllocation[]) => {
    if (!state.scenarioId) return;
    dispatch({ type: 'BACKEND_SET_LOADING', loading: true });
    try {
      const scenario = await allocate({
        scenario_id: state.scenarioId,
        player_id: 'player1',
        allocations,
      });
      dispatch({ type: 'BACKEND_STATE_REFRESHED', scenario });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to set allocations';
      dispatch({ type: 'BACKEND_SET_ERROR', error: msg });
    }
  }, [state.scenarioId]);

  return (
    <GameCtx.Provider value={{ state, dispatch, netWorth: nw, marketValue: mv, unrealizedPL: upl, navigate, startBackendGame, advanceBackendTurn, setAllocations }}>
      {children}
    </GameCtx.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}

export { netWorth as computeNetWorth };
