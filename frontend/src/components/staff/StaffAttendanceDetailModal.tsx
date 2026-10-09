import React, { useState, useEffect } from 'react';
import { markAttendanceApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface StaffAttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: any | null;
  attendanceList: any[];
  onAttendanceUpdated: () => void;
}

export const StaffAttendanceDetailModal: React.FC<StaffAttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  staff,
  attendanceList,
  onAttendanceUpdated,
}) => {
  const { showToast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [updatingDate, setUpdatingDate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedYear(new Date().getFullYear());
      setSelectedMonth(new Date().getMonth());
    }
  }, [isOpen, staff]);

  if (!isOpen || !staff) return null;

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to change month
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Generate array of days for selected month
  const getDaysInMonth = (year: number, month: number) => {
    const numDays = new Date(year, month + 1, 0).getDate();
    const daysArr = [];

    for (let day = 1; day <= numDays; day++) {
      const dateObj = new Date(year, month, day);
      // Format YYYY-MM-DD in local time
      const yearStr = dateObj.getFullYear();
      const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dateObj.getDate()).padStart(2, '0');
      const formattedDate = `${yearStr}-${monthStr}-${dayStr}`;

      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const isSunday = dateObj.getDay() === 0;

      // Find attendance record for this staff and date
      const record = attendanceList.find((att) => {
        const attStaffId = att.staff?._id || att.staff;
        if (attStaffId !== staff._id) return false;

        const attDateObj = new Date(att.date);
        return (
          attDateObj.getFullYear() === year &&
          attDateObj.getMonth() === month &&
          attDateObj.getDate() === day
        );
      });

      daysArr.push({
        dayNumber: day,
        formattedDate,
        dateObj,
        dayName,
        isSunday,
        status: record?.status || '',
        attendanceId: record?._id,
        notes: record?.notes || '',
      });
    }

    return daysArr;
  };

  const daysList = getDaysInMonth(selectedYear, selectedMonth);

  // Summary counts for current selected month
  const totalDaysInMonth = daysList.length;
  const presentCount = daysList.filter((d) => d.status === 'Present').length;
  const halfDayCount = daysList.filter((d) => d.status === 'Half Day').length;
  const absentCount = daysList.filter((d) => d.status === 'Absent').length;
  const leaveCount = daysList.filter((d) => d.status === 'Leave').length;
  const unmarkedCount = daysList.filter((d) => !d.status).length;

  const attendancePercentage = totalDaysInMonth > 0
    ? Math.round(((presentCount + halfDayCount * 0.5) / totalDaysInMonth) * 100)
    : 0;

  // Change status for a specific day
  const handleDayStatusChange = async (dateStr: string, newStatus: string, currentNotes?: string) => {
    setUpdatingDate(dateStr);
    try {
      const res = await markAttendanceApi({
        staffId: staff._id,
        date: dateStr,
        status: newStatus,
        notes: currentNotes,
      });

      if (res.success) {
        showToast(`Attendance updated: ${newStatus} on ${dateStr}`, 'success');
        onAttendanceUpdated();
      } else {
        showToast(res.message || 'Failed to update attendance', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating attendance', 'error');
    } finally {
      setUpdatingDate(null);
    }
  };

  // Change Day Type (Working Day, Weekly Off, Store Holiday, Paid Leave) for a specific day
  const handleDayTypeChange = async (dateStr: string, newDayType: string, currentStatus: string) => {
    setUpdatingDate(dateStr);
    try {
      const res = await markAttendanceApi({
        staffId: staff._id,
        date: dateStr,
        status: currentStatus || (newDayType === 'Weekly Off' || newDayType === 'Store Holiday' ? 'Leave' : 'Present'),
        notes: newDayType,
      });

      if (res.success) {
        showToast(`Day Type updated to ${newDayType} on ${dateStr}`, 'success');
        onAttendanceUpdated();
      } else {
        showToast(res.message || 'Failed to update Day Type', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating Day Type', 'error');
    } finally {
      setUpdatingDate(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-brand-600/20 shrink-0">
              {staff.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                {staff.name} <Sparkles className="w-4 h-4 text-brand-500 fill-brand-500" />
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                <span className="flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-400">
                  <Briefcase className="w-3.5 h-3.5" /> {staff.role || 'Staff Member'} {staff.assignedTable ? `(${staff.assignedTable})` : ''}
                </span>
                {staff.mobile && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {staff.mobile}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Navigation & Summary Cards */}
        <div className="p-4 sm:p-6 space-y-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {/* Month Switcher Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                {monthNames[selectedMonth]} {selectedYear} Attendance Log
              </span>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              <button
                onClick={handlePrevMonth}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold text-xs flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Prev Month
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 font-black text-xs">
                {monthNames[selectedMonth]} {selectedYear}
              </span>

              <button
                onClick={handleNextMonth}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold text-xs flex items-center gap-1 transition-all"
              >
                Next Month <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Monthly KPI Stats Cards (3 columns on mobile, 5 on desktop) */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2.5">
            <div className="p-2 sm:p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-center">
              <p className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Present</p>
              <p className="text-sm sm:text-lg font-black text-emerald-700 dark:text-emerald-300">{presentCount} Days</p>
            </div>

            <div className="p-2 sm:p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-center">
              <p className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Half Days</p>
              <p className="text-sm sm:text-lg font-black text-amber-700 dark:text-amber-300">{halfDayCount} Days</p>
            </div>

            <div className="p-2 sm:p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-center">
              <p className="text-[9px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Absent</p>
              <p className="text-sm sm:text-lg font-black text-rose-700 dark:text-rose-300">{absentCount} Days</p>
            </div>

            <div className="p-2 sm:p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/40 text-center">
              <p className="text-[9px] sm:text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">On Leave</p>
              <p className="text-sm sm:text-lg font-black text-sky-700 dark:text-sky-300">{leaveCount} Days</p>
            </div>

            <div className="p-2 sm:p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center col-span-2 sm:col-span-1">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Score</p>
              <p className="text-sm sm:text-lg font-black text-slate-900 dark:text-white">{attendancePercentage}%</p>
            </div>
          </div>
        </div>

        {/* Detailed Daily Attendance Register Table */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Day-by-Day Register ({daysList.length} Days)</span>
            <span className="text-[10px] text-slate-400">Select status for any day</span>
          </div>

          {/* Mobile View: Compact Day Register Cards (< sm) */}
          <div className="sm:hidden space-y-2">
            {daysList.map((day) => {
              const isToday =
                new Date().getFullYear() === selectedYear &&
                new Date().getMonth() === selectedMonth &&
                new Date().getDate() === day.dayNumber;

              return (
                <div
                  key={day.formattedDate}
                  className={`p-3 rounded-2xl border transition-all space-y-2 ${
                    isToday
                      ? 'bg-brand-50/40 border-brand-200 dark:bg-brand-950/20 dark:border-brand-900/50'
                      : day.isSunday
                      ? 'bg-slate-50/70 border-slate-200/80 dark:bg-slate-900/60 dark:border-slate-800'
                      : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                  }`}
                >
                  {/* Top Row: Date & Day Type */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-800 dark:text-slate-200 text-xs">
                        {day.dayNumber}
                      </span>
                      <div>
                        <p className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                          {day.dayNumber} {monthNames[selectedMonth].slice(0, 3)} ({day.dayName})
                          {isToday && (
                            <span className="text-[9px] font-black text-brand-600 dark:text-brand-400">● TODAY</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <select
                      disabled={updatingDate === day.formattedDate}
                      value={day.notes || (day.isSunday ? 'Weekly Off' : 'Working Day')}
                      onChange={(e) => handleDayTypeChange(day.formattedDate, e.target.value, day.status)}
                      className="px-2 py-1 rounded-xl text-[10px] font-extrabold border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    >
                      <option value="Working Day">💼 Working</option>
                      <option value="Weekly Off">🏖️ Off</option>
                      <option value="Store Holiday">🎉 Holiday</option>
                      <option value="Paid Leave">🔵 Leave</option>
                    </select>
                  </div>

                  {/* Bottom Row: Attendance Status Selector */}
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                    <select
                      disabled={updatingDate === day.formattedDate}
                      value={day.status}
                      onChange={(e) => handleDayStatusChange(day.formattedDate, e.target.value, day.notes)}
                      className={`px-2.5 py-1 rounded-xl font-extrabold text-xs cursor-pointer border ${
                        updatingDate === day.formattedDate
                          ? 'opacity-50 pointer-events-none'
                          : !day.status
                          ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200'
                          : day.status === 'Present'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : day.status === 'Half Day'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : day.status === 'Absent'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-sky-50 text-sky-800 border-sky-300'
                      }`}
                    >
                      <option value="">📋 Not Marked</option>
                      <option value="Present">🟢 Present</option>
                      <option value="Half Day">🟡 Half Day</option>
                      <option value="Absent">🔴 Absent</option>
                      <option value="Leave">🔵 On Leave</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View: Day-by-Day Register Table (hidden sm:block) */}
          <div className="hidden sm:block border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Day</th>
                    <th className="py-3 px-4">Day Type</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Quick Mark Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {daysList.map((day) => {
                    const isToday =
                      new Date().getFullYear() === selectedYear &&
                      new Date().getMonth() === selectedMonth &&
                      new Date().getDate() === day.dayNumber;

                    return (
                      <tr
                        key={day.formattedDate}
                        className={`transition-all ${
                          isToday
                            ? 'bg-brand-50/40 dark:bg-brand-950/20 font-bold'
                            : day.isSunday
                            ? 'bg-slate-50/50 dark:bg-slate-900/50'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Date Number & Full Date */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-800 dark:text-slate-200 text-xs">
                              {day.dayNumber}
                            </span>
                            <div>
                              <p className="font-extrabold text-slate-900 dark:text-white">
                                {day.dayNumber} {monthNames[selectedMonth]} {selectedYear}
                              </p>
                              {isToday && (
                                <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase">
                                  ● TODAY
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Day Name */}
                        <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">
                          {day.dayName}
                        </td>

                        {/* Editable Day Type Selector */}
                        <td className="py-3 px-4">
                          <select
                            disabled={updatingDate === day.formattedDate}
                            value={day.notes || (day.isSunday ? 'Weekly Off' : 'Working Day')}
                            onChange={(e) => handleDayTypeChange(day.formattedDate, e.target.value, day.status)}
                            className="px-2.5 py-1.5 rounded-xl font-extrabold text-xs cursor-pointer border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs hover:border-brand-500 transition-all"
                          >
                            <option value="Working Day">💼 Working Day</option>
                            <option value="Weekly Off">🏖️ Weekly Off</option>
                            <option value="Store Holiday">🎉 Store Holiday</option>
                            <option value="Paid Leave">🔵 Paid Leave</option>
                          </select>
                        </td>

                        {/* Current Status Pill */}
                        <td className="py-3 px-4 text-center">
                          {day.status === 'Present' && (
                            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black text-xs inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Present
                            </span>
                          )}
                          {day.status === 'Half Day' && (
                            <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-xs inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Half Day
                            </span>
                          )}
                          {day.status === 'Absent' && (
                            <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-black text-xs inline-flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Absent
                            </span>
                          )}
                          {day.status === 'Leave' && (
                            <span className="px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 font-black text-xs inline-flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-sky-600" /> On Leave
                            </span>
                          )}
                          {!day.status && (
                            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold text-xs inline-flex items-center gap-1">
                              📋 Not Marked
                            </span>
                          )}
                        </td>

                        {/* Quick Mark Dropdown Selector */}
                        <td className="py-3 px-4 text-right">
                          <select
                            disabled={updatingDate === day.formattedDate}
                            value={day.status}
                            onChange={(e) => handleDayStatusChange(day.formattedDate, e.target.value, day.notes)}
                            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs cursor-pointer border shadow-2xs transition-all ${
                              updatingDate === day.formattedDate
                                ? 'opacity-50 pointer-events-none'
                                : !day.status
                                ? 'bg-white text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                                : day.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200'
                                : day.status === 'Half Day'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200'
                                : day.status === 'Absent'
                                ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200'
                                : 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200'
                            }`}
                          >
                            <option value="">📋 Set Status...</option>
                            <option value="Present">🟢 Present</option>
                            <option value="Half Day">🟡 Half Day</option>
                            <option value="Absent">🔴 Absent</option>
                            <option value="Leave">🔵 On Leave</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-between items-center text-xs">
          <p className="text-slate-500 font-medium">
            Changes to attendance are saved automatically to the system database.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold shadow-sm hover:opacity-90 transition-all"
          >
            Close Register Log
          </button>
        </div>

      </div>
    </div>
  );
};
