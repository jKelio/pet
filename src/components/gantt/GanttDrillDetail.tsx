import React from 'react';
import { IonList, IonItem, IonLabel, IonBadge } from '@ionic/react';
import { GanttSegment, formatRelativeTime, groupSegmentsByAction } from './ganttUtils';

interface GanttDrillDetailProps {
    segments: GanttSegment[];
}

const GanttDrillDetail: React.FC<GanttDrillDetailProps> = ({ segments }) => {
    if (segments.length === 0) {
        return null;
    }

    const groupedByAction = groupSegmentsByAction(segments);

    return (
        <IonList>
            {Array.from(groupedByAction.entries()).map(([actionId, actionSegments]) => {
                const totalDuration = actionSegments.reduce((sum, s) => sum + s.duration, 0);
                const firstSegment = actionSegments[0];

                return (
                    <IonItem key={actionId}>
                        <IonBadge
                            slot="start"
                            style={{
                                backgroundColor: firstSegment.color,
                                color: getContrastColor(firstSegment.color),
                                minWidth: '24px',
                                textAlign: 'center',
                            }}
                        >
                            {actionSegments.length}
                        </IonBadge>
                        <IonLabel>
                            <h3>{firstSegment.actionLabel}</h3>
                            <p>{formatRelativeTime(totalDuration)}</p>
                        </IonLabel>
                    </IonItem>
                );
            })}
        </IonList>
    );
};

// Helper to determine text color based on background brightness
function getContrastColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
}

export default GanttDrillDetail;
