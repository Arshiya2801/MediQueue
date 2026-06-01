import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    docId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Doctor',
    },
    slotDate: {
      type: String,
      required: true,
    },
    slotTime: {
      type: String,
      required: true,
    },
    userData: {
      type: Object,
      required: true
    },
    docData: {
      type: Object,
      required: true
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Number,
      required: true
    },
    cancelled: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    status: { type: String, enum: ['Pending', 'Accepted', 'Waiting', 'Called', 'In Consultation', 'Completed', 'Rejected', 'Skipped', 'No Show'], default: 'Pending' },
    paymentStatus: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    receiptUrl: { type: String, default: '' },
    tokenNumber: { type: Number, default: 0 }
  },
  {
    timestamps: true,
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
