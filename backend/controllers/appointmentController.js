import Appointment from '../models/appointmentModel.js';
import Doctor from '../models/doctorModel.js';
import User from '../models/userModel.js';

// @desc    Book an appointment
// @route   POST /api/appointments/book
// @access  Private
const bookAppointment = async (req, res) => {
  const { docId, slotDate, slotTime } = req.body;
  const userId = req.user._id;

  try {
    const docData = await Doctor.findById(docId);
    if (!docData) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (!docData.available) {
      return res.status(400).json({ message: 'Doctor is not available' });
    }

    let slots_booked = docData.slots_booked;

    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.status(400).json({ message: 'Slot already booked' });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [];
      slots_booked[slotDate].push(slotTime);
    }

    const userData = await User.findById(userId).select('-password');

    // Remove slots_booked from docData to save space in appointment doc
    delete docData.slots_booked;

    // Calculate Token Number for the day
    // Count existing non-cancelled appointments for this doctor on this date
    const existingAppointments = await Appointment.countDocuments({
      docId,
      slotDate,
      cancelled: false
    });
    
    // Assign token number (1-indexed based on how many are already booked)
    // NOTE: If they cancel and someone else books, token numbers might not be perfectly sequential
    // but this gives a unique incremental token for the day.
    const tokenNumber = existingAppointments + 1;

    const appointment = new Appointment({
      userId,
      docId,
      userData,
      docData,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
      tokenNumber,
    });

    await appointment.save();

    await Doctor.findByIdAndUpdate(docId, { slots_booked });

    // Emit Socket.io Event to the Doctor
    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${docId}`).emit('appointment-booked', {
        message: `New appointment booked by ${userData.name}`,
        appointmentId: appointment._id
      });
      io.to(`doctor_${docId}`).emit('dashboard_update');
    }

    res.status(201).json({ success: true, message: 'Appointment booked successfully', appointmentId: appointment._id });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's appointments
// @route   GET /api/appointments/my-appointments
// @access  Private
const myAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.user._id });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Complete an appointment (Doctor/Admin action)
// @route   PUT /api/appointments/complete/:id
// @access  Private (should be restricted to doc, but keeping it simple for now)
const completeAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.isCompleted = true;
    await appointment.save();

    // Broadcast queue update to all patients in this doctor's specific date room
    const io = req.app.get('io');
    const room = `${appointment.docId}_${appointment.slotDate}`;
    
    // Fetch remaining pending appointments for this doctor on this date, sorted by time/creation
    // This is simple queue logic: count how many are pending to update positions
    const pendingAppointments = await Appointment.find({
      docId: appointment.docId,
      slotDate: appointment.slotDate,
      isCompleted: false,
      cancelled: false
    }).sort({ slotTime: 1, _id: 1 }); // Sort by time, then arrival

    // Broadcast the new queue state to the room
    io.to(room).emit('queue_update', {
      message: 'Queue advanced',
      pendingCount: pendingAppointments.length,
      nextUp: pendingAppointments.length > 0 ? pendingAppointments[0]._id : null
    });

    res.json({ message: 'Appointment completed and queue updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel an appointment
// @route   PUT /api/appointments/cancel/:id
// @access  Private
const cancelAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify user owns the appointment
    if (appointment.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    appointment.cancelled = true;
    await appointment.save();

    // Remove the booked slot from the doctor
    const docData = await Doctor.findById(appointment.docId);
    if (docData && docData.slots_booked && docData.slots_booked[appointment.slotDate]) {
      docData.slots_booked[appointment.slotDate] = docData.slots_booked[appointment.slotDate].filter(
        time => time !== appointment.slotTime
      );
      await Doctor.findByIdAndUpdate(appointment.docId, { slots_booked: docData.slots_booked });
    }

    // Emit Socket.io Event
    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${appointment.docId}`).emit('appointment-rejected', {
        message: 'An appointment has been cancelled',
        appointmentId
      });
      io.to(`doctor_${appointment.docId}`).emit('dashboard_update');
    }

    res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reschedule an appointment
// @route   PUT /api/appointments/reschedule/:id
// @access  Private
const rescheduleAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { slotDate, slotTime } = req.body;
    
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify user owns the appointment
    if (appointment.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const docData = await Doctor.findById(appointment.docId);
    
    // 1. Free up the old slot
    if (docData.slots_booked && docData.slots_booked[appointment.slotDate]) {
      docData.slots_booked[appointment.slotDate] = docData.slots_booked[appointment.slotDate].filter(
        time => time !== appointment.slotTime
      );
    }

    // 2. Book the new slot
    let slots_booked = docData.slots_booked || {};
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.status(400).json({ message: 'New slot is already booked' });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [];
      slots_booked[slotDate].push(slotTime);
    }

    // Save doctor's new slots
    await Doctor.findByIdAndUpdate(appointment.docId, { slots_booked });

    // 3. Update appointment
    appointment.slotDate = slotDate;
    appointment.slotTime = slotTime;
    appointment.cancelled = false; // in case they are rescheduling a cancelled one
    await appointment.save();

    // Emit Socket.io Event to update dashboard
    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${appointment.docId}`).emit('dashboard_update');
    }

    res.json({ success: true, message: 'Appointment rescheduled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Queue Status for a specific appointment
// @route   GET /api/appointments/queue-status/:id
// @access  Private
const getQueueStatus = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Identify current patient (lowest token number that is Waiting, Called, or In Consultation)
    // If none, maybe look for the next Pending/Accepted one.
    const currentPatientDoc = await Appointment.findOne({
      docId: appointment.docId,
      slotDate: appointment.slotDate,
      status: { $in: ['Pending', 'Accepted', 'Waiting', 'Called', 'In Consultation'] },
      cancelled: false
    }).sort({ tokenNumber: 1 });

    const currentToken = currentPatientDoc ? currentPatientDoc.tokenNumber : appointment.tokenNumber;

    // Calculate patients ahead
    // Count how many appointments have a lower token number and are still active
    const patientsAhead = await Appointment.countDocuments({
      docId: appointment.docId,
      slotDate: appointment.slotDate,
      tokenNumber: { $lt: appointment.tokenNumber },
      status: { $nin: ['Completed', 'Rejected', 'Skipped', 'No Show'] },
      cancelled: false
    });

    const estimatedWait = patientsAhead * 15; // 15 mins average wait time

    res.json({
      success: true,
      queueData: {
        appointmentId: appointment._id,
        yourToken: appointment.tokenNumber,
        currentToken: currentToken,
        patientsAhead: patientsAhead,
        estimatedWait: estimatedWait,
        status: appointment.status
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { bookAppointment, myAppointments, completeAppointment, cancelAppointment, rescheduleAppointment, getQueueStatus };
