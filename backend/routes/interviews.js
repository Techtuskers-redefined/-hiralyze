import express from 'express';
import Interview from '../models/Interview.js';
import Application from '../models/Application.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendInterviewReminder } from '../services/emailService.js';

const router = express.Router();

// Get all interviews (HR only)
router.get('/', authenticate, authorize('hr'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      date = '',
      type = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.scheduledDate = { $gte: startDate, $lt: endDate };
    }
    
    if (type) {
      query.type = type;
    }

    const interviews = await Interview.find(query)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title company')
      .populate('interviewers', 'name email')
      .sort({ scheduledDate: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Interview.countDocuments(query);

    const formattedInterviews = interviews.map(interview => ({
      id: interview._id,
      candidateName: interview.candidateId.name,
      candidateEmail: interview.candidateId.email,
      jobTitle: interview.jobId.title,
      company: interview.jobId.company,
      date: interview.scheduledDate.toISOString().split('T')[0],
      time: interview.scheduledDate.toTimeString().slice(0, 5),
      duration: interview.duration,
      type: interview.type,
      status: interview.status,
      location: interview.location,
      meetingLink: interview.meetingLink,
      interviewers: interview.interviewers.map(i => i.name),
      notes: interview.notes
    }));

    res.json({
      interviews: formattedInterviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Interviews fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch interviews' });
  }
});

// Schedule interview (HR only)
router.post('/', authenticate, authorize('hr'), async (req, res) => {
  try {
    const {
      applicationId,
      scheduledDate,
      duration = 60,
      type,
      location,
      meetingLink,
      description,
      interviewers = []
    } = req.body;

    // Validate required fields
    if (!applicationId || !scheduledDate || !type) {
      return res.status(400).json({ 
        message: 'Application ID, scheduled date, and type are required' 
      });
    }

    // Get application details
    const application = await Application.findById(applicationId)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title company');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if interview already exists for this application
    const existingInterview = await Interview.findOne({ applicationId });
    if (existingInterview) {
      return res.status(400).json({ 
        message: 'Interview already scheduled for this application' 
      });
    }

    // Create interview
    const interview = new Interview({
      applicationId,
      candidateId: application.candidateId._id,
      jobId: application.jobId._id,
      interviewers: interviewers.length > 0 ? interviewers : [req.user._id],
      scheduledDate: new Date(scheduledDate),
      duration,
      type,
      location,
      meetingLink,
      description
    });

    await interview.save();

    // Update application status
    application.status = 'interview_scheduled';
    application.interviewDetails = {
      scheduledDate: interview.scheduledDate,
      interviewType: interview.type,
      interviewers: interview.interviewers,
      location: interview.location,
      meetingLink: interview.meetingLink
    };
    application.timeline.push({
      status: 'interview_scheduled',
      changedBy: req.user._id,
      timestamp: new Date()
    });

    await application.save();

    // Send email notification (in a real app)
    // await sendInterviewNotification(interview);

    res.status(201).json({
      message: 'Interview scheduled successfully',
      interview: {
        id: interview._id,
        candidateName: application.candidateId.name,
        jobTitle: application.jobId.title,
        scheduledDate: interview.scheduledDate,
        type: interview.type,
        status: interview.status
      }
    });
  } catch (error) {
    console.error('Interview scheduling error:', error);
    res.status(500).json({ message: 'Failed to schedule interview', error: error.message });
  }
});

// Update interview status (HR only)
router.patch('/:id/status', authenticate, authorize('hr'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    interview.status = status;
    await interview.save();

    // Update application status if needed
    if (status === 'completed') {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: 'interviewed'
      });
    } else if (status === 'cancelled') {
      await Application.findByIdAndUpdate(interview.applicationId, {
        status: 'shortlisted'
      });
    }

    res.json({
      message: 'Interview status updated successfully',
      status: interview.status
    });
  } catch (error) {
    console.error('Interview status update error:', error);
    res.status(500).json({ message: 'Failed to update interview status' });
  }
});

// Add interview feedback (HR only)
router.post('/:id/feedback', authenticate, authorize('hr'), async (req, res) => {
  try {
    const {
      rating,
      technicalSkills,
      communication,
      problemSolving,
      culturalFit,
      comments,
      strengths = [],
      concerns = [],
      recommendation
    } = req.body;

    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    interview.feedback = {
      rating,
      technicalSkills,
      communication,
      problemSolving,
      culturalFit,
      comments,
      strengths,
      concerns,
      recommendation,
      submittedBy: req.user._id,
      submittedAt: new Date()
    };

    // Update status to completed if not already
    if (interview.status !== 'completed') {
      interview.status = 'completed';
    }

    await interview.save();

    // Update application with feedback
    const application = await Application.findById(interview.applicationId);
    if (application) {
      application.interviewDetails.feedback = interview.feedback;
      
      // Update application status based on recommendation
      if (recommendation === 'hire') {
        application.status = 'hired';
      } else if (recommendation === 'no_hire') {
        application.status = 'rejected';
        application.rejectionReason = 'Did not meet interview requirements';
      }
      
      await application.save();
    }

    res.json({
      message: 'Interview feedback submitted successfully',
      feedback: interview.feedback
    });
  } catch (error) {
    console.error('Interview feedback error:', error);
    res.status(500).json({ message: 'Failed to submit interview feedback' });
  }
});

// Send interview reminder (HR only)
router.post('/:id/reminder', authenticate, authorize('hr'), async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title company');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Send reminder email (mock implementation)
    await sendInterviewReminder(interview);

    // Log reminder
    interview.reminders.push({
      type: 'email',
      sentAt: new Date(),
      recipient: 'candidate'
    });

    await interview.save();

    res.json({ message: 'Interview reminder sent successfully' });
  } catch (error) {
    console.error('Interview reminder error:', error);
    res.status(500).json({ message: 'Failed to send interview reminder' });
  }
});

// Delete/Cancel interview (HR only)
router.delete('/:id', authenticate, authorize('hr'), async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Update application status
    await Application.findByIdAndUpdate(interview.applicationId, {
      status: 'shortlisted',
      $unset: { interviewDetails: 1 }
    });

    // Delete interview
    await Interview.findByIdAndDelete(req.params.id);

    res.json({ message: 'Interview cancelled successfully' });
  } catch (error) {
    console.error('Interview deletion error:', error);
    res.status(500).json({ message: 'Failed to cancel interview' });
  }
});

// Get candidate's interviews (Candidate only)
router.get('/my-interviews', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const interviews = await Interview.find({ candidateId: req.user._id })
      .populate('jobId', 'title company location')
      .populate('interviewers', 'name email')
      .sort({ scheduledDate: 1 });

    const formattedInterviews = interviews.map(interview => ({
      id: interview._id,
      jobTitle: interview.jobId.title,
      company: interview.jobId.company,
      date: interview.scheduledDate.toISOString().split('T')[0],
      time: interview.scheduledDate.toTimeString().slice(0, 5),
      duration: interview.duration,
      type: interview.type,
      status: interview.status,
      location: interview.location,
      meetingLink: interview.meetingLink,
      description: interview.description,
      interviewers: interview.interviewers.map(i => ({
        name: i.name,
        email: i.email
      }))
    }));

    res.json(formattedInterviews);
  } catch (error) {
    console.error('Candidate interviews fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch interviews' });
  }
});

export default router;