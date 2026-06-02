import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { Card, CardContent } from '../components/ui/Card';
import { CreditCard, QrCode, Building, Globe, User, Calendar, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import DoctorAvatar from '../components/ui/DoctorAvatar';
import MockRazorpayModal from '../components/ui/MockRazorpayModal';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, backendUrl, token, currencySymbol, getDoctorsData } = useContext(AppContext);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('razorpay');
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [currentAppointmentId, setCurrentAppointmentId] = useState(null);

  const paymentMethods = [
    { id: 'razorpay', label: 'Razorpay', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'upi', label: 'UPI / QR', icon: <QrCode className="w-5 h-5" /> },
    { id: 'card', label: 'Credit / Debit Card', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'netbanking', label: 'Net Banking', icon: <Building className="w-5 h-5" /> }
  ];

  // If no state is passed, redirect back
  useEffect(() => {
    if (!location.state || !location.state.docId) {
      toast.error("Invalid payment session");
      navigate('/doctors');
    }
  }, [location, navigate]);

  if (!location.state || !location.state.doctor) return null;

  const { docId, selectedTime, doctor } = location.state;
  const selectedDate = new Date(location.state.selectedDate); // Parse it reliably

  const consultationFee = doctor.fees;
  const platformFee = 50;
  const taxes = 18; // Flat tax for demo
  const totalAmount = consultationFee + platformFee + taxes;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!token) {
      toast.error("Please login to complete payment");
      navigate('/login');
      return;
    }

    if (selectedMethod !== 'razorpay') {
      toast.error("Only Razorpay is supported in this demo.");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create Appointment first to get ID
      let day = selectedDate.getDate();
      let month = selectedDate.getMonth() + 1;
      let year = selectedDate.getFullYear();
      const slotDate = `${day}_${month}_${year}`;

      const { data: appData } = await axios.post(
        backendUrl + '/api/appointments/book',
        { docId, slotDate, slotTime: selectedTime },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!appData.success) {
        setIsProcessing(false);
        return toast.error(appData.message);
      }

      const appointmentId = appData.appointmentId;
      setCurrentAppointmentId(appointmentId);
      setIsProcessing(false);
      setIsMockModalOpen(true); // Open our mock modal instead of real Razorpay
      
    } catch (error) {
      console.log(error);
      setIsProcessing(false);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleMockSuccess = () => {
    setIsMockModalOpen(false);
    toast.success("Payment successful! (Simulated)");
    getDoctorsData();
    navigate('/confirmation', { 
      state: { doctor, selectedDate, selectedTime, appointmentId: currentAppointmentId } 
    });
  };

  const handleMockFailed = () => {
    setIsMockModalOpen(false);
    toast.error("Payment Failed: Simulated Failure");
  };

  const handleMockCancel = () => {
    setIsMockModalOpen(false);
    toast.info("Payment Cancelled");
  };



  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 dark:bg-slate-900 py-10 px-4 animate-fade-in">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Secure Checkout</h1>
          <p className="text-gray-500 mt-2">Review your details and complete your payment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left Column - Details & Methods */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Patient Summary */}
            <Card className="border border-gray-100 dark:border-slate-700 shadow-sm bg-white dark:bg-surface-dark">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Patient Details
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">{userData ? userData.name : 'Loading...'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">{userData ? userData.email : 'Loading...'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Summary */}
            <Card className="border border-gray-100 dark:border-slate-700 shadow-sm bg-white dark:bg-surface-dark">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Appointment Summary
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <DoctorAvatar doctor={doctor} className="w-16 h-16 text-xl" showContainer={false} />
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{doctor.name}</h4>
                    <p className="text-primary font-medium text-sm">{doctor.speciality}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold text-gray-900 dark:text-white">Date:</span> {selectedDate.toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold text-gray-900 dark:text-white">Time:</span> {selectedTime}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="border border-gray-100 dark:border-slate-700 shadow-sm bg-white dark:bg-surface-dark">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" /> Select Payment Method
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {paymentMethods.map(method => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                        selectedMethod === method.id 
                          ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                          : 'border-gray-200 dark:border-slate-700 hover:border-primary/50 bg-transparent'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === method.id ? 'border-primary' : 'border-gray-300'
                      }`}>
                        {selectedMethod === method.id && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                      </div>
                      <span className="text-xl">{method.icon}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{method.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <Card className="border border-gray-100 dark:border-slate-700 shadow-lg bg-white dark:bg-surface-dark overflow-hidden">
                <div className="bg-slate-900 dark:bg-slate-800 p-6">
                  <h3 className="font-bold text-lg text-white">Payment Summary</h3>
                </div>
                
                <CardContent className="p-6 space-y-6">
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                      <span>Consultation Fee</span>
                      <span className="font-medium">{currencySymbol}{consultationFee}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                      <span>Platform Fee</span>
                      <span className="font-medium">{currencySymbol}{platformFee}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                      <span>Taxes & GST</span>
                      <span className="font-medium">{currencySymbol}{taxes}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-dashed border-gray-300 dark:border-slate-600 flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white text-lg">Total Amount</span>
                    <span className="font-black text-primary text-3xl">{currencySymbol}{totalAmount}</span>
                  </div>

                  <div className="pt-6 space-y-3">
                    <Button 
                      fullWidth 
                      size="lg" 
                      onClick={handlePayment} 
                      isLoading={isProcessing}
                    >
                      {isProcessing ? 'Processing Payment...' : `Pay ${currencySymbol}${totalAmount}`}
                    </Button>
                    <Button 
                      fullWidth 
                      variant="outline" 
                      onClick={() => navigate(-1)}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-4">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    256-bit SSL Encrypted
                  </div>

                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>
      
      <MockRazorpayModal 
        isOpen={isMockModalOpen}
        onClose={handleMockCancel}
        onSuccess={handleMockSuccess}
        onFailed={handleMockFailed}
        amount={totalAmount}
        currencySymbol={currencySymbol}
      />
    </div>
  );
};

export default Payment;
