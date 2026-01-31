import {
    IonItem,
    IonItemDivider,
    IonLabel,
    IonList,
    IonListHeader,
    IonSelect,
    IonSelectOption
} from "@ionic/react";
import React from "react";
import {useTranslation} from "react-i18next";
import {useTrackingContext} from "../../pages/tracking/TrackingContext";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableActionItem from './SortableActionItem';

const tags = [
    'station',
    'drill',
    'technique',
    'tactic',
    'smallareagame',
    'skating',
    'passing',
    'shot',
    'puckhandling',
    'battlechecking'
];

const DrillsForm: React.FC = () => {
    const {t} = useTranslation('pet')
    const {getCurrentDrill, updateCurrentDrill, updateDrillAction, currentDrillIndex} = useTrackingContext();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const updateToggledActionButtonAtCurrentDrillByIndex = (actionId: string) => {
        const currentDrill = getCurrentDrill();
        const action = currentDrill.actionButtons.find(a => a.id === actionId);
        if (!action) return;
        updateDrillAction(currentDrillIndex, actionId, { enabled: !action.enabled });
    };

    const updateTagsAtCurrentDrill = (tags: string[]) => {
        const currentDrill = getCurrentDrill();
        updateCurrentDrill({
            ...currentDrill,
            tags: new Set(tags || []),
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;

        if (active.id !== over?.id) {
            const currentDrill = getCurrentDrill();
            const oldIndex = currentDrill.actionButtons.findIndex(action => action.id === active.id);
            const newIndex = currentDrill.actionButtons.findIndex(action => action.id === over?.id);

            const newActionButtons = arrayMove(currentDrill.actionButtons, oldIndex, newIndex);
            
            updateCurrentDrill({
                ...currentDrill,
                actionButtons: newActionButtons,
            });
        }
    };

    const currentDrill = getCurrentDrill();
    const actionButtons = currentDrill?.actionButtons || [];

    return (
        <IonList>
            <IonItem>
                <IonSelect label={t('drills.selectCategoriesLabel') || ''}
                           labelPlacement="floating"
                           multiple={true}
                           value={Array.from(getCurrentDrill()?.tags.values() || [])}
                           onIonChange={e => updateTagsAtCurrentDrill(e.detail.value)}>
                    {tags.map((tag) => (
                        <IonSelectOption key={`selectable_${tag}`} value={tag}>
                            {t(`drills.${tag}`)}
                        </IonSelectOption>
                    ))}
                </IonSelect>
            </IonItem>
            <IonItemDivider>
                <IonListHeader>
                    <IonLabel>{t('actions.label')}</IonLabel>
                </IonListHeader>
            </IonItemDivider>
            <IonItem>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={actionButtons.map(action => action.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <IonList style={{width: '100%'}}>
                            {actionButtons.map((action) => (
                                <SortableActionItem
                                    key={action.id}
                                    action={action}
                                    onToggle={updateToggledActionButtonAtCurrentDrillByIndex}
                                    t={t}
                                />
                            ))}
                        </IonList>
                    </SortableContext>
                </DndContext>
            </IonItem>
        </IonList>
    );
};

export default DrillsForm;
