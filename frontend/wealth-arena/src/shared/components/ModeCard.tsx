interface Props {
  mode: { id: string; name: string; description: string; icon: string };
  selected?: boolean;
  onClick?: () => void;
}

export default function ModeCard({ mode, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border-2 p-3 transition-all ${
        selected
          ? 'border-arena-accent bg-arena-accent/5'
          : 'border-arena-border hover:border-white/20 bg-arena-surface'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full bg-arena-accent shrink-0" />
        <h4 className="font-semibold text-white text-sm">{mode.name}</h4>
      </div>
      <p className="text-xs text-arena-text-dim leading-relaxed">{mode.description}</p>
    </button>
  );
}
