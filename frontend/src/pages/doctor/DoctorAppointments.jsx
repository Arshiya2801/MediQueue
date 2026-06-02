import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { toast } from 'react-toastify';
import DoctorAvatar from '../../components/ui/DoctorAvatar';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';

const DoctorAppointments = () => {
  const { backendUrl, token, socket, userData } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  
  const fetchAppointments = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/doctors/appointments', { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        // Filter only today's appointments
        const today = new Date();
        const todayDateStr = `${today.getDate()}_${today.getMonth() + 1}_${today.getFullYear()}`;
        
        const todaysApps = data.appointments.filter(app => app.slotDate === todayDateStr);
        // Sort chronologically by token number (if available) or keep default sort
        todaysApps.sort((a, b) => (a.tokenNumber || 999) - (b.tokenNumber || 999));
        
        setAppointments(todaysApps);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (token) fetchAppointments();
  }, [token]);

  useEffect(() => {
    if (!socket || !userData?.doctorId) return;
    
    // Join doctor's specific room
    socket.emit('join_doctor_room', userData.doctorId);

    const handleDashboardUpdate = () => {
      fetchAppointments();
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
        if (newStatus === 'Rejected') toast.error("Appointment Rejected");
        else toast.success(`Status updated to: ${newStatus}`);
        fetchAppointments(); // refresh
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 rounded-full text-xs font-bold">Pending</span>;
      case 'Accepted':
      case 'Waiting':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-bold">Waiting</span>;
      case 'Called':
        return <span className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-xs font-bold">Called</span>;
      case 'In Consultation':
        return <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-bold">In Consultation</span>;
      case 'Completed':
        return <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold">Completed</span>;
      case 'Rejected':
      case 'Skipped':
      case 'No Show':
        return <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-bold">{status}</span>;
      default:
        return null;
    }
  };

  // Render buttons based on specific workflow stage
  const renderActionButtons = (app) => {
    switch (app.status) {
      case 'Pending':
      case 'Accepted':
      case 'Waiting':
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateStatus(app._id, 'Skipped')}>
              Skip / No Show
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => updateStatus(app._id, 'Called')}>
              Call Next
            </Button>
          </div>
        );
      case 'Called':
        return (
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => updateStatus(app._id, 'In Consultation')}>
            Start Consultation
          </Button>
        );
      case 'In Consultation':
        return (
          <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(app._id, 'Completed')}>
            Complete
          </Button>
        );
      case 'Completed':
      case 'Rejected':
      case 'Skipped':
      case 'No Show':
        return <span className="text-sm text-gray-400 italic">No further actions</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Appointment Management</h1>
          <p className="text-gray-500 mt-2">Manage your daily workflow and patient statuses.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold">
          Today: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Appointments Pipeline view */}
      <Card className="border-none shadow-sm bg-white dark:bg-surface-dark overflow-hidden">
        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 border-b border-gray-100 dark:border-slate-700">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📋</span> Today's Queue
          </h3>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {appointments.map((app) => (
            <div key={app._id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
              
              {/* Patient Info */}
              <div className="flex items-center gap-4 flex-1">
                <DoctorAvatar doctor={app.userData} className="w-16 h-16 rounded-full object-cover shadow-sm" showContainer={false} />
                <div className="space-y-1">
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">{app.userData.name}</h4>
                  <p className="text-xs text-gray-500 font-medium">Slot: {app.slotDate}</p>
                  <p className="text-xs text-gray-500">Contact: {app.userData.phone || "Not provided"}</p>
                  <p className="text-xs text-gray-500">Reason: Not provided</p>
                </div>
              </div>

              {/* Time & Status */}
              <div className="flex items-center gap-8 flex-1 justify-center">
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Time</p>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">{app.slotTime}</p>
                </div>
                <div className="text-center w-24">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Token</p>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">#{app.tokenNumber || '?'}</p>
                </div>
                <div className="text-center w-24">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Status</p>
                  {getStatusBadge(app.status)}
                </div>
              </div>

              {/* Context Actions */}
              <div className="flex-1 flex justify-end">
                {renderActionButtons(app)}
              </div>

            </div>
          ))}
        </div>
        {appointments.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No appointments scheduled for today.
          </div>
        )}
      </Card>

    </div>
  );
};

export default DoctorAppointments;
