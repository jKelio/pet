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
    IonLoading,
    IonToast,
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
import { domToPng } from 'modern-screenshot';
import { useTrackingContext } from './TrackingContext';
import { PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import ActionTimeChart from '../../components/gantt/ActionTimeChart';
import { useContainerWidth } from '../../hooks/useContainerWidth';
import ActionTimeline from '../../components/gantt/ActionTimeline';
import DrillOverviewTimeline from '../../components/gantt/DrillOverviewTimeline';
import { extractTimelineSegmentsForDrill, aggregateTimeByActionForDrill, extractDrillDurations, ACTION_COLORS } from '../../components/gantt/ganttUtils';
import './Results.css';

const Results: React.FC = () => {
    const { t } = useTranslation('pet');
    const history = useHistory();
    const { drills, practiceInfo, resetAllData } = useTrackingContext();
    const [pieContainerRef, pieWidth] = useContainerWidth<HTMLDivElement>();
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, status: '' });
    const [toastMessage, setToastMessage] = useState<{ message: string; color: 'success' | 'danger' | 'warning' } | null>(null);
    const PDF_EXPORT_WIDTH = 800;

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

    // Drill durations for overview timeline
    const drillDurations = extractDrillDurations(drills, t);

    // Drill time data for bar chart and pie chart (total time per drill)
    const DRILL_COLORS = ['#0088FE', '#FF8042', '#00C49F', '#FFBB28', '#A28BFE', '#FF6699', '#33CC99', '#FF6666', '#66B3FF', '#FFCC99'];
    const drillTimeData = drills.map((drill, index) => {
        const drillTimerTime = Object.values(drill.timerData || {}).reduce((s, td) => s + (td.totalTime || 0), 0);
        const drillTotal = drillTimerTime + (drill.wasteTime || 0);
        return {
            drillId: drill.id,
            name: `${t('results.drill')} ${drill.id}`,
            totalTime: drillTotal,
            color: DRILL_COLORS[index % DRILL_COLORS.length],
        };
    }).filter(d => d.totalTime > 0);
    const drillChartHeight = Math.max(200, drillTimeData.length * 40 + 50);

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
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            // Make container visible for rendering
            container.style.position = 'fixed';
            container.style.left = '0';
            container.style.top = '0';
            container.style.zIndex = '-9999';
            container.style.opacity = '1';

            // Wait for render
            await new Promise(resolve => setTimeout(resolve, isMobile ? 500 : 200));

            // Get all sections to render
            const sections = container.querySelectorAll('.pdf-section');
            const totalSections = sections.length;

            setExportProgress({ current: 0, total: totalSections, status: t('results.preparingExport') });

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const usableWidth = pdfWidth - 2 * margin;
            const usableHeight = pdfHeight - 2 * margin;

            let currentY = 0;
            let isFirstSection = true;

            // Render each section with modern-screenshot
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i] as HTMLElement;

                setExportProgress({
                    current: i + 1,
                    total: totalSections,
                    status: t('results.exportProgress', { current: i + 1, total: totalSections }),
                });

                try {
                    // Use modern-screenshot - much faster than html2canvas
                    const dataUrl = await domToPng(section, {
                        scale: isMobile ? 1.5 : 2,
                        quality: 0.92,
                        backgroundColor: '#ffffff',
                    });

                    // Get image dimensions
                    const img = new Image();
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = reject;
                        img.src = dataUrl;
                    });

                    const scaledWidth = usableWidth;
                    const scaledHeight = (img.height * scaledWidth) / img.width;

                    // Check if we need a new page
                    if (!isFirstSection && currentY + scaledHeight > usableHeight) {
                        pdf.addPage();
                        currentY = 0;
                    }

                    pdf.addImage(dataUrl, 'PNG', margin, margin + currentY, scaledWidth, scaledHeight);
                    currentY += scaledHeight + 5;
                    isFirstSection = false;

                    // Small delay to prevent memory pressure on mobile
                    if (isMobile) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                } catch (sectionError) {
                    console.warn(`Failed to render section ${i}:`, sectionError);
                }
            }

            // Hide container again
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.opacity = '0';

            setExportProgress({ current: totalSections, total: totalSections, status: t('results.finalizingExport') });

            // Download
            const date = new Date().toISOString().split('T')[0];
            const filename = `training-results-${date}.pdf`;

            try {
                const pdfBlob = pdf.output('blob');
                const blobUrl = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                }, 1000);
            } catch {
                pdf.save(filename);
            }

            setToastMessage({
                message: t('results.exportComplete'),
                color: 'success',
            });
        } catch (error) {
            console.error('PDF export failed:', error);
            setToastMessage({
                message: t('results.exportFailed'),
                color: 'danger',
            });
        } finally {
            setIsExporting(false);
            setExportProgress({ current: 0, total: 0, status: '' });
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
                {/* Hidden container for PDF export - uses modern-screenshot */}
                <div
                    ref={exportRef}
                    className="pdf-export-container"
                    style={{
                        position: 'absolute',
                        left: '-9999px',
                        width: PDF_EXPORT_WIDTH,
                        backgroundColor: '#ffffff',
                        opacity: 0,
                    }}
                >
                    {/* Header Section */}
                    <div className="pdf-section pdf-export-header">
                        <h1 style={{ textAlign: 'center', margin: '20px 0' }}>{t('results.title') || 'Training Results'}</h1>
                        <p style={{ textAlign: 'center', color: '#666' }}>{new Date().toLocaleDateString()}</p>
                    </div>

                    {/* Practice Info Section */}
                    {!!(practiceInfo.clubName || practiceInfo.teamName || practiceInfo.coachName || practiceInfo.athletesNumber || practiceInfo.coachesNumber || practiceInfo.evaluation || practiceInfo.trackedPlayerName) && (
                        <div className="pdf-section pdf-practice-info" style={{ padding: '15px', margin: '10px' }}>
                            <h3 style={{ marginBottom: '10px' }}>{t('general.infoHeader')}</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                {practiceInfo.clubName && <div><strong>{t('general.clubLabel')}:</strong> {practiceInfo.clubName}</div>}
                                {practiceInfo.teamName && <div><strong>{t('general.teamLabel')}:</strong> {practiceInfo.teamName}</div>}
                                {practiceInfo.date && <div><strong>{t('general.dateLabel')}:</strong> {formatDate(practiceInfo.date)}</div>}
                                {practiceInfo.coachName && <div><strong>{t('general.coachLabel')}:</strong> {practiceInfo.coachName}</div>}
                                {practiceInfo.athletesNumber > 0 && <div><strong>{t('practice.athletesNumberLabel')}:</strong> {practiceInfo.athletesNumber}</div>}
                                {practiceInfo.coachesNumber > 0 && <div><strong>{t('practice.coachesNumberLabel')}:</strong> {practiceInfo.coachesNumber}</div>}
                                {practiceInfo.evaluation > 0 && <div><strong>{t('general.evaluationLabel')}:</strong> {practiceInfo.evaluation}</div>}
                                {practiceInfo.trackedPlayerName && <div><strong>{t('practice.trackedPlayerNameLabel')}:</strong> {practiceInfo.trackedPlayerName}</div>}
                            </div>
                        </div>
                    )}

                    {/* Summary Section */}
                    <div className="pdf-section pdf-summary" style={{ padding: '15px', margin: '10px', backgroundColor: '#f8f9fa' }}>
                        <h3 style={{ marginBottom: '15px' }}>{t('results.summary') || 'Training Summary'}</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalDrills}</div>
                                <div style={{ color: '#666' }}>{t('results.totalDrills')}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatTime(totalTime)}</div>
                                <div style={{ color: '#666' }}>{t('results.totalTime')}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>{formatTime(totalWasteTime)}</div>
                                <div style={{ color: '#666' }}>{t('results.wasteTime')} ({wastePercent}%)</div>
                            </div>
                        </div>
                    </div>

                    {/* Drill Overview Timeline */}
                    {drillDurations.length > 0 && (
                        <div className="pdf-section" style={{ padding: '15px', margin: '10px' }}>
                            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>{t('results.drillOverview') || 'Drill Overview'}</h3>
                            <DrillOverviewTimeline drillDurations={drillDurations} />
                        </div>
                    )}

                    {/* Drill Time Charts - Bar and Pie side by side */}
                    {drillTimeData.length > 0 && (
                        <div className="pdf-section" style={{ padding: '15px', margin: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {/* Bar Chart - Time per Drill */}
                                <div style={{ flex: '1' }}>
                                    <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>{t('results.timePerDrill') || 'Time per Drill'}</h3>
                                    <BarChart
                                        layout="vertical"
                                        data={drillTimeData}
                                        width={380}
                                        height={drillChartHeight}
                                        margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
                                    >
                                        <XAxis type="number" tickFormatter={(value) => formatDuration(value)} stroke="#666" fontSize={10} />
                                        <YAxis type="category" dataKey="name" stroke="#666" fontSize={9} width={110} />
                                        <Tooltip formatter={(value) => formatDuration(Number(value) || 0)} />
                                        <Bar dataKey="totalTime" radius={[0, 4, 4, 0]}>
                                            {drillTimeData.map((entry, index) => (
                                                <Cell key={`cell-pdf-bar-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </div>
                                {/* Pie Chart - Time Distribution per Drill */}
                                <div style={{ flex: '1' }}>
                                    <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>{t('results.timeDistributionPerDrill') || 'Time Distribution per Drill'}</h3>
                                    <PieChart width={380} height={drillChartHeight}>
                                        <Pie
                                            data={drillTimeData}
                                            dataKey="totalTime"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={Math.min(70, (drillChartHeight - 80) / 2)}
                                        >
                                            {drillTimeData.map((entry, index) => (
                                                <Cell key={`cell-pdf-pie-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatDuration(Number(value) || 0)} />
                                        <Legend />
                                    </PieChart>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Per-Drill Details */}
                    {drills.map((drill) => {
                        const tagString = getDrillTagString(drill);
                        const drillTimelineData = extractTimelineSegmentsForDrill(drill, t);
                        const drillActionTimeData = aggregateTimeByActionForDrill(drill, t);
                        const drillPieData = getDrillActionPieData(drill);
                        const chartHeight = Math.max(180, drillActionTimeData.length * 35 + 40);

                        const timerEntries = Object.entries(drill.timerData || {}).filter(([, data]) => data.totalTime > 0);
                        const counterEntries = Object.entries(drill.counterData || {}).filter(([, data]) => data.count > 0);
                        const hasWasteTime = (drill.wasteTime || 0) > 0;

                        return (
                            <div key={`pdf-drill-${drill.id}`} className="pdf-section" style={{ padding: '15px', margin: '10px', borderTop: '2px solid #ddd' }}>
                                <h2 style={{ marginBottom: '15px' }}>
                                    {t('results.drill')} {drill.id}{tagString ? ` (${tagString})` : ''}
                                </h2>

                                {/* Timeline */}
                                {(drillTimelineData.segments.length > 0 || drillTimelineData.counterEvents.length > 0) && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <h4 style={{ marginBottom: '8px' }}>{t('results.actionTimeline') || 'Action Timeline'}</h4>
                                        <ActionTimeline
                                            segments={drillTimelineData.segments}
                                            counterEvents={drillTimelineData.counterEvents}
                                            actionLabels={drillTimelineData.actionLabels}
                                        />
                                    </div>
                                )}

                                {/* Charts */}
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                                    {drillActionTimeData.length > 0 && (
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ textAlign: 'center', marginBottom: '8px' }}>{t('results.timePerAction')}</h4>
                                            <ActionTimeChart data={drillActionTimeData} height={chartHeight} />
                                        </div>
                                    )}
                                    {drillPieData.length > 0 && (
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ textAlign: 'center', marginBottom: '8px' }}>{t('results.timeDistributionPerAction')}</h4>
                                            <PieChart width={350} height={chartHeight}>
                                                <Pie data={drillPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                                                    {drillPieData.map((entry) => (
                                                        <Cell key={`cell-pdf-pie-${drill.id}-${entry.actionId}`} fill={ACTION_COLORS[entry.actionId] || '#999'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => formatDuration(Number(value) || 0)} />
                                                <Legend />
                                            </PieChart>
                                        </div>
                                    )}
                                </div>

                                {/* Data Table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#5bc0de', color: 'white' }}>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>{t('results.action')}</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>{t('results.totalTime')}</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>{t('results.segments')}</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>{t('results.count')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timerEntries.map(([actionId, data], idx) => (
                                            <tr key={`pdf-t-${drill.id}-${actionId}`} style={{ backgroundColor: idx % 2 ? '#f9f9f9' : 'white' }}>
                                                <td style={{ padding: '6px' }}>{t(`actions.${actionId}`) || actionId}</td>
                                                <td style={{ padding: '6px' }}>{formatTime(data.totalTime)}</td>
                                                <td style={{ padding: '6px' }}>{data.timeSegments?.length || 0}</td>
                                                <td style={{ padding: '6px' }}>-</td>
                                            </tr>
                                        ))}
                                        {counterEntries.map(([actionId, data], idx) => (
                                            <tr key={`pdf-c-${drill.id}-${actionId}`} style={{ backgroundColor: (timerEntries.length + idx) % 2 ? '#f9f9f9' : 'white' }}>
                                                <td style={{ padding: '6px' }}>{t(`actions.${actionId}`) || actionId}</td>
                                                <td style={{ padding: '6px' }}>-</td>
                                                <td style={{ padding: '6px' }}>-</td>
                                                <td style={{ padding: '6px' }}>{data.count}</td>
                                            </tr>
                                        ))}
                                        {hasWasteTime && (
                                            <tr style={{ backgroundColor: '#fff3cd' }}>
                                                <td style={{ padding: '6px' }}>{t('results.wasteTime')}</td>
                                                <td style={{ padding: '6px' }}>{formatTime(drill.wasteTime)}</td>
                                                <td style={{ padding: '6px' }}>-</td>
                                                <td style={{ padding: '6px' }}>-</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>

                <IonGrid>
                    {/* Practice Info Card - only show if at least one field has data */}
                    {!!(practiceInfo.clubName || practiceInfo.teamName || practiceInfo.coachName || practiceInfo.athletesNumber || practiceInfo.coachesNumber || practiceInfo.evaluation || practiceInfo.trackedPlayerName) && (
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
                                            {practiceInfo.evaluation > 0 && (
                                                <IonCol size="6">
                                                    <IonItem>
                                                        <IonLabel>
                                                            <h3>{t('general.evaluationLabel')}</h3>
                                                            <p>{practiceInfo.evaluation}</p>
                                                        </IonLabel>
                                                    </IonItem>
                                                </IonCol>
                                            )}
                                            {practiceInfo.trackedPlayerName && (
                                                <IonCol size="6">
                                                    <IonItem>
                                                        <IonLabel>
                                                            <h3>{t('practice.trackedPlayerNameLabel')}</h3>
                                                            <p>{practiceInfo.trackedPlayerName}</p>
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

                                    {/* Drill Overview Timeline */}
                                    {drillDurations.length > 0 && (
                                        <div style={{ marginTop: 16 }}>
                                            <h3 style={{ textAlign: 'center', marginBottom: 8 }}>
                                                {t('results.drillOverview') || 'Drill Overview'}
                                            </h3>
                                            <DrillOverviewTimeline drillDurations={drillDurations} />
                                        </div>
                                    )}

                                    {/* Drill Time Charts */}
                                    {drillTimeData.length > 0 && (
                                        <IonRow style={{ marginTop: 24 }}>
                                            {/* Bar Chart - Time per Drill */}
                                            <IonCol size="12" sizeMd="6">
                                                <h3 style={{ textAlign: 'center', marginBottom: 8 }}>
                                                    {t('results.timePerDrill') || 'Time per Drill'}
                                                </h3>
                                                <ResponsiveContainer width="100%" height={drillChartHeight}>
                                                    <BarChart
                                                        layout="vertical"
                                                        data={drillTimeData}
                                                        margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                                                    >
                                                        <XAxis
                                                            type="number"
                                                            tickFormatter={(value) => formatDuration(value)}
                                                            stroke="#666"
                                                            fontSize={12}
                                                        />
                                                        <YAxis
                                                            type="category"
                                                            dataKey="name"
                                                            stroke="#666"
                                                            fontSize={11}
                                                            width={90}
                                                            tick={{ fontSize: 10 }}
                                                        />
                                                        <Tooltip formatter={(value) => formatDuration(Number(value) || 0)} />
                                                        <Bar dataKey="totalTime" radius={[0, 4, 4, 0]}>
                                                            {drillTimeData.map((entry, index) => (
                                                                <Cell key={`cell-drill-bar-${index}`} fill={entry.color} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </IonCol>

                                            {/* Pie Chart - Time Distribution per Drill */}
                                            <IonCol size="12" sizeMd="6">
                                                <h3 style={{ textAlign: 'center', marginBottom: 8 }}>
                                                    {t('results.timeDistributionPerDrill') || 'Time Distribution per Drill'}
                                                </h3>
                                                <div ref={pieContainerRef} style={{ width: '100%' }}>
                                                    {pieWidth > 0 && (
                                                        <PieChart width={pieWidth} height={drillChartHeight}>
                                                            <Pie
                                                                data={drillTimeData}
                                                                dataKey="totalTime"
                                                                nameKey="name"
                                                                cx="50%"
                                                                cy="50%"
                                                                outerRadius={Math.min(80, (drillChartHeight - 80) / 2)}
                                                            >
                                                                {drillTimeData.map((entry, index) => (
                                                                    <Cell key={`cell-drill-pie-${index}`} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip formatter={(value) => formatDuration(Number(value) || 0)} />
                                                            <Legend />
                                                        </PieChart>
                                                    )}
                                                </div>
                                            </IonCol>
                                        </IonRow>
                                    )}
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
                                                <div className="raw-data-table-container">
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

                {/* Progress indicator for PDF export */}
                <IonLoading
                    isOpen={isExporting}
                    message={exportProgress.status || t('results.exporting')}
                    spinner="crescent"
                />

                {/* Toast for export result feedback */}
                <IonToast
                    isOpen={toastMessage !== null}
                    message={toastMessage?.message || ''}
                    color={toastMessage?.color || 'primary'}
                    duration={3000}
                    onDidDismiss={() => setToastMessage(null)}
                    position="bottom"
                />
            </IonContent>
        </IonPage>
    );
};

export default Results; 