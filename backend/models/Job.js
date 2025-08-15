import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship'],
    required: true
  },
  salary: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: [String],
  benefits: [String],
  skills: [String],
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive']
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'closed'],
    default: 'active'
  },
  expiryDate: {
    type: Date,
    required: true
  },
  applicationsCount: {
    type: Number,
    default: 0
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isRemote: {
    type: Boolean,
    default: false
  },
  department: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes for search optimization
jobSchema.index({ title: 'text', description: 'text', company: 'text' });
jobSchema.index({ status: 1, expiryDate: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ createdBy: 1 });

export default mongoose.model('Job', jobSchema);