import express from 'express';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Interview from '../models/Interview.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get analytics data (HR only)
router.get('/', authenticate, authorize('hr'), async (req, res) => {
  try {
    const { range = '30' } = req.query;
    const days = parseInt(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Overview metrics
    const totalCandidates = await User.countDocuments({ 
      role: 'candidate', 
      isActive: true,
      createdAt: { $gte: startDate }
    });

    const shortlistedCandidates = await Application.countDocuments({ 
      status: 'shortlisted',
      createdAt: { $gte: startDate }
    });

    const scheduledInterviews = await Interview.countDocuments({ 
      status: { $in: ['scheduled', 'confirmed'] },
      createdAt: { $gte: startDate }
    });

    // Calculate average score
    const scoreAggregation = await Resume.aggregate([
      { 
        $match: { 
          isProcessed: true, 
          aiScore: { $gt: 0 },
          createdAt: { $gte: startDate }
        } 
      },
      { $group: { _id: null, avgScore: { $avg: '$aiScore' } } }
    ]);
    const avgScore = Math.round(scoreAggregation[0]?.avgScore || 0);

    // Calculate growth rate (mock calculation)
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);
    
    const previousCandidates = await User.countDocuments({ 
      role: 'candidate', 
      isActive: true,
      createdAt: { $gte: previousPeriodStart, $lt: startDate }
    });

    const growthRate = previousCandidates > 0 
      ? Math.round(((totalCandidates - previousCandidates) / previousCandidates) * 100)
      : 0;

    // Trends data - applications over time
    const applicationsTrends = await Application.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } }
    ]);

    // Score trends
    const scoresTrends = await Resume.aggregate([
      { 
        $match: { 
          isProcessed: true,
          aiScore: { $gt: 0 },
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          avgScore: { $avg: '$aiScore' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', avgScore: { $round: ['$avgScore', 1] }, _id: 0 } }
    ]);

    // Demographics - experience levels
    const experienceLevel = await Resume.aggregate([
      { $match: { isProcessed: true } },
      { 
        $group: { 
          _id: '$aiAnalysis.experienceLevel', 
          count: { $sum: 1 } 
        } 
      },
      { $project: { level: '$_id', count: 1, _id: 0 } }
    ]);

    // Top locations
    const locations = await User.aggregate([
      { 
        $match: { 
          role: 'candidate', 
          isActive: true,
          location: { $exists: true, $ne: '' }
        } 
      },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { location: '$_id', count: 1, _id: 0 } }
    ]);

    // Top skills
    const skills = await Resume.aggregate([
      { $match: { isProcessed: true } },
      { $unwind: '$parsedData.skills' },
      { $group: { _id: '$parsedData.skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
      { $project: { skill: '$_id', count: 1, _id: 0 } }
    ]);

    // Hiring funnel
    const applied = await Application.countDocuments({ createdAt: { $gte: startDate } });
    const screened = await Application.countDocuments({ 
      status: { $in: ['screening', 'shortlisted', 'interview_scheduled', 'interviewed', 'hired'] },
      createdAt: { $gte: startDate }
    });
    const shortlisted = await Application.countDocuments({ 
      status: { $in: ['shortlisted', 'interview_scheduled', 'interviewed', 'hired'] },
      createdAt: { $gte: startDate }
    });
    const interviewed = await Application.countDocuments({ 
      status: { $in: ['interviewed', 'hired'] },
      createdAt: { $gte: startDate }
    });
    const hired = await Application.countDocuments({ 
      status: 'hired',
      createdAt: { $gte: startDate }
    });

    res.json({
      overview: {
        totalCandidates,
        shortlistedCandidates,
        scheduledInterviews,
        avgScore,
        growthRate
      },
      trends: {
        applications: applicationsTrends,
        scores: scoresTrends
      },
      demographics: {
        experienceLevel: experienceLevel.filter(item => item.level),
        locations,
        skills
      },
      funnel: {
        applied,
        screened,
        shortlisted,
        interviewed,
        hired
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics data' });
  }
});

// Export analytics data (HR only)
router.get('/export', authenticate, authorize('hr'), async (req, res) => {
  try {
    // In a real implementation, you would generate a CSV/Excel file
    // For now, we'll return a simple CSV format
    
    const applications = await Application.find()
      .populate('candidateId', 'name email')
      .populate('jobId', 'title company')
      .lean();

    let csvContent = 'Candidate Name,Email,Job Title,Company,Status,Score,Applied Date\n';
    
    applications.forEach(app => {
      csvContent += `${app.candidateId.name},${app.candidateId.email},${app.jobId.title},${app.jobId.company},${app.status},${app.score || 0},${app.createdAt.toISOString().split('T')[0]}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({ message: 'Failed to export analytics data' });
  }
});

export default router;