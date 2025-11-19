import { Router, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { Job, JobStatus } from '../../database/models/Job.js';
import { authMiddleware, optionalAuth, AuthenticatedRequest, userOrAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const jobRepository = () => AppDataSource.getRepository(Job);

// GET /api/jobs - List jobs
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const queryBuilder = jobRepository().createQueryBuilder('job');

    if (status) {
      queryBuilder.andWhere('job.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('job.type = :type', { type });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy(`job.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit));

    const jobs = await queryBuilder.getMany();

    res.json({
      jobs,
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

// GET /api/jobs/:id - Get job by ID
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const job = await jobRepository().findOne({
      where: { id: req.params.id }
    });

    if (!job) {
      throw new AppError('Job not found', 404);
    }

    res.json(job);
  } catch (error) {
    next(error);
  }
});

// POST /api/jobs/:id/cancel - Cancel job
router.post('/:id/cancel', authMiddleware, userOrAdmin, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const job = await jobRepository().findOne({
      where: { id: req.params.id }
    });

    if (!job) {
      throw new AppError('Job not found', 404);
    }

    if (job.status !== JobStatus.QUEUED && job.status !== JobStatus.PROCESSING) {
      throw new AppError('Job cannot be cancelled', 400);
    }

    job.status = JobStatus.CANCELLED;
    job.completedAt = new Date();
    await jobRepository().save(job);

    res.json({
      success: true,
      message: 'Job cancelled',
      job
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/jobs/stats/queue - Get queue statistics
router.get('/stats/queue', optionalAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const queued = await jobRepository().count({ where: { status: JobStatus.QUEUED } });
    const processing = await jobRepository().count({ where: { status: JobStatus.PROCESSING } });
    const completed = await jobRepository().count({ where: { status: JobStatus.COMPLETED } });
    const failed = await jobRepository().count({ where: { status: JobStatus.FAILED } });

    res.json({
      queued,
      processing,
      completed,
      failed
    });
  } catch (error) {
    next(error);
  }
});

export default router;
