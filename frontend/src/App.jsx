import React from 'react'
import {Route, Routes, Navigate} from 'react-router-dom'
import Home from './pages/Home'
import Doctors from './pages/Doctors'
import Login from './pages/Login'
import Signup from './pages/Signup'
import MyAppointments from './pages/MyAppointments'
import MyProfile from './pages/MyProfile'
import DesignSystem from './pages/DesignSystem'
import PatientDashboard from './pages/patient/PatientDashboard'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorAppointments from './pages/doctor/DoctorAppointments'
import QueueManagement from './pages/doctor/QueueManagement'
import DoctorPatients from './pages/doctor/DoctorPatients'
import MyDoctorProfile from './pages/doctor/MyDoctorProfile'
import DoctorProfile from './pages/DoctorProfile'
import BookingFlow from './pages/BookingFlow'
import Payment from './pages/Payment'
import AppointmentConfirmation from './pages/AppointmentConfirmation'
import QueueTracking from './pages/QueueTracking'
import PatientQueueTracking from './pages/patient/PatientQueueTracking'
import AppointmentHistory from './pages/patient/AppointmentHistory'
import Notifications from './pages/patient/Notifications'
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute'
import PublicLayout from './components/layouts/PublicLayout'
import PatientLayout from './components/layouts/PatientLayout'
import DoctorLayout from './components/layouts/DoctorLayout'

const App = () => {
  return (
    <Routes>
      {/* Public Routes with Navbar and Footer */}
      <Route element={<PublicLayout />}>
        <Route path='/' element={<Home/>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path='/design-system' element={<DesignSystem/>} />
        <Route path='/doctors/:speciality' element={<Doctors/>} />
        <Route path='/doctors' element={<Doctors/>} />
        <Route path='/doctor/:docId' element={<DoctorProfile/>} />
      </Route>

      {/* Protected Patient Routes (PatientLayout) */}
      <Route element={<ProtectedRoute allowedRoles={['patient']}><PatientLayout/></ProtectedRoute>}>
        <Route path='/patient/dashboard' element={<PatientDashboard/>} />
        <Route path='/patient/book-appointment' element={<Doctors/>} />
        <Route path='/patient/appointment-history' element={<AppointmentHistory/>} />
        <Route path='/patient/queue-tracking' element={<PatientQueueTracking/>} />
        <Route path='/patient/notifications' element={<Notifications/>} />
        <Route path='/my-appointments' element={<MyAppointments/>} />
        <Route path='/my-profile' element={<MyProfile/>} />
        <Route path='/book/:docId' element={<BookingFlow/>} />
        <Route path='/payment' element={<Payment/>} />
        <Route path='/confirmation' element={<AppointmentConfirmation/>} />
        <Route path='/track/:appointmentId' element={<QueueTracking/>} />
      </Route>

      {/* Protected Doctor Routes (DoctorLayout) */}
      <Route element={<ProtectedRoute allowedRoles={['doctor']}><DoctorLayout/></ProtectedRoute>}>
        <Route path='/doctor/dashboard' element={<DoctorDashboard/>} />
        <Route path='/doctor/appointments' element={<DoctorAppointments/>} />
        <Route path='/doctor/queue' element={<QueueManagement/>} />
        <Route path='/doctor/patients' element={<DoctorPatients/>} />
        <Route path='/doctor/profile' element={<MyDoctorProfile/>} />
      </Route>

      {/* Legacy route redirect */}
      <Route path='/appointment/:docId' element={<Navigate to="/doctors" replace />} />
    </Routes>
  )
}

export default App
