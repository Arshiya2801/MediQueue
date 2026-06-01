import express from 'express';
import { bookAppointment, myAppointments, completeAppointment, cancelAppointment, rescheduleAppointment, getQueueStatus } from '../controllers/appointmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/book', protect, bookAppointment);
router.get('/my-appointments', protect, myAppointments);
router.put('/complete/:id', protect, completeAppointment);
router.put('/cancel/:id', protect, cancelAppointment);
router.put('/reschedule/:id', protect, rescheduleAppointment);
router.get('/queue-status/:id', protect, getQueueStatus);

export default router;
