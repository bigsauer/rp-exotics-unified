import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, X, Clock, ChevronDown } from 'lucide-react';
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
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: undefined,
      hour12: true
    });
    return `${dateStr} at ${timeStr}`;
  };

  return (
    <div className="relative">
      <div 
        className="flex items-center justify-between w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer hover:bg-white/15 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className={value ? 'text-white font-medium' : 'text-gray-400'}>
              {value ? formatDate(value) : placeholder}
            </span>
          </div>
          {value && (
            <div className="flex items-center space-x-1 text-sm text-blue-300">
              <Clock className="h-3 w-3" />
              <span>{value.toLocaleTimeString('en-US', { hour: 'numeric', minute: undefined, hour12: true })}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {value && (
            <button
              onClick={clearDate}
              className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-red-400/10"
              title="Clear date"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-2">
          <DatePicker
            selected={value}
            onChange={handleDateChange}
            inline
            minDate={new Date()}
            showTimeSelect={true}
            showTimeSelectOnly={false}
            timeIntervals={60} // 1 hour intervals
            timeCaption="Time"
            dateFormat="MMM dd, yyyy h:mm aa"
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
      
      {/* Enhanced custom styles for the date picker */}
      <style jsx>{`
        .react-datepicker-popper {
          z-index: 9999;
        }
        .react-datepicker {
          background-color: #1f2937;
          border: 1px solid #374151;
          border-radius: 0.75rem;
          font-family: inherit;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
        }
        .react-datepicker__header {
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border-bottom: 1px solid #4b5563;
          border-radius: 0.75rem 0.75rem 0 0;
          padding: 1rem 0;
        }
        .react-datepicker__current-month {
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        .react-datepicker__day-name {
          color: #d1d5db;
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0.5rem 0;
        }
        .react-datepicker__day {
          color: white;
          border-radius: 0.375rem;
          margin: 0.125rem;
          width: 2rem;
          height: 2rem;
          line-height: 2rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .react-datepicker__day:hover {
          background-color: #3b82f6;
          transform: scale(1.05);
        }
        .react-datepicker__day--selected {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }
        .react-datepicker__day--keyboard-selected {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          font-weight: 600;
        }
        .react-datepicker__day--today {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
          color: white;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(29, 78, 216, 0.3);
        }
        .react-datepicker__navigation {
          color: white;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 0.375rem;
          width: 2rem;
          height: 2rem;
          transition: all 0.2s ease;
        }
        .react-datepicker__navigation:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }
        .react-datepicker__month-container {
          background-color: #1f2937;
          border-radius: 0.75rem;
        }
        .react-datepicker__time-container {
          background-color: #1f2937;
          border-left: 1px solid #4b5563;
          border-radius: 0 0.75rem 0.75rem 0;
        }
        .react-datepicker__time {
          background-color: #1f2937;
          border-radius: 0 0.75rem 0.75rem 0;
        }
        .react-datepicker__time-box {
          background-color: #1f2937;
          border-radius: 0 0.75rem 0.75rem 0;
        }
        .react-datepicker__time-list {
          background-color: #1f2937;
          border-radius: 0 0.75rem 0.75rem 0;
          padding: 0.5rem 0;
        }
        .react-datepicker__time-list-item {
          color: white;
          padding: 0.5rem 1rem;
          font-weight: 500;
          transition: all 0.2s ease;
          border-radius: 0.25rem;
          margin: 0.125rem 0.5rem;
        }
        .react-datepicker__time-list-item:hover {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          transform: scale(1.02);
        }
        .react-datepicker__time-list-item--selected {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }
        .react-datepicker__time-list-item--disabled {
          color: #6b7280;
          opacity: 0.5;
        }
        .react-datepicker__time-caption {
          color: white;
          font-weight: 700;
          font-size: 1rem;
          padding: 0.75rem 1rem 0.5rem;
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border-bottom: 1px solid #4b5563;
        }
        .react-datepicker__time-list::-webkit-scrollbar {
          width: 6px;
        }
        .react-datepicker__time-list::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 3px;
        }
        .react-datepicker__time-list::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 3px;
        }
        .react-datepicker__time-list::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default LienPayoffDatePicker; 