import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Timer, Hash } from 'lucide-react';
import {
  PUCK_TIMER_IDS,
  TIME_MOVING_WITH_PUCK,
  TIME_MOVING_WITHOUT_PUCK,
} from '@pet/shared';
import type { ActionButton } from '@pet/shared';
import { useTrackingStore } from '../stores/tracking.store.js';
import { SortableActionItem } from './SortableActionItem.js';
import { DrillTagSelector } from './DrillTagSelector.js';

function SortablePuckGroupItem({
  withPuck,
  withoutPuck,
  onToggle,
}: {
  withPuck: ActionButton;
  withoutPuck: ActionButton;
  onToggle: () => void;
}) {
  const { t } = useTranslation('pet');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: withPuck.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const enabled = withPuck.enabled && withoutPuck.enabled;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-2.5 px-3 rounded-md border border-border bg-card hover:bg-muted/50 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label={t('actions.dragToReorder')}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-muted-foreground">
        <Timer className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{t('actions.timemoving')}</p>
        <p className="text-xs text-muted-foreground">{t('actions.timer')}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          enabled ? 'bg-primary' : 'bg-input'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function DrillsForm() {
  const { t } = useTranslation('pet');
  const drills = useTrackingStore((s) => s.drills);
  const currentDrillIndex = useTrackingStore((s) => s.currentDrillIndex);
  const updateDrillAction = useTrackingStore((s) => s.updateDrillAction);
  const updateCurrentDrill = useTrackingStore((s) => s.updateCurrentDrill);
  const setCurrentDrillIndex = useTrackingStore((s) => s.setCurrentDrillIndex);

  const currentDrill = drills[currentDrillIndex];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleTagChange = (tag: string) => {
    if (!currentDrill) return;
    const current = currentDrill.tags as string[];
    const next = current.includes(tag) ? current.filter((tg) => tg !== tag) : [...current, tag];
    updateCurrentDrill({ ...currentDrill, tags: next as typeof currentDrill.tags });
  };

  if (!currentDrill) return null;

  const puckIds = PUCK_TIMER_IDS as readonly string[];
  const timerActions = currentDrill.actionButtons.filter((a) => a.type === 'timer');
  const counterActions = currentDrill.actionButtons.filter((a) => a.type === 'counter');
  const showPuckGroup = puckIds.every((id) => timerActions.some((a) => a.id === id));

  const timerSortableIds = timerActions
    .filter((a) => !(showPuckGroup && a.id === TIME_MOVING_WITHOUT_PUCK))
    .map((a) => a.id);

  const counterSortableIds = counterActions.map((a) => a.id);

  const handleTimerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !currentDrill) return;

    const sortableTimers = timerActions.filter(
      (a) => !(showPuckGroup && a.id === TIME_MOVING_WITHOUT_PUCK),
    );
    const oldIndex = sortableTimers.findIndex((a) => a.id === active.id);
    const newIndex = sortableTimers.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(sortableTimers, oldIndex, newIndex);

    let finalTimers: ActionButton[];
    if (showPuckGroup) {
      finalTimers = [];
      const withoutPuck = timerActions.find((a) => a.id === TIME_MOVING_WITHOUT_PUCK)!;
      for (const item of reordered) {
        finalTimers.push(item);
        if (item.id === TIME_MOVING_WITH_PUCK) finalTimers.push(withoutPuck);
      }
    } else {
      finalTimers = reordered;
    }

    updateCurrentDrill({ ...currentDrill, actionButtons: [...finalTimers, ...counterActions] });
  };

  const handleCounterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !currentDrill) return;

    const oldIndex = counterActions.findIndex((a) => a.id === active.id);
    const newIndex = counterActions.findIndex((a) => a.id === over.id);
    updateCurrentDrill({
      ...currentDrill,
      actionButtons: [...timerActions, ...arrayMove(counterActions, oldIndex, newIndex)],
    });
  };

  const handlePuckGroupToggle = () => {
    const withPuck = timerActions.find((a) => a.id === TIME_MOVING_WITH_PUCK)!;
    const withoutPuck = timerActions.find((a) => a.id === TIME_MOVING_WITHOUT_PUCK)!;
    const newEnabled = !(withPuck.enabled && withoutPuck.enabled);
    updateDrillAction(currentDrillIndex, TIME_MOVING_WITH_PUCK, { enabled: newEnabled });
    updateDrillAction(currentDrillIndex, TIME_MOVING_WITHOUT_PUCK, { enabled: newEnabled });
  };

  return (
    <div className="space-y-6">
      {/* Drill navigator */}
      {drills.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {drills.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentDrillIndex(i)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                i === currentDrillIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t('drills.drill')} {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Drill tags */}
      <DrillTagSelector
        label={t('drills.selectCategoriesLabel')}
        selectedTags={currentDrill.tags as string[]}
        onToggle={handleTagChange}
      />

      {/* Timers */}
      {timerActions.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            {t('actions.timer')}
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleTimerDragEnd}
          >
            <SortableContext items={timerSortableIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {timerActions
                  .filter((a) => !(showPuckGroup && a.id === TIME_MOVING_WITHOUT_PUCK))
                  .map((action) => {
                    if (showPuckGroup && action.id === TIME_MOVING_WITH_PUCK) {
                      return (
                        <SortablePuckGroupItem
                          key={TIME_MOVING_WITH_PUCK}
                          withPuck={action}
                          withoutPuck={timerActions.find((a) => a.id === TIME_MOVING_WITHOUT_PUCK)!}
                          onToggle={handlePuckGroupToggle}
                        />
                      );
                    }
                    return (
                      <SortableActionItem
                        key={action.id}
                        action={action}
                        label={t(`actions.${action.id}`)}
                        typeLabel={t(`actions.${action.type}`)}
                        onToggle={(id) =>
                          updateDrillAction(currentDrillIndex, id, { enabled: !action.enabled })
                        }
                      />
                    );
                  })}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      )}

      {/* Counters */}
      {counterActions.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" />
            {t('actions.counter')}
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCounterDragEnd}
          >
            <SortableContext items={counterSortableIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {counterActions.map((action) => (
                  <SortableActionItem
                    key={action.id}
                    action={action}
                    label={t(`actions.${action.id}`)}
                    typeLabel={t(`actions.${action.type}`)}
                    onToggle={(id) =>
                      updateDrillAction(currentDrillIndex, id, { enabled: !action.enabled })
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      )}
    </div>
  );
}
