import React, { useState, useEffect } from 'react';
import {
  fetchStaffApi,
  createStaffApi,
  updateStaffApi,
  deleteStaffApi,
  fetchAttendanceApi,
  markAttendanceApi,
  deleteAttendanceApi,
  fetchIroningWorkLogsApi,
  logIroningWorkApi,
  fetchStaffPerformanceReportApi,
  fetchSettings,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Users,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Shirt,
  Calendar,
  Award,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  TrendingUp,
  Filter,
  AlertTriangle,
  ChevronDown,
  FileText,
  DollarSign,
} from 'lucide-react';
import { PayslipModal } from '../components/staff/PayslipModal';
import { StaffAttendanceDetailModal } from '../components/staff/StaffAttendanceDetailModal';

export const StaffPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'attendance' | 'ironing' | 'performance'>('attendance');

  // Core Data State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any[]>([]);
  const [ironingLogs, setIroningLogs] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detailed Attendance Log Modal State
  const [selectedDetailStaff, setSelectedDetailStaff] = useState<any | null>(null);

  // Payslip Modal State
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [selectedPayslipStaff, setSelectedPayslipStaff] = useState<any | null>(null);

  // Performance Report Date Filter (today, month, year, custom)
  const [reportFilter, setReportFilter] = useState<'today' | 'month' | 'year' | 'custom'>('month');
  const [repStartDate, setRepStartDate] = useState<string>('');
  const [repEndDate, setRepEndDate] = useState<string>('');
  const [isCustomReportFilterOpen, setIsCustomReportFilterOpen] = useState(false);

  // Attendance Date Filter (month, last6months, year, custom)
  const [attendanceFilter, setAttendanceFilter] = useState<'month' | 'last6months' | 'year' | 'custom'>('month');
  const [attStartDate, setAttStartDate] = useState<string>('');
  const [attEndDate, setAttEndDate] = useState<string>('');

  // Attendance Table Pagination State
  const [attPage, setAttPage] = useState<number>(1);
  const [attPageSize, setAttPageSize] = useState<number>(10);

  // Ironing Logs Pagination State
  const [ironingPage, setIroningPage] = useState<number>(1);
  const [ironingPageSize, setIroningPageSize] = useState<number>(5);

  // Delete Staff Modal State
  const [deletingStaff, setDeletingStaff] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Staff Modal State
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    mobile: '',
    role: 'Ironing Master',
    assignedTable: 'Table 1',
    removeDate: '',
  });

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<any | null>(null);

  // Manual Attendance Log Modal State
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [manualLogForm, setManualLogForm] = useState({
    staffId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
  });

  // Log Ironing Work Form State
  const [ironingForm, setIroningForm] = useState({
    tableName: 'Table 1',
    staffId: '',
    staffName: '',
    itemName: '',
    quantity: 10,
    notes: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, attRes, ironRes, repRes, setRes] = await Promise.all([
        fetchStaffApi(),
        fetchAttendanceApi({
          period: attendanceFilter,
          startDate: attendanceFilter === 'custom' ? attStartDate : undefined,
          endDate: attendanceFilter === 'custom' ? attEndDate : undefined,
        }),
        fetchIroningWorkLogsApi(),
        fetchStaffPerformanceReportApi({
          filter: reportFilter,
          startDate: reportFilter === 'custom' ? repStartDate : undefined,
          endDate: reportFilter === 'custom' ? repEndDate : undefined,
        }),
        fetchSettings().catch(() => null),
      ]);

      if (staffRes.success) {
        setStaffList(staffRes.staff || []);
        if (staffRes.staff && staffRes.staff.length > 0 && !ironingForm.staffName) {
          setIroningForm((prev) => ({
            ...prev,
            staffId: staffRes.staff[0]._id,
            staffName: staffRes.staff[0].name,
            tableName: staffRes.staff[0].assignedTable || 'Table 1',
          }));
        }
      }

      if (attRes.success) {
        setAttendanceList(attRes.attendance || []);
        setAttendanceSummary(attRes.monthlySummary || []);
      }

      if (ironRes.success) setIroningLogs(ironRes.logs || []);
      if (repRes.success) setReportData(repRes);
      if (setRes && setRes.setting) setShopSettings(setRes.setting);
    } catch (err) {
      console.error('Failed to load staff data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reportFilter, attendanceFilter, attStartDate, attEndDate, repStartDate, repEndDate]);

  // Handle Add Staff Submit
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim()) {
      showToast('Please enter staff name', 'error');
      return;
    }
    try {
      const res = await createStaffApi(newStaff);
      if (res.success) {
        showToast('Staff member added successfully!', 'success');
        setIsAddStaffOpen(false);
        setNewStaff({ name: '', mobile: '', role: 'Ironing Master', assignedTable: '', removeDate: '' });
        loadData();
      } else {
        showToast(res.message || 'Failed to add staff', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error adding staff', 'error');
    }
  };

  // Handle Staff Update
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      const res = await updateStaffApi(editingStaff._id, editingStaff);
      if (res.success) {
        showToast('Staff details updated!', 'success');
        setEditingStaff(null);
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating staff', 'error');
    }
  };

  // Open Delete Confirmation Modal
  const handleDeleteStaff = (id: string, name: string) => {
    setDeletingStaff({ id, name });
  };

  // Confirm Delete Staff Execution
  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    try {
      const res = await deleteStaffApi(deletingStaff.id);
      if (res.success) {
        showToast(`Staff member "${deletingStaff.name}" removed successfully`, 'info');
        setDeletingStaff(null);
        loadData();
      } else {
        showToast(res.message || 'Failed to remove staff member', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting staff member', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Attendance Status Change via Explicit Dropdown
  const handleAttendanceChange = async (staffId: string, newStatus: string) => {
    try {
      const res = await markAttendanceApi({
        staffId,
        status: newStatus,
      });
      if (res.success) {
        showToast(`Attendance marked as ${newStatus}`, 'success');
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating attendance', 'error');
    }
  };

  // Handle Log Ironing Work Submit
  const handleLogIroning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ironingForm.itemName.trim()) {
      showToast('Please enter item description (e.g. Shirts, Sarees)', 'error');
      return;
    }
    if (!ironingForm.quantity || Number(ironingForm.quantity) <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }

    try {
      const res = await logIroningWorkApi(ironingForm);
      if (res.success) {
        showToast(`Logged ${ironingForm.quantity} ${ironingForm.itemName} for ${ironingForm.tableName}!`, 'success');
        setIroningForm({ ...ironingForm, itemName: '', quantity: 10, notes: '' });
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error logging work', 'error');
    }
  };

  // Handle Delete Attendance Record
  const handleDeleteAttendanceLog = async (id: string, staffName: string, date: string) => {
    const formattedDate = new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!window.confirm(`Delete attendance record for ${staffName} on ${formattedDate}?`)) return;

    try {
      const res = await deleteAttendanceApi(id);
      if (res.success) {
        showToast(`Deleted attendance log for ${staffName}`, 'success');
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting attendance log', 'error');
    }
  };

  // Handle Create Manual Attendance Log
  const handleCreateManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLogForm.staffId) {
      showToast('Please select a staff member', 'error');
      return;
    }

    try {
      const res = await markAttendanceApi({
        staffId: manualLogForm.staffId,
        date: manualLogForm.date,
        status: manualLogForm.status,
      });

      if (res.success) {
        showToast('Attendance log added successfully!', 'success');
        setShowAddLogModal(false);
        setManualLogForm({
          staffId: '',
          date: new Date().toISOString().split('T')[0],
          status: 'Present',
        });
        loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error adding attendance log', 'error');
    }
  };

  // Staff Attendance Table Pagination Calculations (One row per staff)
  const totalStaffRecords = staffList.length;
  const totalAttPages = Math.ceil(totalStaffRecords / attPageSize) || 1;
  const attStartIndex = (attPage - 1) * attPageSize;
  const paginatedStaffList = staffList.slice(attStartIndex, attStartIndex + attPageSize);

  // Ironing Table Pagination Calculations
  const totalIroningRecords = ironingLogs.length;
  const totalIroningPages = Math.ceil(totalIroningRecords / ironingPageSize) || 1;
  const ironingStartIndex = (ironingPage - 1) * ironingPageSize;
  const paginatedIroningLogs = ironingLogs.slice(ironingStartIndex, ironingStartIndex + ironingPageSize);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-brand-600 text-white shadow-md shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Staff & Attendance Management
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500">
              Track staff attendance, table assignments, and daily ironing productivity
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={loadData}
            className="flex-1 sm:flex-none p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => {
              setSelectedPayslipStaff(staffList[0] || null);
              setIsPayslipOpen(true);
            }}
            className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
          >
            <FileText className="w-4 h-4" /> Payslip Generator
          </button>
          <button
            onClick={() => setIsAddStaffOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs"
          >
            <UserPlus className="w-4 h-4" /> + Add Staff Member
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 glass-card p-1.5">
        {[
          { id: 'attendance', label: '1. Daily Attendance & Staff List', icon: Calendar },
          { id: 'ironing', label: '2. Ironing & Daily Work Logger', icon: Shirt },
          { id: 'performance', label: '3. Performance Reports', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="glass-card p-6 flex items-center justify-center gap-3 text-brand-600 dark:text-brand-400 animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-xs font-black tracking-wide uppercase">Fetching Staff & Attendance Records...</span>
        </div>
      )}

      {/* TAB 1: DAILY ATTENDANCE & REGISTER */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Dynamic Attendance Records Log Table (One row per staff member) */}
          <div className="glass-card p-4 sm:p-6 space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-600" /> Attendance Records Log Table
                </h3>
                <p className="text-xs text-slate-500">
                  Staff list summary with total present & absent counts for selected filter range
                </p>
              </div>

              {/* Filter Pills & Add Manual Log Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                <button
                  onClick={() => setShowAddLogModal(true)}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Attendance Log
                </button>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto max-w-full">
                  {[
                    { id: 'month', label: 'Current Month' },
                    { id: 'last6months', label: 'Last 6 Months' },
                    { id: 'year', label: 'Year' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setAttendanceFilter(f.id as any)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap shrink-0 transition-all ${
                        attendanceFilter === f.id
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {attendanceFilter === 'custom' && (
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <input
                      type="date"
                      value={attStartDate}
                      onChange={(e) => setAttStartDate(e.target.value)}
                      className="flex-1 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="date"
                      value={attEndDate}
                      onChange={(e) => setAttEndDate(e.target.value)}
                      className="flex-1 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Mobile View: Compact Responsive Staff Cards (< sm) */}
            <div className="sm:hidden space-y-3">
              {paginatedStaffList.map((staff) => {
                const att = attendanceList.find((a) => (a.staff?._id || a.staff) === staff._id);
                const currentStatus = att?.status || '';
                const summary = attendanceSummary.find((s) => s._id === staff._id || s.staffName === staff.name);
                const presentCount = summary?.presentDays || 0;
                const absentCount = summary?.absentDays || 0;

                return (
                  <div
                    key={staff._id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
                  >
                    {/* Header: Staff Name, Role & Action Buttons */}
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailStaff(staff)}
                        className="text-left"
                      >
                        <p className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1">
                          {staff.name} <Calendar className="w-3.5 h-3.5 text-brand-500" />
                        </p>
                        <p className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                          {staff.role || 'Staff'} {staff.assignedTable ? `• ${staff.assignedTable}` : ''}
                        </p>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedDetailStaff(staff)}
                          className="px-2.5 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-extrabold text-xs flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <Calendar className="w-3.5 h-3.5" /> Log
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPayslipStaff(staff);
                            setIsPayslipOpen(true);
                          }}
                          className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs active:scale-95 transition-all"
                          title="Generate Payslip"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Footer: Attendance Status Selector & Present/Absent Pills */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <select
                        value={currentStatus}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAttendanceChange(staff._id, e.target.value);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl font-bold text-xs cursor-pointer border transition-all ${
                          !currentStatus
                            ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200'
                            : currentStatus === 'Present'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : currentStatus === 'Half Day'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : currentStatus === 'Absent'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-sky-100 text-sky-800 border-sky-300'
                        }`}
                      >
                        <option value="" disabled hidden>
                          📋 Not Marked
                        </option>
                        <option value="Present">🟢 Present</option>
                        <option value="Half Day">🟡 Half Day</option>
                        <option value="Absent">🔴 Absent</option>
                        <option value="Leave">🔵 On Leave</option>
                      </select>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedDetailStaff(staff)}
                          className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px]"
                        >
                          {presentCount} Days
                        </button>
                        <button
                          onClick={() => setSelectedDetailStaff(staff)}
                          className="px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold text-[11px]"
                        >
                          {absentCount} Abs
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Attendance Summary Table (sm:block) */}
            <div className="hidden sm:block overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900">
                    <th className="py-3 px-3">Staff Name</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Attendance Status</th>
                    <th className="py-3 px-3 text-center">Total Present</th>
                    <th className="py-3 px-3 text-center">Total Absent</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {paginatedStaffList.map((staff) => {
                    const att = attendanceList.find((a) => (a.staff?._id || a.staff) === staff._id);
                    const currentStatus = att?.status || '';
                    const summary = attendanceSummary.find((s) => s._id === staff._id || s.staffName === staff.name);
                    const presentCount = summary?.presentDays || 0;
                    const absentCount = summary?.absentDays || 0;

                    return (
                      <tr key={staff._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailStaff(staff)}
                            className="text-left group cursor-pointer"
                            title="Click to view detailed day-by-day attendance log"
                          >
                            <p className="font-extrabold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-1.5">
                              {staff.name} <Calendar className="w-3.5 h-3.5 text-brand-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </p>
                            {staff.mobile && <p className="text-[10px] text-slate-400">Mob: {staff.mobile}</p>}
                          </button>
                        </td>
                        <td className="py-3 px-3 font-semibold text-brand-600 dark:text-brand-400">
                          {staff.role || 'Staff'} {staff.assignedTable ? `• ${staff.assignedTable}` : ''}
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={currentStatus}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAttendanceChange(staff._id, e.target.value);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-xl font-bold text-xs cursor-pointer border transition-all ${
                              !currentStatus
                                ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-200'
                                : currentStatus === 'Present'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : currentStatus === 'Half Day'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : currentStatus === 'Absent'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-sky-100 text-sky-800 border-sky-300'
                            }`}
                          >
                            <option value="" disabled hidden>
                              📋 Not Marked
                            </option>
                            <option value="Present">🟢 Present</option>
                            <option value="Half Day">🟡 Half Day</option>
                            <option value="Absent">🔴 Absent</option>
                            <option value="Leave">🔵 On Leave</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailStaff(staff)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-black text-xs transition-all cursor-pointer"
                            title="Click to view day-by-day present records"
                          >
                            {presentCount} Days
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailStaff(staff)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-black text-xs transition-all cursor-pointer"
                            title="Click to view day-by-day absent records"
                          >
                            {absentCount} Days
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedDetailStaff(staff)}
                              className="px-2 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 hover:bg-brand-100 font-extrabold text-xs flex items-center gap-1 transition-all"
                              title="View detailed daily attendance log for staff"
                            >
                              <Calendar className="w-3.5 h-3.5" /> Detailed Log
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayslipStaff(staff);
                                setIsPayslipOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-extrabold text-xs flex items-center gap-1 transition-all"
                              title="Generate Payslip for staff"
                            >
                              <FileText className="w-3.5 h-3.5" /> Payslip
                            </button>
                            <button
                              onClick={() => setEditingStaff(staff)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                              title="Edit Staff Member"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staff._id, staff.name)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all"
                              title="Delete Staff Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {totalStaffRecords > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-500 font-semibold">
                  <span>
                    Showing <strong className="text-slate-900 dark:text-white">{attStartIndex + 1}</strong> to{' '}
                    <strong className="text-slate-900 dark:text-white">{Math.min(attStartIndex + attPageSize, totalStaffRecords)}</strong> of{' '}
                    <strong className="text-slate-900 dark:text-white">{totalStaffRecords}</strong> staff members
                  </span>
                  <select
                    value={attPageSize}
                    onChange={(e) => {
                      setAttPageSize(Number(e.target.value));
                      setAttPage(1);
                    }}
                    className="ml-2 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs cursor-pointer"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAttPage((prev) => Math.max(prev - 1, 1))}
                    disabled={attPage === 1}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs"
                  >
                    Previous
                  </button>

                  <span className="px-3 py-1.5 font-black text-brand-600 dark:text-brand-400 text-xs">
                    Page {attPage} of {totalAttPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setAttPage((prev) => Math.min(prev + 1, totalAttPages))}
                    disabled={attPage === totalAttPages}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: IRONING & DAILY WORK LOGGER */}
      {activeTab === 'ironing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form */}
          <div className="lg:col-span-5 glass-card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Shirt className="w-5 h-5 text-brand-600" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Log Ironed Clothes</h3>
            </div>

            <form onSubmit={handleLogIroning} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Ironing Table:</label>
                <select
                  value={ironingForm.tableName}
                  onChange={(e) => setIroningForm({ ...ironingForm, tableName: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  <option value="Table 1">Table 1</option>
                  <option value="Table 2">Table 2</option>
                  <option value="Table 3">Table 3</option>
                  <option value="Custom Table">Custom Table</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Staff Member at Table:</label>
                <select
                  value={ironingForm.staffId}
                  onChange={(e) => {
                    const selected = staffList.find((s) => s._id === e.target.value);
                    setIroningForm({
                      ...ironingForm,
                      staffId: e.target.value,
                      staffName: selected ? selected.name : '',
                    });
                  }}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Item Description (Type Clothes Name):</label>
                <input
                  type="text"
                  required
                  value={ironingForm.itemName}
                  onChange={(e) => setIroningForm({ ...ironingForm, itemName: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-sm"
                  placeholder="e.g. Shirts, Sarees, Jeans, Pants, Cottons"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Quantity Ironed (Pieces):</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={ironingForm.quantity}
                  onChange={(e) => setIroningForm({ ...ironingForm, quantity: Number(e.target.value) })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-sm"
                  placeholder="25"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Save Ironing Work Log
              </button>
            </form>
          </div>

          {/* Right History Table with Pagination */}
          <div className="lg:col-span-7 glass-card p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                Recent Ironing Work Entries
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedIroningLogs.map((log) => (
                  <div key={log._id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {log.itemName} <span className="text-brand-600">({log.quantity} pcs)</span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {log.tableName} • Staff: <strong className="text-slate-700 dark:text-slate-300">{log.staffName}</strong> • {new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="font-black text-xs text-brand-600 bg-brand-50 dark:bg-brand-950 px-2.5 py-1 rounded-lg">
                      +{log.quantity} items
                    </span>
                  </div>
                ))}

                {ironingLogs.length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center italic">No ironing work entries logged yet.</p>
                )}
              </div>
            </div>

            {/* Ironing Pagination Bar */}
            {totalIroningRecords > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-semibold">Rows:</span>
                  <select
                    value={ironingPageSize}
                    onChange={(e) => {
                      setIroningPageSize(Number(e.target.value));
                      setIroningPage(1);
                    }}
                    className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-extrabold text-xs cursor-pointer"
                  >
                    <option value={5}>5 / page</option>
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                  </select>
                  <span className="text-slate-400 font-medium">
                    Showing {ironingStartIndex + 1} to {Math.min(ironingStartIndex + ironingPageSize, totalIroningRecords)} of {totalIroningRecords}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={ironingPage === 1}
                    onClick={() => setIroningPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 font-bold hover:bg-slate-200"
                  >
                    Prev
                  </button>
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">
                    {ironingPage} / {totalIroningPages}
                  </span>
                  <button
                    disabled={ironingPage >= totalIroningPages}
                    onClick={() => setIroningPage((p) => Math.min(totalIroningPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 font-bold hover:bg-slate-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PERFORMANCE REPORTS */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Report Filter Bar & Cards */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" /> Performance Reports
                </h3>
                <p className="text-xs text-slate-500">
                  Filter work productivity by Day, Month, Year, or Custom Date Range
                </p>
              </div>

              {/* Performance Date Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'month', label: 'Current Month' },
                    { id: 'year', label: 'Current Year' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setReportFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                        reportFilter === f.id
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {reportFilter === 'custom' && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={repStartDate}
                      onChange={(e) => setRepStartDate(e.target.value)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="date"
                      value={repEndDate}
                      onChange={(e) => setRepEndDate(e.target.value)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            {reportData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Top Staff Contribution */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4 border-t-4 border-t-amber-500">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" /> Top Staff Contribution
                  </h4>
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {(reportData.staffTotals || []).map((s: any) => (
                      <div key={s._id} className="py-3 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{s._id}</span>
                        <span className="font-black text-amber-600 text-sm">{s.totalQuantity} items</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Output by Ironing Table */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4 border-t-4 border-t-brand-600">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-brand-600" /> Output by Ironing Table
                  </h4>
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {(reportData.tableTotals || []).map((t: any) => (
                      <div key={t._id} className="py-3 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{t._id}</span>
                        <span className="font-black text-brand-600 text-sm">{t.totalQuantity} items</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF MEMBER */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white">+ Add New Staff Member</h2>
            <form onSubmit={handleSaveStaff} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Staff Full Name:</label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  placeholder="e.g. Ramesh"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Role / Position (Type Role):</label>
                <input
                  type="text"
                  required
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  placeholder="e.g. Ironing Master, Washer Operator, Helper"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Assigned Table / Machine (Optional):</label>
                <input
                  type="text"
                  value={newStaff.assignedTable}
                  onChange={(e) => setNewStaff({ ...newStaff, assignedTable: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  placeholder="e.g. Table 1, Table 2, Washer Area"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Mobile Number (Optional):</label>
                <input
                  type="text"
                  value={newStaff.mobile}
                  onChange={(e) => setNewStaff({ ...newStaff, mobile: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white font-black"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STAFF MEMBER */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white">Edit Staff Details</h2>
            <form onSubmit={handleUpdateStaff} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Staff Full Name:</label>
                <input
                  type="text"
                  required
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Role / Position:</label>
                <input
                  type="text"
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Assigned Table / Machine:</label>
                <input
                  type="text"
                  value={editingStaff.assignedTable}
                  onChange={(e) => setEditingStaff({ ...editingStaff, assignedTable: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Mobile Number:</label>
                <input
                  type="text"
                  value={editingStaff.mobile}
                  onChange={(e) => setEditingStaff({ ...editingStaff, mobile: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Remove Date (Optional):</label>
                <input
                  type="date"
                  value={editingStaff.removeDate ? new Date(editingStaff.removeDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, removeDate: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white font-black"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE STAFF CONFIRMATION */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 space-y-4 text-center border-t-4 border-t-rose-500 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900 dark:text-white">Delete Staff Member?</h2>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{deletingStaff.name}</strong> from your shop roster? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-2 shadow-xs"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Deleting...' : 'Yes, Delete Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD MANUAL ATTENDANCE LOG */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card p-6 space-y-4 shadow-2xl border-t-4 border-t-brand-600 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-600" /> Add Attendance Record Manually
              </h3>
              <button
                type="button"
                onClick={() => setShowAddLogModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualLog} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Staff Member:</label>
                <select
                  required
                  value={manualLogForm.staffId}
                  onChange={(e) => setManualLogForm({ ...manualLogForm, staffId: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                >
                  <option value="">-- Select Staff Member --</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Date:</label>
                <input
                  type="date"
                  required
                  value={manualLogForm.date}
                  onChange={(e) => setManualLogForm({ ...manualLogForm, date: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Attendance Status:</label>
                <select
                  value={manualLogForm.status}
                  onChange={(e) => setManualLogForm({ ...manualLogForm, status: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                >
                  <option value="Present">🟢 Present</option>
                  <option value="Half Day">🟡 Half Day</option>
                  <option value="Absent">🔴 Absent</option>
                  <option value="Leave">🔵 On Leave</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs shadow-xs"
                >
                  Save Log Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: PAYSLIP GENERATOR */}
      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        staff={selectedPayslipStaff}
        staffList={staffList}
        attendanceSummary={attendanceSummary}
        shopSettings={shopSettings}
      />

      {/* MODAL: DETAILED STAFF ATTENDANCE CALENDAR REGISTER */}
      <StaffAttendanceDetailModal
        isOpen={!!selectedDetailStaff}
        onClose={() => setSelectedDetailStaff(null)}
        staff={selectedDetailStaff}
        attendanceList={attendanceList}
        onAttendanceUpdated={loadData}
      />
    </div>
  );
};
