import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

export const sendWelcomeEmail = async (user) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@Hiralyze.com',
      to: user.email,
      subject: 'Welcome to Hiralyze - Your AI-Powered Recruitment Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3B82F6;">Welcome to Hiralyze!</h1>
          <p>Hi ${user.name},</p>
          <p>Thank you for joining Hiralyze, the AI-powered resume screening and recruitment platform.</p>
          
          ${user.role === 'candidate' ? `
            <h2>As a Candidate, you can:</h2>
            <ul>
              <li>Upload your resume for AI analysis</li>
              <li>Browse and apply for jobs</li>
              <li>Track your application status</li>
              <li>Schedule interviews</li>
              <li>Chat with our AI assistant</li>
            </ul>
            <p>Get started by uploading your resume to receive personalized job recommendations!</p>
          ` : `
            <h2>As an HR Professional, you can:</h2>
            <ul>
              <li>Create and manage job postings</li>
              <li>Review AI-scored candidate profiles</li>
              <li>Schedule and manage interviews</li>
              <li>Access detailed analytics</li>
              <li>Use our AI chatbot for assistance</li>
            </ul>
            <p>Start by creating your first job posting to attract top talent!</p>
          `}
          
          <div style="margin: 30px 0; padding: 20px; background-color: #F3F4F6; border-radius: 8px;">
            <h3>Need Help?</h3>
            <p>Our AI assistant is available 24/7 to help you navigate the platform. Just click the chat icon in the bottom right corner!</p>
          </div>
          
          <p>Best regards,<br>The Hiralyze Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', user.email);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
};

export const sendApplicationNotification = async (application, candidate, job) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@Hiralyze.com',
      to: candidate.email,
      subject: `Application Received - ${job.title} at ${job.company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #3B82F6;">Application Received!</h1>
          <p>Hi ${candidate.name},</p>
          <p>We've received your application for the <strong>${job.title}</strong> position at <strong>${job.company}</strong>.</p>
          
          <div style="margin: 20px 0; padding: 20px; background-color: #F0F9FF; border-radius: 8px; border-left: 4px solid #3B82F6;">
            <h3>Application Details:</h3>
            <p><strong>Position:</strong> ${job.title}</p>
            <p><strong>Company:</strong> ${job.company}</p>
            <p><strong>Location:</strong> ${job.location}</p>
            <p><strong>AI Match Score:</strong> ${application.score}%</p>
            <p><strong>Status:</strong> Under Review</p>
          </div>
          
          <p>Our AI has analyzed your profile and given you a match score of <strong>${application.score}%</strong> for this position.</p>
          <p>We'll keep you updated on the status of your application. You can track your progress in your dashboard.</p>
          
          <p>Best of luck!</p>
          <p>The Hiralyze Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Application notification sent to:', candidate.email);
  } catch (error) {
    console.error('Failed to send application notification:', error);
  }
};

export const sendInterviewInvitation = async (interview, candidate, job) => {
  try {
    const transporter = createTransporter();
    
    const interviewDate = new Date(interview.scheduledDate);
    const dateStr = interviewDate.toLocaleDateString();
    const timeStr = interviewDate.toLocaleTimeString();
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@Hiralyze.com',
      to: candidate.email,
      subject: `Interview Invitation - ${job.title} at ${job.company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10B981;">Interview Invitation</h1>
          <p>Hi ${candidate.name},</p>
          <p>Congratulations! You've been selected for an interview for the <strong>${job.title}</strong> position at <strong>${job.company}</strong>.</p>
          
          <div style="margin: 20px 0; padding: 20px; background-color: #F0FDF4; border-radius: 8px; border-left: 4px solid #10B981;">
            <h3>Interview Details:</h3>
            <p><strong>Position:</strong> ${job.title}</p>
            <p><strong>Company:</strong> ${job.company}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${timeStr}</p>
            <p><strong>Duration:</strong> ${interview.duration} minutes</p>
            <p><strong>Type:</strong> ${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)}</p>
            ${interview.location ? `<p><strong>Location:</strong> ${interview.location}</p>` : ''}
            ${interview.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${interview.meetingLink}">${interview.meetingLink}</a></p>` : ''}
          </div>
          
          ${interview.description ? `
            <div style="margin: 20px 0; padding: 15px; background-color: #F9FAFB; border-radius: 8px;">
              <h4>Additional Information:</h4>
              <p>${interview.description}</p>
            </div>
          ` : ''}
          
          <p>Please confirm your attendance by replying to this email or updating your status in the platform.</p>
          <p>If you need to reschedule, please contact us as soon as possible.</p>
          
          <p>We look forward to speaking with you!</p>
          <p>Best regards,<br>The Hiralyze Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Interview invitation sent to:', candidate.email);
  } catch (error) {
    console.error('Failed to send interview invitation:', error);
  }
};

export const sendInterviewReminder = async (interview) => {
  try {
    const transporter = createTransporter();
    
    const interviewDate = new Date(interview.scheduledDate);
    const dateStr = interviewDate.toLocaleDateString();
    const timeStr = interviewDate.toLocaleTimeString();
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@Hiralyze.com',
      to: interview.candidateId.email,
      subject: `Interview Reminder - ${interview.jobId.title} Tomorrow`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #F59E0B;">Interview Reminder</h1>
          <p>Hi ${interview.candidateId.name},</p>
          <p>This is a friendly reminder about your upcoming interview for the <strong>${interview.jobId.title}</strong> position.</p>
          
          <div style="margin: 20px 0; padding: 20px; background-color: #FFFBEB; border-radius: 8px; border-left: 4px solid #F59E0B;">
            <h3>Interview Details:</h3>
            <p><strong>Position:</strong> ${interview.jobId.title}</p>
            <p><strong>Company:</strong> ${interview.jobId.company}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${timeStr}</p>
            <p><strong>Type:</strong> ${interview.type.charAt(0).toUpperCase() + interview.type.slice(1)}</p>
            ${interview.location ? `<p><strong>Location:</strong> ${interview.location}</p>` : ''}
            ${interview.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${interview.meetingLink}">${interview.meetingLink}</a></p>` : ''}
          </div>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #EFF6FF; border-radius: 8px;">
            <h4>Preparation Tips:</h4>
            <ul>
              <li>Review the job description and company information</li>
              <li>Prepare examples of your relevant experience</li>
              <li>Test your technology if it's a video interview</li>
              <li>Prepare thoughtful questions about the role and company</li>
            </ul>
          </div>
          
          <p>If you need to reschedule or have any questions, please contact us immediately.</p>
          
          <p>Good luck with your interview!</p>
          <p>Best regards,<br>The Hiralyze Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Interview reminder sent to:', interview.candidateId.email);
  } catch (error) {
    console.error('Failed to send interview reminder:', error);
  }
};

export const sendStatusUpdateNotification = async (application, candidate, job, newStatus) => {
  try {
    const transporter = createTransporter();
    
    let statusMessage = '';
    let statusColor = '#3B82F6';
    
    switch (newStatus) {
      case 'shortlisted':
        statusMessage = 'Great news! You\'ve been shortlisted for the next round.';
        statusColor = '#10B981';
        break;
      case 'rejected':
        statusMessage = 'Thank you for your interest. Unfortunately, we won\'t be moving forward with your application at this time.';
        statusColor = '#EF4444';
        break;
      case 'interview_scheduled':
        statusMessage = 'Congratulations! An interview has been scheduled for you.';
        statusColor = '#10B981';
        break;
      default:
        statusMessage = `Your application status has been updated to: ${newStatus}`;
    }
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@Hiralyze.com',
      to: candidate.email,
      subject: `Application Update - ${job.title} at ${job.company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${statusColor};">Application Update</h1>
          <p>Hi ${candidate.name},</p>
          <p>We have an update regarding your application for the <strong>${job.title}</strong> position at <strong>${job.company}</strong>.</p>
          
          <div style="margin: 20px 0; padding: 20px; background-color: #F9FAFB; border-radius: 8px; border-left: 4px solid ${statusColor};">
            <h3>Status Update:</h3>
            <p style="font-size: 16px; color: ${statusColor}; font-weight: bold;">${statusMessage}</p>
          </div>
          
          <p>You can view more details and track your application progress in your dashboard.</p>
          
          <p>Thank you for your interest in joining our team.</p>
          <p>Best regards,<br>The Hiralyze Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Status update notification sent to:', candidate.email);
  } catch (error) {
    console.error('Failed to send status update notification:', error);
  }
};