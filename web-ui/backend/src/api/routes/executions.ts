import { Router, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Execution, ExecutionStatus } from '../../database/models/Execution.js';
import { authMiddleware, optionalAuth, AuthenticatedRequest, userOrAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const executionRepository = () => AppDataSource.getRepository(Execution);

// GET /api/executions - List executions
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      playbookId,
      sortBy = 'startedAt',
      sortOrder = 'DESC'
    } = req.query;

    const queryBuilder = executionRepository()
      .createQueryBuilder('execution')
      .leftJoinAndSelect('execution.playbook', 'playbook')
      .leftJoinAndSelect('execution.executedBy', 'executedBy');

    if (status) {
      queryBuilder.andWhere('execution.status = :status', { status });
    }

    if (playbookId) {
      queryBuilder.andWhere('execution.playbookId = :playbookId', { playbookId });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy(`execution.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit));

    const executions = await queryBuilder.getMany();

    res.json({
      executions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/executions/:id - Get execution by ID
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const execution = await executionRepository().findOne({
      where: { id: req.params.id },
      relations: ['playbook', 'executedBy']
    });

    if (!execution) {
      throw new AppError('Execution not found', 404);
    }

    res.json(execution);
  } catch (error) {
    next(error);
  }
});

// GET /api/executions/:id/output - Get execution output
router.get('/:id/output', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const execution = await executionRepository().findOne({
      where: { id: req.params.id }
    });

    if (!execution) {
      throw new AppError('Execution not found', 404);
    }

    res.json({
      id: execution.id,
      status: execution.status,
      output: execution.output,
      error: execution.error,
      stats: execution.stats
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/executions/:id/logs - Get execution logs
router.get('/:id/logs', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const execution = await executionRepository().findOne({
      where: { id: req.params.id }
    });

    if (!execution) {
      throw new AppError('Execution not found', 404);
    }

    res.json({
      id: execution.id,
      output: execution.output,
      error: execution.error,
      command: execution.command
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/executions/:id/stop - Stop running execution
router.post('/:id/stop', authMiddleware, userOrAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const execution = await executionRepository().findOne({
      where: { id: req.params.id }
    });

    if (!execution) {
      throw new AppError('Execution not found', 404);
    }

    if (execution.status !== ExecutionStatus.RUNNING) {
      throw new AppError('Execution is not running', 400);
    }

    // This will be integrated with actual execution cancellation
    execution.status = ExecutionStatus.CANCELLED;
    execution.completedAt = new Date();
    await executionRepository().save(execution);

    res.json({
      success: true,
      message: 'Execution stopped',
      execution
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/executions/stats/summary - Get execution statistics
router.get('/stats/summary', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const total = await executionRepository().count();
    const running = await executionRepository().count({ where: { status: ExecutionStatus.RUNNING } });
    const success = await executionRepository().count({ where: { status: ExecutionStatus.SUCCESS } });
    const failed = await executionRepository().count({ where: { status: ExecutionStatus.FAILED } });

    const avgDuration = await executionRepository()
      .createQueryBuilder('execution')
      .select('AVG(execution.durationSeconds)', 'avg')
      .where('execution.durationSeconds IS NOT NULL')
      .getRawOne();

    res.json({
      total,
      running,
      success,
      failed,
      successRate: total > 0 ? (success / total * 100).toFixed(2) : 0,
      averageDuration: avgDuration?.avg ? parseFloat(avgDuration.avg).toFixed(2) : 0
    });
  } catch (error) {
    next(error);
  }
});

export default router;
