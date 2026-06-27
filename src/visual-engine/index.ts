export { VisualEngine } from './core/VisualEngine';
export { mapStateToBrain, getBrainRegionPosition, getBrainStateColor } from './core/ClinicalRenderer';
export { mapStateToTimeline, getStepLabel, getStepIcon, getTimelineProgress } from './core/TimelineEngine';
export { AnimationPipeline, ANIMATION_PRESETS, getAnimationStyle } from './core/AnimationPipeline';
export {
  STATE_COLORS, BRAIN_ACTIVITY_COLORS, BRAIN_REGION_LABELS,
  type PatientState, type BrainRegionId, type BrainActivityLevel,
  type BrainVisualState, type TimelineVisualState, type TMSVisualState,
  type TwinVisualState, type HospitalVisualState, type ClinicalVisualSnapshot,
} from './core/StateMapper';

export { default as BrainViewer } from './modules/brain/BrainViewer';
export { useBrainState } from './modules/brain/useBrainState';
export { BRAIN_REGIONS, getRegionById } from './modules/brain/brain-regions';

export { default as TMSLiveSession } from './modules/tms/TMSLiveSession';
export { getIntensityConfig, getIntensityGradient } from './modules/tms/intensity-map';

export { default as DigitalTwinChart } from './modules/twin/DigitalTwinChart';

export { default as HospitalDashboard } from './modules/hospital/HospitalDashboard';

export { default as KioskDisplay } from './modules/reception/KioskDisplay';

export { default as ClinicalTimeline } from './modules/timeline/ClinicalTimeline';
