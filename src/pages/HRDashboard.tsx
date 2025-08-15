import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Star, 
  Calendar,
  Award,
  Search,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DashboardStats {
  totalCandidates: number;
  shortlistedCandidates: number;
  scheduledInterviews: number;
  avgScore: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  score: number;
  status: 'submitted' | 'shortlisted' | 'rejected' | 'interview_scheduled';
  appliedDate: string;
  skills: string[];
  experience: number;
  jobTitle: string;
}

interface ChartData {
  skillsDistribution: { skill: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  scoreRanges: { range: string; count: number }[];
}

export default function HRDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCandidates: 0,
    shortlistedCandidates: 0,
    scheduledInterviews: 0,
    avgScore: 0
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    skillsDistribution: [],
    statusDistribution: [],
    scoreRanges: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, candidatesResponse, chartDataResponse] = await Promise.all([
        axios.get('/dashboard/hr-stats'),
        axios.get('/candidates'),
        axios.get('/dashboard/chart-data')
      ]);

      setStats(statsResponse.data);

      // ✅ Ensure candidates is always an array
      const candidatesData = Array.isArray(candidatesResponse.data)
        ? candidatesResponse.data
        : Array.isArray(candidatesResponse.data?.candidates)
          ? candidatesResponse.data.candidates
          : [];

      setCandidates(candidatesData);

      setChartData(chartDataResponse.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCandidateStatus = async (candidateId: string, status: string) => {
    try {
      await axios.patch(`/candidates/${candidateId}/status`, { status });
      setCandidates(prev => 
        prev.map(candidate => 
          candidate.id === candidateId ? { ...candidate, status: status as any } : candidate
        )
      );
    } catch (error) {
      console.error('Failed to update candidate status:', error);
    }
  };

  const filteredCandidates = Array.isArray(candidates)
    ? candidates
        .filter(candidate => {
          const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               candidate.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
          return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
          if (sortBy === 'score') return b.score - a.score;
          if (sortBy === 'name') return a.name.localeCompare(b.name);
          if (sortBy === 'date') return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
          return 0;
        })
    : [];

  const skillsChartData = {
    labels: chartData.skillsDistribution.slice(0, 10).map(item => item.skill),
    datasets: [
      {
        label: 'Candidates with Skill',
        data: chartData.skillsDistribution.slice(0, 10).map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const statusChartData = {
    labels: chartData.statusDistribution.map(item => item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())),
    datasets: [
      {
        data: chartData.statusDistribution.map(item => item.count),
        backgroundColor: [
          'rgba(251, 191, 36, 0.8)', // submitted
          'rgba(59, 130, 246, 0.8)', // shortlisted
          'rgba(239, 68, 68, 0.8)',  // rejected
          'rgba(34, 197, 94, 0.8)',  // interview_scheduled
        ],
        borderColor: [
          'rgba(251, 191, 36, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 1,
      },
    ],
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
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
            HR Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Manage candidates and track recruitment metrics
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
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCandidates}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.shortlistedCandidates}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.scheduledInterviews}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgScore}%</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Skills</h2>
            <div className="h-64">
              <Bar 
                data={skillsChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Candidate Status</h2>
            <div className="h-64 flex items-center justify-center">
              <Doughnut data={statusChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}/>
            </div>
          </motion.div>
        </div>

        {/* Candidates List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Candidates</h2>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search candidates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="rejected">Rejected</option>
                  <option value="interview_scheduled">Interview Scheduled</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="score">Sort by Score</option>
                  <option value="name">Sort by Name</option>
                  <option value="date">Sort by Date</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredCandidates.length > 0 ? (
              <div className="space-y-4">
                {filteredCandidates.map((candidate) => (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {candidate.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{candidate.name}</h3>
                          <p className="text-sm text-gray-600">{candidate.email}</p>
                          <p className="text-sm text-gray-500">{candidate.jobTitle}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        {/* Skills */}
                        <div className="hidden md:block">
                          <p className="text-sm font-medium text-gray-700 mb-1">Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills.slice(0, 3).map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {skill}
                              </span>
                            ))}
                            {candidate.skills.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{candidate.skills.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Score */}
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700">AI Score</p>
                          <p className={`text-lg font-bold ${getScoreColor(candidate.score)}`}>
                            {candidate.score}%
                          </p>
                        </div>
                        
                        {/* Status */}
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700 mb-2">Status</p>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                            {candidate.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateCandidateStatus(candidate.id, 'shortlisted')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Shortlist"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateCandidateStatus(candidate.id, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Reject"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No candidates found
                </h3>
                <p className="text-sm text-gray-600">
                  Try adjusting your search filters to see more candidates.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}