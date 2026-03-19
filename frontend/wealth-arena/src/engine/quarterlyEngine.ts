import type { QuarterAllocation, QuarterNewsEvent, NewsImpactDirection, Holdings, TradeOrder } from '../types/game';

const TOTAL_QUARTERS = 20;
const STARTING_CAPITAL = 100_000;
const TIMER_SECONDS = 300; // 5 minutes

interface AssetReturns {
  stocks: number;
  indexFunds: number;
  bonds: number;
}

interface NewsTemplate {
  rawHeadline: string;
  rawDetails: string;
  impactDirection: NewsImpactDirection;
  assetHint: { up: (keyof QuarterAllocation)[]; down: (keyof QuarterAllocation)[] };
  baseReturns: AssetReturns;
}

const NEWS_BANK: NewsTemplate[] = [
  { rawHeadline: "Tech earnings smash expectations; NASDAQ surges 4%", rawDetails: "Major technology corporations report record quarterly revenues driven by cloud computing and AI adoption, pushing growth expectations higher across the sector.", impactDirection: "positive", assetHint: { up: ["stocks", "indexFunds"], down: [] }, baseReturns: { stocks: 0.08, indexFunds: 0.05, bonds: 0.005 } },
  { rawHeadline: "Inflation hits 8.2%; Fed signals aggressive rate hikes", rawDetails: "Consumer Price Index surges to a 40-year high. Federal Reserve Chair indicates 75 basis-point rate increases are on the table for upcoming FOMC meetings.", impactDirection: "negative", assetHint: { up: ["bonds"], down: ["stocks", "indexFunds"] }, baseReturns: { stocks: -0.07, indexFunds: -0.04, bonds: 0.01 } },
  { rawHeadline: "Global supply chain disruptions ease; shipping costs plummet", rawDetails: "Container shipping rates from Asia to Europe drop 60% from pandemic highs. Manufacturers report improved component availability and shorter lead times.", impactDirection: "positive", assetHint: { up: ["stocks", "indexFunds"], down: [] }, baseReturns: { stocks: 0.05, indexFunds: 0.04, bonds: 0.008 } },
  { rawHeadline: "Major bank collapses; regulators seize assets in emergency action", rawDetails: "A top-20 financial institution fails after significant exposure to distressed real estate loans. FDIC steps in; contagion fears spread across the banking sector.", impactDirection: "negative", assetHint: { up: ["bonds"], down: ["stocks", "indexFunds"] }, baseReturns: { stocks: -0.12, indexFunds: -0.08, bonds: 0.02 } },
  { rawHeadline: "Unemployment drops to 3.4%, lowest in 50 years", rawDetails: "Non-farm payrolls add 517,000 jobs, far exceeding expectations. Wage growth accelerates at 4.4% year-over-year, signaling a tight labor market.", impactDirection: "positive", assetHint: { up: ["stocks", "indexFunds"], down: [] }, baseReturns: { stocks: 0.04, indexFunds: 0.03, bonds: 0.005 } },
  { rawHeadline: "Geopolitical crisis erupts; oil prices spike 30% overnight", rawDetails: "Military conflict in a major oil-producing region disrupts global energy supplies. Brent crude jumps past $120/barrel, raising recession fears across developed economies.", impactDirection: "negative", assetHint: { up: ["bonds"], down: ["stocks"] }, baseReturns: { stocks: -0.09, indexFunds: -0.05, bonds: 0.015 } },
  { rawHeadline: "Central bank pivots to rate cuts; markets rally", rawDetails: "After 18 months of tightening, the central bank announces a 50 basis-point rate cut citing cooling inflation. Equity futures surge in after-hours trading.", impactDirection: "positive", assetHint: { up: ["stocks", "indexFunds", "bonds"], down: [] }, baseReturns: { stocks: 0.07, indexFunds: 0.05, bonds: 0.02 } },
  { rawHeadline: "Housing market cools sharply; home sales drop 25%", rawDetails: "Existing home sales fall to the lowest level in a decade as mortgage rates top 7%. Housing starts decline, and construction firms issue profit warnings.", impactDirection: "negative", assetHint: { up: [], down: ["stocks", "indexFunds"] }, baseReturns: { stocks: -0.04, indexFunds: -0.02, bonds: 0.01 } },
  { rawHeadline: "AI revolution drives productivity surge across industries", rawDetails: "Corporate adoption of generative AI tools accelerates. Major consultancies estimate a $4.4 trillion annual productivity boost, lifting earnings projections across sectors.", impactDirection: "positive", assetHint: { up: ["stocks", "indexFunds"], down: [] }, baseReturns: { stocks: 0.06, indexFunds: 0.04, bonds: 0.005 } },
  { rawHeadline: "Consumer confidence plunges to recession-era lows", rawDetails: "The Conference Board Consumer Confidence Index falls to 85.7, the lowest reading since 2011. Households report anxiety about job prospects and rising living costs.", impactDirection: "negative", assetHint: { up: ["bonds"], down: ["stocks"] }, baseReturns: { stocks: -0.05, indexFunds: -0.03, bonds: 0.012 } },
  { rawHeadline: "Record corporate buybacks boost stock valuations", rawDetails: "S&P 500 companies announce $1.2 trillion in share repurchase programs, reducing float and providing tailwinds to earnings per share growth.", impactDirection: "positive", assetHint: { up: ["stocks", "indexFunds"], down: [] }, baseReturns: { stocks: 0.05, indexFunds: 0.035, bonds: 0.006 } },
  { rawHeadline: "Trade war escalation: new tariffs imposed on $300B of imports", rawDetails: "Retaliatory tariffs between major economies raise costs for manufacturers and retailers. Supply chain restructuring accelerates but at significant short-term expense.", impactDirection: "negative", assetHint: { up: ["bonds"], down: ["stocks", "indexFunds"] }, baseReturns: { stocks: -0.06, indexFunds: -0.04, bonds: 0.01 } },
  { rawHeadline: "Pandemic declared; global lockdowns begin", rawDetails: "WHO declares a global pandemic. Countries impose border closures and stay-at-home orders. Travel, hospitality, and retail sectors face unprecedented revenue collapse.", impactDirection: "negative", assetHint: { up: ["bonds"], down: ["stocks", "indexFunds"] }, baseReturns: { stocks: -0.15, indexFunds: -0.10, bonds: 0.025 } },
  { rawHeadline: "Massive fiscal stimulus package approved: $2 trillion injection", rawDetails: "Legislature passes emergency spending bill including direct payments, enhanced unemployment benefits, and small business loans to counter economic contraction.", impactDirection: "positive", assetHint: { up: ["stocks", "indexFunds"], down: [] }, baseReturns: { stocks: 0.10, indexFunds: 0.07, bonds: 0.008 } },
  { rawHeadline: "Yield curve inverts; recession signals flash red", rawDetails: "The spread between 2-year and 10-year Treasury yields turns negative for the first time in three years. Historically, inversion has preceded every US recession since 1970.", impactDirection: "negative", assetHint: { up: ["bonds"], down: ["stocks"] }, baseReturns: { stocks: -0.03, indexFunds: -0.02, bonds: 0.015 } },
  { rawHeadline: "Earnings season beats expectations across the board", rawDetails: "78% of S&P 500 companies exceed analyst earnings estimates. Revenue growth averages 8% year-over-year, led by healthcare and technology sectors.", impactDirection: "positive", assetHint: { up: ["stocks", "indexFunds"], down: [] }, baseReturns: { stocks: 0.045, indexFunds: 0.035, bonds: 0.005 } },
  { rawHeadline: "Sovereign debt crisis: European bonds downgraded", rawDetails: "Credit rating agencies downgrade government debt of multiple eurozone nations. Bank exposure to sovereign bonds triggers capital adequacy concerns.", impactDirection: "negative", assetHint: { up: [], down: ["stocks", "bonds"] }, baseReturns: { stocks: -0.06, indexFunds: -0.04, bonds: -0.01 } },
  { rawHeadline: "Emerging markets boom as commodities rally", rawDetails: "Strong demand from industrializing economies lifts commodity prices. Emerging market equity indices outperform developed markets by 12% year-to-date.", impactDirection: "positive", assetHint: { up: ["stocks", "indexFunds"], down: [] }, baseReturns: { stocks: 0.06, indexFunds: 0.045, bonds: 0.007 } },
  { rawHeadline: "Crypto market crash triggers broader risk-off sentiment", rawDetails: "Major cryptocurrency exchange files for bankruptcy. Leveraged positions unwind across digital and traditional assets as investors flee to safety.", impactDirection: "negative", assetHint: { up: ["bonds"], down: ["stocks"] }, baseReturns: { stocks: -0.04, indexFunds: -0.025, bonds: 0.012 } },
  { rawHeadline: "Manufacturing PMI rebounds above 50; expansion resumes", rawDetails: "The ISM Manufacturing Purchasing Managers' Index rises to 52.3 after six months of contraction, signaling renewed factory output and order growth.", impactDirection: "positive", assetHint: { up: ["stocks", "indexFunds"], down: [] }, baseReturns: { stocks: 0.04, indexFunds: 0.03, bonds: 0.006 } },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function generateQuarterlyGame(scenarioSeed: number) {
  const rng = seededRandom(scenarioSeed);
  const shuffled = [...NEWS_BANK].sort(() => rng() - 0.5);
  const selectedNews = shuffled.slice(0, TOTAL_QUARTERS);

  const newsEvents: QuarterNewsEvent[] = selectedNews.map((template, i) => ({
    id: `q${i + 1}`,
    quarter: i + 1,
    rawHeadline: template.rawHeadline,
    rawDetails: template.rawDetails,
    impactDirection: template.impactDirection,
    assetHint: template.assetHint,
  }));

  return { newsEvents, selectedNews };
}

export function defaultHoldings(): Holdings {
  return { stocks: 0, indexFunds: 0, bonds: 0, cash: STARTING_CAPITAL };
}

export function totalPortfolioValue(h: Holdings): number {
  return Math.round((h.stocks + h.indexFunds + h.bonds + h.cash) * 100) / 100;
}

export function executeTrades(holdings: Holdings, trades: TradeOrder[]): Holdings {
  const h = { ...holdings };
  for (const t of trades) {
    if (t.action === 'buy') {
      const cost = Math.min(t.amount, h.cash);
      if (cost <= 0) continue;
      h.cash -= cost;
      h[t.asset] += cost;
    } else {
      const proceeds = Math.min(t.amount, h[t.asset]);
      if (proceeds <= 0) continue;
      h[t.asset] -= proceeds;
      h.cash += proceeds;
    }
  }
  return roundHoldings(h);
}

function roundHoldings(h: Holdings): Holdings {
  return {
    stocks: Math.round(h.stocks * 100) / 100,
    indexFunds: Math.round(h.indexFunds * 100) / 100,
    bonds: Math.round(h.bonds * 100) / 100,
    cash: Math.round(h.cash * 100) / 100,
  };
}

export function applyQuarterReturns(
  holdings: Holdings,
  newsTemplate: NewsTemplate,
  seed: number
): { newHoldings: Holdings; returnPct: number; perAsset: Record<string, number> } {
  const rng = seededRandom(seed);
  const template = newsTemplate;
  const noise = (rng() - 0.5) * 0.02;

  const sReturn = template.baseReturns.stocks + noise;
  const iReturn = template.baseReturns.indexFunds + noise * 0.7;
  const bReturn = template.baseReturns.bonds + noise * 0.2;

  const oldTotal = totalPortfolioValue(holdings);
  const newHoldings = roundHoldings({
    stocks: holdings.stocks * (1 + sReturn),
    indexFunds: holdings.indexFunds * (1 + iReturn),
    bonds: holdings.bonds * (1 + bReturn),
    cash: holdings.cash,
  });
  const newTotal = totalPortfolioValue(newHoldings);
  const returnPct = oldTotal > 0 ? Math.round(((newTotal - oldTotal) / oldTotal) * 10000) / 100 : 0;

  return {
    newHoldings,
    returnPct,
    perAsset: {
      stocks: Math.round(sReturn * 10000) / 100,
      indexFunds: Math.round(iReturn * 10000) / 100,
      bonds: Math.round(bReturn * 10000) / 100,
    },
  };
}

export function generateBotTrades(
  botHoldings: Holdings,
  newsEvent: QuarterNewsEvent,
  seed: number
): TradeOrder[] {
  const rng = seededRandom(seed);
  const trades: TradeOrder[] = [];
  const total = totalPortfolioValue(botHoldings);

  if (newsEvent.impactDirection === 'negative') {
    if (botHoldings.stocks > total * 0.1) {
      trades.push({ asset: 'stocks', action: 'sell', amount: Math.round(botHoldings.stocks * 0.3) });
    }
    trades.push({ asset: 'bonds', action: 'buy', amount: Math.round(botHoldings.cash * 0.4) });
  } else {
    const buyAmount = Math.round(botHoldings.cash * (0.3 + rng() * 0.3));
    if (rng() > 0.4) {
      trades.push({ asset: 'stocks', action: 'buy', amount: buyAmount });
    } else {
      trades.push({ asset: 'indexFunds', action: 'buy', amount: buyAmount });
    }
  }
  return trades;
}

export function getQuarterLabel(quarter: number): string {
  const year = Math.floor((quarter - 1) / 4) + 1;
  const q = ((quarter - 1) % 4) + 1;
  return `Y${year} Q${q}`;
}

export type { NewsTemplate };
export { TOTAL_QUARTERS, STARTING_CAPITAL, TIMER_SECONDS, NEWS_BANK };
