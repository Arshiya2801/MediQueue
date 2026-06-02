import express from 'express';
import { getDoctors, addDoctor, getDoctorById, getDoctorAppointments, updateAppointmentStatus, getDoctorDashboard, getDoctorPatients, getMyProfile } from '../controllers/doctorController.js';
import { protect as authUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(getDoctors).post(addDoctor);
router.route('/appointments').get(authUser, getDoctorAppointments);
router.route('/dashboard').get(authUser, getDoctorDashboard);
router.route('/appointment-status').put(authUser, updateAppointmentStatus);
router.route('/patients').get(authUser, getDoctorPatients);
router.route('/my-profile').get(authUser, getMyProfile);
router.route('/:id').get(getDoctorById);

export default router;
