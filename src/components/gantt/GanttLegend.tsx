import React from 'react';
import { IonBadge } from '@ionic/react';

interface LegendItem {
    actionId: string;
    actionLabel: string;
    color: string;
}

interface GanttLegendProps {
    items: LegendItem[];
}

const GanttLegend: React.FC<GanttLegendProps> = ({ items }) => {
    if (items.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '8px 0',
                justifyContent: 'center',
            }}
        >
            {items.map((item) => (
                <IonBadge
                    key={item.actionId}
                    style={{
                        backgroundColor: item.color,
                        color: getContrastColor(item.color),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                    }}
                >
                    {item.actionLabel}
                </IonBadge>
            ))}
        </div>
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

export default GanttLegend;
