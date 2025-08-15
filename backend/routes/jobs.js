import express from 'express';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';
import { validateRequest, jobCreateSchema } from '../middleware/validation.js';

const router = express.Router();

// Get all jobs (public with optional auth)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      location = '',
      type = '',
      status = 'active',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    
    // Only show active jobs to non-HR users
    if (!req.user || req.user.role !== 'hr') {
      query.status = 'active';
      query.expiryDate = { $gt: new Date() };
    } else if (status !== 'all') {
      query.status = status;
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Location filter
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Sorting
    const sortField = sortBy === 'title' ? 'title' : 
                     sortBy === 'company' ? 'company' : 
                     sortBy === 'salary' ? 'salary' : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const jobs = await Job.find(query)
      .populate('createdBy', 'name email')
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Job.countDocuments(query);

    // Add application count for each job
    const jobsWithStats = await Promise.all(
      jobs.map(async (job) => {
        const applicationsCount = await Application.countDocuments({ jobId: job._id });
        return {
          ...job,
          applicants: applicationsCount
        };
      })
    );

    res.json({
      jobs: jobsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Jobs fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// Get single job
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if job is accessible
    if (job.status !== 'active' && (!req.user || req.user.role !== 'hr')) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Increment view count
    job.viewsCount += 1;
    await job.save();

    // Get application count
    const applicationsCount = await Application.countDocuments({ jobId: job._id });

    // Check if current user has applied (if authenticated)
    let hasApplied = false;
    if (req.user && req.user.role === 'candidate') {
      const application = await Application.findOne({
        candidateId: req.user._id,
        jobId: job._id
      });
      hasApplied = !!application;
    }

    res.json({
      ...job.toObject(),
      applicants: applicationsCount,
      hasApplied
    });
  } catch (error) {
    console.error('Job fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
});

// Create job (HR only)
router.post('/', authenticate, authorize('hr'), validateRequest(jobCreateSchema), async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      createdBy: req.user._id
    };

    const job = new Job(jobData);
    await job.save();

    const populatedJob = await Job.findById(job._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Job created successfully',
      job: populatedJob
    });
  } catch (error) {
    console.error('Job creation error:', error);
    res.status(500).json({ message: 'Failed to create job', error: error.message });
  }
});

// Update job (HR only)
router.put('/:id', authenticate, authorize('hr'), validateRequest(jobCreateSchema), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user owns this job or is admin
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      message: 'Job updated successfully',
      job: updatedJob
    });
  } catch (error) {
    console.error('Job update error:', error);
    res.status(500).json({ message: 'Failed to update job', error: error.message });
  }
});

// Update job status (HR only)
router.patch('/:id/status', authenticate, authorize('hr'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'paused', 'closed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    job.status = status;
    await job.save();

    res.json({
      message: 'Job status updated successfully',
      job
    });
  } catch (error) {
    console.error('Job status update error:', error);
    res.status(500).json({ message: 'Failed to update job status' });
  }
});

// Delete job (HR only)
router.delete('/:id', authenticate, authorize('hr'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user owns this job
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    // Check if job has applications
    const applicationsCount = await Application.countDocuments({ jobId: job._id });
    if (applicationsCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete job with existing applications. Please close the job instead.' 
      });
    }

    await Job.findByIdAndDelete(req.params.id);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Job deletion error:', error);
    res.status(500).json({ message: 'Failed to delete job' });
  }
});

// Get job applications (HR only)
router.get('/:id/applications', authenticate, authorize('hr'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const applications = await Application.find({ jobId: req.params.id })
      .populate('candidateId', 'name email phone location')
      .populate('resumeId')
      .sort({ createdAt: -1 });

    res.json({
      job: {
        id: job._id,
        title: job.title,
        company: job.company
      },
      applications: applications.map(app => ({
        id: app._id,
        candidate: {
          id: app.candidateId._id,
          name: app.candidateId.name,
          email: app.candidateId.email,
          phone: app.candidateId.phone,
          location: app.candidateId.location
        },
        status: app.status,
        score: app.score,
        aiRecommendation: app.aiRecommendation,
        appliedDate: app.createdAt,
        coverLetter: app.coverLetter
      }))
    });
  } catch (error) {
    console.error('Job applications fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch job applications' });
  }
});

export default router;