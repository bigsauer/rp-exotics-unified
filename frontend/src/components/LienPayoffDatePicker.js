import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, X } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

const LienPayoffDatePicker = ({ value, onChange, placeholder = "Select lien payoff date..." }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateChange = (date) => {
    onChange(date);
    setIsOpen(false);
  };

  const clearDate = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="relative">
      <div 
        className="flex items-center justify-between w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer hover:bg-white/15 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-blue-400" />
          <span className={value ? 'text-white' : 'text-gray-400'}>
            {value ? formatDate(value) : placeholder}
          </span>
        </div>
        {value && (
          <button
            onClick={clearDate}
            className="text-gray-400 hover:text-red-400 transition-colors p-1"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1">
          <DatePicker
            selected={value}
            onChange={handleDateChange}
            inline
            minDate={new Date()}
            showTimeSelect={false}
            dateFormat="MMM dd, yyyy"
            placeholderText={placeholder}
            popperClassName="react-datepicker-popper"
            customInput={<div />}
            onCalendarOpen={() => setIsOpen(true)}
            onCalendarClose={() => setIsOpen(false)}
            popperPlacement="bottom-start"
            popperModifiers={[
              {
                name: "offset",
                options: {
                  offset: [0, 8],
                },
              },
            ]}
          />
        </div>
      )}
      
      {/* Custom styles for the date picker */}
      <style jsx>{`
        .react-datepicker-popper {
          z-index: 9999;
        }
        .react-datepicker {
          background-color: #1f2937;
          border: 1px solid #374151;
          border-radius: 0.5rem;
          font-family: inherit;
        }
        .react-datepicker__header {
          background-color: #374151;
          border-bottom: 1px solid #4b5563;
          border-radius: 0.5rem 0.5rem 0 0;
        }
        .react-datepicker__current-month {
          color: white;
          font-weight: 600;
        }
        .react-datepicker__day-name {
          color: #9ca3af;
        }
        .react-datepicker__day {
          color: white;
          border-radius: 0.25rem;
        }
        .react-datepicker__day:hover {
          background-color: #3b82f6;
        }
        .react-datepicker__day--selected {
          background-color: #3b82f6;
          color: white;
        }
        .react-datepicker__day--keyboard-selected {
          background-color: #3b82f6;
          color: white;
        }
        .react-datepicker__day--today {
          background-color: #1d4ed8;
          color: white;
        }
        .react-datepicker__navigation {
          color: white;
        }
        .react-datepicker__navigation:hover {
          background-color: #374151;
          border-radius: 0.25rem;
        }
        .react-datepicker__month-container {
          background-color: #1f2937;
        }
      `}</style>
    </div>
  );
};

export default LienPayoffDatePicker; 