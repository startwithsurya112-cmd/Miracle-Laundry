import { Request, Response } from 'express';
import Staff from '../models/Staff';
import Attendance from '../models/Attendance';
import IroningWorkLog from '../models/IroningWorkLog';
import Setting from '../models/Setting';
import { sendAutomatedWhatsAppDocument } from '../services/whatsappGateway';
import { generatePayslipPDFBuffer } from '../utils/pdfGenerator';

// -------------------------------------------------------------
// 1. Staff Profile Management
// -------------------------------------------------------------
export const getAllStaff = async (req: Request, res: Response) => {
  try {
    const staffList = await Staff.find().sort({ createdAt: 1 });
    return res.json({ success: true, staff: staffList });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createStaff = async (req: Request, res: Response) => {
  try {
    const { name, mobile, role, assignedTable, removeDate } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Staff name is required.' });
    }

    const newStaff = new Staff({
      name: name.trim(),
      mobile: mobile ? mobile.trim() : '',
      role: role ? role.trim() : 'Ironing Staff',
      assignedTable: assignedTable ? assignedTable.trim() : 'Table 1',
      dailyWage: 0,
      status: 'Active',
      removeDate: removeDate ? new Date(removeDate) : undefined,
    });

    await newStaff.save();
    return res.status(201).json({ success: true, staff: newStaff, message: 'Staff member added successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, mobile, role, assignedTable, status, removeDate } = req.body;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (name) staff.name = name.trim();
    if (mobile !== undefined) staff.mobile = mobile.trim();
    if (role !== undefined) staff.role = role.trim();
    if (assignedTable !== undefined) staff.assignedTable = assignedTable.trim();
    if (status) staff.status = status;
    if (removeDate !== undefined) staff.removeDate = removeDate ? new Date(removeDate) : undefined;

    await staff.save();
    return res.json({ success: true, staff, message: 'Staff profile updated.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Staff.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Staff member removed.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 2. Attendance Register & Tracking
// -------------------------------------------------------------
export const getAttendance = async (req: Request, res: Response) => {
  try {
    const { date, month, year, period = 'month', startDate, endDate } = req.query;
    let query: any = {};
    const now = new Date();

    if (startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
      const s = new Date(startDate as string);
      const e = new Date(endDate as string);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        query.date = { $gte: s, $lte: e };
      }
    } else if (date && date !== 'undefined') {
      const d = new Date(date as string);
      if (!isNaN(d.getTime())) {
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        query.date = { $gte: start, $lte: end };
      }
    } else if (period === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    } else if (period === 'last6months' || period === '6months') {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    } else if (period === 'year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    } else if (month && year) {
      const m = Number(month) - 1;
      const y = Number(year);
      const start = new Date(y, m, 1, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    } else {
      // Default: Current Month
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const attendanceRecords = await Attendance.find(query).sort({ date: -1 }).populate('staff');

    // Aggregate summary per Staff Member for the requested filter period
    const summaryMatch = query.date ? { date: query.date } : {};

    const monthlySummary = await Attendance.aggregate([
      { $match: summaryMatch },
      {
        $group: {
          _id: '$staff',
          staffName: { $first: '$staffName' },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          halfDays: { $sum: { $cond: [{ $eq: ['$status', 'Half Day'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          leaveDays: { $sum: { $cond: [{ $eq: ['$status', 'Leave'] }, 1, 0] } },
        },
      },
    ]);

    return res.json({ success: true, attendance: attendanceRecords, monthlySummary });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { staffId, date, status, clockIn, clockOut, overtimeHours, notes } = req.body;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Staff ID is required.' });
    }

    const staffMember = await Staff.findById(staffId);
    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    let record = await Attendance.findOne({
      staff: staffId,
      date: { $gte: start, $lte: end },
    });

    if (record) {
      if (status) record.status = status;
      if (clockIn !== undefined) record.clockIn = clockIn;
      if (clockOut !== undefined) record.clockOut = clockOut;
      if (overtimeHours !== undefined) record.overtimeHours = Number(overtimeHours);
      if (notes !== undefined) record.notes = notes;
      await record.save();
    } else {
      record = new Attendance({
        staff: staffId,
        staffName: staffMember.name,
        date: start,
        status: status || 'Present',
        clockIn: clockIn || '09:00 AM',
        clockOut: clockOut || '06:00 PM',
        overtimeHours: Number(overtimeHours) || 0,
        notes: notes || '',
      });
      await record.save();
    }

    return res.json({ success: true, attendance: record, message: 'Attendance updated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Attendance.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }
    return res.json({ success: true, message: 'Attendance record deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 3. Ironing Work Logger
// -------------------------------------------------------------
export const getIroningWorkLogs = async (req: Request, res: Response) => {
  try {
    const { tableName, startDate, endDate } = req.query;
    let query: any = {};

    if (tableName) {
      query.tableName = tableName;
    }

    if (startDate && endDate) {
      const s = new Date(startDate as string);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate as string);
      e.setHours(23, 59, 59, 999);
      query.date = { $gte: s, $lte: e };
    } else {
      const s = new Date();
      s.setDate(s.getDate() - 30);
      s.setHours(0, 0, 0, 0);
      query.date = { $gte: s };
    }

    const logs = await IroningWorkLog.find(query).sort({ date: -1 });
    return res.json({ success: true, logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const logIroningWork = async (req: Request, res: Response) => {
  try {
    const { staffId, staffName, tableName, itemName, quantity, notes, date } = req.body;

    if (!tableName || !itemName || !quantity) {
      return res.status(400).json({ success: false, message: 'Table name, item description, and quantity are required.' });
    }

    let finalStaffName = staffName || 'Ironing Staff';
    if (staffId) {
      const s = await Staff.findById(staffId);
      if (s) finalStaffName = s.name;
    }

    const newLog = new IroningWorkLog({
      staff: staffId || undefined,
      staffName: finalStaffName,
      tableName: tableName.trim(),
      date: date ? new Date(date) : new Date(),
      itemName: itemName.trim(),
      quantity: Number(quantity),
      notes: notes || '',
    });

    await newLog.save();
    return res.status(201).json({ success: true, log: newLog, message: 'Ironing work logged successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 4. Performance Reports (Day Wise, Month Wise, Year Wise)
// -------------------------------------------------------------
export const getStaffPerformanceReport = async (req: Request, res: Response) => {
  try {
    const { filter = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const now = new Date();

    let startDate = new Date();
    let endDate = new Date();

    if (filter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (filter === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (filter === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart as string);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd as string);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default: Current Month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 1. Table Totals
    const tableTotals = await IroningWorkLog.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$tableName',
          totalQuantity: { $sum: '$quantity' },
          totalLogs: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    // 2. Staff Totals
    const staffTotals = await IroningWorkLog.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$staffName',
          totalQuantity: { $sum: '$quantity' },
          totalLogs: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
    ]);

    return res.json({
      success: true,
      filter,
      dateRange: { startDate, endDate },
      tableTotals,
      staffTotals,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 5. Send Staff Payslip PDF Directly via WhatsApp
// -------------------------------------------------------------
export const sendStaffPayslipWhatsApp = async (req: Request, res: Response) => {
  try {
    const {
      mobile,
      staffName,
      role,
      payPeriod,
      presentDays,
      absentDays,
      baseSalary,
      overtimeBonus,
      advanceDeduction,
      weeklyPayouts,
      totalWeeklyPaid,
      otherDeduction,
      grossEarnings,
      totalDeductions,
      netPayable,
      paymentStatus,
      paymentMode,
      paymentDate,
    } = req.body;

    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Staff mobile number is required' });
    }

    const settings = await Setting.findOne({});

    const payslipData = {
      staffName: staffName || 'Staff',
      role: role || 'Staff',
      mobile: mobile,
      payPeriod: payPeriod || 'Current Month',
      presentDays: Number(presentDays || 0),
      absentDays: Number(absentDays || 0),
      baseSalary: Number(baseSalary || 0),
      overtimeBonus: Number(overtimeBonus || 0),
      advanceDeduction: Number(advanceDeduction || 0),
      weeklyPayouts: Array.isArray(weeklyPayouts) ? weeklyPayouts : [],
      totalWeeklyPaid: Number(totalWeeklyPaid || 0),
      otherDeduction: Number(otherDeduction || 0),
      grossEarnings: Number(grossEarnings || 0),
      totalDeductions: Number(totalDeductions || 0),
      netPayable: Number(netPayable || 0),
      paymentStatus: paymentStatus || 'Paid',
      paymentMode: paymentMode || 'Cash',
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    };

    // Generate Payslip PDF Buffer
    const pdfBuffer = await generatePayslipPDFBuffer(payslipData, settings);
    const cleanStaffName = (staffName || 'Staff').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanPeriod = (payPeriod || 'Payslip').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Payslip_${cleanStaffName}_${cleanPeriod}.pdf`;

    // Send ONLY the PDF document attachment over WhatsApp (no message text)
    const sent = await sendAutomatedWhatsAppDocument(mobile, pdfBuffer, fileName);

    if (sent) {
      return res.json({
        success: true,
        message: `Payslip PDF sent directly to +${mobile} via WhatsApp!`,
      });
    } else {
      return res.json({
        success: false,
        gatewayConnected: false,
        message: 'WhatsApp Gateway socket is offline. Opening WhatsApp Web/App directly with downloaded PDF.',
      });
    }
  } catch (error: any) {
    console.error('Error sending staff payslip via WhatsApp:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// -------------------------------------------------------------
// 6. Generate & Download Staff Payslip PDF Endpoint
// -------------------------------------------------------------
export const downloadStaffPayslipPDF = async (req: Request, res: Response) => {
  try {
    const {
      mobile,
      staffName,
      role,
      payPeriod,
      presentDays,
      absentDays,
      baseSalary,
      overtimeBonus,
      advanceDeduction,
      weeklyPayouts,
      totalWeeklyPaid,
      otherDeduction,
      grossEarnings,
      totalDeductions,
      netPayable,
      paymentStatus,
      paymentMode,
      paymentDate,
    } = req.body;

    const settings = await Setting.findOne({});

    const payslipData = {
      staffName: staffName || 'Staff',
      role: role || 'Staff',
      mobile: mobile || '',
      payPeriod: payPeriod || 'Current Month',
      presentDays: Number(presentDays || 0),
      absentDays: Number(absentDays || 0),
      baseSalary: Number(baseSalary || 0),
      overtimeBonus: Number(overtimeBonus || 0),
      advanceDeduction: Number(advanceDeduction || 0),
      weeklyPayouts: Array.isArray(weeklyPayouts) ? weeklyPayouts : [],
      totalWeeklyPaid: Number(totalWeeklyPaid || 0),
      otherDeduction: Number(otherDeduction || 0),
      grossEarnings: Number(grossEarnings || 0),
      totalDeductions: Number(totalDeductions || 0),
      netPayable: Number(netPayable || 0),
      paymentStatus: paymentStatus || 'Paid',
      paymentMode: paymentMode || 'Cash',
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    };

    const pdfBuffer = await generatePayslipPDFBuffer(payslipData, settings);
    const cleanStaffName = (staffName || 'Staff').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanPeriod = (payPeriod || 'Payslip').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Payslip_${cleanStaffName}_${cleanPeriod}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating payslip PDF:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error generating PDF' });
  }
};
