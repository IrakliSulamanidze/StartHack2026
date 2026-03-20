import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ASSET_META, INSTRUMENT_CATEGORY, ALLOCATION_CATEGORIES } from '@/shared/types/domain';

interface Props {
  allocation: Record<string, number>;
  size?: number;
  showLabels?: boolean;
}

export default function AllocationDonutChart({ allocation, size = 200, showLabels = true }: Props) {
  // Aggregate by scoring category (equities/bonds/gold/fx) OR by subcategory for richer display
  const subcatTotals: Record<string, number> = {};
  const catTotals: Record<string, number> = {};

  for (const [symbol, weight] of Object.entries(allocation)) {
    if (weight <= 0) continue;
    const scoringCat = INSTRUMENT_CATEGORY[symbol] ?? symbol;
    catTotals[scoringCat] = (catTotals[scoringCat] ?? 0) + weight;

    // Find subcategory
    const subcat = ALLOCATION_CATEGORIES.find(c =>
      c.instruments.some(i => i.symbol === symbol)
    );
    const subcatKey = subcat?.key ?? scoringCat;
    subcatTotals[subcatKey] = (subcatTotals[subcatKey] ?? 0) + weight;
  }

  // Use subcategory-level for more granular donut, fall back to category
  const subcatColors: Record<string, string> = {};
  const subcatLabels: Record<string, string> = {};
  for (const cat of ALLOCATION_CATEGORIES) {
    subcatColors[cat.key] = cat.color;
    subcatLabels[cat.key] = cat.label;
  }
  // Fallback for abstract asset classes (backward compat)
  for (const [key, meta] of Object.entries(ASSET_META)) {
    if (!subcatColors[key]) subcatColors[key] = meta.color;
    if (!subcatLabels[key]) subcatLabels[key] = meta.name;
  }

  const data = Object.entries(subcatTotals)
    .filter(([, v]) => v > 0)
    .map(([key, weight]) => ({
      name: subcatLabels[key] ?? key,
      value: weight,
      color: subcatColors[key] ?? '#6b7280',
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-arena-text-dim text-xs" style={{ width: size, height: size }}>
        No allocation
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.3}
            outerRadius={size * 0.44}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8 }}
            itemStyle={{ color: '#e0e0e0' }}
            formatter={(value) => [`${value}%`, '']}
          />
        </PieChart>
      </ResponsiveContainer>

      {showLabels && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-[10px] text-arena-text-dim">{d.name} {d.value}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
