import { useState } from 'react';
import { ALLOCATION_CATEGORIES } from '@/shared/types/domain';
import AssetChartPopup from './AssetChartPopup';

interface Props {
  allocation: Record<string, number>;
  onChange: (asset: string, value: number) => void;
  disabled?: boolean;
  /** Current game round — passed to chart popups so data advances with gameplay */
  currentRound?: number;
}

export default function AllocationEditor({ allocation, onChange, disabled, currentRound }: Props) {
  const total = Object.values(allocation).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(total - 100) < 0.5;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [chartAsset, setChartAsset] = useState<{ symbol: string; name: string } | null>(null);

  function toggleCategory(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Portfolio Allocation</h3>
        <span className={`text-xs font-mono ${isValid ? 'text-arena-accent' : 'text-arena-danger'}`}>
          {total}%
        </span>
      </div>

      {ALLOCATION_CATEGORIES.map((cat) => {
        const catTotal = cat.instruments.reduce(
          (sum, inst) => sum + (allocation[inst.symbol] ?? 0), 0
        );
        const isOpen = expanded[cat.key] ?? false;

        return (
          <div key={cat.key} className="border border-arena-border rounded-lg overflow-hidden">
            {/* Category Header — click to expand/collapse */}
            <button
              type="button"
              onClick={() => toggleCategory(cat.key)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-arena-surface hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs">{isOpen ? '▼' : '►'}</span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs font-semibold text-white">{cat.label}</span>
              </div>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: catTotal > 0 ? cat.color + '22' : 'transparent',
                  color: catTotal > 0 ? cat.color : '#6b7280',
                }}
              >
                {catTotal}%
              </span>
            </button>

            {/* Instruments (when expanded) */}
            {isOpen && (
              <div className="px-3 py-2 space-y-2 bg-black/20 border-t border-arena-border">
                {cat.instruments.map((inst) => {
                  const weight = allocation[inst.symbol] ?? 0;
                  return (
                    <div key={inst.symbol} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setChartAsset({ symbol: inst.symbol, name: inst.name })}
                          className="text-[11px] text-white hover:text-arena-accent transition-colors truncate max-w-[65%] text-left"
                          title={`${inst.name} (${inst.symbol}) — click for 5Y chart`}
                        >
                          <span className="font-mono text-arena-text-dim">{inst.symbol}</span>{' '}
                          <span>{inst.name}</span>
                        </button>
                        <span className="text-[11px] font-mono text-arena-text-dim w-8 text-right">
                          {weight}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={weight}
                        onChange={(e) => onChange(inst.symbol, Number(e.target.value))}
                        disabled={disabled}
                        className="w-full h-1 rounded-full appearance-none cursor-pointer bg-arena-border"
                        style={{ accentColor: cat.color }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {!isValid && (
        <p className="text-xs text-arena-danger">
          Total must equal 100%. Currently {total}%.
        </p>
      )}

      {/* 5Y Chart Popup */}
      {chartAsset && (
        <AssetChartPopup
          symbol={chartAsset.symbol}
          name={chartAsset.name}
          onClose={() => setChartAsset(null)}
          currentRound={currentRound}
        />
      )}
    </div>
  );
}
