import React, { useEffect, useState } from 'react';
import { Card, CardContent } from './Card';

const AppointmentCalendar = ({ doctor, selectedDate, selectedTime, onSelectDate, onSelectTime, isLoading }) => {
  const daysofWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [docSlots, setDocSlots] = useState([]);
  const [slotIndex, setSlotIndex] = useState(0);

  // Generate 7 days of slots
  const getAvailableSlots = () => {
    setDocSlots([]);
    const today = new Date();
    const newSlots = [];

    // Check if slot is booked from doctor data
    const isSlotBooked = (dateStr, timeStr) => {
      if (doctor && doctor.slots_booked && doctor.slots_booked[dateStr]) {
        return doctor.slots_booked[dateStr].includes(timeStr);
      }
      return false;
    };

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const endTime = new Date(currentDate);
      endTime.setHours(21, 0, 0, 0); // End at 9 PM
      
      const day = currentDate.getDate();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const dateStr = `${day}_${month}_${year}`;

      if (i === 0) {
        if (currentDate.getHours() >= 18) continue;
        currentDate.setHours(currentDate.getHours() + 1);
        currentDate.setMinutes(currentDate.getMinutes() > 30 ? 0 : 30);
      } else {
        currentDate.setHours(10); // Start at 10 AM
        currentDate.setMinutes(0);
      }

      const timeSlots = [];
      while (currentDate < endTime) {
        const formattedTime = currentDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        
        // Categorize into Morning, Afternoon, Evening
        const hr = currentDate.getHours();
        let period = 'Evening';
        if (hr < 12) period = 'Morning';
        else if (hr < 17) period = 'Afternoon';

        timeSlots.push({
          dateTime: new Date(currentDate),
          time: formattedTime,
          period: period,
          isBooked: isSlotBooked(dateStr, formattedTime)
        });
        currentDate.setMinutes(currentDate.getMinutes() + 30);
      }
      newSlots.push(timeSlots);
    }
    setDocSlots(newSlots);
  };

  useEffect(() => {
    if (doctor) {
      getAvailableSlots();
      setSlotIndex(0);
      if (onSelectDate) onSelectDate(new Date()); // default to today
      if (onSelectTime) onSelectTime('');
    }
  }, [doctor]);

  const handleDateClick = (index, dateObj) => {
    setSlotIndex(index);
    if (onSelectDate) onSelectDate(dateObj);
    if (onSelectTime) onSelectTime(''); // reset time when date changes
  };

  if (isLoading || docSlots.length === 0) {
    return (
      <Card className="border border-gray-100 dark:border-slate-700 shadow-sm animate-pulse">
        <CardContent className="p-6 h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </CardContent>
      </Card>
    );
  }

  const currentSlots = docSlots[slotIndex] || [];
  const morningSlots = currentSlots.filter(s => s.period === 'Morning');
  const afternoonSlots = currentSlots.filter(s => s.period === 'Afternoon');
  const eveningSlots = currentSlots.filter(s => s.period === 'Evening');

  return (
    <div className="space-y-6">
      
      {/* Date Selection Strip */}
      <Card className="border border-gray-100 dark:border-slate-700 shadow-sm transition-all">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm">1</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Date</h2>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {docSlots.map((item, index) => {
              if (item.length === 0) return null;
              const dateObj = item[0].dateTime;
              const isSelected = slotIndex === index;
              
              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(index, dateObj)}
                  className={`snap-start shrink-0 flex flex-col items-center justify-center w-[88px] h-24 rounded-2xl transition-all duration-300 ${
                    isSelected
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900'
                      : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-primary/50'
                  }`}
                >
                  <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${isSelected ? 'opacity-90' : 'text-gray-500'}`}>
                    {daysofWeek[dateObj.getDay()]}
                  </span>
                  <span className="text-2xl font-black">
                    {dateObj.getDate()}
                  </span>
                  <span className={`text-[10px] mt-1 font-semibold ${isSelected ? 'opacity-80' : 'text-green-500'}`}>
                    {item.filter(s => !s.isBooked).length} Slots
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Time Selection */}
      <Card className="border border-gray-100 dark:border-slate-700 shadow-sm transition-all">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm">2</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Time</h2>
          </div>

          {currentSlots.length === 0 ? (
            <div className="py-12 text-center text-gray-500 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50">
              <p className="font-medium">No slots available on this date.</p>
              <p className="text-sm mt-1">Please select another date from above.</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Helper renderer for slot blocks */}
              {[
                { title: 'Morning', icon: '🌅', slots: morningSlots },
                { title: 'Afternoon', icon: '☀️', slots: afternoonSlots },
                { title: 'Evening', icon: '🌙', slots: eveningSlots }
              ].map((block, i) => block.slots.length > 0 && (
                <div key={i}>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>{block.icon}</span> {block.title}
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {block.slots.map((item, index) => {
                      const isSelected = item.time === selectedTime;
                      const isBooked = item.isBooked;

                      let btnStyles = "py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-200 border ";
                      
                      if (isBooked) {
                        btnStyles += "bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60";
                      } else if (isSelected) {
                        btnStyles += "bg-primary text-white border-primary shadow-md";
                      } else {
                        btnStyles += "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-primary/50 hover:bg-primary/5";
                      }

                      return (
                        <button
                          key={index}
                          disabled={isBooked}
                          onClick={() => onSelectTime && onSelectTime(item.time)}
                          className={btnStyles}
                          title={isBooked ? "This slot is already booked" : "Available"}
                        >
                          {item.time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default AppointmentCalendar;
