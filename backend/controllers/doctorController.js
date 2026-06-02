import Doctor from '../models/doctorModel.js';
import Appointment from '../models/appointmentModel.js';
import Notification from '../models/notificationModel.js';

// @desc    Fetch all doctors
// @route   GET /api/doctors
// @access  Public
const getDoctors = async (req, res) => {
  try {
    const { search, speciality } = req.query;
    
    // Build query object
    let query = {};
    if (speciality) {
      query.speciality = { $regex: new RegExp(speciality, 'i') }; // Case-insensitive exact/partial match
    }
    if (search) {
      // Search by name
      query.name = { $regex: new RegExp(search, 'i') };
    }

    const doctors = await Doctor.find(query);
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const docsWithImages = doctors.map(doc => {
      const docObj = doc.toObject();
      return {
        ...docObj,
        image: docObj.image ? `${backendUrl}/images/${docObj.image}` : ''
      };
    });
    res.json(docsWithImages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a doctor
// @route   POST /api/doctors
// @access  Public (mocking admin access for now)
const addDoctor = async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    const createdDoctor = await doctor.save();
    res.status(201).json(createdDoctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const docObj = doctor.toObject();
    docObj.image = docObj.image ? `${backendUrl}/images/${docObj.image}` : '';
    
    res.json(docObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get doctor's appointments
// @route   GET /api/doctors/appointments
// @access  Private (Doctor)
const getDoctorAppointments = async (req, res) => {
  try {
    if (!req.user || !req.user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not authorized as a doctor' });
    }
    const appointments = await Appointment.find({ docId: req.user.doctorId }).sort({ date: -1 });
    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update appointment status
// @route   PUT /api/doctors/appointment-status
// @access  Private (Doctor)
const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId, status } = req.body;
    
    if (!req.user || !req.user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not authorized as a doctor' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (appointment.docId.toString() !== req.user.doctorId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this appointment' });
    }

    appointment.status = status;
    if (status === 'Completed') appointment.isCompleted = true;
    if (status === 'Rejected') appointment.cancelled = true;

    await appointment.save();

    // Handle Notifications
    let notificationMessage = '';
    if (status === 'Accepted') {
      notificationMessage = `Your appointment with Dr. ${req.user.name || 'Doctor'} has been accepted.`;
    } else if (status === 'Rejected') {
      notificationMessage = `Your appointment with Dr. ${req.user.name || 'Doctor'} has been rejected.`;
    } else if (status === 'Completed') {
      notificationMessage = 'Consultation completed successfully.';
    }

    if (notificationMessage) {
      await Notification.create({
        userId: appointment.userId,
        title: `Appointment ${status}`,
        message: notificationMessage,
        type: status === 'Completed' ? 'success' : status === 'Accepted' ? 'info' : 'error'
      });
    }

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      if (status === 'Accepted') {
        io.to(`user_${appointment.userId}`).emit('appointment-accepted', { appointmentId });
      } else if (status === 'Rejected') {
        io.to(`user_${appointment.userId}`).emit('appointment-rejected', { appointmentId });
      }

      // Trigger queue update for everyone waiting on this doctor/date
      const room = `queue_${appointment.docId}_${appointment.slotDate}`;
      io.to(room).emit('queue_update', { appointmentId, status });
      
      // Trigger dashboard update for the doctor
      io.to(`doctor_${appointment.docId}`).emit('dashboard_update', { appointmentId, status });
    }

    res.json({ success: true, message: `Status updated to ${status}`, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Doctor Dashboard Stats
// @route   GET /api/doctors/dashboard
// @access  Private (Doctor)
const getDoctorDashboard = async (req, res) => {
  try {
    if (!req.user || !req.user.doctorId) {
      return res.status(403).json({ success: false, message: 'Not authorized as a doctor' });
    }

    const docId = req.user.doctorId;
    const appointments = await Appointment.find({ docId }).sort({ date: -1 });

    // Calculate Today's Date String (e.g. 1_6_2026)
    const today = new Date();
    const todayDateStr = `${today.getDate()}_${today.getMonth() + 1}_${today.getFullYear()}`;

    // 1. Today's Appointments
    const todaysAppointments = appointments.filter(app => app.slotDate === todayDateStr && !app.cancelled);

    // 2. Upcoming Patients
    // For simplicity, anything that is not completed or cancelled, and is either today or in the future
    // In our system, checking status is enough or checking date > Date.now()
    const upcomingAppointments = appointments.filter(app => !app.cancelled && !app.isCompleted);

    // 3. Monthly Earnings
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const monthlyEarnings = appointments.reduce((sum, app) => {
      // Check if slotDate belongs to current month and year
      const appParts = app.slotDate.split('_'); // [day, month, year]
      if (appParts.length === 3) {
        if (parseInt(appParts[1]) === currentMonth && parseInt(appParts[2]) === currentYear && app.isCompleted) {
          return sum + app.amount;
        }
      }
      return sum;
    }, 0);

    // 4. Total Unique Patients
    const uniquePatients = new Set();
    appointments.forEach(app => {
      if (app.userId) uniquePatients.add(app.userId.toString());
    });

    const stats = {
      todaysAppointments: todaysAppointments.length,
      upcomingPatients: upcomingAppointments.length,
      monthlyEarnings: monthlyEarnings,
      totalPatients: uniquePatients.size
    };

    // Return the latest 5 appointments for the recent table
    const latestAppointments = appointments.slice(0, 5);

    res.json({ success: true, stats, latestAppointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { getDoctors, addDoctor, getDoctorById, getDoctorAppointments, updateAppointmentStatus, getDoctorDashboard };
