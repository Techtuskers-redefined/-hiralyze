import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload,
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Star,
  Award
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ResumeUpload from '../components/ResumeUpload';

interface DashboardStats {
  applications: number;
  interviews: number;
  shortlisted: number;
  score: number;
}

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  status: 'submitted' | 'shortlisted' | 'rejected' | 'interview_scheduled';
  appliedDate: string;
  score?: number;
}

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    applications: 0,
    interviews: 0,
    shortlisted: 0,
    score: 0
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, applicationsResponse, resumeResponse] = await Promise.all([
        axios.get('/dashboard/candidate-stats'),
        axios.get('/applications'),
        axios.get('/resume/check')
      ]);

      setStats(statsResponse.data);
      setApplications(applicationsResponse.data);
      setHasResume(resumeResponse.data.hasResume);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'shortlisted':
        return <Star className="w-4 h-4 text-blue-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'interview_scheduled':
        return <Calendar className="w-4 h-4 text-green-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'shortlisted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'interview_scheduled':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleResumeUpload = () => {
    setHasResume(true);
    setShowResumeUpload(false);
    fetchDashboardData(); // Refresh data after upload
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-2 text-gray-600">
            Track your applications and manage your job search journey
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.applications}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Interviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.interviews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Shortlisted</p>
                <p className="text-2xl font-bold text-gray-900">{stats.shortlisted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">AI Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.score}%</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Resume Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Resume Status</h2>
                {hasResume ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Upload className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {hasResume ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Resume uploaded and analyzed</span>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700">
                      Your resume has been processed by our AI system. You can now apply for jobs
                      and receive personalized recommendations.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowResumeUpload(true)}
                    className="w-full px-4 py-2 text-sm text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors duration-200"
                  >
                    Update Resume
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Upload Your Resume
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Get started by uploading your resume. Our AI will analyze it and help you
                      find the perfect opportunities.
                    </p>
                    <button
                      onClick={() => setShowResumeUpload(true)}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-200"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Resume
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Applications */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
              </div>
              <div className="p-6">
                {applications.length > 0 ? (
                  <div className="space-y-4">
                    {applications.slice(0, 5).map((application) => (
                      <motion.div
                        key={application.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {application.company.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{application.jobTitle}</h3>
                            <p className="text-sm text-gray-600">{application.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(application.status)}
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
                                {application.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(application.appliedDate).toLocaleDateString()}
                            </p>
                          </div>
                          {application.score && (
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{application.score}%</p>
                              <p className="text-xs text-gray-500">Match</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {applications.length > 5 && (
                      <div className="text-center pt-4">
                        <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                          View all applications →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No applications yet
                    </h3>
                    <p className="text-sm text-gray-600">
                      Start applying to jobs to see your application status here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Resume Upload Modal */}
        {showResumeUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Upload Resume</h2>
                <button
                  onClick={() => setShowResumeUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <ResumeUpload onUploadComplete={handleResumeUpload} />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}