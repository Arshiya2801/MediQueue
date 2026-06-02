import React, { useState, useEffect, useContext } from 'react';
import { Card } from '../../components/ui/Card';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';

const DoctorPatients = () => {
  const { backendUrl, token, socket, userData } = useContext(AppContext);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  
  const fetchPatients = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/doctors/patients', { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        setPatients(data.patients);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (token) fetchPatients();
  }, [token]);

  useEffect(() => {
    if (!socket || !userData?.doctorId) return;
    
    socket.emit('join_doctor_room', userData.doctorId);

    const handleDashboardUpdate = () => {
      fetchPatients();
    };

    socket.on('dashboard_update', handleDashboardUpdate);
    return () => {
      socket.off('dashboard_update', handleDashboardUpdate);
    };
  }, [socket, userData]);

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">My Patients</h1>
          <p className="text-gray-500 mt-2">View all patients who have booked appointments with you.</p>
        </div>
        <div>
          <input 
            type="text" 
            placeholder="Search patients..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-surface-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Total Visits</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Visit</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Upcoming</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-dark divide-y divide-gray-100 dark:divide-slate-700">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No patients found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p.userId} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900 dark:text-white">{p.email}</p>
                      <p className="text-xs text-gray-500">{p.phone}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{p.totalVisits}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.lastVisitDate ? <span className="font-medium text-gray-900 dark:text-white">{p.lastVisitDate}</span> : 'None'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {p.upcomingAppointment ? <span className="text-blue-600 font-bold">{p.upcomingAppointment}</span> : 'None'}
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

export default DoctorPatients;
