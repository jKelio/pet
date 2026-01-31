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
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import {
    analyticsOutline,
    timeOutline,
    trophyOutline,
    homeOutline,
    downloadOutline,
    informationCircleOutline,
    listOutline
} from 'ionicons/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTrackingContext } from './TrackingContext';
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import ActionTimeChart from '../../components/gantt/ActionTimeChart';
import { useContainerWidth } from '../../hooks/useContainerWidth';
import ActionTimeline from '../../components/gantt/ActionTimeline';
import { aggregateTimeByAction, extractTimelineSegments } from '../../components/gantt/ganttUtils';
import './Results.css';

const Results: React.FC = () => {
    const { t } = useTranslation('pet');
    const history = useHistory();
    const { drills, practiceInfo, resetAllData } = useTrackingContext();
    const [pieContainerRef, pieWidth] = useContainerWidth<HTMLDivElement>();
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const PDF_EXPORT_WIDTH = 1200;

    // Hilfsfunktionen
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch {
            return dateString;
        }
    };

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
    const drillPieData = drills.map((drill) => {
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

    // Action time chart data (aggregated)
    const actionTimeData = aggregateTimeByAction(drills, t);
    const chartHeight = Math.max(200, actionTimeData.length * 40 + 50);

    // Timeline data (individual segments, counter events, drill boundaries)
    const { segments: timelineSegments, counterEvents, drillBoundaries, actionLabels } = extractTimelineSegments(drills, t);

    const goHome = () => {
        resetAllData();
        history.push('/page/language');
    };

    const exportToPdf = async () => {
        if (!exportRef.current) return;

        setIsExporting(true);
        try {
            const container = exportRef.current;

            // Temporarily make container visible for rendering
            container.style.position = 'fixed';
            container.style.left = '0';
            container.style.top = '0';
            container.style.zIndex = '-1';
            container.style.opacity = '1';

            // Wait for charts to render
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Hide container again
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.zIndex = '';
            container.style.opacity = '';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const usableHeight = pdfHeight - 2 * margin;

            // Scale image to fit page width
            const scaledWidth = pdfWidth - 2 * margin;
            const scaledHeight = (canvas.height * scaledWidth) / canvas.width;

            // Check if content fits on one page or needs multiple pages
            if (scaledHeight <= usableHeight) {
                // Content fits on one page
                const imgX = margin;
                const imgY = margin;
                pdf.addImage(imgData, 'PNG', imgX, imgY, scaledWidth, scaledHeight);
            } else {
                // Content needs multiple pages - split the canvas
                const pageHeightInCanvas = (usableHeight * canvas.width) / scaledWidth;
                let remainingHeight = canvas.height;
                let sourceY = 0;

                while (remainingHeight > 0) {
                    const sliceHeight = Math.min(pageHeightInCanvas, remainingHeight);

                    // Create a temporary canvas for this page slice
                    const pageCanvas = document.createElement('canvas');
                    pageCanvas.width = canvas.width;
                    pageCanvas.height = sliceHeight;
                    const ctx = pageCanvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(
                            canvas,
                            0, sourceY, canvas.width, sliceHeight,
                            0, 0, canvas.width, sliceHeight
                        );
                    }

                    const pageImgData = pageCanvas.toDataURL('image/png');
                    const pageScaledHeight = (sliceHeight * scaledWidth) / canvas.width;

                    pdf.addImage(pageImgData, 'PNG', margin, margin, scaledWidth, pageScaledHeight);

                    remainingHeight -= sliceHeight;
                    sourceY += sliceHeight;

                    if (remainingHeight > 0) {
                        pdf.addPage();
                    }
                }
            }

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

                    {/* Practice Info for PDF */}
                    {(practiceInfo.clubName || practiceInfo.teamName || practiceInfo.coachName || practiceInfo.athletesNumber || practiceInfo.coachesNumber) && (
                        <div className="pdf-practice-info">
                            <h3>{t('general.infoHeader')}</h3>
                            <div className="pdf-practice-info-row">
                                {practiceInfo.clubName && (
                                    <div className="pdf-practice-info-item">
                                        <strong>{t('general.clubLabel')}:</strong> {practiceInfo.clubName}
                                    </div>
                                )}
                                {practiceInfo.teamName && (
                                    <div className="pdf-practice-info-item">
                                        <strong>{t('general.teamLabel')}:</strong> {practiceInfo.teamName}
                                    </div>
                                )}
                                {practiceInfo.date && (
                                    <div className="pdf-practice-info-item">
                                        <strong>{t('general.dateLabel')}:</strong> {formatDate(practiceInfo.date)}
                                    </div>
                                )}
                                {practiceInfo.coachName && (
                                    <div className="pdf-practice-info-item">
                                        <strong>{t('general.coachLabel')}:</strong> {practiceInfo.coachName}
                                    </div>
                                )}
                                {practiceInfo.athletesNumber > 0 && (
                                    <div className="pdf-practice-info-item">
                                        <strong>{t('practice.athletesNumberLabel')}:</strong> {practiceInfo.athletesNumber}
                                    </div>
                                )}
                                {practiceInfo.coachesNumber > 0 && (
                                    <div className="pdf-practice-info-item">
                                        <strong>{t('practice.coachesNumberLabel')}:</strong> {practiceInfo.coachesNumber}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                            <PieChart width={500} height={chartHeight}>
                                <Pie
                                    data={drillPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={Math.min(100, (chartHeight - 80) / 2)}
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

                    {/* Raw Data Table for PDF */}
                    <div className="pdf-chart-section">
                        <h3>{t('results.rawDataTable') || 'Raw Tracking Data'}</h3>
                        <table className="pdf-raw-data-table">
                            <thead>
                                <tr>
                                    <th>{t('results.drill')}</th>
                                    <th>{t('results.action')}</th>
                                    <th>{t('results.totalTime')}</th>
                                    <th>{t('results.segments')}</th>
                                    <th>{t('results.count')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drills.map((drill) => {
                                    const timerEntries = Object.entries(drill.timerData || {}).filter(
                                        ([, data]) => data.totalTime > 0
                                    );
                                    const counterEntries = Object.entries(drill.counterData || {}).filter(
                                        ([, data]) => data.count > 0
                                    );
                                    const hasWasteTime = (drill.wasteTime || 0) > 0;
                                    const hasData = timerEntries.length > 0 || counterEntries.length > 0 || hasWasteTime;

                                    let tagString = '';
                                    if (drill.tags && drill.tags.size > 0) {
                                        tagString = Array.from(drill.tags)
                                            .map(tag => t('drills.' + tag) || tag)
                                            .join(', ');
                                    }

                                    return (
                                        <React.Fragment key={`pdf-drill-${drill.id}`}>
                                            <tr className="drill-header">
                                                <td colSpan={5}>
                                                    {t('results.drill')} {drill.id}
                                                    {tagString && ` (${tagString})`}
                                                </td>
                                            </tr>
                                            {!hasData && (
                                                <tr>
                                                    <td></td>
                                                    <td colSpan={4} style={{ color: '#999', fontStyle: 'italic' }}>
                                                        {t('results.noData')}
                                                    </td>
                                                </tr>
                                            )}
                                            {timerEntries.length > 0 && (
                                                <>
                                                    <tr className="section-header">
                                                        <td></td>
                                                        <td colSpan={4}>{t('results.timerData')}</td>
                                                    </tr>
                                                    {timerEntries.map(([actionId, data]) => (
                                                        <tr key={`pdf-timer-${drill.id}-${actionId}`}>
                                                            <td></td>
                                                            <td>{t(`actions.${actionId}`) || actionId}</td>
                                                            <td>{formatTime(data.totalTime)}</td>
                                                            <td>{data.timeSegments?.length || 0}</td>
                                                            <td>-</td>
                                                        </tr>
                                                    ))}
                                                </>
                                            )}
                                            {counterEntries.length > 0 && (
                                                <>
                                                    <tr className="section-header">
                                                        <td></td>
                                                        <td colSpan={4}>{t('results.counterData')}</td>
                                                    </tr>
                                                    {counterEntries.map(([actionId, data]) => (
                                                        <tr key={`pdf-counter-${drill.id}-${actionId}`}>
                                                            <td></td>
                                                            <td>{t(`actions.${actionId}`) || actionId}</td>
                                                            <td>-</td>
                                                            <td>-</td>
                                                            <td>{data.count}</td>
                                                        </tr>
                                                    ))}
                                                </>
                                            )}
                                            {hasWasteTime && (
                                                <tr className="waste-time-row">
                                                    <td></td>
                                                    <td>{t('results.wasteTime')}</td>
                                                    <td>{formatTime(drill.wasteTime)}</td>
                                                    <td>-</td>
                                                    <td>-</td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Visible content */}
                <IonGrid>
                    {/* Practice Info Card - only show if at least one field has data */}
                    {(practiceInfo.clubName || practiceInfo.teamName || practiceInfo.coachName || practiceInfo.athletesNumber || practiceInfo.coachesNumber) && (
                        <IonRow>
                            <IonCol>
                                <IonCard>
                                    <IonCardHeader>
                                        <IonCardTitle className="results-card-title">
                                            <IonIcon icon={informationCircleOutline} size="large" />
                                            {t('general.infoHeader')}
                                        </IonCardTitle>
                                    </IonCardHeader>
                                    <IonCardContent>
                                        <IonRow>
                                            {practiceInfo.clubName && (
                                                <IonCol size="6">
                                                    <IonItem>
                                                        <IonLabel>
                                                            <h3>{t('general.clubLabel')}</h3>
                                                            <p>{practiceInfo.clubName}</p>
                                                        </IonLabel>
                                                    </IonItem>
                                                </IonCol>
                                            )}
                                            {practiceInfo.teamName && (
                                                <IonCol size="6">
                                                    <IonItem>
                                                        <IonLabel>
                                                            <h3>{t('general.teamLabel')}</h3>
                                                            <p>{practiceInfo.teamName}</p>
                                                        </IonLabel>
                                                    </IonItem>
                                                </IonCol>
                                            )}
                                            {practiceInfo.date && (
                                                <IonCol size="6">
                                                    <IonItem>
                                                        <IonLabel>
                                                            <h3>{t('general.dateLabel')}</h3>
                                                            <p>{formatDate(practiceInfo.date)}</p>
                                                        </IonLabel>
                                                    </IonItem>
                                                </IonCol>
                                            )}
                                            {practiceInfo.coachName && (
                                                <IonCol size="6">
                                                    <IonItem>
                                                        <IonLabel>
                                                            <h3>{t('general.coachLabel')}</h3>
                                                            <p>{practiceInfo.coachName}</p>
                                                        </IonLabel>
                                                    </IonItem>
                                                </IonCol>
                                            )}
                                            {practiceInfo.athletesNumber > 0 && (
                                                <IonCol size="6">
                                                    <IonItem>
                                                        <IonLabel>
                                                            <h3>{t('practice.athletesNumberLabel')}</h3>
                                                            <p>{practiceInfo.athletesNumber}</p>
                                                        </IonLabel>
                                                    </IonItem>
                                                </IonCol>
                                            )}
                                            {practiceInfo.coachesNumber > 0 && (
                                                <IonCol size="6">
                                                    <IonItem>
                                                        <IonLabel>
                                                            <h3>{t('practice.coachesNumberLabel')}</h3>
                                                            <p>{practiceInfo.coachesNumber}</p>
                                                        </IonLabel>
                                                    </IonItem>
                                                </IonCol>
                                            )}
                                        </IonRow>
                                    </IonCardContent>
                                </IonCard>
                            </IonCol>
                        </IonRow>
                    )}

                    {/* Training Summary Card */}
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
                                                    <PieChart width={pieWidth} height={chartHeight}>
                                                        <Pie
                                                            data={drillPieData}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={Math.min(80, (chartHeight - 80) / 2)}
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

                    {/* Raw Tracking Data Table */}
                    <IonRow>
                        <IonCol>
                            <IonCard>
                                <IonCardHeader>
                                    <IonCardTitle className="results-card-title">
                                        <IonIcon icon={listOutline} size="large" />
                                        {t('results.rawDataTable') || 'Raw Tracking Data'}
                                    </IonCardTitle>
                                </IonCardHeader>
                                <IonCardContent>
                                    <table className="raw-data-table">
                                        <thead>
                                            <tr>
                                                <th>{t('results.drill')}</th>
                                                <th>{t('results.action')}</th>
                                                <th>{t('results.totalTime')}</th>
                                                <th>{t('results.segments')}</th>
                                                <th>{t('results.count')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {drills.map((drill) => {
                                                const timerEntries = Object.entries(drill.timerData || {}).filter(
                                                    ([, data]) => data.totalTime > 0
                                                );
                                                const counterEntries = Object.entries(drill.counterData || {}).filter(
                                                    ([, data]) => data.count > 0
                                                );
                                                const hasWasteTime = (drill.wasteTime || 0) > 0;
                                                const hasData = timerEntries.length > 0 || counterEntries.length > 0 || hasWasteTime;

                                                // Get drill tags for display
                                                let tagString = '';
                                                if (drill.tags && drill.tags.size > 0) {
                                                    tagString = Array.from(drill.tags)
                                                        .map(tag => t('drills.' + tag) || tag)
                                                        .join(', ');
                                                }

                                                return (
                                                    <React.Fragment key={`drill-${drill.id}`}>
                                                        <tr className="drill-header">
                                                            <td colSpan={5}>
                                                                {t('results.drill')} {drill.id}
                                                                {tagString && ` (${tagString})`}
                                                            </td>
                                                        </tr>
                                                        {!hasData && (
                                                            <tr>
                                                                <td></td>
                                                                <td colSpan={4} className="no-data">
                                                                    {t('results.noData')}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {timerEntries.length > 0 && (
                                                            <>
                                                                <tr className="section-header">
                                                                    <td></td>
                                                                    <td colSpan={4}>{t('results.timerData')}</td>
                                                                </tr>
                                                                {timerEntries.map(([actionId, data]) => (
                                                                    <tr key={`timer-${drill.id}-${actionId}`}>
                                                                        <td></td>
                                                                        <td>{t(`actions.${actionId}`) || actionId}</td>
                                                                        <td>{formatTime(data.totalTime)}</td>
                                                                        <td>{data.timeSegments?.length || 0}</td>
                                                                        <td>-</td>
                                                                    </tr>
                                                                ))}
                                                            </>
                                                        )}
                                                        {counterEntries.length > 0 && (
                                                            <>
                                                                <tr className="section-header">
                                                                    <td></td>
                                                                    <td colSpan={4}>{t('results.counterData')}</td>
                                                                </tr>
                                                                {counterEntries.map(([actionId, data]) => (
                                                                    <tr key={`counter-${drill.id}-${actionId}`}>
                                                                        <td></td>
                                                                        <td>{t(`actions.${actionId}`) || actionId}</td>
                                                                        <td>-</td>
                                                                        <td>-</td>
                                                                        <td>{data.count}</td>
                                                                    </tr>
                                                                ))}
                                                            </>
                                                        )}
                                                        {hasWasteTime && (
                                                            <tr className="waste-time-row">
                                                                <td></td>
                                                                <td>{t('results.wasteTime')}</td>
                                                                <td>{formatTime(drill.wasteTime)}</td>
                                                                <td>-</td>
                                                                <td>-</td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
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