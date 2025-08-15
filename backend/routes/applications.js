import express from 'express';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { calculateJobMatch } from '../services/aiService.js';

const router = express.Router();

// Get user's applications (Candidate only)
router.get('/', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const applications = await Application.find({ candidateId: req.user._id })
      .populate('jobId', 'title company location type salary description requirements')
      .sort({ createdAt: -1 });

    const formattedApplications = applications.map(app => ({
      id: app._id,
      jobTitle: app.jobId.title,
      company: app.jobId.company,
      location: app.jobId.location,
      jobType: app.jobId.type,
      salary: app.jobId.salary,
      description: app.jobId.description,
      requirements: app.jobId.requirements,
      status: app.status,
      score: app.score,
      appliedDate: app.createdAt.toISOString(),
      interviewDate: app.interviewDetails?.scheduledDate
    }));

    res.json(formattedApplications);
  } catch (error) {
    console.error('Applications fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

// Apply for a job (Candidate only)
router.post('/', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const { jobId, coverLetter } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    // Check if job exists and is active
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.status !== 'active') {
      return res.status(400).json({ message: 'Job is not accepting applications' });
    }

    if (new Date() > job.expiryDate) {
      return res.status(400).json({ message: 'Job application deadline has passed' });
    }

    // Check if user already applied
    const existingApplication = await Application.findOne({
      candidateId: req.user._id,
      jobId
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this job' });
    }

    // Get user's resume
    const resume = await Resume.findOne({ userId: req.user._id });
    if (!resume || !resume.isProcessed) {
      return res.status(400).json({ 
        message: 'Please upload and process your resume before applying' 
      });
    }

    // Calculate job match score using AI
    const matchResult = await calculateJobMatch(resume, job);

    // Create application
    const application = new Application({
      candidateId: req.user._id,
      jobId,
      resumeId: resume._id,
      coverLetter,
      score: matchResult.score,
      aiRecommendation: matchResult.recommendation,
      timeline: [{
        status: 'submitted',
        timestamp: new Date()
      }]
    });

    await application.save();

    // Update job applications count
    job.applicationsCount += 1;
    await job.save();

    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: application._id,
      score: application.score,
      recommendation: application.aiRecommendation
    });
  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({ message: 'Failed to submit application', error: error.message });
  }
});

// Get single application (Candidate only)
router.get('/:id', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      candidateId: req.user._id
    }).populate('jobId', 'title company location type salary description requirements');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({
      id: application._id,
      job: {
        id: application.jobId._id,
        title: application.jobId.title,
        company: application.jobId.company,
        location: application.jobId.location,
        type: application.jobId.type,
        salary: application.jobId.salary,
        description: application.jobId.description,
        requirements: application.jobId.requirements
      },
      status: application.status,
      score: application.score,
      aiRecommendation: application.aiRecommendation,
      coverLetter: application.coverLetter,
      appliedDate: application.createdAt,
      timeline: application.timeline,
      interviewDetails: application.interviewDetails,
      notes: application.notes.map(note => ({
        content: note.content,
        createdAt: note.createdAt
      }))
    });
  } catch (error) {
    console.error('Application fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch application' });
  }
});

// Withdraw application (Candidate only)
router.delete('/:id', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      candidateId: req.user._id
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if application can be withdrawn
    if (['interviewed', 'hired'].includes(application.status)) {
      return res.status(400).json({ 
        message: 'Cannot withdraw application at this stage' 
      });
    }

    // Update status instead of deleting
    application.status = 'withdrawn';
    application.timeline.push({
      status: 'withdrawn',
      timestamp: new Date()
    });

    await application.save();

    // Update job applications count
    const job = await Job.findById(application.jobId);
    if (job && job.applicationsCount > 0) {
      job.applicationsCount -= 1;
      await job.save();
    }

    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    console.error('Application withdrawal error:', error);
    res.status(500).json({ message: 'Failed to withdraw application' });
  }
});

// Get all applications (HR only)
router.get('/admin/all', authenticate, authorize('hr'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      jobId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (jobId) {
      query.jobId = jobId;
    }

    // Sorting
    const sortField = sortBy === 'score' ? 'score' : 
                     sortBy === 'status' ? 'status' : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const applications = await Application.find(query)
      .populate('candidateId', 'name email phone location')
      .populate('jobId', 'title company location')
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limitNum);

    const total = await Application.countDocuments(query);

    res.json({
      applications: applications.map(app => ({
        id: app._id,
        candidate: {
          id: app.candidateId._id,
          name: app.candidateId.name,
          email: app.candidateId.email,
          phone: app.candidateId.phone,
          location: app.candidateId.location
        },
        job: {
          id: app.jobId._id,
          title: app.jobId.title,
          company: app.jobId.company,
          location: app.jobId.location
        },
        status: app.status,
        score: app.score,
        aiRecommendation: app.aiRecommendation,
        appliedDate: app.createdAt
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Admin applications fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

export default router;