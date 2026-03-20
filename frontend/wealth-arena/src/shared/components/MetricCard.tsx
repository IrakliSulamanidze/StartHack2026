interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}

export default function MetricCard({ label, value, subtitle, trend, icon }: Props) {
  const trendColor =
    trend === 'up' ? 'text-arena-accent' : trend === 'down' ? 'text-arena-danger' : 'text-arena-text-dim';

  return (
    <div className="bg-arena-surface border border-arena-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-arena-text-dim font-medium uppercase tracking-wide">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold ${trendColor}`}>{value}</p>
      {subtitle && <p className="text-xs text-arena-text-dim mt-1">{subtitle}</p>}
    </div>
  );
}
