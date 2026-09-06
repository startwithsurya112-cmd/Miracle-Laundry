import { Request, Response } from 'express';
import MachineLog from '../models/MachineLog';
import GasCylinderLog from '../models/GasCylinderLog';
import { AuthRequest } from '../middleware/auth';

// Helper to calculate start & end date based on period filter
const calculateDateRange = (period: string, startDate?: string, endDate?: string) => {
  const now = new Date();
  let s = new Date();
  let e = new Date();

  if (period === 'custom' && startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
    s = new Date(startDate);
    e = new Date(endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
  }

  if (period === 'today') {
    s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'year') {
    s = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    e = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else {
    // Default: Current Month
    s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { start: s, end: e };
};

// -------------------------------------------------------------
// 1. Machine Cycle Logging (Washer Extractor & Dryer)
// -------------------------------------------------------------
export const getMachineLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { machineType, period = 'month', startDate, endDate } = req.query;
    let query: any = {};

    if (req.targetShopId) {
      query.shopId = req.targetShopId;
    }

    if (machineType) {
      query.machineType = machineType;
    }

    const range = calculateDateRange(period as string, startDate as string, endDate as string);
    query.date = { $gte: range.start, $lte: range.end };

    const logs = await MachineLog.find(query).sort({ date: -1 });
    return res.json({ success: true, logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const logMachineCycle = async (req: AuthRequest, res: Response) => {
  try {
    const { machineType, programName, durationMinutes, cyclesCount, operatorName, notes, date, shopId } = req.body;

    if (!machineType || !programName) {
      return res.status(400).json({ success: false, message: 'Machine type and program name are required.' });
    }

    let targetDate = new Date();
    if (date) {
      const parts = String(date).split('-');
      if (parts.length === 3) {
        targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      } else {
        targetDate = new Date(date);
      }
    }

    const newLog = new MachineLog({
      shopId: req.user?.role === 'super_admin' ? (req.targetShopId || shopId || null) : req.targetShopId,
      machineType,
      date: targetDate,
      programName: programName.trim(),
      durationMinutes: Number(durationMinutes) || (machineType === 'Dryer' ? 30 : 45),
      cyclesCount: Number(cyclesCount) || 1,
      operatorName: operatorName ? operatorName.trim() : '',
      notes: notes || '',
    });

    await newLog.save();
    return res.status(201).json({ success: true, log: newLog, message: `${machineType} cycle logged successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 2. LPG Gas Cylinder Tracking (Dryer)
// -------------------------------------------------------------
export const getGasCylinderLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const range = calculateDateRange(period as string, startDate as string, endDate as string);

    const filter: any = {};
    if (req.targetShopId) {
      filter.shopId = req.targetShopId;
    }

    // Fetch logs sorted ascending by changeDate to compute exact longevity interval for each cylinder
    const allLogs = await GasCylinderLog.find(filter).sort({ changeDate: 1 });

    // Compute longevity days for each cylinder (the duration it ran until replaced by the next cylinder)
    for (let i = 0; i < allLogs.length; i++) {
      if (i < allLogs.length - 1) {
        const currDate = new Date(allLogs[i].changeDate);
        const nextDate = new Date(allLogs[i + 1].changeDate);
        const diffMs = nextDate.getTime() - currDate.getTime();
        const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        allLogs[i].daysLasted = days;
      } else {
        // Most recent cylinder is currently active
        allLogs[i].daysLasted = 0;
      }
    }

    // Filter logs strictly by the requested date range (Today, Current Month, Current Year, Custom Range)
    const filteredLogs = allLogs
      .filter((log) => {
        const d = new Date(log.changeDate);
        return d >= range.start && d <= range.end;
      })
      .reverse();

    return res.json({ success: true, logs: filteredLogs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const logGasCylinder = async (req: AuthRequest, res: Response) => {
  try {
    const { changeDate, quantity, vendorName, cylinderSize, notes, shopId } = req.body;
    
    let targetDate = new Date();
    if (changeDate) {
      const parts = String(changeDate).split('-');
      if (parts.length === 3) {
        targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      } else {
        targetDate = new Date(changeDate);
      }
    }

    const newLog = new GasCylinderLog({
      shopId: req.user?.role === 'super_admin' ? (req.targetShopId || shopId || null) : req.targetShopId,
      changeDate: targetDate,
      quantity: Number(quantity) || 1,
      daysLasted: 0,
      vendorName: vendorName || 'LPG Supplier',
      cylinderSize: cylinderSize || '19kg Commercial',
      notes: notes || '',
    });

    await newLog.save();

    return res.status(201).json({
      success: true,
      log: newLog,
      message: `Gas cylinder replacement recorded (${newLog.quantity} cylinder(s)).`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGasCylinder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cylinder = await GasCylinderLog.findById(id);
    if (!cylinder) {
      return res.status(404).json({ success: false, message: 'Cylinder log not found.' });
    }

    if (req.user?.role !== 'super_admin' && req.targetShopId && cylinder.shopId && String(cylinder.shopId) !== req.targetShopId) {
      return res.status(403).json({ success: false, message: 'Access denied: cylinder belongs to another branch.' });
    }

    await GasCylinderLog.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Cylinder log deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 3. Utility Performance Analytics (Washer Extractor & Dryer LPG)
// -------------------------------------------------------------
export const getMachineUtilityAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const range = calculateDateRange(period as string, startDate as string, endDate as string);
    const shopFilter = req.targetShopId ? { shopId: req.targetShopId } : {};

    // 1. Washer Extractor Logs
    const washerLogs = await MachineLog.find({
      ...shopFilter,
      machineType: 'Washer Extractor',
      date: { $gte: range.start, $lte: range.end },
    });

    let totalWasherMinutes = 0;
    let totalWasherCycles = 0;
    const washerProgramsMap: { [prog: string]: number } = {};

    washerLogs.forEach((log) => {
      const minutes = (log.durationMinutes || 45) * (log.cyclesCount || 1);
      totalWasherMinutes += minutes;
      totalWasherCycles += log.cyclesCount || 1;
      washerProgramsMap[log.programName] = (washerProgramsMap[log.programName] || 0) + (log.cyclesCount || 1);
    });

    const washerTotalHours = (totalWasherMinutes / 60).toFixed(1);

    // 2. Dryer Logs
    const dryerLogs = await MachineLog.find({
      ...shopFilter,
      machineType: 'Dryer',
      date: { $gte: range.start, $lte: range.end },
    });

    let totalDryerMinutes = 0;
    let totalDryerCycles = 0;
    dryerLogs.forEach((log) => {
      const minutes = (log.durationMinutes || 30) * (log.cyclesCount || 1);
      totalDryerMinutes += minutes;
      totalDryerCycles += log.cyclesCount || 1;
    });

    const dryerTotalHours = (totalDryerMinutes / 60).toFixed(1);

    // 3. Gas Cylinder Replacements in period
    const cylinders = await GasCylinderLog.find({
      ...shopFilter,
      changeDate: { $gte: range.start, $lte: range.end },
    }).sort({ changeDate: -1 });

    const totalCylindersUsed = cylinders.reduce((sum, c) => sum + (c.quantity || 1), 0);

    // Calculate Average Longevity in Days across all completed cylinders
    const allCylinders = await GasCylinderLog.find(shopFilter).sort({ changeDate: 1 });
    let totalDays = 0;
    let countedCylinders = 0;

    for (let i = 0; i < allCylinders.length - 1; i++) {
      const prev = new Date(allCylinders[i].changeDate);
      const curr = new Date(allCylinders[i + 1].changeDate);
      const diffMs = curr.getTime() - prev.getTime();
      const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      totalDays += days;
      countedCylinders++;
    }

    const avgDaysPerCylinder = countedCylinders > 0 ? (totalDays / countedCylinders).toFixed(1) : 'N/A';

    return res.json({
      success: true,
      period,
      washerExtractor: {
        totalHours: washerTotalHours,
        totalCycles: totalWasherCycles,
        programsBreakdown: Object.keys(washerProgramsMap).map((k) => ({ program: k, count: washerProgramsMap[k] })),
      },
      dryer: {
        totalHours: dryerTotalHours,
        totalCycles: totalDryerCycles,
        totalCylindersUsed,
        avgDaysPerCylinder,
      },
      recentCylinders: cylinders.slice(0, 10),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

