import React, { useState, useEffect, useContext } from 'react';
import { Card } from '../../components/ui/Card';
import { toast } from 'react-toastify';
import DoctorAvatar from '../../components/ui/DoctorAvatar';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';

const DoctorAppointments = () => {
  const { backendUrl, token, socket, userData } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('All'); 
  
  const fetchAppointments = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/doctors/appointments', { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        setAppointments(data.appointments);
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
      case 'Expired':
      case 'Missed':
        return <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-bold">{status}</span>;
      default:
        return null;
    }
  };

  const getApptDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return new Date(0);
    const [day, month, year] = dateStr.split('_').map(Number);
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return new Date(year, month - 1, day, hours, minutes);
  };

  const filteredAppointments = appointments.filter(app => {
    if (filter === 'All') return true;

    const apptDateTime = getApptDateTime(app.slotDate, app.slotTime);
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appDate = new Date(apptDateTime);
    appDate.setHours(0, 0, 0, 0);

    if (filter === 'Today') return appDate.getTime() === today.getTime();
    if (filter === 'Upcoming') return apptDateTime > now && !app.isCompleted && !app.cancelled;
    if (filter === 'Completed') return app.status === 'Completed';
    if (filter === 'Cancelled' || filter === 'Rejected') return app.status === 'Rejected' || app.status === 'Expired' || app.status === 'Missed' || app.cancelled;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">All Appointments</h1>
          <p className="text-gray-500 mt-2">View and filter all historical and upcoming bookings.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {['All', 'Today', 'Upcoming', 'Completed', 'Rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              filter === tab ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-surface-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Appointment Time</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Token</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-dark divide-y divide-gray-100 dark:divide-slate-700">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No appointments found for {filter.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((app) => (
                  <tr key={app._id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <DoctorAvatar doctor={app.userData} className="w-10 h-10 rounded-full object-cover shadow-sm" showContainer={false} />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{app.userData.name}</p>
                          <p className="text-xs text-gray-500">Reason: Not provided</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{app.slotDate}</span>
                      <p className="text-xs text-gray-500 font-bold">{app.slotTime}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.userData.phone || "Not provided"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="font-bold text-gray-900 dark:text-white">#{app.tokenNumber || '?'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
};

export default DoctorAppointments;
