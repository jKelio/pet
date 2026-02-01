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
    informationCircleOutline
} from 'ionicons/icons';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTrackingContext } from './TrackingContext';
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import ActionTimeChart from '../../components/gantt/ActionTimeChart';
import { useContainerWidth } from '../../hooks/useContainerWidth';
import ActionTimeline from '../../components/gantt/ActionTimeline';
import { extractTimelineSegmentsForDrill, aggregateTimeByActionForDrill, ACTION_COLORS } from '../../components/gantt/ganttUtils';
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

    // Zeitformatierung für Diagramm-Labels (Sekunden, Minuten oder Stunden)
    const formatDuration = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        } else if (minutes > 0) {
            return `${minutes}min ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

    // Daten berechnen
    const totalDrills = drills.length;
    const totalWasteTime = drills.reduce((sum, drill) => sum + (drill.wasteTime || 0), 0);
    const totalTimerTime = drills.reduce((sum, drill) => {
        return sum + Object.values(drill.timerData || {}).reduce((s, t) => s + (t.totalTime || 0), 0);
    }, 0);
    const totalTime = totalTimerTime + totalWasteTime;
    const wastePercent = totalTime > 0 ? Math.round((totalWasteTime / totalTime) * 100) : 0;

    // Helper function to get drill tag string
    const getDrillTagString = (drill: typeof drills[0]) => {
        if (drill.tags && drill.tags.size > 0) {
            return Array.from(drill.tags)
                .map(tag => t('drills.' + tag) || tag)
                .join(', ');
        }
        return '';
    };

    // Helper function to create pie data for a single drill (time distribution per action)
    const getDrillActionPieData = (drill: typeof drills[0]) => {
        const data: Array<{ name: string; value: number; actionId: string }> = [];

        Object.entries(drill.timerData || {}).forEach(([actionId, timerData]) => {
            if (timerData.totalTime > 0) {
                data.push({
                    name: t(`actions.${actionId}`) || actionId,
                    value: timerData.totalTime,
                    actionId,
                });
            }
        });

        if (drill.wasteTime > 0) {
            data.push({
                name: t('results.wasteTime') || 'Waste Time',
                value: drill.wasteTime,
                actionId: 'wasteTime',
            });
        }

        return data;
    };

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

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const usableWidth = pdfWidth - 2 * margin;
            const usableHeight = pdfHeight - 2 * margin;

            // Find all sections to render separately
            const headerSection = container.querySelector('.pdf-export-header');
            const practiceInfoSection = container.querySelector('.pdf-practice-info');
            const summarySection = container.querySelector('.pdf-summary-row');
            const drillSections = container.querySelectorAll('.pdf-drill-section');

            // Helper function to render element to canvas and add to PDF
            const renderAndAddToPdf = async (element: Element, currentY: number): Promise<number> => {
                const canvas = await html2canvas(element as HTMLElement, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const scaledWidth = usableWidth;
                const scaledHeight = (canvas.height * scaledWidth) / canvas.width;

                // Check if element fits on current page
                if (currentY + scaledHeight > usableHeight && currentY > 0) {
                    pdf.addPage();
                    currentY = 0;
                }

                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', margin, margin + currentY, scaledWidth, scaledHeight);

                return currentY + scaledHeight + 5; // 5mm spacing between sections
            };

            let currentY = 0;

            // Render header
            if (headerSection) {
                currentY = await renderAndAddToPdf(headerSection, currentY);
            }

            // Render practice info
            if (practiceInfoSection) {
                currentY = await renderAndAddToPdf(practiceInfoSection, currentY);
            }

            // Render summary
            if (summarySection) {
                currentY = await renderAndAddToPdf(summarySection, currentY);
            }

            // Render each drill section on its own (starts new page if doesn't fit)
            for (const drillSection of drillSections) {
                currentY = await renderAndAddToPdf(drillSection, currentY);
            }

            // Hide container again
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.zIndex = '';
            container.style.opacity = '';

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
                    {!!(practiceInfo.clubName || practiceInfo.teamName || practiceInfo.coachName || practiceInfo.athletesNumber || practiceInfo.coachesNumber) && (
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
                    {/* Per-Drill Details for PDF */}
                    {drills.map((drill) => {
                        const tagString = getDrillTagString(drill);
                        const drillTimelineData = extractTimelineSegmentsForDrill(drill, t);
                        const drillActionTimeData = aggregateTimeByActionForDrill(drill, t);
                        const drillPieData = getDrillActionPieData(drill);
                        const drillChartHeight = Math.max(200, drillActionTimeData.length * 40 + 50);

                        const timerEntries = Object.entries(drill.timerData || {}).filter(
                            ([, data]) => data.totalTime > 0
                        );
                        const counterEntries = Object.entries(drill.counterData || {}).filter(
                            ([, data]) => data.count > 0
                        );
                        const hasWasteTime = (drill.wasteTime || 0) > 0;
                        const hasData = timerEntries.length > 0 || counterEntries.length > 0 || hasWasteTime;

                        return (
                            <div key={`pdf-drill-section-${drill.id}`} className="pdf-drill-section">
                                <h2 className="pdf-drill-title">
                                    {t('results.drill')} {drill.id}
                                    {tagString && ` (${tagString})`}
                                </h2>

                                {/* Timeline */}
                                {(drillTimelineData.segments.length > 0 || drillTimelineData.counterEvents.length > 0) && (
                                    <div className="pdf-chart-section">
                                        <h3>{t('results.actionTimeline') || 'Action Timeline'}</h3>
                                        <ActionTimeline
                                            segments={drillTimelineData.segments}
                                            counterEvents={drillTimelineData.counterEvents}
                                            actionLabels={drillTimelineData.actionLabels}
                                        />
                                    </div>
                                )}

                                {/* Charts Row */}
                                <div className="pdf-charts-row">
                                    <div className="pdf-chart-col">
                                        <h3>{t('results.timePerAction') || 'Time per Action'}</h3>
                                        {drillActionTimeData.length > 0 ? (
                                            <ActionTimeChart data={drillActionTimeData} height={drillChartHeight} />
                                        ) : (
                                            <p style={{ color: '#999', fontStyle: 'italic' }}>{t('results.noTimeData')}</p>
                                        )}
                                    </div>
                                    <div className="pdf-chart-col">
                                        <h3>{t('results.timeDistributionPerAction') || 'Time Distribution per Action'}</h3>
                                        {drillPieData.length > 0 ? (
                                            <PieChart width={500} height={drillChartHeight}>
                                                <Pie
                                                    data={drillPieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={Math.min(100, (drillChartHeight - 80) / 2)}
                                                >
                                                    {drillPieData.map((entry) => (
                                                        <Cell key={`cell-export-${drill.id}-${entry.actionId}`} fill={ACTION_COLORS[entry.actionId] || '#999999'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => formatDuration(Number(value) || 0)} />
                                                <Legend />
                                            </PieChart>
                                        ) : (
                                            <p style={{ color: '#999', fontStyle: 'italic' }}>{t('results.noTimeData')}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Raw Data Table */}
                                <div className="pdf-chart-section">
                                    <h3>{t('results.rawDataTable') || 'Raw Tracking Data'}</h3>
                                    <table className="pdf-raw-data-table">
                                        <thead>
                                            <tr>
                                                <th>{t('results.action')}</th>
                                                <th>{t('results.totalTime')}</th>
                                                <th>{t('results.segments')}</th>
                                                <th>{t('results.count')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!hasData && (
                                                <tr>
                                                    <td colSpan={4} style={{ color: '#999', fontStyle: 'italic' }}>
                                                        {t('results.noData')}
                                                    </td>
                                                </tr>
                                            )}
                                            {timerEntries.map(([actionId, data]) => (
                                                <tr key={`pdf-timer-${drill.id}-${actionId}`}>
                                                    <td>{t(`actions.${actionId}`) || actionId}</td>
                                                    <td>{formatTime(data.totalTime)}</td>
                                                    <td>{data.timeSegments?.length || 0}</td>
                                                    <td>-</td>
                                                </tr>
                                            ))}
                                            {counterEntries.map(([actionId, data]) => (
                                                <tr key={`pdf-counter-${drill.id}-${actionId}`}>
                                                    <td>{t(`actions.${actionId}`) || actionId}</td>
                                                    <td>-</td>
                                                    <td>-</td>
                                                    <td>{data.count}</td>
                                                </tr>
                                            ))}
                                            {hasWasteTime && (
                                                <tr className="waste-time-row">
                                                    <td>{t('results.wasteTime')}</td>
                                                    <td>{formatTime(drill.wasteTime)}</td>
                                                    <td>-</td>
                                                    <td>-</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Visible content */}
                <IonGrid>
                    {/* Practice Info Card - only show if at least one field has data */}
                    {!!(practiceInfo.clubName || practiceInfo.teamName || practiceInfo.coachName || practiceInfo.athletesNumber || practiceInfo.coachesNumber) && (
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

                    {/* Per-Drill Detailed Results */}
                    {drills.map((drill) => {
                        const tagString = getDrillTagString(drill);
                        const drillTimelineData = extractTimelineSegmentsForDrill(drill, t);
                        const drillActionTimeData = aggregateTimeByActionForDrill(drill, t);
                        const drillPieData = getDrillActionPieData(drill);
                        const drillChartHeight = Math.max(200, drillActionTimeData.length * 40 + 50);

                        const timerEntries = Object.entries(drill.timerData || {}).filter(
                            ([, data]) => data.totalTime > 0
                        );
                        const counterEntries = Object.entries(drill.counterData || {}).filter(
                            ([, data]) => data.count > 0
                        );
                        const hasWasteTime = (drill.wasteTime || 0) > 0;
                        const hasData = timerEntries.length > 0 || counterEntries.length > 0 || hasWasteTime;

                        return (
                            <IonRow key={`drill-details-${drill.id}`}>
                                <IonCol>
                                    <IonCard>
                                        <IonCardHeader>
                                            <IonCardTitle className="results-card-title">
                                                <IonIcon icon={timeOutline} size="large" />
                                                {t('results.drill')} {drill.id}
                                                {tagString && ` (${tagString})`}
                                            </IonCardTitle>
                                        </IonCardHeader>
                                        <IonCardContent>
                                            {/* Timeline */}
                                            {(drillTimelineData.segments.length > 0 || drillTimelineData.counterEvents.length > 0) && (
                                                <div style={{ marginBottom: 24 }}>
                                                    <h3 style={{ textAlign: 'center', marginBottom: 8 }}>
                                                        {t('results.actionTimeline') || 'Action Timeline'}
                                                    </h3>
                                                    <ActionTimeline
                                                        segments={drillTimelineData.segments}
                                                        counterEvents={drillTimelineData.counterEvents}
                                                        actionLabels={drillTimelineData.actionLabels}
                                                    />
                                                </div>
                                            )}

                                            {/* Charts Row */}
                                            <IonRow>
                                                <IonCol size="12" sizeMd="6">
                                                    <h3 style={{ textAlign: 'center', marginBottom: 8 }}>
                                                        {t('results.timePerAction') || 'Time per Action'}
                                                    </h3>
                                                    {drillActionTimeData.length > 0 ? (
                                                        <ActionTimeChart
                                                            data={drillActionTimeData}
                                                            height={drillChartHeight}
                                                        />
                                                    ) : (
                                                        <IonItem>
                                                            <IonLabel>
                                                                <p>{t('results.noTimeData') || 'No timing data recorded.'}</p>
                                                            </IonLabel>
                                                        </IonItem>
                                                    )}
                                                </IonCol>

                                                <IonCol size="12" sizeMd="6">
                                                    <h3 style={{ textAlign: 'center', marginBottom: 8 }}>
                                                        {t('results.timeDistributionPerAction') || 'Time Distribution per Action'}
                                                    </h3>
                                                    <div ref={pieContainerRef} style={{ width: '100%' }}>
                                                        {pieWidth > 0 && drillPieData.length > 0 ? (
                                                            <PieChart width={pieWidth} height={drillChartHeight}>
                                                                <Pie
                                                                    data={drillPieData}
                                                                    dataKey="value"
                                                                    nameKey="name"
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    outerRadius={Math.min(80, (drillChartHeight - 80) / 2)}
                                                                >
                                                                    {drillPieData.map((entry) => (
                                                                        <Cell key={`cell-${drill.id}-${entry.actionId}`} fill={ACTION_COLORS[entry.actionId] || '#999999'} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip formatter={(value) => formatDuration(Number(value) || 0)} />
                                                                <Legend />
                                                            </PieChart>
                                                        ) : (
                                                            <IonItem>
                                                                <IonLabel>
                                                                    <p>{t('results.noTimeData') || 'No timing data recorded.'}</p>
                                                                </IonLabel>
                                                            </IonItem>
                                                        )}
                                                    </div>
                                                </IonCol>
                                            </IonRow>

                                            {/* Raw Data Table */}
                                            <div style={{ marginTop: 24 }}>
                                                <h3 style={{ textAlign: 'center', marginBottom: 8 }}>
                                                    {t('results.rawDataTable') || 'Raw Tracking Data'}
                                                </h3>
                                                <table className="raw-data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>{t('results.action')}</th>
                                                            <th>{t('results.totalTime')}</th>
                                                            <th>{t('results.segments')}</th>
                                                            <th>{t('results.count')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {!hasData && (
                                                            <tr>
                                                                <td colSpan={4} className="no-data">
                                                                    {t('results.noData')}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {timerEntries.map(([actionId, data]) => (
                                                            <tr key={`timer-${drill.id}-${actionId}`}>
                                                                <td>{t(`actions.${actionId}`) || actionId}</td>
                                                                <td>{formatTime(data.totalTime)}</td>
                                                                <td>{data.timeSegments?.length || 0}</td>
                                                                <td>-</td>
                                                            </tr>
                                                        ))}
                                                        {counterEntries.map(([actionId, data]) => (
                                                            <tr key={`counter-${drill.id}-${actionId}`}>
                                                                <td>{t(`actions.${actionId}`) || actionId}</td>
                                                                <td>-</td>
                                                                <td>-</td>
                                                                <td>{data.count}</td>
                                                            </tr>
                                                        ))}
                                                        {hasWasteTime && (
                                                            <tr className="waste-time-row">
                                                                <td>{t('results.wasteTime')}</td>
                                                                <td>{formatTime(drill.wasteTime)}</td>
                                                                <td>-</td>
                                                                <td>-</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </IonCardContent>
                                    </IonCard>
                                </IonCol>
                            </IonRow>
                        );
                    })}
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