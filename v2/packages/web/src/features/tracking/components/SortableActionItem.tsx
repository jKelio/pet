import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Timer, Hash } from 'lucide-react';
import type { ActionButton } from '@pet/shared';

interface Props {
  action: ActionButton;
  label: string;
  typeLabel: string;
  onToggle: (id: string) => void;
}

export function SortableActionItem({ action, label, typeLabel, onToggle }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: action.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-2.5 px-3 rounded-md border border-border bg-card hover:bg-muted/50 transition-colors"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Icon */}
      <span className="text-muted-foreground">
        {action.type === 'timer' ? (
          <Timer className="h-4 w-4" />
        ) : (
          <Hash className="h-4 w-4" />
        )}
      </span>

      {/* Label + type */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground">{typeLabel}</p>
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle(action.id)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          action.enabled ? 'bg-primary' : 'bg-input'
        }`}
        role="switch"
        aria-checked={action.enabled}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            action.enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
