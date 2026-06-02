import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

const MyDoctorProfile = () => {
  const { backendUrl, token, userData } = useContext(AppContext);
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/doctors/my-profile', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (data.success) {
        setProfileData(data.profile);
        setStats(data.stats);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchProfile();
  }, [token]);

  if (isLoading || !profileData) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getInitials = (name) => {
    const cleanName = name.replace('Dr. ', '').trim();
    const parts = cleanName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Doctor Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your public information and consultation settings.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => toast.info('Edit Profile Modal Coming Soon')}>Edit Profile</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="text-center pt-8 border-none shadow-md overflow-hidden relative bg-white dark:bg-slate-800">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary to-secondary"></div>
            <CardContent className="relative z-10 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 overflow-hidden bg-gray-100 dark:bg-slate-700 shadow-xl mb-4 flex items-center justify-center">
                {profileData.image ? (
                  <img src={profileData.image} alt={profileData.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-primary/40 tracking-widest">
                    {getInitials(profileData.name)}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profileData.name}</h2>
              <p className="text-sm font-semibold text-primary tracking-wider mb-6">{profileData.speciality}</p>

              <div className="w-full grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-slate-700 pt-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total Patients</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalPatients}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total Appts</p>
                  <p className="text-2xl font-black text-primary">{stats.totalAppointments}</p>
                </div>
              </div>
              <div className="w-full border-t border-gray-100 dark:border-slate-700 mt-4 pt-4">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Lifetime Earnings</p>
                <p className="text-2xl font-black text-green-600">₹{stats.lifetimeEarnings.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-gray-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-primary">📋</span> Professional Details
              </h3>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-1">Full Name</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{profileData.name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-1">Specialization</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{profileData.speciality}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-1">Degree/Qualification</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{profileData.degree}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-1">Years of Experience</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{profileData.experience}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-1">Consultation Fee</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">₹{profileData.fees}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-1">Availability Status</p>
                  <p className={`text-base font-bold ${profileData.available ? 'text-green-600' : 'text-red-600'}`}>
                    {profileData.available ? 'Available for Bookings' : 'Currently Unavailable'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500 font-semibold mb-1">About Me</p>
                  <p className="text-base text-gray-700 dark:text-gray-300">
                    {profileData.about}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500 font-semibold mb-1">Hospital / Clinic Address</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    {profileData.address?.line1 || 'Address not provided'} <br />
                    {profileData.address?.line2 || ''}
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default MyDoctorProfile;
