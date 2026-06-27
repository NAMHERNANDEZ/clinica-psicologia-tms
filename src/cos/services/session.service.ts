import { SessionOrchestrator } from '../engine/SessionOrchestrator';

const sessionOrchestrator = new SessionOrchestrator();

export const sessionService = {
  getContext: (sessionId: number) => sessionOrchestrator.getSessionContext(sessionId),
  complete: (sessionId: number, data: Parameters<SessionOrchestrator['completeSession']>[1]) => sessionOrchestrator.completeSession(sessionId, data),
  getTimeline: (profileId: number) => sessionOrchestrator.getSessionTimeline(profileId),
  getActiveCount: () => sessionOrchestrator.getActiveSessionsCount(),
  getSummary: (profileId: number) => sessionOrchestrator.getSessionsSummary(profileId),
};
