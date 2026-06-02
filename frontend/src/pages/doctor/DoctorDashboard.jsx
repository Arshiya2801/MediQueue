import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';
import { Calendar, Users, IndianRupee, Activity, Phone } from 'lucide-react';

const DoctorDashboard = () => {
  const { backendUrl, token, userData, socket } = useContext(AppContext);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ todaysAppointments: 0, upcomingPatients: 0, monthlyEarnings: 0, totalPatients: 0 });
  
  const fetchDashboardData = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/doctors/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        setStats(data.stats);
        setAppointments(data.latestAppointments);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  useEffect(() => {
    if (!socket || !userData?.doctorId) return;

    socket.emit('join_doctor_room', userData.doctorId);

    const handleDashboardUpdate = () => {
      fetchDashboardData();
    };

    socket.on('dashboard_update', handleDashboardUpdate);

    return () => {
      socket.off('dashboard_update', handleDashboardUpdate);
    };
  }, [socket, userData]);


  const updateStatus = async (id, newStatus) => {
    try {
      const { data } = await axios.put(
        backendUrl + '/api/doctors/appointment-status',
        { appointmentId: id, status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(`Status updated to: ${newStatus}`);
        fetchDashboardData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome Back, {userData?.name ? userData.name.split(' ')[0] : 'Doctor'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Doctor Dashboard</p>
        </div>
      </div>
      
      {/* 1. Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-surface-dark border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Today's Appointments</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{stats.todaysAppointments}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Upcoming Patients</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{stats.upcomingPatients}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Monthly Earnings</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">₹{stats.monthlyEarnings.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
              <IndianRupee className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Patients</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{stats.totalPatients}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Appointments Table */}
      <Card className="border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Appointments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Appointment Time</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-dark divide-y divide-gray-100 dark:divide-slate-700">
              {appointments.filter(app => app.status === 'Pending').length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    No pending appointments requiring action.
                  </td>
                </tr>
              ) : (
                appointments.filter(app => app.status === 'Pending').map((app) => (
                  <tr key={app._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => setSelectedPatient(app)}
                        className="font-bold text-primary hover:underline"
                      >
                        {app.userData.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{app.slotDate} {app.slotTime}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => updateStatus(app._id, 'Accepted')} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">Accept</button>
                      <button onClick={() => updateStatus(app._id, 'Rejected')} className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">Reject</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Patient Details</h3>
              <button onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              
              {/* Info Block */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-xl font-bold text-primary">
                  {selectedPatient.userData.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">{selectedPatient.userData.name}</h4>
                  <p className="text-sm text-gray-500">Patient ID: #{selectedPatient.userId.substring(0,6)}</p>
                </div>
              </div>

              {/* Required Sections */}
              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Medical History</h5>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                    No major issues recorded.
                  </p>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Information</h5>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" /> {selectedPatient.userData.phone || "Not provided"}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button fullWidth variant="outline" onClick={() => setSelectedPatient(null)}>Close Details</Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorDashboard;
