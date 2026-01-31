import React, {useCallback} from "react";
import {IonSegment, IonSegmentButton} from "@ionic/react";
import {useTrackingContext} from "../pages/tracking/TrackingContext";

const DrillSegments: React.FC = () => {
    const { drills, currentDrillIndex, setCurrentDrillIndex } = useTrackingContext();

    const changeDrillIndex = useCallback((drillIndex: number) => {
        setCurrentDrillIndex(drillIndex);
    }, [setCurrentDrillIndex]);

    return <IonSegment value={currentDrillIndex.toString()}
                       onIonChange={e => changeDrillIndex(parseInt(e.detail.value as string))}
                       scrollable={true}>
        {drills.map((d, i) => <IonSegmentButton key={'drill-'+i}
                                                value={i.toString()}>Drill #{d.id}</IonSegmentButton>)}
    </IonSegment>
};

export default DrillSegments;