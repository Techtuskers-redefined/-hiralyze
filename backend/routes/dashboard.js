import express from 'express';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Interview from '../models/Interview.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get candidate dashboard stats
router.get('/candidate-stats', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const userId = req.user._id;

    // Get applications count
    const applications = await Application.countDocuments({ candidateId: userId });

    // Get interviews count
    const interviews = await Interview.countDocuments({ 
      candidateId: userId,
      status: { $in: ['scheduled', 'confirmed', 'completed'] }
    });

    // Get shortlisted count
    const shortlisted = await Application.countDocuments({ 
      candidateId: userId,
      status: 'shortlisted'
    });

    // Get AI score from resume
    const resume = await Resume.findOne({ userId });
    const score = resume?.aiScore || 0;

    res.json({
      applications,
      interviews,
      shortlisted,
      score
    });
  } catch (error) {
    console.error('Candidate stats error:', error);
    res.status(500).json({ message: 'Failed to fetch candidate statistics' });
  }
});

// Get HR dashboard stats
router.get('/hr-stats', authenticate, authorize('hr'), async (req, res) => {
  try {
    // Get total candidates
    const totalCandidates = await User.countDocuments({ role: 'candidate', isActive: true });

    // Get shortlisted candidates
    const shortlistedCandidates = await Application.countDocuments({ status: 'shortlisted' });

    // Get scheduled interviews
    const scheduledInterviews = await Interview.countDocuments({ 
      status: { $in: ['scheduled', 'confirmed'] }
    });

    // Calculate average score
    const scoreAggregation = await Resume.aggregate([
      { $match: { isProcessed: true, aiScore: { $gt: 0 } } },
      { $group: { _id: null, avgScore: { $avg: '$aiScore' } } }
    ]);
    const avgScore = Math.round(scoreAggregation[0]?.avgScore || 0);

    res.json({
      totalCandidates,
      shortlistedCandidates,
      scheduledInterviews,
      avgScore
    });
  } catch (error) {
    console.error('HR stats error:', error);
    res.status(500).json({ message: 'Failed to fetch HR statistics' });
  }
});

// Get chart data for HR dashboard
router.get('/chart-data', authenticate, authorize('hr'), async (req, res) => {
  try {
    // Skills distribution
    const skillsAggregation = await Resume.aggregate([
      { $match: { isProcessed: true } },
      { $unwind: '$parsedData.skills' },
      { $group: { _id: '$parsedData.skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
      { $project: { skill: '$_id', count: 1, _id: 0 } }
    ]);

    // Status distribution
    const statusAggregation = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);

    // Score ranges
    const scoreRanges = await Resume.aggregate([
      { $match: { isProcessed: true, aiScore: { $gt: 0 } } },
      {
        $bucket: {
          groupBy: '$aiScore',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'Other',
          output: { count: { $sum: 1 } }
        }
      },
      {
        $project: {
          range: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 0] }, then: '0-20' },
                { case: { $eq: ['$_id', 20] }, then: '20-40' },
                { case: { $eq: ['$_id', 40] }, then: '40-60' },
                { case: { $eq: ['$_id', 60] }, then: '60-80' },
                { case: { $eq: ['$_id', 80] }, then: '80-100' }
              ],
              default: 'Other'
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      skillsDistribution: skillsAggregation,
      statusDistribution: statusAggregation,
      scoreRanges
    });
  } catch (error) {
    console.error('Chart data error:', error);
    res.status(500).json({ message: 'Failed to fetch chart data' });
  }
});

export default router;