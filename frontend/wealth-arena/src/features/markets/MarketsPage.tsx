import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchMarketAssets,
  fetchAllCalibrations,
  getAssetCategories,
  getSubcategoryColor,
  type MarketAsset,
  type AssetCalibration,
  type AssetCategory,
} from '@/services/marketData';

export default function MarketsPage() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [calibrations, setCals] = useState<Record<string, AssetCalibration>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [assets, cals] = await Promise.all([
        fetchMarketAssets(),
        fetchAllCalibrations(),
      ]);
      setCategories(getAssetCategories(assets));
      setCals(cals);
      setLoading(false);
    }
    load();
  }, []);

  function toggle(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Filter by search
  const filtered = search.trim()
    ? categories
        .map((cat) => ({
          ...cat,
          assets: cat.assets.filter(
            (a) =>
              a.symbol.toLowerCase().includes(search.toLowerCase()) ||
              a.name.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((cat) => cat.assets.length > 0)
    : categories;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 text-center">
        <div className="text-arena-text-dim animate-pulse text-lg">Loading market data…</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            Markets
          </h1>
          <p className="text-sm text-arena-text-dim mt-1">
            Browse {categories.reduce((s, c) => s + c.assets.length, 0)} instruments across {categories.length} categories
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets…"
            className="bg-arena-surface border border-arena-border rounded-lg px-4 py-2 text-sm text-white placeholder-arena-text-dim focus:outline-none focus:border-arena-accent w-64"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-arena-text-dim hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Sections */}
      <div className="space-y-4">
        {filtered.map((cat) => {
          const isCollapsed = !!collapsed[cat.key];
          const catColor = getSubcategoryColor(cat.key);

          return (
            <div key={cat.key} className="bg-arena-surface border border-arena-border rounded-xl overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggle(cat.key)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${catColor}20` }}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: catColor }} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-white">{cat.label}</h2>
                    <p className="text-xs text-arena-text-dim">{cat.assets.length} instrument{cat.assets.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-arena-text-dim transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Asset Grid */}
              {!isCollapsed && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                    {cat.assets.map((asset) => (
                      <AssetCard
                        key={asset.symbol}
                        asset={asset}
                        calibration={calibrations[asset.symbol]}
                        accentColor={catColor}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-arena-text-dim">No assets match "{search}"</p>
        </div>
      )}
    </div>
  );
}

// ── Asset Card Component ──

function AssetCard({
  asset,
  calibration,
  accentColor,
}: {
  asset: MarketAsset;
  calibration?: AssetCalibration;
  accentColor: string;
}) {
  const vol = calibration?.annualizedVolPct;
  const ret = calibration?.totalReturnPct;

  return (
    <Link
      to={`/markets/${encodeURIComponent(asset.symbol)}`}
      className="group bg-arena-bg border border-arena-border rounded-lg p-3 hover:border-white/25 hover:bg-white/[0.02] transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-black text-white shrink-0"
          style={{ backgroundColor: `${accentColor}30`, color: accentColor }}
        >
          {asset.symbol.slice(0, 3)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate group-hover:text-arena-accent transition-colors">
            {asset.symbol}
          </p>
          <p className="text-[10px] text-arena-text-dim truncate">{asset.name}</p>
        </div>
      </div>

      {/* Mini stats */}
      <div className="flex items-center justify-between mt-1">
        {ret != null ? (
          <span className={`text-[11px] font-mono ${ret >= 0 ? 'text-arena-accent' : 'text-arena-danger'}`}>
            {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
          </span>
        ) : (
          <span className="text-[11px] text-arena-text-dim">—</span>
        )}
        {vol != null && (
          <span className="text-[10px] text-arena-text-dim font-mono">
            σ {vol.toFixed(1)}%
          </span>
        )}
      </div>
    </Link>
  );
}
