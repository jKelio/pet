import type { PracticeSession, TeiScores } from '@pet/shared';
import { PUCK_TIMER_IDS, PASSIVE_TIMER_IDS, TIME_STATIONARY, getEffectiveDurationMs } from '@pet/shared';

export function computeTei(session: PracticeSession): TeiScores {
  const totalMs = getEffectiveDurationMs(session);
  if (totalMs <= 0) {
    return { activity: 10, coaching: 5, repetitions: 5, organisation: 5, total: 25, grade: 'F' };
  }

  let activeMs = 0;
  let coachingMs = 0;
  let wasteMs = session.practiceInfo.wasteTime?.totalTime ?? 0;
  let counterActions = 0;
  let movementSegments = 0;

  for (const drill of session.drills) {
    for (const id of [...PUCK_TIMER_IDS, TIME_STATIONARY]) {
      activeMs += drill.timerData[id]?.totalTime ?? 0;
    }
    for (const id of PASSIVE_TIMER_IDS) {
      coachingMs += drill.timerData[id]?.totalTime ?? 0;
    }
    wasteMs += drill.wasteTime?.totalTime ?? 0;
    counterActions +=
      (drill.counterData['shots']?.count ?? 0) +
      (drill.counterData['passes']?.count ?? 0);
    for (const id of PUCK_TIMER_IDS) {
      movementSegments += drill.timerData[id]?.timeSegments?.length ?? 0;
    }
  }

  const athletes = session.practiceInfo.athletesNumber || 1;
  const activePercent   = (activeMs   / totalMs) * 100;
  const coachingPercent = (coachingMs / totalMs) * 100;
  const wastePercent    = (wasteMs    / totalMs) * 100;
  const actionsPerPlayer = (counterActions + movementSegments) / athletes;

  const activity =
    activePercent > 75 ? 40 : activePercent >= 70 ? 35 :
    activePercent >= 60 ? 30 : activePercent >= 50 ? 20 : 10;

  const coaching =
    coachingPercent < 20 ? 20 : coachingPercent <= 25 ? 18 :
    coachingPercent <= 30 ? 15 : coachingPercent <= 40 ? 10 : 5;

  const repetitions =
    actionsPerPlayer > 40 ? 20 : actionsPerPlayer >= 30 ? 18 :
    actionsPerPlayer >= 20 ? 15 : actionsPerPlayer >= 10 ? 10 : 5;

  const organisation =
    wastePercent < 10 ? 20 : wastePercent <= 15 ? 18 :
    wastePercent <= 20 ? 16 : wastePercent <= 30 ? 12 : 5;

  const total = activity + coaching + repetitions + organisation;
  const grade: TeiScores['grade'] =
    total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B' :
    total >= 60 ? 'C'  : total >= 50 ? 'D' : 'F';

  return { activity, coaching, repetitions, organisation, total, grade };
}
