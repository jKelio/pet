import React from 'react';
import { IonItem, IonLabel, IonToggle, IonIcon } from "@ionic/react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { reorderThreeOutline } from 'ionicons/icons';

interface ActionButton {
    id: string;
    type: 'timer' | 'counter';
    enabled: boolean;
}

interface SortableActionItemProps {
    action: ActionButton;
    onToggle: (actionId: string) => void;
    t: (key: string) => string;
}

const SortableActionItem: React.FC<SortableActionItemProps> = ({ action, onToggle, t }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: action.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <IonItem 
            ref={setNodeRef} 
            style={style} 
            {...attributes}
            {...listeners}
        >
            <IonIcon 
                icon={reorderThreeOutline} 
                slot="start" 
                style={{ cursor: 'grab', color: '#666' }}
            />
            <IonLabel>
                <h3>{t(`actions.${action.id}`)}</h3>
                <p>{t(`actions.${action.type}`)}</p>
            </IonLabel>
            <IonToggle 
                slot="end"
                checked={action.enabled}
                onIonChange={() => onToggle(action.id)} 
            />
        </IonItem>
    );
};

export default SortableActionItem; 