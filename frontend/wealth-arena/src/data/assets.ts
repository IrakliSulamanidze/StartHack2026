export interface Asset {
  ticker: string;
  name: string;
  type: 'stock' | 'indexFund' | 'bond' | 'etf';
  sector: string;
  basePrice: number;
  volatility: number;
  description: string;
  dividendYield: number;
}

export interface MarketIndex {
  ticker: string;
  name: string;
  baseValue: number;
}

export const ASSET_UNIVERSE: Asset[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', type: 'stock', sector: 'Technology', basePrice: 185, volatility: 0.28, description: 'Consumer electronics and software giant.', dividendYield: 0.005 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', type: 'stock', sector: 'Technology', basePrice: 415, volatility: 0.25, description: 'Cloud computing and enterprise software leader.', dividendYield: 0.008 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', sector: 'Technology', basePrice: 165, volatility: 0.30, description: 'Search, advertising, and cloud services.', dividendYield: 0.0 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', sector: 'Consumer', basePrice: 180, volatility: 0.32, description: 'E-commerce and cloud infrastructure leader.', dividendYield: 0.0 },
  { ticker: 'TSLA', name: 'Tesla Inc.', type: 'stock', sector: 'Automotive', basePrice: 245, volatility: 0.55, description: 'Electric vehicle and energy company.', dividendYield: 0.0 },
  { ticker: 'JPM', name: 'JPMorgan Chase', type: 'stock', sector: 'Financial', basePrice: 195, volatility: 0.22, description: 'Largest U.S. bank by assets.', dividendYield: 0.025 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', type: 'stock', sector: 'Healthcare', basePrice: 155, volatility: 0.16, description: 'Diversified healthcare and consumer goods.', dividendYield: 0.030 },
  { ticker: 'PG', name: 'Procter & Gamble', type: 'stock', sector: 'Consumer', basePrice: 165, volatility: 0.15, description: 'Consumer staples and household brands.', dividendYield: 0.025 },
  { ticker: 'XOM', name: 'ExxonMobil Corp.', type: 'stock', sector: 'Energy', basePrice: 105, volatility: 0.30, description: 'Oil and gas exploration and production.', dividendYield: 0.035 },
  { ticker: 'NVDA', name: 'Nvidia Corp.', type: 'stock', sector: 'Technology', basePrice: 875, volatility: 0.45, description: 'GPU and AI chip designer.', dividendYield: 0.001 },
  { ticker: 'META', name: 'Meta Platforms', type: 'stock', sector: 'Technology', basePrice: 505, volatility: 0.35, description: 'Social media and virtual reality.', dividendYield: 0.004 },
  { ticker: 'DIS', name: 'Walt Disney Co.', type: 'stock', sector: 'Entertainment', basePrice: 110, volatility: 0.28, description: 'Entertainment, media, and theme parks.', dividendYield: 0.008 },
  { ticker: 'SPY', name: 'S&P 500 ETF', type: 'indexFund', sector: 'Broad Market', basePrice: 510, volatility: 0.18, description: 'Tracks the 500 largest U.S. companies.', dividendYield: 0.013 },
  { ticker: 'QQQ', name: 'Nasdaq-100 ETF', type: 'indexFund', sector: 'Technology', basePrice: 445, volatility: 0.22, description: 'Tracks the 100 largest Nasdaq companies.', dividendYield: 0.006 },
  { ticker: 'VTI', name: 'Total Stock Market', type: 'indexFund', sector: 'Broad Market', basePrice: 260, volatility: 0.18, description: 'Tracks the entire U.S. stock market.', dividendYield: 0.014 },
  { ticker: 'XLF', name: 'Financial Select', type: 'etf', sector: 'Financial', basePrice: 42, volatility: 0.22, description: 'Tracks U.S. financial sector companies.', dividendYield: 0.018 },
  { ticker: 'XLE', name: 'Energy Select', type: 'etf', sector: 'Energy', basePrice: 88, volatility: 0.30, description: 'Tracks U.S. energy sector companies.', dividendYield: 0.035 },
  { ticker: 'XLK', name: 'Technology Select', type: 'etf', sector: 'Technology', basePrice: 210, volatility: 0.24, description: 'Tracks U.S. technology sector companies.', dividendYield: 0.007 },
  { ticker: 'GOVT', name: 'US Treasury Bond ETF', type: 'bond', sector: 'Government', basePrice: 23, volatility: 0.06, description: 'U.S. government treasury bonds.', dividendYield: 0.028 },
  { ticker: 'BND', name: 'Total Bond Market', type: 'bond', sector: 'Broad Bond', basePrice: 72, volatility: 0.08, description: 'Diversified U.S. investment-grade bonds.', dividendYield: 0.032 },
  { ticker: 'TLT', name: '20+ Year Treasury', type: 'bond', sector: 'Government', basePrice: 92, volatility: 0.15, description: 'Long-term U.S. treasury bonds.', dividendYield: 0.038 },
  { ticker: 'HYG', name: 'High Yield Corporate', type: 'bond', sector: 'Corporate', basePrice: 75, volatility: 0.12, description: 'High-yield corporate bonds (junk bonds).', dividendYield: 0.055 },
  { ticker: 'TIPS', name: 'TIPS Bond ETF', type: 'bond', sector: 'Government', basePrice: 108, volatility: 0.07, description: 'Inflation-protected treasury bonds.', dividendYield: 0.025 },
];

export const MARKET_INDICES: MarketIndex[] = [
  { ticker: 'SPX', name: 'S&P 500', baseValue: 5250 },
  { ticker: 'DJI', name: 'Dow Jones', baseValue: 39800 },
  { ticker: 'IXIC', name: 'Nasdaq', baseValue: 16750 },
];

function seededRandom(seed: number): number {
  const s = ((seed * 1103515245 + 12345) & 0x7fffffff);
  return s / 0x7fffffff;
}

export function computeAssetPrice(
  asset: Asset,
  newsImpact: 'positive' | 'negative' | 'mixed',
  seed: number
): number {
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);
  const maxMove = asset.volatility * 0.06;
  const rawMove = (r1 - 0.5) * 2 * maxMove;

  let impactMult: number;
  if (newsImpact === 'positive') impactMult = 0.5 + r2 * 0.8;
  else if (newsImpact === 'negative') impactMult = -0.5 - r2 * 0.8;
  else impactMult = (r2 - 0.5) * 0.4;

  const pctChange = rawMove + impactMult * maxMove * 0.5;
  return Math.round(asset.basePrice * (1 + pctChange) * 100) / 100;
}

export function computeIndexValue(
  index: MarketIndex,
  newsImpact: 'positive' | 'negative' | 'mixed',
  seed: number
): number {
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);
  const maxMove = 0.03;
  const rawMove = (r1 - 0.5) * 2 * maxMove;

  let impactMult: number;
  if (newsImpact === 'positive') impactMult = 0.3 + r2 * 0.5;
  else if (newsImpact === 'negative') impactMult = -0.3 - r2 * 0.5;
  else impactMult = (r2 - 0.5) * 0.3;

  const pctChange = rawMove + impactMult * maxMove;
  return Math.round(index.baseValue * (1 + pctChange));
}

export const FINANCIAL_TRIVIA: string[] = [
  "The S&P 500 has averaged about 10% annual returns since 1926.",
  "Bonds are like IOUs — you lend money to a government or company, and they pay you back with interest.",
  "Diversification means spreading your money across different investments so one bad pick doesn't sink you.",
  "Index funds let you own a tiny piece of hundreds of companies in one purchase.",
  "Historically, stocks outperform bonds over long periods, but with more ups and downs.",
  "The 'Rule of 72' — divide 72 by your annual return to estimate how many years to double your money.",
  "A bear market means prices are falling 20%+. A bull market means they're rising steadily.",
  "Dollar-cost averaging means investing the same amount regularly, regardless of price.",
  "Compound interest is when your earnings start earning their own earnings — it's exponential growth.",
  "ETFs (Exchange-Traded Funds) trade like stocks but hold a basket of assets, like a sampler platter.",
  "Dividends are cash payments companies make to shareholders — like a thank-you bonus for owning the stock.",
  "Inflation means your money buys less over time. Investing helps your wealth keep pace.",
  "A stock's price reflects what people think the company will be worth in the future, not just today.",
  "Treasury bonds are considered the safest investments because they're backed by the U.S. government.",
  "Panic selling during a crash often locks in losses. Markets have always recovered eventually.",
  "The Dow Jones Industrial Average tracks just 30 large companies, not the whole market.",
  "Mutual funds pool money from many investors and are managed by professionals.",
  "Risk and reward are linked — higher potential returns usually mean higher potential losses.",
  "Most professional fund managers fail to beat the S&P 500 index over 10+ years.",
  "Starting to invest early matters more than investing large amounts later, thanks to compounding.",
];

export const HELPFUL_HINTS: Record<string, string[]> = {
  news: [
    "Read the headline carefully — positive news usually helps stocks, while negative news can boost bonds.",
    "The AI Market Mentor breaks down jargon into plain English. Check the analogy for intuition.",
    "Look at which assets the news hints will go up or down before making your trades.",
    "Not every negative headline means you should sell — sometimes holding steady is the best move.",
    "Pay attention to whether the news affects a specific sector or the whole market.",
  ],
  trading: [
    "You don't have to invest everything. Keeping some cash gives you flexibility next turn.",
    "Diversification is your best friend — spread across stocks, index funds, and bonds.",
    "In Solo mode, the AI Trade Guardian will warn you if you're about to make a risky move.",
    "Use the MAX button to quickly invest all your available cash into an asset.",
    "You can make multiple trades per turn — buy stocks AND bonds in the same quarter.",
    "Selling isn't bad — taking profits or reducing risk before bad news is smart strategy.",
  ],
  review: [
    "Compare your return to the opponent's — what did they do differently?",
    "Check your diversification score. A higher score means less risk from any single asset class.",
    "Look at the news recap to understand WHY your portfolio moved the way it did.",
    "Use the AI Chat to ask questions about anything you don't understand.",
    "Your transaction history shows every trade — review it to spot patterns in your strategy.",
  ],
};
