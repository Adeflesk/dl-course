import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadProblems, loadTrajectory, clearCache, type Trajectory, type Problem } from '../utils/trajectory-loader';

// Mock fetch for testing
global.fetch = vi.fn();

describe('trajectory-loader', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  describe('loadProblems', () => {
    it('should load problems from /trajectories/problems.json', async () => {
      const mockProblems = {
        problems: [
          {
            id: 'quadratic-bowl',
            name: 'Quadratic Bowl',
            description: 'Simple quadratic loss landscape',
            difficulty: 1.0,
            trajectories: {
              'sgd-0.01': 'quadratic-bowl-sgd-lr0.01.json',
            },
          },
          {
            id: 'rosenbrock',
            name: 'Rosenbrock Function',
            description: 'Classic non-convex landscape',
            difficulty: 1.5,
            trajectories: {
              'adam-0.001': 'rosenbrock-adam-lr0.001.json',
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProblems,
      });

      const problems = await loadProblems();

      expect(problems).toBeInstanceOf(Map);
      expect(problems.size).toBe(2);
      expect(problems.has('quadratic-bowl')).toBe(true);
      expect(problems.has('rosenbrock')).toBe(true);

      const quadratic = problems.get('quadratic-bowl') as Problem;
      expect(quadratic.name).toBe('Quadratic Bowl');
      expect(quadratic.difficulty).toBe(1.0);
      expect(quadratic.trajectories['sgd-0.01']).toBe('quadratic-bowl-sgd-lr0.01.json');
    });

    it('should cache problems after first load', async () => {
      const mockProblems = {
        problems: [
          {
            id: 'test-problem',
            name: 'Test',
            description: 'Test problem',
            difficulty: 1.0,
            trajectories: {},
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProblems,
      });

      const problems1 = await loadProblems();
      const problems2 = await loadProblems();

      // Should return the same cached instance
      expect(problems1).toBe(problems2);
      // fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error on network failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(loadProblems()).rejects.toThrow('Failed to load problems');
    });

    it('should throw error on invalid JSON format', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'format' }),
      });

      await expect(loadProblems()).rejects.toThrow('Invalid problems.json format');
    });

    it('should throw error on missing problem id', async () => {
      const mockProblems = {
        problems: [
          {
            name: 'Test',
            description: 'Test problem',
            difficulty: 1.0,
            trajectories: {},
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProblems,
      });

      await expect(loadProblems()).rejects.toThrow('Invalid problem: missing id field');
    });
  });

  describe('loadTrajectory', () => {
    it('should load trajectory from /trajectories/{filename}', async () => {
      const mockTrajectory = {
        optimizer: 'sgd',
        learningRate: 0.01,
        momentum: 0,
        steps: [
          { iteration: 0, loss: 50, x: -5, y: 5, weights: [-5, 5] },
          { iteration: 100, loss: 0.001, x: 0, y: 0, weights: [0, 0] },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrajectory,
      });

      const trajectory = await loadTrajectory('test-trajectory.json');

      expect(trajectory.optimizer).toBe('sgd');
      expect(trajectory.learningRate).toBe(0.01);
      expect(trajectory.steps.length).toBe(2);
      expect(trajectory.steps[0].iteration).toBe(0);
      expect(trajectory.steps[1].iteration).toBe(100);

      expect(global.fetch).toHaveBeenCalledWith('/trajectories/test-trajectory.json');
    });

    it('should cache trajectories after first load', async () => {
      const mockTrajectory = {
        optimizer: 'adam',
        learningRate: 0.001,
        momentum: 0,
        steps: [
          { iteration: 0, loss: 25, x: -5, y: 5, weights: [-5, 5] },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrajectory,
      });

      const traj1 = await loadTrajectory('cached-trajectory.json');
      const traj2 = await loadTrajectory('cached-trajectory.json');

      // Should return the same cached instance
      expect(traj1).toBe(traj2);
      // fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should reject path traversal attacks', async () => {
      await expect(loadTrajectory('../../../etc/passwd')).rejects.toThrow('Invalid filename');
      await expect(loadTrajectory('folder/file.json')).rejects.toThrow('Invalid filename');
      await expect(loadTrajectory('file\\windows.json')).rejects.toThrow('Invalid filename');
    });

    it('should throw error on network failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(loadTrajectory('missing.json')).rejects.toThrow('Failed to load trajectory');
    });

    it('should throw error on invalid trajectory format', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'format' }),
      });

      await expect(loadTrajectory('invalid.json')).rejects.toThrow('Invalid trajectory format');
    });

    it('should throw error on empty steps array', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          optimizer: 'sgd',
          learningRate: 0.01,
          steps: [],
        }),
      });

      await expect(loadTrajectory('empty-steps.json')).rejects.toThrow('steps array is empty');
    });

    it('should throw error on invalid step structure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          optimizer: 'sgd',
          learningRate: 0.01,
          steps: [
            { iteration: 0, loss: 50, x: -5, y: 5 }, // missing weights
          ],
        }),
      });

      await expect(loadTrajectory('invalid-step.json')).rejects.toThrow('Invalid trajectory step');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      const mockProblems = {
        problems: [
          {
            id: 'test',
            name: 'Test',
            description: 'Test',
            difficulty: 1.0,
            trajectories: {},
          },
        ],
      };

      const mockTrajectory = {
        optimizer: 'sgd',
        learningRate: 0.01,
        momentum: 0,
        steps: [{ iteration: 0, loss: 50, x: -5, y: 5, weights: [-5, 5] }],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProblems,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrajectory,
      });

      await loadProblems();
      await loadTrajectory('test.json');

      expect(global.fetch).toHaveBeenCalledTimes(2);

      clearCache();

      // Refetch and verify cache was cleared
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProblems,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrajectory,
      });

      await loadProblems();
      await loadTrajectory('test.json');

      // fetch should be called 2 more times (total 4)
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });
});
