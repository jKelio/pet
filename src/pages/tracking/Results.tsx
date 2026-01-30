import React, { useRef, useState } from 'react';
import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonButtons,
    IonBackButton,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import {
    analyticsOutline,
    timeOutline,
    trophyOutline,
    homeOutline,
    downloadOutline
} from 'ionicons/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTrackingContext } from './TrackingContextProvider';
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import ActionTimeChart from '../../components/gantt/ActionTimeChart';
import { useContainerWidth } from '../../hooks/useContainerWidth';
import ActionTimeline from '../../components/gantt/ActionTimeline';
import { aggregateTimeByAction, extractTimelineSegments } from '../../components/gantt/ganttUtils';
import './Results.css';

const Results: React.FC = () => {
    const { t } = useTranslation('pet');
    const history = useHistory();
    const { drills } = useTrackingContext();
    const [pieContainerRef, pieWidth] = useContainerWidth<HTMLDivElement>();
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const PDF_EXPORT_WIDTH = 1200;

    // Hilfsfunktionen
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            const time = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            return `${time} ${t('results.unitHours')}`;
        }
        const time = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        return `${time} ${t('results.unitMinutes')}`;
    };

    // Zeitformatierung für Diagramm-Labels (Minuten oder Stunden)
    const formatDuration = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        } else {
            return `${minutes}min`;
        }
    };

    // Zeitverteilung pro Drill berechnen
    const drillPieData = drills.map((drill, idx) => {
        const drillTimerTime = Object.values(drill.timerData || {}).reduce((s, t) => s + (t.totalTime || 0), 0);
        const drillTotal = drillTimerTime + (drill.wasteTime || 0);
        // Kategorie-Tags als String, übersetzt
        let tagString = '';
        if (drill.tags && drill.tags.size > 0) {
            tagString = Array.from(drill.tags)
                .map(tag => t('drills.' + tag) || tag)
                .join(', ');
        }
        return {
            name: `${t('results.drill')} ${drill.id}${tagString ? ' (' + tagString + ')' : ''}`,
            value: drillTotal,
            label: `${t('results.drill')} ${drill.id}${tagString ? ' (' + tagString + ')' : ''}: ${formatDuration(drillTotal)}`
        };
    });
    const DRILL_COLORS = ['#0088FE', '#FF8042', '#00C49F', '#FFBB28', '#A28BFE', '#FF6699', '#33CC99', '#FF6666', '#66B3FF', '#FFCC99'];

    // Daten berechnen
    const totalDrills = drills.length;
    const totalWasteTime = drills.reduce((sum, drill) => sum + (drill.wasteTime || 0), 0);
    const totalTimerTime = drills.reduce((sum, drill) => {
        return sum + Object.values(drill.timerData || {}).reduce((s, t) => s + (t.totalTime || 0), 0);
    }, 0);
    const totalTime = totalTimerTime + totalWasteTime;
    const wastePercent = totalTime > 0 ? Math.round((totalWasteTime / totalTime) * 100) : 0;

    // Daten für das Kreisdiagramm
    const pieData = [
        { name: t('results.activeTime') || 'Aktive Zeit', value: totalTimerTime },
        { name: t('results.wasteTime') || 'Leerlauf', value: totalWasteTime },
    ];
    const COLORS = ['#0088FE', '#FF8042'];

    // Action time chart data (aggregated)
    const actionTimeData = aggregateTimeByAction(drills, t);
    const chartHeight = Math.max(200, actionTimeData.length * 40 + 50);

    // Timeline data (individual segments, counter events, drill boundaries)
    const { segments: timelineSegments, counterEvents, drillBoundaries, actionLabels } = extractTimelineSegments(drills, t);

    const goHome = () => {
        history.push('/page/language');
    };

    const exportToPdf = async () => {
        if (!exportRef.current) return;

        setIsExporting(true);
        try {
            const canvas = await html2canvas(exportRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                unit: 'mm',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 10;

            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

            const date = new Date().toISOString().split('T')[0];
            pdf.save(`training-results-${date}.pdf`);
        } catch (error) {
            console.error('PDF export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonBackButton defaultHref="/page/tracking" />
                    </IonButtons>
                    <IonTitle>
                        <span className="results-header-title">
                            <IonIcon icon={trophyOutline} />
                            {t('results.title') || 'Training Results'}
                        </span>
                    </IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent>
                {/* Hidden container for PDF export with horizontal summary layout */}
                <div ref={exportRef} className="pdf-export-container" style={{ width: PDF_EXPORT_WIDTH }}>
                    <div className="pdf-export-header">
                        <h1>{t('results.title') || 'Training Results'}</h1>
                    </div>
                    <div className="pdf-summary-row">
                        <div className="pdf-summary-item">
                            <h3>{t('results.totalDrills') || 'Total Drills'}</h3>
                            <p>{totalDrills} Drills</p>
                        </div>
                        <div className="pdf-summary-item">
                            <h3>{t('results.totalTime') || 'Total Time'}</h3>
                            <p>{formatTime(totalTime)}</p>
                        </div>
                        <div className="pdf-summary-item">
                            <h3>{t('results.wasteTime') || 'Waste Time'}</h3>
                            <p>{formatTime(totalWasteTime)} ({wastePercent}%)</p>
                        </div>
                    </div>
                    <div className="pdf-chart-section">
                        <h3>{t('results.actionTimeline') || 'Action Timeline'}</h3>
                        {(timelineSegments.length > 0 || counterEvents.length > 0) && (
                            <ActionTimeline
                                segments={timelineSegments}
                                counterEvents={counterEvents}
                                drillBoundaries={drillBoundaries}
                                actionLabels={actionLabels}
                            />
                        )}
                    </div>
                    <div className="pdf-charts-row">
                        <div className="pdf-chart-col">
                            <h3>{t('results.timePerAction') || 'Time per Action'}</h3>
                            {actionTimeData.length > 0 && (
                                <ActionTimeChart data={actionTimeData} height={chartHeight} />
                            )}
                        </div>
                        <div className="pdf-chart-col">
                            <h3>{t('results.timeDistributionPerDrill') || 'Time Distribution per Drill'}</h3>
                            <PieChart width={500} height={300}>
                                <Pie
                                    data={drillPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                >
                                    {drillPieData.map((entry, index) => (
                                        <Cell key={`cell-export-${index}`} fill={DRILL_COLORS[index % DRILL_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatDuration(typeof value === 'number' ? value : 0)} />
                                <Legend />
                            </PieChart>
                        </div>
                    </div>
                </div>

                {/* Visible content */}
                <IonGrid>
                    <IonRow>
                        <IonCol>
                            <IonCard>
                                <IonCardHeader>
                                    <IonCardTitle className="results-card-title">
                                        <IonIcon icon={analyticsOutline} size="large" />
                                        {t('results.summary') || 'Training Summary'}
                                    </IonCardTitle>
                                </IonCardHeader>
                                <IonCardContent>
                                    <IonItem>
                                        <IonLabel>
                                            <h3>{t('results.totalDrills') || 'Total Drills'}</h3>
                                            <p>{totalDrills} Drills completed</p>
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem>
                                        <IonLabel>
                                            <h3>{t('results.totalTime') || 'Total Time'}</h3>
                                            <p>{formatTime(totalTime)}</p>
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem>
                                        <IonLabel>
                                            <h3>{t('results.wasteTime') || 'Waste Time'}</h3>
                                            <p>{formatTime(totalWasteTime)} ({wastePercent}%)</p>
                                        </IonLabel>
                                    </IonItem>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                    </IonRow>

                    <IonRow>
                        <IonCol>
                            <IonCard>
                                <IonCardHeader>
                                    <IonCardTitle className="results-card-title">
                                        <IonIcon icon={timeOutline} size="large" />
                                        {t('results.detailedResults') || 'Detailed Results'}
                                    </IonCardTitle>
                                </IonCardHeader>
                                <IonCardContent>
                                    {/* Timeline - einzelne Segmente */}
                                    <div style={{ marginBottom: 24 }}>
                                        <h3 style={{ textAlign: 'center', marginBottom: 8 }}>
                                            {t('results.actionTimeline') || 'Aktions-Timeline'}
                                        </h3>
                                        {(timelineSegments.length > 0 || counterEvents.length > 0) ? (
                                            <ActionTimeline
                                                segments={timelineSegments}
                                                counterEvents={counterEvents}
                                                drillBoundaries={drillBoundaries}
                                                actionLabels={actionLabels}
                                            />
                                        ) : (
                                            <IonItem>
                                                <IonLabel>
                                                    <p>{t('results.noTimeData') || 'No timing data recorded.'}</p>
                                                </IonLabel>
                                            </IonItem>
                                        )}
                                    </div>

                                    <IonRow>
                                        {/* Zeit pro Aktion (Summe) */}
                                        <IonCol size="12" sizeMd="6">
                                            <h3 style={{ textAlign: 'center', marginBottom: 8 }}>
                                                {t('results.timePerAction') || 'Zeit pro Aktion'}
                                            </h3>
                                            {actionTimeData.length > 0 ? (
                                                <ActionTimeChart
                                                    data={actionTimeData}
                                                    height={chartHeight}
                                                />
                                            ) : (
                                                <IonItem>
                                                    <IonLabel>
                                                        <p>{t('results.noTimeData') || 'No timing data recorded.'}</p>
                                                    </IonLabel>
                                                </IonItem>
                                            )}
                                        </IonCol>

                                        {/* Kreisdiagramm für Zeitverteilung pro Drill */}
                                        <IonCol size="12" sizeMd="6">
                                            <h3 style={{ textAlign: 'center', marginBottom: 8 }}>
                                                {t('results.timeDistributionPerDrill') || 'Zeitverteilung pro Drill'}
                                            </h3>
                                            <div ref={pieContainerRef} style={{ width: '100%' }}>
                                                {pieWidth > 0 && (
                                                    <PieChart width={pieWidth} height={250}>
                                                        <Pie
                                                            data={drillPieData}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={80}
                                                        >
                                                            {drillPieData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={DRILL_COLORS[index % DRILL_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip formatter={(value) => formatDuration(typeof value === 'number' ? value : 0)} />
                                                        <Legend />
                                                    </PieChart>
                                                )}
                                            </div>
                                        </IonCol>
                                    </IonRow>
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                    </IonRow>
                </IonGrid>

                <div className="results-button-container">
                    <IonButton onClick={exportToPdf} color="secondary" size="large" disabled={isExporting}>
                        <IonIcon icon={downloadOutline} slot="start" />
                        {isExporting ? t('results.exporting') : t('results.exportPdf')}
                    </IonButton>
                    <IonButton onClick={goHome} color="primary" size="large">
                        <IonIcon icon={homeOutline} slot="start" />
                        {t('results.backToHome') || 'Back to Home'}
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Results; 