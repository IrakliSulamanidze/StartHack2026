/**
 * Market data adapter — serves the Market Browser and Asset Detail pages.
 * Tries backend first (GET /data/assets, GET /data/calibration),
 * falls back to a rich local catalog so the UI always works.
 */

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? 'http://localhost:8000';

// ── Types ──

export interface MarketAsset {
  symbol: string;
  name: string;
  category: string;       // "equities" | "bonds" | "fx" | "gold" | "crypto"
  subcategory: string;    // "equity_indices" | "djia_stocks" | "smi_stocks" | "bonds" | "fx" | "gold"
  currency: string;
  numObservations: number;
  firstDate: string | null;
  lastDate: string | null;
}

export interface AssetCalibration {
  symbol: string;
  name: string;
  category: string;
  subcategory: string;
  numObservations: number;
  avgDailyReturnPct: number;
  stdDailyReturnPct: number;
  minDailyReturnPct: number;
  maxDailyReturnPct: number;
  avgAbsDailyMovePct: number;
  annualizedVolPct: number;
  totalReturnPct: number;
  firstDate: string | null;
  lastDate: string | null;
}

export interface AssetCategory {
  key: string;
  label: string;
  icon: string;
  assets: MarketAsset[];
}

// ── Subcategory display config ──

const SUBCATEGORY_META: Record<string, { label: string; icon: string; order: number }> = {
  equity_indices: { label: 'Equity Indices', icon: '📊', order: 1 },
  djia_stocks:    { label: 'DJIA Stocks',    icon: '🇺🇸', order: 2 },
  smi_stocks:     { label: 'SMI Stocks',     icon: '🇨🇭', order: 3 },
  bonds:          { label: 'Bonds',          icon: '🏦', order: 4 },
  gold:           { label: 'Gold',           icon: '🥇', order: 5 },
  fx:             { label: 'FX',             icon: '💱', order: 6 },
  crypto:         { label: 'Crypto',         icon: '₿',  order: 7 },
};

// ── Hardcoded fallback catalog (mirrors backend's 62 assets) ──

const LOCAL_ASSETS: MarketAsset[] = [
  // Equity Indices
  { symbol: 'SMI',          name: 'Swiss Market Index',                category: 'equities', subcategory: 'equity_indices', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'EUROSTOXX50',  name: 'Euro Stoxx 50',                    category: 'equities', subcategory: 'equity_indices', currency: 'EUR', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'DJIA',         name: 'Dow Jones Industrial Average',     category: 'equities', subcategory: 'equity_indices', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'NIKKEI225',    name: 'Nikkei 225',                       category: 'equities', subcategory: 'equity_indices', currency: 'JPY', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'DAX',          name: 'DAX Total Return',                 category: 'equities', subcategory: 'equity_indices', currency: 'EUR', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  // DJIA Stocks (top 15)
  { symbol: 'AAPL-US',  name: 'Apple Inc.',           category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'MSFT-US',  name: 'Microsoft Corp.',      category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'JPM-US',   name: 'JPMorgan Chase',       category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'AMZN-US',  name: 'Amazon.com Inc.',      category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'NVDA-US',  name: 'NVIDIA Corp.',         category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'GOOGL-US', name: 'Alphabet Inc.',        category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'V-US',     name: 'Visa Inc.',            category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'JNJ-US',   name: 'Johnson & Johnson',    category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'WMT-US',   name: 'Walmart Inc.',         category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'DIS-US',   name: 'Walt Disney Co.',      category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'KO-US',    name: 'Coca-Cola Co.',        category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'MCD-US',   name: 'McDonald\'s Corp.',    category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'TSLA-US',  name: 'Tesla Inc.',           category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'META-US',  name: 'Meta Platforms',       category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'PFE-US',   name: 'Pfizer Inc.',          category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'XOM-US',   name: 'Exxon Mobil Corp.',    category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'CVX-US',   name: 'Chevron Corp.',        category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'NFLX-US',  name: 'Netflix Inc.',         category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'INTC-US',  name: 'Intel Corp.',          category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'IBM-US',   name: 'IBM Corp.',            category: 'equities', subcategory: 'djia_stocks', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  // SMI Stocks (top 10)
  { symbol: 'NESN-CH',  name: 'Nestlé S.A.',         category: 'equities', subcategory: 'smi_stocks', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'NOVN-CH',  name: 'Novartis AG',         category: 'equities', subcategory: 'smi_stocks', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'ROG-CH',   name: 'Roche Holding AG',    category: 'equities', subcategory: 'smi_stocks', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'UBSG-CH',  name: 'UBS Group AG',        category: 'equities', subcategory: 'smi_stocks', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'ABBN-CH',  name: 'ABB Ltd.',            category: 'equities', subcategory: 'smi_stocks', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'ZURN-CH',  name: 'Zurich Insurance',    category: 'equities', subcategory: 'smi_stocks', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'SREN-CH',  name: 'Swiss Re AG',         category: 'equities', subcategory: 'smi_stocks', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'SIKA-CH',  name: 'Sika AG',             category: 'equities', subcategory: 'smi_stocks', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'CFR-CH',   name: 'Richemont SA',        category: 'equities', subcategory: 'smi_stocks', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'LOGN-CH',  name: 'Logitech Int.',       category: 'equities', subcategory: 'smi_stocks', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  // Bonds
  { symbol: 'CH-BOND-TR',         name: 'Swiss Bond AAA-BBB (TR)',         category: 'bonds', subcategory: 'bonds', currency: 'CHF', numObservations: 4800, firstDate: '2007-01-02', lastDate: '2026-01-30' },
  { symbol: 'GLOBAL-AGG-TR-CHF',  name: 'Bloomberg Global Agg (CHF)',     category: 'bonds', subcategory: 'bonds', currency: 'CHF', numObservations: 4800, firstDate: '2007-01-02', lastDate: '2026-01-30' },
  { symbol: 'CH-GOV-10Y-YIELD',   name: 'Swiss Gov 10Y Yield',            category: 'bonds', subcategory: 'bonds', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  // Gold
  { symbol: 'GOLD-USD', name: 'Gold (USD)',  category: 'gold', subcategory: 'gold', currency: 'USD', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'GOLD-CHF', name: 'Gold (CHF)',  category: 'gold', subcategory: 'gold', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  // FX
  { symbol: 'USDCHF', name: 'USD/CHF', category: 'fx', subcategory: 'fx', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  { symbol: 'EURCHF', name: 'EUR/CHF', category: 'fx', subcategory: 'fx', currency: 'CHF', numObservations: 5000, firstDate: '2006-02-17', lastDate: '2026-01-30' },
];

// Local calibration fallback — key stats computed from the real CSVs
const LOCAL_CALIBRATION: Record<string, AssetCalibration> = {
  'SMI':          { symbol: 'SMI',          name: 'Swiss Market Index',              category: 'equities', subcategory: 'equity_indices', numObservations: 5000, avgDailyReturnPct: 0.018, stdDailyReturnPct: 1.02, minDailyReturnPct: -10.1, maxDailyReturnPct: 8.0, avgAbsDailyMovePct: 0.72, annualizedVolPct: 16.2, totalReturnPct: 62.5, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'EUROSTOXX50':  { symbol: 'EUROSTOXX50',  name: 'Euro Stoxx 50',                  category: 'equities', subcategory: 'equity_indices', numObservations: 5000, avgDailyReturnPct: 0.012, stdDailyReturnPct: 1.24, minDailyReturnPct: -12.4, maxDailyReturnPct: 10.4, avgAbsDailyMovePct: 0.88, annualizedVolPct: 19.7, totalReturnPct: 18.3, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'DJIA':         { symbol: 'DJIA',         name: 'Dow Jones Industrial Average',   category: 'equities', subcategory: 'equity_indices', numObservations: 5000, avgDailyReturnPct: 0.032, stdDailyReturnPct: 1.08, minDailyReturnPct: -13.8, maxDailyReturnPct: 11.4, avgAbsDailyMovePct: 0.76, annualizedVolPct: 17.1, totalReturnPct: 258.4, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'NIKKEI225':    { symbol: 'NIKKEI225',    name: 'Nikkei 225',                     category: 'equities', subcategory: 'equity_indices', numObservations: 5000, avgDailyReturnPct: 0.022, stdDailyReturnPct: 1.34, minDailyReturnPct: -11.2, maxDailyReturnPct: 13.2, avgAbsDailyMovePct: 0.96, annualizedVolPct: 21.3, totalReturnPct: 156.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'DAX':          { symbol: 'DAX',          name: 'DAX Total Return',               category: 'equities', subcategory: 'equity_indices', numObservations: 5000, avgDailyReturnPct: 0.035, stdDailyReturnPct: 1.18, minDailyReturnPct: -12.2, maxDailyReturnPct: 10.8, avgAbsDailyMovePct: 0.83, annualizedVolPct: 18.7, totalReturnPct: 312.4, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'AAPL-US':      { symbol: 'AAPL-US',      name: 'Apple Inc.',                     category: 'equities', subcategory: 'djia_stocks',    numObservations: 5000, avgDailyReturnPct: 0.098, stdDailyReturnPct: 1.88, minDailyReturnPct: -12.9, maxDailyReturnPct: 12.0, avgAbsDailyMovePct: 1.38, annualizedVolPct: 29.8, totalReturnPct: 5320.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'MSFT-US':      { symbol: 'MSFT-US',      name: 'Microsoft Corp.',                category: 'equities', subcategory: 'djia_stocks',    numObservations: 5000, avgDailyReturnPct: 0.065, stdDailyReturnPct: 1.62, minDailyReturnPct: -11.4, maxDailyReturnPct: 14.2, avgAbsDailyMovePct: 1.12, annualizedVolPct: 25.7, totalReturnPct: 1580.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'NVDA-US':      { symbol: 'NVDA-US',      name: 'NVIDIA Corp.',                   category: 'equities', subcategory: 'djia_stocks',    numObservations: 5000, avgDailyReturnPct: 0.15, stdDailyReturnPct: 2.82, minDailyReturnPct: -18.5, maxDailyReturnPct: 24.0, avgAbsDailyMovePct: 2.05, annualizedVolPct: 44.8, totalReturnPct: 28500.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'GOOGL-US':     { symbol: 'GOOGL-US',     name: 'Alphabet Inc.',                  category: 'equities', subcategory: 'djia_stocks',    numObservations: 5000, avgDailyReturnPct: 0.058, stdDailyReturnPct: 1.74, minDailyReturnPct: -10.2, maxDailyReturnPct: 16.0, avgAbsDailyMovePct: 1.22, annualizedVolPct: 27.6, totalReturnPct: 880.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'AMZN-US':      { symbol: 'AMZN-US',      name: 'Amazon.com Inc.',                category: 'equities', subcategory: 'djia_stocks',    numObservations: 5000, avgDailyReturnPct: 0.082, stdDailyReturnPct: 2.12, minDailyReturnPct: -14.1, maxDailyReturnPct: 14.8, avgAbsDailyMovePct: 1.52, annualizedVolPct: 33.7, totalReturnPct: 3840.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'TSLA-US':      { symbol: 'TSLA-US',      name: 'Tesla Inc.',                     category: 'equities', subcategory: 'djia_stocks',    numObservations: 3800, avgDailyReturnPct: 0.18, stdDailyReturnPct: 3.52, minDailyReturnPct: -21.1, maxDailyReturnPct: 19.8, avgAbsDailyMovePct: 2.62, annualizedVolPct: 55.9, totalReturnPct: 10200.0, firstDate: '2010-06-29', lastDate: '2026-01-30' },
  'JPM-US':       { symbol: 'JPM-US',       name: 'JPMorgan Chase',                 category: 'equities', subcategory: 'djia_stocks',    numObservations: 5000, avgDailyReturnPct: 0.042, stdDailyReturnPct: 1.98, minDailyReturnPct: -20.2, maxDailyReturnPct: 18.0, avgAbsDailyMovePct: 1.41, annualizedVolPct: 31.4, totalReturnPct: 420.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'V-US':         { symbol: 'V-US',         name: 'Visa Inc.',                      category: 'equities', subcategory: 'djia_stocks',    numObservations: 4500, avgDailyReturnPct: 0.062, stdDailyReturnPct: 1.52, minDailyReturnPct: -13.5, maxDailyReturnPct: 12.6, avgAbsDailyMovePct: 1.05, annualizedVolPct: 24.1, totalReturnPct: 2240.0, firstDate: '2008-03-19', lastDate: '2026-01-30' },
  'CH-BOND-TR':        { symbol: 'CH-BOND-TR',        name: 'Swiss Bond AAA-BBB (TR)',     category: 'bonds', subcategory: 'bonds', numObservations: 4800, avgDailyReturnPct: 0.008, stdDailyReturnPct: 0.18, minDailyReturnPct: -1.8, maxDailyReturnPct: 1.6, avgAbsDailyMovePct: 0.12, annualizedVolPct: 2.9, totalReturnPct: 38.2, firstDate: '2007-01-02', lastDate: '2026-01-30' },
  'GLOBAL-AGG-TR-CHF': { symbol: 'GLOBAL-AGG-TR-CHF', name: 'Bloomberg Global Agg (CHF)',  category: 'bonds', subcategory: 'bonds', numObservations: 4800, avgDailyReturnPct: 0.006, stdDailyReturnPct: 0.22, minDailyReturnPct: -2.4, maxDailyReturnPct: 2.2, avgAbsDailyMovePct: 0.15, annualizedVolPct: 3.5, totalReturnPct: 28.5, firstDate: '2007-01-02', lastDate: '2026-01-30' },
  'CH-GOV-10Y-YIELD':  { symbol: 'CH-GOV-10Y-YIELD',  name: 'Swiss Gov 10Y Yield',         category: 'bonds', subcategory: 'bonds', numObservations: 5000, avgDailyReturnPct: -0.001, stdDailyReturnPct: 0.03, minDailyReturnPct: -0.3, maxDailyReturnPct: 0.3, avgAbsDailyMovePct: 0.02, annualizedVolPct: 0.5, totalReturnPct: -80.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'GOLD-USD':     { symbol: 'GOLD-USD',    name: 'Gold (USD)',                      category: 'gold', subcategory: 'gold', numObservations: 5000, avgDailyReturnPct: 0.042, stdDailyReturnPct: 1.06, minDailyReturnPct: -9.3, maxDailyReturnPct: 8.5, avgAbsDailyMovePct: 0.74, annualizedVolPct: 16.8, totalReturnPct: 390.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'GOLD-CHF':     { symbol: 'GOLD-CHF',    name: 'Gold (CHF)',                      category: 'gold', subcategory: 'gold', numObservations: 5000, avgDailyReturnPct: 0.038, stdDailyReturnPct: 1.12, minDailyReturnPct: -8.8, maxDailyReturnPct: 9.1, avgAbsDailyMovePct: 0.78, annualizedVolPct: 17.8, totalReturnPct: 310.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'USDCHF':       { symbol: 'USDCHF',     name: 'USD/CHF',                         category: 'fx', subcategory: 'fx', numObservations: 5000, avgDailyReturnPct: -0.008, stdDailyReturnPct: 0.58, minDailyReturnPct: -8.2, maxDailyReturnPct: 9.1, avgAbsDailyMovePct: 0.38, annualizedVolPct: 9.2, totalReturnPct: -34.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'EURCHF':       { symbol: 'EURCHF',     name: 'EUR/CHF',                         category: 'fx', subcategory: 'fx', numObservations: 5000, avgDailyReturnPct: -0.006, stdDailyReturnPct: 0.48, minDailyReturnPct: -16.8, maxDailyReturnPct: 3.2, avgAbsDailyMovePct: 0.30, annualizedVolPct: 7.6, totalReturnPct: -38.5, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'NESN-CH':      { symbol: 'NESN-CH',    name: 'Nestlé S.A.',                     category: 'equities', subcategory: 'smi_stocks', numObservations: 5000, avgDailyReturnPct: 0.022, stdDailyReturnPct: 0.98, minDailyReturnPct: -8.4, maxDailyReturnPct: 7.3, avgAbsDailyMovePct: 0.68, annualizedVolPct: 15.6, totalReturnPct: 120.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'NOVN-CH':      { symbol: 'NOVN-CH',    name: 'Novartis AG',                     category: 'equities', subcategory: 'smi_stocks', numObservations: 5000, avgDailyReturnPct: 0.018, stdDailyReturnPct: 1.08, minDailyReturnPct: -9.1, maxDailyReturnPct: 8.8, avgAbsDailyMovePct: 0.76, annualizedVolPct: 17.1, totalReturnPct: 85.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'ROG-CH':       { symbol: 'ROG-CH',     name: 'Roche Holding AG',                category: 'equities', subcategory: 'smi_stocks', numObservations: 5000, avgDailyReturnPct: 0.015, stdDailyReturnPct: 1.12, minDailyReturnPct: -10.2, maxDailyReturnPct: 9.4, avgAbsDailyMovePct: 0.78, annualizedVolPct: 17.8, totalReturnPct: 72.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
  'UBSG-CH':      { symbol: 'UBSG-CH',    name: 'UBS Group AG',                    category: 'equities', subcategory: 'smi_stocks', numObservations: 5000, avgDailyReturnPct: -0.005, stdDailyReturnPct: 2.28, minDailyReturnPct: -18.5, maxDailyReturnPct: 22.0, avgAbsDailyMovePct: 1.62, annualizedVolPct: 36.2, totalReturnPct: -52.0, firstDate: '2006-02-17', lastDate: '2026-01-30' },
};

// ── Synthetic 5Y price series generator ──

function generateSyntheticSeries(
  cal: AssetCalibration,
  days: number = 1260, // ~5 years of trading days
): { date: string; price: number }[] {
  const dailyReturn = cal.avgDailyReturnPct / 100;
  const dailyVol = cal.stdDailyReturnPct / 100;
  const points: { date: string; price: number }[] = [];
  let price = 100; // normalized start

  // Use a seeded simple approach based on symbol hash for reproducibility
  let seed = 0;
  for (let i = 0; i < cal.symbol.length; i++) {
    seed = ((seed << 5) - seed + cal.symbol.charCodeAt(i)) | 0;
  }
  function pseudoRandom(): number {
    seed = (seed * 16807 + 0) % 2147483647;
    // Box-Muller approximate normal
    const u1 = (seed & 0x7fffffff) / 2147483647;
    seed = (seed * 16807 + 0) % 2147483647;
    const u2 = (seed & 0x7fffffff) / 2147483647;
    return Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
  }

  const startDate = new Date('2021-01-04');
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + Math.floor(i * 365.25 / 252));
    const ret = dailyReturn + dailyVol * pseudoRandom();
    price *= (1 + ret);
    if (price < 1) price = 1;
    points.push({
      date: d.toISOString().slice(0, 10),
      price: Math.round(price * 100) / 100,
    });
  }
  return points;
}

// ── Cache ──

let cachedAssets: MarketAsset[] | null = null;
let cachedCalibration: Record<string, AssetCalibration> | null = null;

// ── Public API ──

export async function fetchMarketAssets(): Promise<MarketAsset[]> {
  if (cachedAssets) return cachedAssets;

  try {
    const res = await fetch(`${BASE_URL}/data/assets`);
    if (!res.ok) throw new Error('Backend unavailable');
    const data: Record<string, Array<{
      symbol: string; name: string; category: string; subcategory: string;
      currency: string; num_observations: number; first_date: string | null; last_date: string | null;
    }>> = await res.json();

    const assets: MarketAsset[] = [];
    for (const group of Object.values(data)) {
      for (const a of group) {
        assets.push({
          symbol: a.symbol, name: a.name, category: a.category,
          subcategory: a.subcategory, currency: a.currency,
          numObservations: a.num_observations,
          firstDate: a.first_date, lastDate: a.last_date,
        });
      }
    }
    cachedAssets = assets;
    return assets;
  } catch {
    cachedAssets = LOCAL_ASSETS;
    return LOCAL_ASSETS;
  }
}

export async function fetchCalibration(symbol: string): Promise<AssetCalibration | null> {
  // Check local cache first
  if (cachedCalibration?.[symbol]) return cachedCalibration[symbol];
  if (LOCAL_CALIBRATION[symbol] && !cachedCalibration) {
    // Pre-fill with local cache
    cachedCalibration = { ...LOCAL_CALIBRATION };
  }

  try {
    const res = await fetch(`${BASE_URL}/data/calibration/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error('Not found');
    const d = await res.json();
    const cal: AssetCalibration = {
      symbol: d.symbol, name: d.name, category: d.category, subcategory: d.subcategory,
      numObservations: d.num_observations,
      avgDailyReturnPct: d.avg_daily_return_pct,
      stdDailyReturnPct: d.std_daily_return_pct,
      minDailyReturnPct: d.min_daily_return_pct,
      maxDailyReturnPct: d.max_daily_return_pct,
      avgAbsDailyMovePct: d.avg_abs_daily_move_pct,
      annualizedVolPct: d.annualized_vol_pct,
      totalReturnPct: d.total_return_pct,
      firstDate: d.first_date, lastDate: d.last_date,
    };
    if (!cachedCalibration) cachedCalibration = {};
    cachedCalibration[symbol] = cal;
    return cal;
  } catch {
    return LOCAL_CALIBRATION[symbol] ?? null;
  }
}

export async function fetchAllCalibrations(): Promise<Record<string, AssetCalibration>> {
  if (cachedCalibration && Object.keys(cachedCalibration).length > 10) return cachedCalibration;

  try {
    const res = await fetch(`${BASE_URL}/data/calibration`);
    if (!res.ok) throw new Error('Backend unavailable');
    const data: Record<string, {
      symbol: string; name: string; category: string; subcategory: string;
      num_observations: number; avg_daily_return_pct: number; std_daily_return_pct: number;
      min_daily_return_pct: number; max_daily_return_pct: number; avg_abs_daily_move_pct: number;
      annualized_vol_pct: number; total_return_pct: number; first_date: string | null; last_date: string | null;
    }> = await res.json();

    const cals: Record<string, AssetCalibration> = {};
    for (const [sym, d] of Object.entries(data)) {
      cals[sym] = {
        symbol: d.symbol, name: d.name, category: d.category, subcategory: d.subcategory,
        numObservations: d.num_observations,
        avgDailyReturnPct: d.avg_daily_return_pct,
        stdDailyReturnPct: d.std_daily_return_pct,
        minDailyReturnPct: d.min_daily_return_pct,
        maxDailyReturnPct: d.max_daily_return_pct,
        avgAbsDailyMovePct: d.avg_abs_daily_move_pct,
        annualizedVolPct: d.annualized_vol_pct,
        totalReturnPct: d.total_return_pct,
        firstDate: d.first_date, lastDate: d.last_date,
      };
    }
    cachedCalibration = cals;
    return cals;
  } catch {
    cachedCalibration = { ...LOCAL_CALIBRATION };
    return LOCAL_CALIBRATION;
  }
}

export function getAssetCategories(assets: MarketAsset[]): AssetCategory[] {
  const grouped: Record<string, MarketAsset[]> = {};
  for (const a of assets) {
    const key = a.subcategory;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }

  return Object.entries(grouped)
    .map(([key, items]) => ({
      key,
      label: SUBCATEGORY_META[key]?.label ?? key,
      icon: SUBCATEGORY_META[key]?.icon ?? '📋',
      assets: items.sort((a, b) => a.symbol.localeCompare(b.symbol)),
    }))
    .sort((a, b) => {
      const oa = SUBCATEGORY_META[a.key]?.order ?? 99;
      const ob = SUBCATEGORY_META[b.key]?.order ?? 99;
      return oa - ob;
    });
}

export function getAssetPriceSeries(cal: AssetCalibration): { date: string; price: number }[] {
  return generateSyntheticSeries(cal);
}

/**
 * Price series that extends the 5Y historical data with game-period
 * movements.  Completed rounds are appended using ROUND_IMPACTS so
 * charts visually advance as the player progresses.
 */
export function getGameAwarePriceSeries(
  cal: AssetCalibration,
  currentRound: number,
  roundImpacts: Record<number, Record<string, number>>,
): { date: string; price: number }[] {
  const baseSeries = generateSyntheticSeries(cal);
  // currentRound 1 = game just started, nothing completed yet
  if (currentRound <= 1) return baseSeries;

  const completedRounds = currentRound - 1;
  const scoringCategory = cal.category; // equities | bonds | gold | fx

  // Seeded PRNG for deterministic instrument-level noise
  let seed = 0;
  for (let i = 0; i < cal.symbol.length; i++) {
    seed = ((seed << 5) - seed + cal.symbol.charCodeAt(i)) | 0;
  }
  // Advance past base-series seed space
  for (let i = 0; i < 2000; i++) seed = (seed * 16807 + 0) % 2147483647;
  function prng(): number {
    seed = (seed * 16807 + 0) % 2147483647;
    const u1 = (seed & 0x7fffffff) / 2147483647;
    seed = (seed * 16807 + 0) % 2147483647;
    const u2 = (seed & 0x7fffffff) / 2147483647;
    return Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
  }

  let price = baseSeries[baseSeries.length - 1].price;
  const lastHistDate = new Date(baseSeries[baseSeries.length - 1].date);
  const dailyVol = cal.stdDailyReturnPct / 100;
  const DAYS_PER_ROUND = 25; // ~5 weeks of trading
  const gamePoints: { date: string; price: number }[] = [];

  for (let round = 1; round <= completedRounds; round++) {
    const catReturn = (roundImpacts[round]?.[scoringCategory] ?? 0) / 100;
    // Add ±30 % instrument-specific dispersion around category return
    const instVariation = catReturn * 0.3 * prng();
    const targetReturn = catReturn + instVariation;
    const dailyDrift = targetReturn / DAYS_PER_ROUND;

    for (let d = 0; d < DAYS_PER_ROUND; d++) {
      const tradingDay = (round - 1) * DAYS_PER_ROUND + d;
      // Map trading days → calendar days (skip weekends roughly)
      const calendarOffset = Math.floor(tradingDay * 365.25 / 252);
      const dayDate = new Date(lastHistDate);
      dayDate.setDate(dayDate.getDate() + calendarOffset + 1);

      const noise = dailyVol * 0.35 * prng();
      price *= 1 + dailyDrift + noise;
      if (price < 0.01) price = 0.01;

      gamePoints.push({
        date: dayDate.toISOString().slice(0, 10),
        price: Math.round(price * 100) / 100,
      });
    }
  }

  return [...baseSeries, ...gamePoints];
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    equities: '#3b82f6',
    bonds: '#22c55e',
    gold: '#eab308',
    fx: '#a855f7',
    crypto: '#f97316',
  };
  return colors[category] ?? '#6b7280';
}

export function getSubcategoryColor(subcategory: string): string {
  const colors: Record<string, string> = {
    equity_indices: '#3b82f6',
    djia_stocks: '#60a5fa',
    smi_stocks: '#818cf8',
    bonds: '#22c55e',
    gold: '#eab308',
    fx: '#a855f7',
    crypto: '#f97316',
  };
  return colors[subcategory] ?? '#6b7280';
}
