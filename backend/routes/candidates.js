import express from 'express';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import Application from '../models/Application.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all candidates (HR only)
router.get('/', authenticate, authorize('hr'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      skills = '', 
      experienceLevel = '',
      minScore = 0,
      maxScore = 100,
      sortBy = 'score',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline
    const pipeline = [
      // Match candidates only
      { $match: { role: 'candidate', isActive: true } },
      
      // Lookup resume data
      {
        $lookup: {
          from: 'resumes',
          localField: '_id',
          foreignField: 'userId',
          as: 'resume'
        }
      },
      
      // Unwind resume (optional)
      {
        $unwind: {
          path: '$resume',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Lookup applications
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'candidateId',
          as: 'applications'
        }
      },
      
      // Add computed fields
      {
        $addFields: {
          score: { $ifNull: ['$resume.aiScore', 0] },
          skills: { $ifNull: ['$resume.parsedData.skills', []] },
          experienceYears: {
            $reduce: {
              input: { $ifNull: ['$resume.parsedData.experience', []] },
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.duration', 0] }] }
            }
          },
          applicationCount: { $size: '$applications' },
          lastApplicationDate: { $max: '$applications.createdAt' }
        }
      }
    ];

    // Add search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { skills: { $in: [new RegExp(search, 'i')] } }
          ]
        }
      });
    }

    // Add skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      pipeline.push({
        $match: {
          skills: { $in: skillsArray.map(skill => new RegExp(skill, 'i')) }
        }
      });
    }

    // Add experience level filter
    if (experienceLevel) {
      pipeline.push({
        $match: {
          'resume.aiAnalysis.experienceLevel': experienceLevel
        }
      });
    }

    // Add score range filter
    pipeline.push({
      $match: {
        score: { $gte: parseInt(minScore), $lte: parseInt(maxScore) }
      }
    });

    // Add sorting
    const sortField = sortBy === 'name' ? 'name' : 
                     sortBy === 'date' ? 'createdAt' : 'score';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    // Add pagination
    pipeline.push({ $skip: skip }, { $limit: limitNum });

    // Project final fields
    pipeline.push({
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        location: 1,
        score: 1,
        skills: 1,
        experienceYears: 1,
        experienceLevel: '$resume.aiAnalysis.experienceLevel',
        applicationCount: 1,
        lastApplicationDate: 1,
        appliedDate: '$createdAt',
        status: {
          $cond: {
            if: { $gt: ['$applicationCount', 0] },
            then: 'applied',
            else: 'registered'
          }
        },
        jobTitle: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ['$resume.parsedData.experience', []] } }, 0] },
            then: { $arrayElemAt: ['$resume.parsedData.experience.position', 0] },
            else: 'Not specified'
          }
        }
      }
    });

    const candidates = await User.aggregate(pipeline);

    // Get total count for pagination
    const totalPipeline = pipeline.slice(0, -3); // Remove skip, limit, and project
    totalPipeline.push({ $count: 'total' });
    const totalResult = await User.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.json({
      candidates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Candidates fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch candidates' });
  }
});

// Get candidate details (HR only)
router.get('/:id', authenticate, authorize('hr'), async (req, res) => {
  try {
    const candidate = await User.findById(req.params.id).select('-password');
    if (!candidate || candidate.role !== 'candidate') {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const resume = await Resume.findOne({ userId: candidate._id });
    const applications = await Application.find({ candidateId: candidate._id })
      .populate('jobId', 'title company location')
      .sort({ createdAt: -1 });

    res.json({
      candidate: {
        id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        bio: candidate.bio,
        createdAt: candidate.createdAt
      },
      resume: resume ? {
        score: resume.aiScore,
        parsedData: resume.parsedData,
        analysis: resume.aiAnalysis,
        uploadedAt: resume.createdAt
      } : null,
      applications: applications.map(app => ({
        id: app._id,
        jobTitle: app.jobId.title,
        company: app.jobId.company,
        location: app.jobId.location,
        status: app.status,
        score: app.score,
        appliedDate: app.createdAt
      }))
    });
  } catch (error) {
    console.error('Candidate details fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch candidate details' });
  }
});

// Update candidate status (HR only)
router.patch('/:id/status', authenticate, authorize('hr'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['submitted', 'shortlisted', 'rejected', 'interview_scheduled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find the most recent application for this candidate
    const application = await Application.findOne({ candidateId: req.params.id })
      .sort({ createdAt: -1 });

    if (!application) {
      return res.status(404).json({ message: 'No application found for this candidate' });
    }

    application.status = status;
    application.timeline.push({
      status,
      changedBy: req.user._id,
      timestamp: new Date()
    });

    await application.save();

    res.json({
      message: 'Candidate status updated successfully',
      status: application.status
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Failed to update candidate status' });
  }
});

// Add notes to candidate (HR only)
router.post('/:id/notes', authenticate, authorize('hr'), async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const application = await Application.findOne({ candidateId: req.params.id })
      .sort({ createdAt: -1 });

    if (!application) {
      return res.status(404).json({ message: 'No application found for this candidate' });
    }

    application.notes.push({
      author: req.user._id,
      content: content.trim(),
      createdAt: new Date()
    });

    await application.save();

    res.json({
      message: 'Note added successfully',
      note: application.notes[application.notes.length - 1]
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: 'Failed to add note' });
  }
});

export default router;