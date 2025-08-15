import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  status: {
    type: String,
    enum: ['submitted', 'screening', 'shortlisted', 'interview_scheduled', 'interviewed', 'rejected', 'hired'],
    default: 'submitted'
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  aiRecommendation: {
    type: String,
    enum: ['highly_recommended', 'recommended', 'maybe', 'not_recommended']
  },
  coverLetter: String,
  notes: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  timeline: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  interviewDetails: {
    scheduledDate: Date,
    interviewType: {
      type: String,
      enum: ['phone', 'video', 'in-person', 'technical', 'panel']
    },
    interviewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    location: String,
    meetingLink: String,
    feedback: {
      rating: Number,
      comments: String,
      strengths: [String],
      concerns: [String]
    }
  },
  rejectionReason: String,
  source: {
    type: String,
    default: 'direct_application'
  }
}, {
  timestamps: true
});

// Compound indexes
applicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ jobId: 1, status: 1 });
applicationSchema.index({ candidateId: 1, status: 1 });
applicationSchema.index({ score: -1 });

export default mongoose.model('Application', applicationSchema);