import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fetchCalibration, getAssetPriceSeries, getGameAwarePriceSeries } from '@/services/marketData';
import { ROUND_IMPACTS } from '@/services/gameAdapter';
import type { AssetCalibration } from '@/services/marketData';

interface Props {
  symbol: string;
  name: string;
  onClose: () => void;
  /** Current game round — when provided, chart extends with game-period data */
  currentRound?: number;
}

export default function AssetChartPopup({ symbol, name, onClose, currentRound }: Props) {
  const [cal, setCal] = useState<AssetCalibration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCalibration(symbol).then((c) => {
      if (!cancelled) {
        setCal(c);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [symbol]);

  const series = cal
    ? currentRound && currentRound > 1
      ? getGameAwarePriceSeries(cal, currentRound, ROUND_IMPACTS)
      : getAssetPriceSeries(cal)
    : [];

  // Find the boundary date between historical and game data (for the marker)
  const baseSeries = cal ? getAssetPriceSeries(cal) : [];
  const gameStartDate = baseSeries.length > 0 ? baseSeries[baseSeries.length - 1].date : null;

  // Sample every 20th point for perf
  const chartData = series.filter((_, i) => i % 20 === 0 || i === series.length - 1);

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-arena-surface border border-arena-border rounded-2xl w-full max-w-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* X Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-lg font-bold transition-colors z-10"
        >
          ✕
        </button>

        <div className="p-6">
          <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
          <p className="text-xs text-arena-text-dim font-mono">{symbol}</p>
          {currentRound && currentRound > 1 && (
            <p className="text-[10px] text-arena-accent mt-0.5 mb-3">Chart includes game data through round {currentRound - 1}</p>
          )}
          {(!currentRound || currentRound <= 1) && <div className="mb-4" />}

          {loading ? (
            <div className="h-48 flex items-center justify-center text-arena-text-dim animate-pulse">
              Loading chart…
            </div>
          ) : !cal ? (
            <div className="h-48 flex items-center justify-center text-arena-text-dim">
              No data available for this asset.
            </div>
          ) : (
            <>
              {/* Chart */}
              <div className="h-52 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      tickFormatter={(d: string) => d.slice(0, 4)}
                      interval={Math.floor(chartData.length / 5)}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      width={42}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value) => [Number(value).toFixed(2), 'Price']}
                    />
                    {gameStartDate && currentRound && currentRound > 1 && (
                      <ReferenceLine
                        x={gameStartDate}
                        stroke="#eab308"
                        strokeDasharray="4 4"
                        label={{ value: 'Game Start', position: 'top', fill: '#eab308', fontSize: 9 }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-[10px] text-arena-text-dim">Total Return</p>
                  <p className={`text-sm font-bold font-mono ${cal.totalReturnPct >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
                    {cal.totalReturnPct >= 0 ? '+' : ''}{cal.totalReturnPct.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-[10px] text-arena-text-dim">Annual Vol</p>
                  <p className="text-sm font-bold font-mono text-white">{cal.annualizedVolPct.toFixed(1)}%</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-[10px] text-arena-text-dim">Avg Daily</p>
                  <p className={`text-sm font-bold font-mono ${cal.avgDailyReturnPct >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
                    {cal.avgDailyReturnPct >= 0 ? '+' : ''}{cal.avgDailyReturnPct.toFixed(3)}%
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
