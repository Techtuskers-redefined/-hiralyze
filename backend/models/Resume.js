import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  parsedData: {
    personalInfo: {
      name: String,
      email: String,
      phone: String,
      location: String
    },
    summary: String,
    skills: [String],
    experience: [{
      company: String,
      position: String,
      startDate: String,
      endDate: String,
      current: Boolean,
      description: String,
      duration: Number
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      startDate: String,
      endDate: String,
      gpa: String
    }],
    certifications: [{
      name: String,
      issuer: String,
      date: String,
      expiryDate: String
    }],
    languages: [String],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      url: String
    }]
  },
  aiScore: {
    type: Number,
    min: 0,
    max: 100
  },
  aiAnalysis: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    skillsMatch: [{
      skill: String,
      confidence: Number
    }],
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive']
    }
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: String
}, {
  timestamps: true
});

// Index for search optimization
resumeSchema.index({ userId: 1 });
resumeSchema.index({ 'parsedData.skills': 1 });
resumeSchema.index({ aiScore: -1 });

export default mongoose.model('Resume', resumeSchema);