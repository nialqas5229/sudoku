import { generatePuzzle } from '../core/generator';
import { Difficulty, GridSize } from '../core/types';

export interface WorkerRequest {
  id: number;
  size: GridSize;
  difficulty: Difficulty;
  seed?: string;
}

export interface WorkerResponse {
  id: number;
  success: boolean;
  result?: ReturnType<typeof generatePuzzle>;
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, size, difficulty, seed } = event.data;
  try {
    const result = generatePuzzle(size, difficulty, seed);
    const response: WorkerResponse = { id, success: true, result };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      id,
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate puzzle',
    };
    self.postMessage(response);
  }
};
