# Resume Screening Platform

A comprehensive, AI-powered resume screening and recruitment platform built with MERN stack (MongoDB, Express.js, React, Node.js) and Python AI/ML services using GROQ + GEMINI APIs.

## 🚀 Features

### For Candidates
- **Resume Upload & AI Analysis**: Upload resumes in PDF, DOC, DOCX, or image formats for AI-powered parsing and scoring
- **Job Search & Applications**: Browse jobs with AI match scores and apply with one click
- **Application Tracking**: Monitor application status and interview schedules
- **AI Chatbot**: Get assistance with applications, interviews, and platform navigation
- **Profile Management**: Maintain detailed professional profiles with skills, experience, and education

### For HR/Recruiters
- **Candidate Management**: View AI-scored candidate profiles with detailed analysis
- **Job Posting Management**: Create, edit, and manage job listings
- **Interview Scheduling**: Schedule interviews with calendar integration and automated reminders
- **Analytics Dashboard**: Comprehensive recruitment metrics and insights
- **AI-Powered Screening**: Automated candidate screening and ranking
- **Bulk Operations**: Efficiently manage multiple candidates and applications

### AI-Powered Features
- **Resume Parsing**: Extract structured data from resumes using GROQ + GEMINI
- **Intelligent Scoring**: AI-based candidate scoring and job matching
- **Semantic Analysis**: Advanced NLP for skill matching and candidate assessment
- **Chatbot Assistant**: Context-aware conversational AI for user support
- **Interview Questions**: AI-generated interview questions based on job requirements

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Chart.js** for data visualization
- **React Router** for navigation
- **Axios** for API communication

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Bcrypt** for password hashing
- **Multer** for file uploads
- **Nodemailer** for email notifications

### AI/ML Service
- **Python FastAPI** for AI service
- **GROQ API** for natural language processing
- **GEMINI API** for advanced AI capabilities
- **spaCy** for NLP tasks
- **scikit-learn** for machine learning
- **PyPDF2** for PDF processing

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- MongoDB (v5.0 or higher)
- GROQ API key
- GEMINI API key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd resume-screening-platform
```

### 2. Frontend Setup
```bash
# Install frontend dependencies
npm install

# Start development server
npm run dev
```

### 3. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# Add MongoDB URI, JWT secret, email credentials, etc.

# Start backend server
npm run dev
```

### 4. AI Service Setup
```bash
# Navigate to AI service directory
cd ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Create environment file
cp .env.example .env

# Edit .env with your GROQ and GEMINI API keys

# Start AI service
python app.py
```

### 5. Database Setup
```bash
# Make sure MongoDB is running
# The application will create collections automatically
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/resume-screening
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### AI Service (.env)
```env
PORT=8000
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_AI_SERVICE_URL=http://localhost:8000
```

## 🚀 Usage

### Starting the Application
1. Start MongoDB service
2. Start the backend server: `cd backend && npm run dev`
3. Start the AI service: `cd ai-service && python app.py`
4. Start the frontend: `npm run dev`

### Demo Accounts
- **Candidate**: candidate@demo.com / demo123
- **HR**: hr@demo.com / demo123

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Resume Endpoints
- `POST /api/resume/upload` - Upload resume file
- `POST /api/resume/process` - Process resume with AI
- `GET /api/resume/check` - Check resume status
- `GET /api/resume` - Get resume details

### Job Endpoints
- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create job (HR only)
- `PUT /api/jobs/:id` - Update job (HR only)
- `DELETE /api/jobs/:id` - Delete job (HR only)

### Application Endpoints
- `GET /api/applications` - Get user applications
- `POST /api/applications` - Apply for job
- `GET /api/applications/:id` - Get application details

### AI Service Endpoints
- `POST /process-resume` - Process resume with AI
- `POST /chat` - Chat with AI assistant
- `POST /match-job` - Calculate job match score

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface with vibrant colors
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Framer Motion animations for enhanced user experience
- **Interactive Charts**: Real-time data visualization with Chart.js
- **Dark Mode Support**: Toggle between light and dark themes
- **Accessibility**: WCAG compliant with keyboard navigation support

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for secure password storage
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation with Joi
- **CORS Protection**: Configured CORS for secure cross-origin requests
- **Helmet.js**: Security headers for Express.js

## 📈 Performance Optimizations

- **Code Splitting**: React lazy loading for optimal bundle sizes
- **Image Optimization**: Optimized image loading and caching
- **Database Indexing**: MongoDB indexes for fast queries
- **Caching**: Redis caching for frequently accessed data
- **Compression**: Gzip compression for API responses

## 🧪 Testing

### Frontend Testing
```bash
npm run test
```

### Backend Testing
```bash
cd backend
npm run test
```

### AI Service Testing
```bash
cd ai-service
python -m pytest
```

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing Guidelines](./docs/contributing.md)
- [Architecture Overview](./docs/architecture.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@Hiralyze.com
- Documentation: [docs.Hiralyze.com](https://docs.Hiralyze.com)

## 🙏 Acknowledgments

- GROQ for advanced NLP capabilities
- GEMINI for AI-powered insights
- React community for excellent tooling
- MongoDB for flexible data storage
- All contributors and testers

---

**Built with ❤️ by the Hiralyze Team**