import mongoose from 'mongoose';

const chatLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      intent: String,
      confidence: Number,
      entities: [mongoose.Schema.Types.Mixed]
    }
  }],
  context: {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    currentTopic: String,
    userPreferences: mongoose.Schema.Types.Mixed
  },
  isActive: {
    type: Boolean,
    default: true
  },
  endedAt: Date,
  satisfaction: {
    rating: Number,
    feedback: String
  }
}, {
  timestamps: true
});

// Indexes
chatLogSchema.index({ userId: 1, sessionId: 1 });
chatLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('ChatLog', chatLogSchema);