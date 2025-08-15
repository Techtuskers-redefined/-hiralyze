import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
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
  interviewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    default: 60 // minutes
  },
  type: {
    type: String,
    enum: ['phone', 'video', 'in-person', 'technical', 'panel', 'final'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
    default: 'scheduled'
  },
  location: String,
  meetingLink: String,
  meetingId: String,
  description: String,
  preparation: {
    materials: [String],
    instructions: String,
    techRequirements: String
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 10
    },
    technicalSkills: {
      type: Number,
      min: 1,
      max: 10
    },
    communication: {
      type: Number,
      min: 1,
      max: 10
    },
    problemSolving: {
      type: Number,
      min: 1,
      max: 10
    },
    culturalFit: {
      type: Number,
      min: 1,
      max: 10
    },
    comments: String,
    strengths: [String],
    concerns: [String],
    recommendation: {
      type: String,
      enum: ['hire', 'maybe', 'no_hire']
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submittedAt: Date
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'notification']
    },
    sentAt: Date,
    recipient: {
      type: String,
      enum: ['candidate', 'interviewer', 'both']
    }
  }],
  notes: String,
  round: {
    type: Number,
    default: 1
  },
  isRescheduleRequested: {
    type: Boolean,
    default: false
  },
  rescheduleReason: String,
  originalDate: Date
}, {
  timestamps: true
});

// Indexes
interviewSchema.index({ scheduledDate: 1 });
interviewSchema.index({ candidateId: 1, scheduledDate: 1 });
interviewSchema.index({ interviewers: 1, scheduledDate: 1 });
interviewSchema.index({ status: 1 });

export default mongoose.model('Interview', interviewSchema);