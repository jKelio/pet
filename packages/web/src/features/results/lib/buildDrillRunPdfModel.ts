import type { TFunction } from 'i18next';
import type { Drill, PdfReportModel, PracticeInfo } from '@pet/shared';
import { buildPdfReportModel } from './buildPdfReportModel.js';

/**
 * Builds the PDF report model for an ephemeral Drill Run: exactly one drill,
 * no session around it. Wraps the session builder with a synthetic
 * PracticeInfo (player name and drill label come from the export dialog) and
 * drops the session-level chart blocks — a one-slice drill pie/overview would
 * be noise. The drill label travels as a tag chip: model tags are plain
 * already-translated strings, so no i18n key lookup happens server-side.
 */
export function buildDrillRunPdfModel(params: {
  sessionId: string;
  drill: Drill;
  playerName?: string;
  drillLabel?: string;
  t: TFunction;
  language: string;
}): PdfReportModel {
  const { sessionId, drill, playerName, drillLabel, t, language } = params;

  const practiceInfo: PracticeInfo = {
    clubName: '',
    teamName: '',
    date: new Date().toISOString(),
    coachName: '',
    athletesNumber: 0,
    coachesNumber: 0,
    totalTime: 0,
    trackedPlayerName: playerName?.trim() ?? '',
    drillsNumber: 1,
    sessionType: 'open',
    wasteTime: { totalTime: 0, timeSegments: [] },
  };

  const model = buildPdfReportModel({
    sessionId,
    drills: [drill],
    practiceInfo,
    t,
    language,
  });

  delete model.drillTimeData;
  delete model.drillOverview;

  const label = drillLabel?.trim();
  if (label && model.drills[0]) {
    model.drills[0].tags.unshift(label.slice(0, 60));
  }

  return model;
}
