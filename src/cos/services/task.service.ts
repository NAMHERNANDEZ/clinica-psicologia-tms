import { TaskEngine } from '../engine/TaskEngine';

const taskEngine = new TaskEngine();

export const taskService = {
  generate: () => taskEngine.generateTasks(),
  getStats: () => taskEngine.getTaskStats(),
};
