import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import {
  fetchMarketAssets,
  fetchCalibration,
  getAssetPriceSeries,
  getGameAwarePriceSeries,
  getCategoryColor,
  type MarketAsset,
  type AssetCalibration,
} from '@/services/marketData';
import { ROUND_IMPACTS } from '@/services/gameAdapter';
import { load } from '@/services/persistence';

export default function AssetDetailPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const [asset, setAsset] = useState<MarketAsset | null>(null);
  const [cal, setCal] = useState<AssetCalibration | null>(null);
  const [series, setSeries] = useState<{ date: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const activeRound = load<number>('active_game_round') ?? 0;

  useEffect(() => {
    if (!assetId) return;
    async function load_() {
      const [assets, calibration] = await Promise.all([
        fetchMarketAssets(),
        fetchCalibration(assetId!),
      ]);
      const found = assets.find((a) => a.symbol === assetId);
      setAsset(found ?? null);
      setCal(calibration);
      if (calibration) {
        setSeries(
          activeRound > 1
            ? getGameAwarePriceSeries(calibration, activeRound, ROUND_IMPACTS)
            : getAssetPriceSeries(calibration)
        );
      }
      setLoading(false);
    }
    load_();
  }, [assetId, activeRound]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <div className="text-arena-text-dim animate-pulse text-lg">Loading asset data…</div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-white mb-4">Asset Not Found</h1>
        <p className="text-arena-text-dim mb-6">No data available for "{assetId}".</p>
        <Link to="/markets" className="text-arena-accent hover:underline font-semibold">← Back to Markets</Link>
      </div>
    );
  }

  const color = getCategoryColor(asset.category);
  const totalReturn = cal?.totalReturnPct ?? 0;

  // Compute extra derived stats from series
  const prices = series.map((s) => s.price);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const lastPrice = prices[prices.length - 1] ?? 100;
  const firstPrice = prices[0] ?? 100;
  const drawdown = maxPrice > 0 ? ((minPrice - maxPrice) / maxPrice) * 100 : 0;
  const fiveYrReturn = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  // Sample series for chart (keep every Nth point)
  const step = Math.max(1, Math.floor(series.length / 300));
  const chartData = series.filter((_, i) => i % step === 0 || i === series.length - 1);

  // Find boundary between historical and game data
  const baseSeries = activeRound > 1 && cal ? getAssetPriceSeries(cal) : [];
  const gameStartDate = baseSeries.length > 0 ? baseSeries[baseSeries.length - 1].date : null;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      {/* Back */}
      <Link
        to="/markets"
        className="inline-flex items-center gap-2 text-sm text-arena-text-dim hover:text-arena-accent transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Markets
      </Link>

      {/* Title Block */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {asset.symbol.slice(0, 3)}
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">{asset.symbol}</h1>
          <p className="text-base text-arena-text-dim">{asset.name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {asset.category.charAt(0).toUpperCase() + asset.category.slice(1)}
            </span>
            <span className="text-xs text-arena-text-dim">{asset.subcategory.replace(/_/g, ' ')}</span>
            <span className="text-xs text-arena-text-dim">• {asset.currency}</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <p className={`text-2xl font-black ${totalReturn >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
          </p>
          <p className="text-xs text-arena-text-dim">Total Return (All Time)</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-arena-surface border border-arena-border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">
                {activeRound > 1 ? 'Price Chart (incl. Game Data)' : '5-Year Price Chart'}
              </h2>
              {activeRound > 1 && (
                <p className="text-[10px] text-arena-accent mt-0.5">Includes game data through round {activeRound - 1}</p>
              )}
            </div>
            <span className={`text-sm font-mono ${fiveYrReturn >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
              {fiveYrReturn >= 0 ? '+' : ''}{fiveYrReturn.toFixed(2)}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(v: string) => v.slice(0, 7)}
                interval={Math.floor(chartData.length / 6)}
                axisLine={{ stroke: '#2a2d3a' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => v.toFixed(0)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1d27',
                  border: '1px solid #2a2d3a',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                itemStyle={{ color: '#e0e0e0' }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                formatter={(value) => [`${Number(value).toFixed(2)}`, 'Price']}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: color }}
              />
              {gameStartDate && (
                <ReferenceLine
                  x={gameStartDate}
                  stroke="#eab308"
                  strokeDasharray="4 4"
                  label={{ value: 'Game Start', position: 'top', fill: '#eab308', fontSize: 9 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricBox label="Annualized Volatility" value={cal ? `${cal.annualizedVolPct.toFixed(1)}%` : '—'} />
        <MetricBox label="Avg Daily Move" value={cal ? `${cal.avgAbsDailyMovePct.toFixed(3)}%` : '—'} />
        <MetricBox label="Max Daily Drawdown" value={cal ? `${cal.minDailyReturnPct.toFixed(2)}%` : '—'} negative />
        <MetricBox label="Best Daily Return" value={cal ? `+${cal.maxDailyReturnPct.toFixed(2)}%` : '—'} positive />
        <MetricBox label="5Y Simulated Return" value={`${fiveYrReturn >= 0 ? '+' : ''}${fiveYrReturn.toFixed(1)}%`} positive={fiveYrReturn >= 0} negative={fiveYrReturn < 0} />
        <MetricBox label="Max Drawdown (5Y)" value={`${drawdown.toFixed(1)}%`} negative />
        <MetricBox label="Observations" value={cal ? cal.numObservations.toLocaleString() : '—'} />
        <MetricBox label="Data Range" value={cal?.firstDate && cal?.lastDate ? `${cal.firstDate.slice(0, 4)}–${cal.lastDate.slice(0, 4)}` : '—'} />
      </div>

      {/* Interpretation */}
      <div className="bg-arena-surface border border-arena-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Asset Profile</h3>
        <p className="text-sm text-arena-text-dim leading-relaxed">
          <strong className="text-white">{asset.name}</strong> ({asset.symbol}) is a{' '}
          {asset.category} instrument traded in {asset.currency}.
          {cal && (
            <>
              {' '}Over the observed period ({cal.firstDate?.slice(0, 4)}–{cal.lastDate?.slice(0, 4)}),
              it delivered a total return of{' '}
              <span className={totalReturn >= 0 ? 'text-arena-accent' : 'text-arena-danger'}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
              </span>
              {' '}with an annualized volatility of {cal.annualizedVolPct.toFixed(1)}%.
            </>
          )}
          {cal && cal.annualizedVolPct > 25 && (
            <> This is a <span className="text-arena-danger">high-volatility</span> asset — expect large swings and significant drawdown risk.</>
          )}
          {cal && cal.annualizedVolPct <= 10 && (
            <> This is a <span className="text-arena-accent">low-volatility</span> asset — relatively stable, often used for defensive portfolio positioning.</>
          )}
          {cal && cal.annualizedVolPct > 10 && cal.annualizedVolPct <= 25 && (
            <> This is a <span className="text-arena-blue">moderate-volatility</span> asset — suitable for balanced portfolio construction.</>
          )}
          {' '}In the game, this belongs to the <strong className="text-white">{asset.category}</strong> asset class (subcategory: {asset.subcategory.replace(/_/g, ' ')}).
        </p>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="bg-arena-surface border border-arena-border rounded-lg p-3">
      <p className="text-[10px] text-arena-text-dim font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-base font-bold font-mono ${
        positive ? 'text-arena-accent' : negative ? 'text-arena-danger' : 'text-white'
      }`}>
        {value}
      </p>
    </div>
  );
}
