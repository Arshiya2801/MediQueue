import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import DoctorAvatar from '../components/ui/DoctorAvatar';
import AppointmentCalendar from '../components/ui/AppointmentCalendar';
import { Calendar } from 'lucide-react';

const MyAppointments = () => {
  const { backendUrl, token } = useContext(AppContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [socket, setSocket] = useState(null);
  const [queueInfo, setQueueInfo] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleApp, setRescheduleApp] = useState(null);
  const [newDate, setNewDate] = useState(new Date());
  const [newTime, setNewTime] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Dashboard State
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');

  const getUserAppointments = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(backendUrl + '/api/appointments/my-appointments', { headers: { Authorization: `Bearer ${token}` } });
      setAppointments(data);
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      getUserAppointments();
    }
  }, [token]);

  // Real-time queue setup
  useEffect(() => {
    if (appointments.length > 0) {
      const newSocket = io(backendUrl);
      setSocket(newSocket);

      appointments.forEach(app => {
        if (!app.isCompleted && !app.cancelled) {
          newSocket.emit('join_queue', { docId: app.docId, date: app.slotDate });
        }
      });

      newSocket.on('queue_update', (data) => {
        setQueueInfo(data);
      });

      return () => newSocket.disconnect();
    }
  }, [appointments, backendUrl]);

  const handleRescheduleSubmit = async () => {
    if (!newDate || !newTime) {
      toast.error("Please select a new date and time");
      return;
    }
    setIsRescheduling(true);
    try {
      let day = newDate.getDate();
      let month = newDate.getMonth() + 1;
      let year = newDate.getFullYear();
      const slotDate = `${day}_${month}_${year}`;

      const { data } = await axios.put(backendUrl + `/api/appointments/reschedule/${rescheduleApp._id}`, {
        slotDate,
        slotTime: newTime
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (data.success) {
        toast.success("Appointment rescheduled successfully!");
        setIsRescheduleModalOpen(false);
        getUserAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Error rescheduling appointment");
    } finally {
      setIsRescheduling(false);
    }
  };

  // API Actions
  const handleCancel = async (appId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      const { data } = await axios.put(backendUrl + `/api/appointments/cancel/${appId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        toast.success("Appointment cancelled");
        getUserAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Error cancelling appointment");
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

  // Filter Logic - Only Upcoming for this page
  const filteredAppointments = appointments.filter((item) => {
    // Only Upcoming (Must be future datetime)
    if (item.cancelled || item.isCompleted) return false;
    
    const apptDateTime = getApptDateTime(item.slotDate, item.slotTime);
    if (apptDateTime <= new Date()) return false;

    // Search by name or speciality
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = item.docData.name.toLowerCase().includes(term);
      const matchSpec = item.docData.speciality.toLowerCase().includes(term);
      if (!matchName && !matchSpec) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* HEADER & TOP BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">My Appointments</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your bookings and track your wait time.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="Search doctors..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm text-gray-900 dark:text-white"
            />
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>
      </div>

      {/* QUEUE WIDGET */}
      {queueInfo.pendingCount !== undefined && activeTab === 'upcoming' && (
        <div className="bg-gradient-to-r from-primary to-secondary p-[1px] rounded-2xl shadow-lg mb-8 transform hover:-translate-y-0.5 transition-all duration-300">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-4 z-10 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                <div className="absolute inset-0 border-2 border-primary rounded-full animate-ping opacity-20"></div>
                <span className="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Live Queue Tracking</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your doctor's waiting room</p>
              </div>
            </div>

            <div className="mt-4 sm:mt-0 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 px-5 py-2 rounded-xl flex flex-col items-center z-10 min-w-[120px]">
              <span className="text-2xl font-black text-primary">
                {queueInfo.pendingCount}
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Waiting</span>
            </div>
          </div>
        </div>
      )}

      {/* TABS - Removed since we have a dedicated history page now. Only Upcoming displayed here. */}

      {/* MAIN CONTENT / CARDS */}
      <div className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-slate-700 rounded-b-2xl rounded-tr-2xl p-6 min-h-[400px]">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-2xl">
              <Calendar className="w-5 h-5 text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No appointments found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
              {searchTerm 
                ? "No appointments match your search criteria. Try a different term." 
                : `You don't have any ${activeTab} appointments.`}
            </p>
            {activeTab === 'upcoming' && !searchTerm && (
              <Button onClick={() => navigate('/doctors')} variant="primary" className="mt-6">
                Book an Appointment
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAppointments.map((item, index) => (
              <div 
                key={index}
                className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Status Banner */}
                <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider text-white ${
                  item.cancelled ? 'bg-red-500' : 
                  item.isCompleted ? 'bg-blue-500' : 
                  'bg-primary'
                }`}>
                  {item.cancelled ? 'Cancelled' : item.isCompleted ? 'Completed' : 'Upcoming'}
                </div>

                <div className="p-5 flex-1">
                  {/* Doctor Info */}
                  <div className="flex gap-4 items-start mb-5">
                    <DoctorAvatar doctor={item.docData} className="w-16 h-16 rounded-xl object-cover bg-white dark:bg-slate-700 shadow-sm" showContainer={false} />
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{item.docData.name}</h3>
                      <p className="text-xs text-primary font-semibold">{item.docData.speciality}</p>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-700 mb-5">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.slotDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span className="text-sm font-bold text-primary">{item.slotTime}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 mt-auto">
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button 
                        variant="secondary" 
                        onClick={() => handleCancel(item._id)}
                        className="bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-600 dark:hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="primary"
                        onClick={() => {
                          setRescheduleApp(item);
                          setNewDate(new Date());
                          setNewTime('');
                          setIsRescheduleModalOpen(true);
                        }}
                      >
                        Reschedule
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      <Modal 
        isOpen={isRescheduleModalOpen} 
        onClose={() => setIsRescheduleModalOpen(false)} 
        title="Reschedule Appointment"
      >
        {rescheduleApp && (
          <div className="space-y-6">
            <AppointmentCalendar 
              doctor={rescheduleApp.docData}
              selectedDate={newDate}
              selectedTime={newTime}
              onSelectDate={setNewDate}
              onSelectTime={setNewTime}
              isLoading={false}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
              <Button variant="outline" onClick={() => setIsRescheduleModalOpen(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleRescheduleSubmit}
                disabled={!newTime || isRescheduling}
                isLoading={isRescheduling}
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default MyAppointments;
