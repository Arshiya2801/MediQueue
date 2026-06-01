import Doctor from '../models/doctorModel.js';
import Appointment from '../models/appointmentModel.js';

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
    }

    res.json({ success: true, message: `Status updated to ${status}`, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { getDoctors, addDoctor, getDoctorById, getDoctorAppointments, updateAppointmentStatus };
