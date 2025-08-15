import express from 'express';
import multer from 'multer';
import Resume from '../models/Resume.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { processResumeWithAI } from '../services/aiService.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and image files are allowed.'));
    }
  }
});

// Upload resume
router.post('/upload', authenticate, authorize('candidate'), upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // In a real implementation, you would save the file to cloud storage (AWS S3, etc.)
    // For now, we'll simulate a file URL
    const fileUrl = `${req.user._id}-${Date.now()}-${Math.floor(Math.random() * 10000)}-${req.file.originalname}`;

    // Check if user already has a resume
    let resume = await Resume.findOne({ userId: req.user._id });
    
    if (resume) {
      // Update existing resume
      resume.fileName = req.file.originalname;
      resume.fileUrl = fileUrl;
      resume.fileSize = req.file.size;
      resume.mimeType = req.file.mimetype;
      resume.isProcessed = false;
      resume.processingStatus = 'pending';
      resume.parsedData = {};
      resume.aiScore = 0;
      resume.aiAnalysis = {};
    } else {
      // Create new resume record
      resume = new Resume({
        userId: req.user._id,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
    }

    await resume.save();

    res.json({
      message: 'Resume uploaded successfully',
      resumeId: resume._id,
      fileUrl: resume.fileUrl
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ message: 'Failed to upload resume', error: error.message });
  }
});

// Process resume with AI
router.post('/process', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const { fileUrl, fileName } = req.body;

    const resume = await Resume.findOne({ userId: req.user._id });
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    resume.processingStatus = 'processing';
    await resume.save();

    try {
      // Process resume with AI service
      const aiResult = await processResumeWithAI(fileUrl, fileName);
      
      resume.parsedData = aiResult.parsedData;
      resume.aiScore = aiResult.score;
      resume.aiAnalysis = aiResult.analysis;
      resume.isProcessed = true;
      resume.processingStatus = 'completed';
      
      await resume.save();

      res.json({
        message: 'Resume processed successfully',
        score: resume.aiScore,
        parsedData: resume.parsedData,
        analysis: resume.aiAnalysis
      });
    } catch (aiError) {
      console.error('AI processing error:', aiError);
      resume.processingStatus = 'failed';
      resume.processingError = aiError.message;
      await resume.save();
      
      res.status(500).json({ message: 'Failed to process resume with AI' });
    }
  } catch (error) {
    console.error('Resume processing error:', error);
    res.status(500).json({ message: 'Failed to process resume' });
  }
});

// Check if user has resume
router.get('/check', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user._id });
    
    res.json({
      hasResume: !!resume,
      isProcessed: resume?.isProcessed || false,
      processingStatus: resume?.processingStatus || 'none',
      score: resume?.aiScore || 0
    });
  } catch (error) {
    console.error('Resume check error:', error);
    res.status(500).json({ message: 'Failed to check resume status' });
  }
});

// Get resume details
router.get('/', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user._id });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json({
      id: resume._id,
      fileName: resume.fileName,
      fileUrl: resume.fileUrl,
      fileSize: resume.fileSize,
      isProcessed: resume.isProcessed,
      processingStatus: resume.processingStatus,
      score: resume.aiScore,
      parsedData: resume.parsedData,
      analysis: resume.aiAnalysis,
      uploadedAt: resume.createdAt
    });
  } catch (error) {
    console.error('Resume fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch resume' });
  }
});

// Delete resume
router.delete('/', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({ userId: req.user._id });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // In a real implementation, you would also delete the file from storage
    
    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Resume deletion error:', error);
    res.status(500).json({ message: 'Failed to delete resume' });
  }
});

export default router;