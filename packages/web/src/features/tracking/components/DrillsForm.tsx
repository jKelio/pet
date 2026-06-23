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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTrackingStore } from '../stores/tracking.store.js';
import { SortableActionItem } from './SortableActionItem.js';
import { DrillTagSelector } from './DrillTagSelector.js';

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
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    updateCurrentDrill({ ...currentDrill, tags: next as typeof currentDrill.tags });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !currentDrill) return;

    const oldIndex = currentDrill.actionButtons.findIndex((a) => a.id === active.id);
    const newIndex = currentDrill.actionButtons.findIndex((a) => a.id === over.id);
    updateCurrentDrill({
      ...currentDrill,
      actionButtons: arrayMove(currentDrill.actionButtons, oldIndex, newIndex),
    });
  };

  if (!currentDrill) return null;

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

      {/* Action buttons */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('actions.label')}
        </h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={currentDrill.actionButtons.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {currentDrill.actionButtons.map((action) => (
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
    </div>
  );
}
