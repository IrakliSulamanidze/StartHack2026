import { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { ASSET_UNIVERSE, type Asset } from '../data/assets';

type AssetCategory = 'All' | 'stock' | 'indexFund' | 'etf' | 'bond';

const CATEGORIES: { label: string; value: AssetCategory }[] = [
  { label: 'All Assets', value: 'All' },
  { label: 'Stocks', value: 'stock' },
  { label: 'Index Funds', value: 'indexFund' },
  { label: 'ETFs', value: 'etf' },
  { label: 'Bonds', value: 'bond' },
];

interface TradeHint {
  type: 'warning' | 'tip';
  message: string;
}

interface StagedTrade {
  id: string;
  ticker: string;
  name: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
}

function evaluateTradeHint(
  ticker: string,
  side: 'buy' | 'sell',
  quantity: number,
  price: number,
  cash: number,
  holdings: { ticker: string; quantity: number; avgCost: number }[],
  mode: string,
): TradeHint | null {
  if (side === 'buy') {
    const totalCost = quantity * price;
    const cashAfter = cash - totalCost;

    if (cashAfter < cash * 0.05 && cash > 10000) {
      return { type: 'warning', message: 'Hint: You\'re investing almost all your cash. Keeping a cash reserve gives you flexibility for future opportunities.' };
    }

    const totalMV = holdings.reduce((s, h) => s + h.quantity * price, 0) + totalCost;
    const thisAssetMV = (holdings.find(h => h.ticker === ticker)?.quantity ?? 0) * price + totalCost;
    if (totalMV > 0 && thisAssetMV / totalMV > 0.4) {
      return { type: 'warning', message: `Hint: Over 40% of your portfolio would be in ${ticker}. Consider adding index funds like SPY or VTI for diversification.` };
    }

    const asset = ASSET_UNIVERSE.find(a => a.ticker === ticker);
    if (asset && asset.volatility > 0.4 && mode === 'beginner') {
      return { type: 'tip', message: `Tip: ${ticker} is a high-volatility stock (${(asset.volatility * 100).toFixed(0)}%). Beginners might want to pair this with stable assets like bonds (BND, GOVT).` };
    }
  }

  if (side === 'sell') {
    const holding = holdings.find(h => h.ticker === ticker);
    if (holding && quantity >= holding.quantity) {
      return { type: 'tip', message: 'Tip: Selling your entire position. Consider keeping a small amount in case the price recovers.' };
    }
  }

  return null;
}

export default function TradingPage() {
  const { state, dispatch } = useGame();
  const [category, setCategory] = useState<AssetCategory>('All');
  const [search, setSearch] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [qty, setQty] = useState('');
  const [hint, setHint] = useState<TradeHint | null>(null);
  const [stagedTrades, setStagedTrades] = useState<StagedTrade[]>([]);
  const [investToast, setInvestToast] = useState('');

  const filteredAssets = useMemo(() => {
    let list = ASSET_UNIVERSE;
    if (category !== 'All') list = list.filter(a => a.type === category);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a => a.ticker.toLowerCase().includes(s) || a.name.toLowerCase().includes(s));
    }
    return list;
  }, [category, search]);

  const portfolioPreview = useMemo(() => {
    const qtyByTicker = state.holdings.reduce<Record<string, number>>((acc, h) => {
      acc[h.ticker] = h.quantity;
      return acc;
    }, {});
    let previewCash = state.cash;

    for (const t of stagedTrades) {
      if (t.side === 'buy') {
        previewCash -= t.total;
        qtyByTicker[t.ticker] = (qtyByTicker[t.ticker] ?? 0) + t.quantity;
      } else {
        previewCash += t.total;
        qtyByTicker[t.ticker] = Math.max(0, (qtyByTicker[t.ticker] ?? 0) - t.quantity);
      }
    }

    return {
      cash: Math.round(previewCash * 100) / 100,
      qtyByTicker,
    };
  }, [state.cash, state.holdings, stagedTrades]);

  const selectedAsset = ASSET_UNIVERSE.find(a => a.ticker === selectedTicker);
  const currentPrice = selectedTicker ? (state.prices[selectedTicker] ?? selectedAsset?.basePrice ?? 0) : 0;
  const parsedQty = Math.max(0, parseInt(qty, 10) || 0);
  const estimatedCost = parsedQty * currentPrice;
  const holding = state.holdings.find(h => h.ticker === selectedTicker);
  const simulatedTickerQty = selectedTicker ? (portfolioPreview.qtyByTicker[selectedTicker] ?? 0) : 0;
  const maxBuyQty = currentPrice > 0 ? Math.floor(portfolioPreview.cash / currentPrice) : 0;
  const maxSellQty = simulatedTickerQty;

  function handleSelectAsset(asset: Asset) {
    setSelectedTicker(asset.ticker);
    setSide('buy');
    setQty('');
    setHint(null);
  }

  function handleStageTrade() {
    if (!selectedAsset || parsedQty <= 0) return;
    if (side === 'buy' && estimatedCost > portfolioPreview.cash) return;
    if (side === 'sell' && parsedQty > maxSellQty) return;

    const h = evaluateTradeHint(
      selectedAsset.ticker, side, parsedQty, currentPrice,
      portfolioPreview.cash,
      state.holdings.map(item => ({
        ticker: item.ticker,
        quantity: portfolioPreview.qtyByTicker[item.ticker] ?? item.quantity,
        avgCost: item.avgCost,
      })),
      state.mode,
    );
    setHint(h);
    setStagedTrades(prev => [
      ...prev,
      {
        id: `staged_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ticker: selectedAsset.ticker,
        name: selectedAsset.name,
        side,
        quantity: parsedQty,
        price: currentPrice,
        total: estimatedCost,
      },
    ]);
    setQty('');
  }

  function removeStagedTrade(id: string) {
    setStagedTrades(prev => prev.filter(t => t.id !== id));
  }

  function handleInvestClick() {
    if (stagedTrades.length === 0) return;

    stagedTrades.forEach(t => {
      dispatch({
        type: 'EXECUTE_TRADE',
        trade: {
          ticker: t.ticker,
          name: t.name,
          side: t.side,
          quantity: t.quantity,
          price: t.price,
          total: t.total,
          round: state.currentRound,
          year: state.currentYear,
        },
      });
    });

    setStagedTrades([]);
    setHint(null);
    setInvestToast('Trades successfully executed!');
    window.setTimeout(() => setInvestToast(''), 2200);
  }

  const showAdvanced = state.mode === 'advanced' || state.mode === 'intermediate';

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto space-y-4">
      {investToast ? (
        <div className="fixed right-4 top-4 z-40 rounded-xl border border-green-500/40 bg-green-500/15 px-4 py-3 text-sm font-medium text-green-300 shadow-md">
          {investToast}
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Trading Center</h1>
          <p className="text-xs text-arena-text-dim mt-0.5">
            Round {state.currentRound} · Live Cash:{' '}
            <span className="text-arena-accent font-mono">${state.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            {' '}· Staged Cash:{' '}
            <span className={`font-mono ${portfolioPreview.cash >= 0 ? 'text-white' : 'text-red-400'}`}>
              ${portfolioPreview.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => dispatch({ type: 'ADVANCE_ROUND' })} className="bg-arena-accent/20 hover:bg-arena-accent/30 text-arena-accent font-semibold text-xs px-4 py-2 rounded-xl shadow-md transition-colors">
            Next Quarter →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Browser */}
        <div className="lg:col-span-2 bg-arena-surface border border-arena-border rounded-xl p-4 sm:p-5 shadow-md">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  category === c.value
                    ? 'bg-arena-accent/20 text-arena-accent'
                    : 'bg-arena-bg text-arena-text-dim hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ticker or name..."
              className="ml-auto bg-arena-bg border border-arena-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-arena-text-dim w-40 focus:outline-none focus:ring-1 focus:ring-arena-accent/50"
            />
          </div>

          <div className="overflow-y-auto max-h-[520px] -mx-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-arena-surface z-10">
                <tr className="text-[10px] uppercase text-arena-text-dim border-b border-arena-border">
                  <th className="text-left py-2 px-2">Ticker</th>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Sector</th>
                  <th className="text-right py-2 px-2">Price</th>
                  <th className="text-right py-2 px-2">Volatility</th>
                  {showAdvanced && <th className="text-right py-2 px-2">Yield</th>}
                  <th className="text-right py-2 px-2">Held</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map(asset => {
                  const price = state.prices[asset.ticker] ?? asset.basePrice;
                  const chg = ((price - asset.basePrice) / asset.basePrice) * 100;
                  const held = state.holdings.find(h => h.ticker === asset.ticker);
                  const sel = selectedTicker === asset.ticker;
                  return (
                    <tr
                      key={asset.ticker}
                      onClick={() => handleSelectAsset(asset)}
                      className={`cursor-pointer border-b border-arena-border/30 transition-colors ${sel ? 'bg-arena-accent/10' : 'hover:bg-arena-bg/50'}`}
                    >
                      <td className="py-2 px-2 font-mono font-bold text-arena-accent">{asset.ticker}</td>
                      <td className="py-2 px-2 text-white text-xs">{asset.name}</td>
                      <td className="py-2 px-2 text-arena-text-dim text-xs">{asset.sector}</td>
                      <td className="py-2 px-2 text-right font-mono">
                        <span className="text-white">${price.toFixed(2)}</span>
                        <span className={`ml-1 text-[10px] ${chg >= 0 ? 'text-arena-accent' : 'text-red-400'}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(1)}%</span>
                      </td>
                      <td className="py-2 px-2 text-right text-arena-text-dim text-xs">{(asset.volatility * 100).toFixed(0)}%</td>
                      {showAdvanced && <td className="py-2 px-2 text-right text-arena-text-dim text-xs">{(asset.dividendYield * 100).toFixed(1)}%</td>}
                      <td className="py-2 px-2 text-right font-mono text-xs">{held ? held.quantity.toLocaleString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trade Ticket */}
        <div className="bg-arena-surface border border-arena-border rounded-xl p-4 sm:p-5 h-fit lg:sticky top-6 shadow-md space-y-4">
          <p className="text-xs uppercase tracking-wider text-arena-text-dim mb-4 font-semibold">Trade Ticket</p>

          {!selectedAsset ? (
            <p className="text-sm text-arena-text-dim text-center py-12">Select an asset from the browser to begin trading.</p>
          ) : (
            <div className="space-y-4">
              {/* Selected asset info */}
              <div className="bg-arena-bg rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-arena-accent text-lg">{selectedAsset.ticker}</span>
                  <span className="text-white font-mono">${currentPrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-arena-text-dim">{selectedAsset.name} · {selectedAsset.sector}</p>
                <p className="text-[10px] text-arena-text-dim mt-1">{selectedAsset.description}</p>
                {holding && (
                  <p className="text-xs text-arena-accent mt-2">You own {holding.quantity.toLocaleString()} shares</p>
                )}
              </div>

              {/* Buy / Sell Toggle */}
              <div className="flex rounded-xl overflow-hidden border border-arena-border">
                <button
                  onClick={() => { setSide('buy'); setHint(null); }}
                  className={`flex-1 py-2 text-sm font-bold transition-colors ${side === 'buy' ? 'bg-arena-accent text-white' : 'bg-arena-bg text-arena-text-dim hover:text-white'}`}
                >
                  Buy
                </button>
                <button
                  onClick={() => { setSide('sell'); setHint(null); }}
                  className={`flex-1 py-2 text-sm font-bold transition-colors ${side === 'sell' ? 'bg-red-500 text-white' : 'bg-arena-bg text-arena-text-dim hover:text-white'}`}
                >
                  Sell
                </button>
              </div>

              {/* Quantity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase text-arena-text-dim font-semibold">Quantity</label>
                  <button
                    onClick={() => setQty(String(side === 'buy' ? maxBuyQty : maxSellQty))}
                    className="text-[10px] text-arena-accent hover:underline"
                  >
                    MAX ({side === 'buy' ? maxBuyQty.toLocaleString() : maxSellQty.toLocaleString()})
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  max={side === 'buy' ? maxBuyQty : maxSellQty}
                  value={qty}
                  onChange={e => { setQty(e.target.value); setHint(null); }}
                  className="w-full bg-arena-bg border border-arena-border rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-arena-accent/50"
                  placeholder="0"
                />
              </div>

              {/* Summary */}
              <div className="bg-arena-bg rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-arena-text-dim">Price</span><span className="text-white font-mono">${currentPrice.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-arena-text-dim">Quantity</span><span className="text-white font-mono">{parsedQty.toLocaleString()}</span></div>
                <div className="flex justify-between border-t border-arena-border pt-1.5"><span className="text-arena-text-dim font-bold">Estimated {side === 'buy' ? 'Cost' : 'Proceeds'}</span><span className="text-white font-mono font-bold">${estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                <div className="flex justify-between"><span className="text-arena-text-dim">Resulting Staged Cash</span><span className={`font-mono ${side === 'buy' ? (portfolioPreview.cash - estimatedCost >= 0 ? 'text-white' : 'text-red-400') : 'text-arena-accent'}`}>${(side === 'buy' ? portfolioPreview.cash - estimatedCost : portfolioPreview.cash + estimatedCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
              </div>

              {/* Hint Card */}
              {hint && (
                <div className={`rounded-xl p-3 text-xs ${hint.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200' : 'bg-blue-500/10 border border-blue-500/30 text-blue-200'}`}>
                  <p className="font-semibold mb-0.5">{hint.type === 'warning' ? '⚠ Warning' : '💡 Tip'}</p>
                  <p>{hint.message}</p>
                </div>
              )}

              <button
                onClick={handleStageTrade}
                disabled={parsedQty <= 0 || (side === 'buy' && estimatedCost > portfolioPreview.cash) || (side === 'sell' && parsedQty > maxSellQty)}
                className="w-full py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-arena-accent hover:bg-arena-accent-dim text-white shadow-md"
              >
                Stage {side === 'buy' ? 'Buy' : 'Sell'}
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-arena-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-arena-text-dim">Staged Trades</p>
              <span className="text-xs text-arena-text-dim">{stagedTrades.length} queued</span>
            </div>

            {stagedTrades.length === 0 ? (
              <p className="text-xs text-arena-text-dim bg-arena-bg rounded-lg p-3">No staged trades yet.</p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-auto pr-1">
                {stagedTrades.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-arena-bg px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="text-white truncate">
                        <span className={`mr-1 font-bold ${t.side === 'buy' ? 'text-arena-accent' : 'text-red-400'}`}>
                          {t.side.toUpperCase()}
                        </span>
                        {t.quantity.toLocaleString()} {t.ticker} @ ${t.price.toFixed(2)}
                      </p>
                      <p className="text-arena-text-dim">${t.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <button onClick={() => removeStagedTrade(t.id)} className="shrink-0 rounded-md px-2 py-1 text-red-300 hover:bg-red-500/20">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleInvestClick}
              disabled={stagedTrades.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Invest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
