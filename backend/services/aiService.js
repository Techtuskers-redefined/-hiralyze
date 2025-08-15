import axios from 'axios';

// Mock AI service using GROQ + GEMINI APIs
// In a real implementation, you would integrate with actual GROQ and GEMINI APIs

export const processResumeWithAI = async (fileUrl, fileName) => {
  try {
    // Mock AI processing - in reality, you would:
    // 1. Extract text from PDF/DOC using libraries like pdf-parse or mammoth
    // 2. Send to GROQ API for NLP processing
    // 3. Use GEMINI for semantic analysis and scoring
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock parsed data
    const mockParsedData = {
      personalInfo: {
        name: "John Doe",
        email: "john.doe@email.com",
        phone: "+1-555-0123",
        location: "San Francisco, CA"
      },
      summary: "Experienced software engineer with 5+ years in full-stack development, specializing in React, Node.js, and cloud technologies.",
      skills: [
        "JavaScript", "React", "Node.js", "Python", "AWS", "Docker", 
        "MongoDB", "PostgreSQL", "Git", "Agile", "REST APIs", "GraphQL"
      ],
      experience: [
        {
          company: "Tech Corp",
          position: "Senior Software Engineer",
          startDate: "2021-01",
          endDate: "2024-01",
          current: false,
          description: "Led development of microservices architecture, improved system performance by 40%",
          duration: 3
        },
        {
          company: "StartupXYZ",
          position: "Full Stack Developer",
          startDate: "2019-06",
          endDate: "2021-01",
          current: false,
          description: "Built responsive web applications using React and Node.js",
          duration: 1.5
        }
      ],
      education: [
        {
          institution: "University of California",
          degree: "Bachelor of Science",
          field: "Computer Science",
          startDate: "2015-09",
          endDate: "2019-05",
          gpa: "3.8"
        }
      ],
      certifications: [
        {
          name: "AWS Certified Solutions Architect",
          issuer: "Amazon Web Services",
          date: "2022-03",
          expiryDate: "2025-03"
        }
      ],
      languages: ["English", "Spanish"],
      projects: [
        {
          name: "E-commerce Platform",
          description: "Built scalable e-commerce platform using MERN stack",
          technologies: ["React", "Node.js", "MongoDB", "Stripe"],
          url: "https://github.com/rounakkraaj-1744/hiralyze"
        }
      ]
    };

    // Mock AI analysis
    const mockAnalysis = {
      strengths: [
        "Strong technical skills in modern web technologies",
        "Proven track record of improving system performance",
        "Leadership experience in software development",
        "Relevant certifications in cloud technologies"
      ],
      weaknesses: [
        "Limited experience with mobile development",
        "Could benefit from more DevOps experience",
        "No mention of testing frameworks"
      ],
      recommendations: [
        "Consider adding mobile development skills",
        "Highlight specific achievements with metrics",
        "Include experience with testing frameworks",
        "Add more details about leadership responsibilities"
      ],
      skillsMatch: [
        { skill: "JavaScript", confidence: 0.95 },
        { skill: "React", confidence: 0.90 },
        { skill: "Node.js", confidence: 0.88 },
        { skill: "AWS", confidence: 0.85 },
        { skill: "Python", confidence: 0.75 }
      ],
      experienceLevel: "senior"
    };

    // Calculate AI score based on various factors
    const score = calculateResumeScore(mockParsedData, mockAnalysis);

    return {
      parsedData: mockParsedData,
      analysis: mockAnalysis,
      score
    };
  } catch (error) {
    console.error('AI processing error:', error);
    throw new Error('Failed to process resume with AI');
  }
};

export const calculateJobMatch = async (resume, job) => {
  try {
    // Mock job matching algorithm
    // In reality, you would use GROQ + GEMINI for semantic similarity
    
    const resumeSkills = resume.parsedData.skills || [];
    const jobRequirements = job.requirements || [];
    
    // Simple skill matching
    let matchingSkills = 0;
    let totalJobSkills = jobRequirements.length;
    
    jobRequirements.forEach(requirement => {
      const matches = resumeSkills.some(skill => 
        skill.toLowerCase().includes(requirement.toLowerCase()) ||
        requirement.toLowerCase().includes(skill.toLowerCase())
      );
      if (matches) matchingSkills++;
    });

    // Calculate base score
    let score = totalJobSkills > 0 ? (matchingSkills / totalJobSkills) * 100 : 50;
    
    // Adjust based on experience level
    const experienceBonus = getExperienceBonus(resume.aiAnalysis.experienceLevel, job.experienceLevel);
    score = Math.min(100, score + experienceBonus);
    
    // Determine recommendation
    let recommendation;
    if (score >= 80) recommendation = 'highly_recommended';
    else if (score >= 60) recommendation = 'recommended';
    else if (score >= 40) recommendation = 'maybe';
    else recommendation = 'not_recommended';

    return {
      score: Math.round(score),
      recommendation,
      matchingSkills,
      totalSkills: totalJobSkills
    };
  } catch (error) {
    console.error('Job matching error:', error);
    return {
      score: 50,
      recommendation: 'maybe',
      matchingSkills: 0,
      totalSkills: 0
    };
  }
};

export const processWithGroqGemini = async ({ message, conversationHistory, userRole, context }) => {
  try {
    // Mock chatbot response using GROQ + GEMINI
    // In reality, you would integrate with actual APIs
    
    const lowerMessage = message.toLowerCase();
    let response = '';
    let intent = 'general';
    let confidence = 0.8;
    let updatedContext = {};

    // Intent detection
    if (lowerMessage.includes('application') || lowerMessage.includes('apply')) {
      intent = 'application_inquiry';
      if (userRole === 'candidate') {
        response = "I can help you with your job applications! You can view your application status in the Applications section of your dashboard. Would you like me to guide you through the application process for a specific job?";
      } else {
        response = "I can help you manage candidate applications. You can view all applications in the HR dashboard, filter by status, and update candidate progress. What specific information do you need?";
      }
    } else if (lowerMessage.includes('interview') || lowerMessage.includes('schedule')) {
      intent = 'interview_inquiry';
      if (userRole === 'candidate') {
        response = "I can help you with interview-related questions! You can view your scheduled interviews in your dashboard. If you need to reschedule or have questions about the interview process, I can guide you through the options.";
      } else {
        response = "I can help you manage interviews! You can schedule new interviews, send reminders to candidates, and track interview feedback in the Interview Scheduling section. What would you like to do?";
      }
    } else if (lowerMessage.includes('resume') || lowerMessage.includes('cv')) {
      intent = 'resume_inquiry';
      if (userRole === 'candidate') {
        response = "I can help you with your resume! You can upload your resume in the dashboard, and our AI will analyze it to provide a match score for jobs. Make sure to upload a PDF, DOC, or DOCX file for best results.";
      } else {
        response = "I can help you review candidate resumes! You can view parsed resume data, AI scores, and detailed analysis for each candidate in the candidate management section.";
      }
    } else if (lowerMessage.includes('job') || lowerMessage.includes('position')) {
      intent = 'job_inquiry';
      if (userRole === 'candidate') {
        response = "I can help you find jobs! Browse available positions, filter by location and type, and apply directly through the platform. Our AI will show you match scores to help you find the best opportunities.";
      } else {
        response = "I can help you manage job postings! You can create new job listings, edit existing ones, and track applications. Would you like help with creating a new job posting or managing existing ones?";
      }
    } else if (lowerMessage.includes('score') || lowerMessage.includes('rating')) {
      intent = 'score_inquiry';
      response = "Our AI scoring system evaluates candidates based on skills match, experience level, education, and other factors. Scores range from 0-100, with higher scores indicating better matches for specific positions.";
    } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      intent = 'help_request';
      if (userRole === 'candidate') {
        response = "I'm here to help! As a candidate, you can:\n• Upload and manage your resume\n• Browse and apply for jobs\n• Track your application status\n• View scheduled interviews\n• Update your profile\n\nWhat specific area would you like help with?";
      } else {
        response = "I'm here to help! As an HR user, you can:\n• Manage candidate applications\n• Schedule and track interviews\n• Create and manage job postings\n• View analytics and reports\n• Review candidate profiles and resumes\n\nWhat would you like assistance with?";
      }
    } else {
      intent = 'general';
      response = "I'm your AI assistant for the resume screening platform. I can help you with applications, interviews, job postings, and more. What would you like to know?";
    }

    // Update context based on intent
    if (intent !== 'general') {
      updatedContext = { lastIntent: intent, lastTopic: intent.split('_')[0] };
    }

    return {
      response,
      intent,
      confidence,
      entities: [],
      updatedContext
    };
  } catch (error) {
    console.error('GROQ/GEMINI processing error:', error);
    return {
      response: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
      intent: 'error',
      confidence: 0,
      entities: [],
      updatedContext: {}
    };
  }
};

// Helper functions
const calculateResumeScore = (parsedData, analysis) => {
  let score = 0;
  
  // Skills (30%)
  const skillsCount = parsedData.skills?.length || 0;
  score += Math.min(30, skillsCount * 2);
  
  // Experience (40%)
  const totalExperience = parsedData.experience?.reduce((total, exp) => total + (exp.duration || 0), 0) || 0;
  score += Math.min(40, totalExperience * 8);
  
  // Education (20%)
  if (parsedData.education?.length > 0) {
    score += 20;
  }
  
  // Certifications (10%)
  const certificationsCount = parsedData.certifications?.length || 0;
  score += Math.min(10, certificationsCount * 5);
  
  return Math.min(100, Math.round(score));
};

const getExperienceBonus = (resumeLevel, jobLevel) => {
  const levels = { entry: 1, mid: 2, senior: 3, executive: 4 };
  const resumeLevelNum = levels[resumeLevel] || 2;
  const jobLevelNum = levels[jobLevel] || 2;
  
  if (resumeLevelNum === jobLevelNum) return 10;
  if (Math.abs(resumeLevelNum - jobLevelNum) === 1) return 5;
  return 0;
};