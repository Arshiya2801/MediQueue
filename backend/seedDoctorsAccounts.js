import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Doctor from './models/doctorModel.js';
import User from './models/userModel.js';

dotenv.config();

const seedDoctorAccounts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const doctors = await Doctor.find({});
    
    for (const doctor of doctors) {
      // Create a formatted email from the doctor's name
      // e.g., "Dr. Richard James" -> "richard.james@doctor.com"
      const nameParts = doctor.name.replace('Dr. ', '').split(' ');
      const email = `${nameParts.join('.').toLowerCase()}@doctor.com`;

      // Check if user already exists
      const userExists = await User.findOne({ email });

      if (!userExists) {
        await User.create({
          name: doctor.name,
          email: email,
          password: 'password123',
          role: 'doctor',
          doctorId: doctor._id
        });
        console.log(`Created account for ${doctor.name}: ${email} / password123`);
      } else {
        // If exists but no doctorId, update it
        if (!userExists.doctorId) {
          userExists.doctorId = doctor._id;
          await userExists.save();
          console.log(`Updated existing account for ${doctor.name} with Doctor ID`);
        } else {
          console.log(`Account already exists for ${doctor.name}: ${email}`);
        }
      }
    }

    console.log('Finished generating doctor accounts.');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedDoctorAccounts();
