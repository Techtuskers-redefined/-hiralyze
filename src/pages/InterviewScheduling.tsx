/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { 
  Calendar,
  Clock,
  Video,
  MapPin,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  AlertCircle,
  X
} from 'lucide-react';

interface Interview {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  date: string;
  time: string;
  duration: number;
  type: 'in-person' | 'video' | 'phone';
  location?: string;
  meetingLink?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  interviewers: string[];
}

interface TimeSlot {
  time: string;
  available: boolean;
  interview?: Interview;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

// Mock data for demonstration
const mockInterviews: Interview[] = [
  {
    id: '1',
    candidateName: 'John Smith',
    candidateEmail: 'john.smith@email.com',
    jobTitle: 'Senior React Developer',
    date: '2025-01-17',
    time: '10:00',
    duration: 60,
    type: 'video',
    meetingLink: 'https://zoom.us/j/123456789',
    status: 'scheduled',
    notes: 'Technical interview focusing on React and TypeScript',
    interviewers: ['Sarah Johnson', 'Mike Davis']
  },
  {
    id: '2',
    candidateName: 'Alice Johnson',
    candidateEmail: 'alice.johnson@email.com',
    jobTitle: 'UX Designer',
    date: '2025-01-16',
    time: '14:00',
    duration: 45,
    type: 'in-person',
    location: 'Conference Room A',
    status: 'completed',
    notes: 'Portfolio review and design challenge discussion',
    interviewers: ['Emma Wilson']
  },
  {
    id: '3',
    candidateName: 'Bob Wilson',
    candidateEmail: 'bob.wilson@email.com',
    jobTitle: 'Marketing Manager',
    date: '2025-01-18',
    time: '15:30',
    duration: 30,
    type: 'phone',
    status: 'scheduled',
    notes: 'Initial screening call',
    interviewers: ['Tom Brown']
  },
  {
    id: '4',
    candidateName: 'Sarah Davis',
    candidateEmail: 'sarah.davis@email.com',
    jobTitle: 'Data Analyst',
    date: '2025-01-16',
    time: '11:00',
    duration: 90,
    type: 'video',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    status: 'scheduled',
    notes: 'Technical assessment and case study review',
    interviewers: ['Alex Chen', 'Lisa Wang']
  }
];

// Helper functions for date manipulation (simplified versions)
const format = (date: Date, formatStr: string): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  if (formatStr === 'MMMM yyyy') {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  if (formatStr === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  }
  if (formatStr === 'd') {
    return date.getDate().toString();
  }
  return date.toLocaleDateString();
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const startOfWeek = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day;
  result.setDate(diff);
  return result;
};

export default function InterviewScheduling() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<'calendar' | 'list'>('calendar');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast functions
  const showToast = (type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    const newToast = { id, type, message };
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };


  useEffect(() => {
    fetchInterviews();
  });

  const fetchInterviews = async () => {
    try {
      setError(null);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInterviews(mockInterviews);
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
      setError('Failed to fetch interviews');
      showToast('error', 'Failed to fetch interviews');
      setInterviews([]); // Ensure interviews is always an array
    } finally {
      setLoading(false);
    }
  };

  const updateInterviewStatus = async (interviewId: string, status: Interview['status']) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      setInterviews(prev => Array.isArray(prev) ? prev.map(interview => 
        interview.id === interviewId ? { ...interview, status } : interview
      ) : []);
      showToast('success', `Interview marked as ${status}!`);
    } catch (error: any) {
      console.error('Failed to update interview status:', error);
      showToast('error', 'Failed to update interview status');
    }
  };

  const deleteInterview = async (interviewId: string) => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      setInterviews(prev => Array.isArray(prev) ? prev.filter(interview => interview.id !== interviewId) : []);
      showToast('success', 'Interview cancelled successfully!');
    } catch (error: any) {
      console.error('Failed to delete interview:', error);
      showToast('error', 'Failed to cancel interview');
    }
  };

  const sendReminder = async (interviewId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      showToast('success', 'Reminder sent successfully!');
    } catch (error: any) {
      console.error('Failed to send reminder:', error);
      showToast('error', 'Failed to send reminder');
    }
  };

  const getStatusColor = (status: Interview['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no-show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: Interview['type']) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'in-person':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getInterviewsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return safeInterviews.filter(interview => interview.date === dateStr);
  };

  // Ensure interviews is always an array before filtering
  const safeInterviews = Array.isArray(interviews) ? interviews : [];
  
  const todayInterviews = safeInterviews.filter(interview => 
    interview.date === format(new Date(), 'yyyy-MM-dd')
  );

  const upcomingInterviews = safeInterviews.filter(interview => 
    new Date(interview.date) >= new Date() && interview.status === 'scheduled'
  ).slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button
            onClick={fetchInterviews}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Scheduling</h1>
            <p className="mt-2 text-gray-600">
              Manage and schedule candidate interviews
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewType('calendar')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  viewType === 'calendar' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  viewType === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
            </div>
            
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Interview</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Interviews</p>
                <p className="text-2xl font-bold text-gray-900">{todayInterviews.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {safeInterviews.filter(i => i.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {safeInterviews.filter(i => i.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {safeInterviews.filter(i => i.status === 'cancelled').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {viewType === 'calendar' ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {format(selectedDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedDate(prev => addDays(prev, -7))}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setSelectedDate(prev => addDays(prev, 7))}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-7 gap-4 mb-6">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-4">
                    {getWeekDays().map(date => {
                      const dayInterviews = getInterviewsForDate(date);
                      const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                      const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      
                      return (
                        <div
                          key={date.toISOString()}
                          className={`min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors duration-200 ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : isToday 
                                ? 'border-blue-300 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedDate(date)}
                        >
                          <div className={`text-sm font-medium mb-2 ${
                            isToday ? 'text-blue-600' : 'text-gray-900'
                          }`}>
                            {format(date, 'd')}
                          </div>
                          <div className="space-y-1">
                            {dayInterviews.slice(0, 2).map(interview => (
                              <div
                                key={interview.id}
                                className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate"
                              >
                                {interview.time} - {interview.candidateName}
                              </div>
                            ))}
                            {dayInterviews.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{dayInterviews.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">All Interviews</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {safeInterviews.length > 0 ? (
                      safeInterviews.map(interview => (
                        <div
                          key={interview.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-medium text-gray-900">{interview.candidateName}</h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(interview.status)}`}>
                                  {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                                </span>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">{interview.jobTitle}</p>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(interview.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{interview.time}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {getTypeIcon(interview.type)}
                                  <span>{interview.type.replace('-', ' ')}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => sendReminder(interview.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                title="Send Reminder"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                              
                              {interview.status === 'scheduled' && (
                                <>
                                  <button
                                    onClick={() => updateInterviewStatus(interview.id, 'completed')}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                                    title="Mark as Completed"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateInterviewStatus(interview.id, 'cancelled')}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                    title="Cancel Interview"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              
                              <button
                                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => deleteInterview(interview.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No interviews scheduled
                        </h3>
                        <p className="text-gray-600">
                          Start by scheduling your first interview.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
              {todayInterviews.length > 0 ? (
                <div className="space-y-3">
                  {todayInterviews.map(interview => (
                    <div key={interview.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {interview.candidateName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {interview.candidateName}
                        </p>
                        <p className="text-xs text-gray-500">{interview.time}</p>
                      </div>
                      <div className="flex items-center text-gray-400">
                        {getTypeIcon(interview.type)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No interviews scheduled for today.</p>
              )}
            </div>

            {/* Upcoming Interviews */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Interviews</h3>
              {upcomingInterviews.length > 0 ? (
                <div className="space-y-3">
                  {upcomingInterviews.map(interview => (
                    <div key={interview.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{interview.candidateName}</p>
                        <p className="text-gray-500">
                          {new Date(interview.date).toLocaleDateString()} at {interview.time}
                        </p>
                      </div>
                      <div className="flex items-center text-gray-400">
                        {getTypeIcon(interview.type)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No upcoming interviews.</p>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Interview Modal Placeholder */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Schedule Interview</h3>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">Interview scheduling form would go here.</p>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Toast Container */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Transition
              key={toast.id}
              show={true}
              appear={true}
              enter="transform ease-out duration-300 transition"
              enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
              enterTo="translate-y-0 opacity-100 sm:translate-x-0"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${
                toast.type === 'success' ? 'border-l-4 border-green-400' :
                toast.type === 'error' ? 'border-l-4 border-red-400' :
                'border-l-4 border-yellow-400'
              }`}>
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {toast.type === 'success' && (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      )}
                      {toast.type === 'error' && (
                        <XCircle className="h-6 w-6 text-red-400" />
                      )}
                      {toast.type === 'warning' && (
                        <AlertCircle className="h-6 w-6 text-yellow-400" />
                      )}
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-gray-900">
                        {toast.type === 'success' && 'Success!'}
                        {toast.type === 'error' && 'Error!'}
                        {toast.type === 'warning' && 'Warning!'}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">{toast.message}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                      <button
                        className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={() => removeToast(toast.id)}
                      >
                        <span className="sr-only">Close</span>
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          ))}
        </div>
      </div>
    </div>
  );
}