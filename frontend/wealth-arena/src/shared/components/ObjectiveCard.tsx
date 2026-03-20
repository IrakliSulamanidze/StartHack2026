import type { MissionObjective } from '@/shared/types/domain';

interface Props {
  objective: MissionObjective;
  selected?: boolean;
  onClick?: () => void;
}

export default function ObjectiveCard({ objective, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border-2 p-3 transition-all ${
        selected
          ? 'border-arena-accent bg-arena-accent/5 shadow-md shadow-arena-accent/10'
          : 'border-arena-border hover:border-white/20 bg-arena-surface'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{objective.icon}</span>
        <h4 className="font-semibold text-white text-sm">{objective.name}</h4>
      </div>
      <p className="text-xs text-arena-text-dim leading-relaxed">{objective.description}</p>
    </button>
  );
}
