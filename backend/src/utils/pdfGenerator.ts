import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

const toAmount = (val: any): string => {
  const num = Number(val);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

export const generateInvoicePDFBuffer = async (order: any, setting?: any, shop?: any): Promise<Buffer> => {
  // Generate QR Code PNG Buffer
  let qrBuffer: Buffer | null = null;
  const effectiveShop = shop || (order.shopId && typeof order.shopId === 'object' ? order.shopId : null);
  const upiId = effectiveShop?.upiId || setting?.upiId || 'miraclelaundry@upi';
  const shopName = effectiveShop?.name || setting?.shopName || 'Miracle Laundry';
  const dueAmount = (order.remainingBalance && order.remainingBalance > 0) ? order.remainingBalance : order.totalAmount;
  const upiPaymentUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${dueAmount}&cu=INR&tn=${encodeURIComponent('Order #' + order.orderNumber)}`;

  const paymentQrUrl = effectiveShop?.paymentQrUrl || setting?.paymentQrUrl;
  if (paymentQrUrl && paymentQrUrl.startsWith('data:image')) {
    try {
      const base64Data = paymentQrUrl.replace(/^data:image\/\w+;base64,/, '');
      qrBuffer = Buffer.from(base64Data, 'base64');
    } catch (e) {}
  }

  if (!qrBuffer) {
    try {
      const qrDataUrl = await QRCode.toDataURL(upiPaymentUrl, { margin: 1, width: 200 });
      const base64Data = qrDataUrl.replace(/^data:image\/\w+;base64,/, '');
      qrBuffer = Buffer.from(base64Data, 'base64');
    } catch (e) {}
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const address = effectiveShop?.address || setting?.address || '123 Sparkle Avenue, Suite 4B, Commercial Hub';
      const phone = effectiveShop?.phone || setting?.phone || '+91 98765 43210';
      const email = effectiveShop?.email || setting?.email || 'contact@miraclelaundry.com';
      const gstNumber = effectiveShop?.gstNumber || setting?.gstNumber || '';

      // Check for store logo image
      const possibleLogoPaths = [
        path.join(process.cwd(), '../frontend/public/logo.jpg'),
        path.join(process.cwd(), 'public/logo.jpg'),
        path.join(process.cwd(), '../frontend/public/logo.png'),
      ];
      let logoPath: string | null = null;
      for (const p of possibleLogoPaths) {
        if (fs.existsSync(p)) {
          logoPath = p;
          break;
        }
      }

      // Top Header Row
      let headerY = 45;

      // Draw Logo or Brand Accent
      if (logoPath) {
        try {
          doc.image(logoPath, 40, headerY, { width: 45, height: 45 });
          doc.fontSize(20).fillColor('#0369a1').font('Helvetica-Bold').text(shopName, 95, headerY + 2);
          doc.fontSize(8.5).fillColor('#64748b').font('Helvetica').text('Smart & Premium Laundry Management', 95, headerY + 24);
        } catch (e) {
          doc.fontSize(20).fillColor('#0369a1').font('Helvetica-Bold').text(shopName, 40, headerY);
          doc.fontSize(8.5).fillColor('#64748b').font('Helvetica').text('Smart & Premium Laundry Management', 40, headerY + 22);
        }
      } else {
        doc.fontSize(20).fillColor('#0369a1').font('Helvetica-Bold').text(shopName, 40, headerY);
        doc.fontSize(8.5).fillColor('#64748b').font('Helvetica').text('Smart & Premium Laundry Management', 40, headerY + 22);
      }

      // Store Details under header
      const storeDetailsY = headerY + 42;
      doc.fontSize(8.5).fillColor('#475569').font('Helvetica').text(address, 40, storeDetailsY, { width: 300 });
      doc.text(`Phone: ${phone}  |  Email: ${email}`, 40, storeDetailsY + 14);
      if (gstNumber) {
        doc.font('Helvetica-Bold').fillColor('#334155').text(`GSTIN: ${gstNumber}`, 40, storeDetailsY + 26);
      }

      // Top Right Invoice Pill & Metadata
      doc.rect(380, 42, 175, 24).fill('#0f172a');
      doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold').text(`INVOICE #${order.orderNumber}`, 380, 49, { width: 175, align: 'center' });

      doc.fontSize(8.5).fillColor('#64748b').font('Helvetica');
      doc.text(`Order Date: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : 'N/A'}`, 380, 72, { width: 175, align: 'right' });

      // Payment Status Pill (Right side)
      const pStatus = (order.paymentStatus || 'Pending').toUpperCase();
      let pBg = '#fef3c7'; // Amber (Pending)
      let pTxt = '#b45309';
      if (pStatus === 'PAID') {
        pBg = '#dcfce7'; // Green
        pTxt = '#15803d';
      } else if (pStatus === 'PARTIALLY PAID') {
        pBg = '#e0f2fe'; // Blue
        pTxt = '#0369a1';
      }

      doc.rect(455, 86, 100, 18).fill(pBg);
      doc.fontSize(8).fillColor(pTxt).font('Helvetica-Bold').text(pStatus, 455, 91, { width: 100, align: 'center' });

      // Divider Line
      doc.moveTo(40, 135).lineTo(555, 135).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // Billed To & Current Status Card Box
      const cardY = 145;
      doc.rect(40, cardY, 515, 60).fill('#f8fafc').stroke('#e2e8f0');

      // Left: Customer Info
      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica-Bold').text('BILLED TO CUSTOMER', 52, cardY + 10);
      doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold').text(order.customerSnapshot?.name || 'Walk-in Customer', 52, cardY + 22);
      doc.fontSize(8.5).fillColor('#475569').font('Helvetica').text(`Mobile: +91 ${order.customerSnapshot?.mobile || 'N/A'}`, 52, cardY + 36);
      if (order.customerSnapshot?.address) {
        doc.text(order.customerSnapshot.address, 52, cardY + 47, { width: 260 });
      }

      // Right: Order Status
      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica-Bold').text('CURRENT STATUS', 380, cardY + 10, { width: 160, align: 'right' });
      const statusStr = (order.status || 'Received').toUpperCase();
      doc.rect(435, cardY + 24, 105, 20).fill('#0284c7');
      doc.fontSize(8.5).fillColor('#ffffff').font('Helvetica-Bold').text(statusStr, 435, cardY + 30, { width: 105, align: 'center' });

      // Itemized Table Header
      let tableY = 220;
      doc.rect(40, tableY, 515, 24).fill('#0f172a');
      doc.fontSize(8.5).fillColor('#ffffff').font('Helvetica-Bold');
      doc.text('#', 50, tableY + 7);
      doc.text('ITEM & SERVICE DESCRIPTION', 80, tableY + 7);
      doc.text('QTY', 320, tableY + 7, { width: 40, align: 'center' });
      doc.text('UNIT PRICE', 370, tableY + 7, { width: 80, align: 'right' });
      doc.text('SUBTOTAL', 460, tableY + 7, { width: 85, align: 'right' });

      // Table Rows
      tableY += 24;
      const itemsList = Array.isArray(order.items) ? order.items : [];
      itemsList.forEach((item: any, index: number) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, tableY, 515, 24).fill(rowBg);

        const serviceName = item.serviceName || item.serviceType || 'Care';
        const itemTotal = item.subtotal ?? item.itemTotal ?? ((item.unitPrice || 0) * (item.quantity || 1));

        doc.fontSize(8.5).fillColor('#64748b').font('Helvetica').text(`${index + 1}`, 50, tableY + 7);
        
        // Item Name & Service Name
        doc.fontSize(8.5).fillColor('#0f172a').font('Helvetica-Bold').text(`${item.itemName || 'Item'}`, 80, tableY + 7, { width: 230 });
        doc.fontSize(7.5).fillColor('#0284c7').font('Helvetica-Bold').text(` (${serviceName})`, 80 + doc.widthOfString(`${item.itemName || 'Item'}`), tableY + 7.5);

        doc.fontSize(8.5).fillColor('#1e293b').font('Helvetica').text(`${item.quantity || 1}`, 320, tableY + 7, { width: 40, align: 'center' });
        doc.text(`Rs. ${toAmount(item.unitPrice)}`, 370, tableY + 7, { width: 80, align: 'right' });
        doc.fontSize(8.5).fillColor('#0f172a').font('Helvetica-Bold').text(`Rs. ${toAmount(itemTotal)}`, 460, tableY + 7, { width: 85, align: 'right' });

        tableY += 24;
      });

      // Table Bottom Border Line
      doc.moveTo(40, tableY).lineTo(555, tableY).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // Calculation Summary Box
      tableY += 15;

      // Right: Financial Summary Breakdown
      const summaryLeft = 360;
      let sumY = tableY;

      doc.fontSize(8.5).fillColor('#475569').font('Helvetica');
      doc.text('Subtotal:', summaryLeft, sumY, { width: 100, align: 'left' });
      doc.text(`Rs. ${toAmount(order.subtotal)}`, summaryLeft + 100, sumY, { width: 95, align: 'right' });

      if (Number(order.discount) > 0) {
        sumY += 14;
        doc.text('Discount:', summaryLeft, sumY, { width: 100, align: 'left' });
        doc.text(`- Rs. ${toAmount(order.discount)}`, summaryLeft + 100, sumY, { width: 95, align: 'right' });
      }

      if (Number(order.taxAmount) > 0) {
        sumY += 14;
        doc.text(`Tax (${order.taxPercent || 0}%):`, summaryLeft, sumY, { width: 100, align: 'left' });
        doc.text(`Rs. ${toAmount(order.taxAmount)}`, summaryLeft + 100, sumY, { width: 95, align: 'right' });
      }

      // Grand Total Highlighted Box
      sumY += 16;
      doc.rect(summaryLeft - 10, sumY - 3, 205, 22).fill('#0f172a');
      doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold');
      doc.text('Grand Total:', summaryLeft, sumY + 2);
      doc.text(`Rs. ${toAmount(order.totalAmount)}`, summaryLeft + 90, sumY + 2, { width: 95, align: 'right' });

      // Advance & Remaining Balance
      sumY += 26;
      doc.fontSize(8.5).fillColor('#475569').font('Helvetica');
      doc.text('Advance Paid:', summaryLeft, sumY, { width: 100, align: 'left' });
      doc.text(`Rs. ${toAmount(order.advancePaid)}`, summaryLeft + 100, sumY, { width: 95, align: 'right' });

      sumY += 14;
      const bal = Number(order.remainingBalance || 0);
      doc.font('Helvetica-Bold').fillColor(bal > 0 ? '#dc2626' : '#16a34a');
      doc.text('Balance Due:', summaryLeft, sumY, { width: 100, align: 'left' });
      doc.text(`Rs. ${toAmount(order.remainingBalance)}`, summaryLeft + 100, sumY, { width: 95, align: 'right' });

      // Bottom Footer Banner with Exact Terms & Conditions
      const footerY = 720;
      doc.moveTo(40, footerY - 10).lineTo(555, footerY - 10).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.fontSize(9).fillColor('#0284c7').font('Helvetica-Bold').text(`Thank you for choosing ${shopName}!`, 40, footerY, { align: 'center' });
      
      doc.fontSize(7.5).fillColor('#475569').font('Helvetica');
      doc.text('1. Please inspect clothes upon delivery.', 40, footerY + 14, { align: 'center' });
      doc.text('2. Clothes not collected within 30 days are subject to storage charges.', 40, footerY + 25, { align: 'center' });
      doc.text('3. Colors may bleed on delicate items if not pre-informed.', 40, footerY + 36, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export interface IPayslipData {
  staffName: string;
  role?: string;
  mobile?: string;
  payPeriod: string;
  presentDays: number;
  absentDays: number;
  baseSalary: number;
  overtimeBonus: number;
  advanceDeduction: number;
  weeklyPayouts?: Array<{ date: string; amount: number }>;
  totalWeeklyPaid?: number;
  otherDeduction: number;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  paymentStatus: string;
  paymentMode: string;
  paymentDate: string;
}

export const generatePayslipPDFBuffer = async (data: IPayslipData, setting?: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const shopName = setting?.storeName || setting?.shopName || setting?.companyName || 'MIRACLE LAUNDRY & DRY CLEANERS';
      const address = setting?.address || '123 Commercial Main Road, City Plaza, Sector 4';
      const phone = setting?.mobile || setting?.phone || '+91 98765 43210';
      const email = setting?.email || 'contact@miraclelaundry.com';

      // Header
      let y = 45;
      doc.fontSize(18).fillColor('#0f172a').font('Helvetica-Bold').text(shopName, 40, y);
      doc.fontSize(8.5).fillColor('#64748b').font('Helvetica').text(address, 40, y + 22);
      doc.text(`Phone: ${phone} | Email: ${email}`, 40, y + 34);

      // Document Title Box (Right)
      doc.rect(380, 42, 175, 24).fill('#0f172a');
      doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold').text('SALARY PAYSLIP', 380, 49, { width: 175, align: 'center' });

      doc.fontSize(8.5).fillColor('#475569').font('Helvetica');
      doc.text(`Period: ${data.payPeriod}`, 380, 72, { width: 175, align: 'right' });
      doc.text(`Date: ${data.paymentDate}`, 380, 84, { width: 175, align: 'right' });

      // Line divider
      y = 105;
      doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').lineWidth(1).stroke();

      // Employee Info Grid Box
      y += 12;
      doc.rect(40, y, 515, 50).fill('#f8fafc').stroke('#e2e8f0');

      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica-Bold').text('EMPLOYEE NAME', 50, y + 8);
      doc.fontSize(9.5).fillColor('#0f172a').font('Helvetica-Bold').text(data.staffName || 'Staff', 50, y + 20);

      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica-Bold').text('ROLE / DESIGNATION', 180, y + 8);
      doc.fontSize(9.5).fillColor('#334155').font('Helvetica-Bold').text(data.role || 'Staff', 180, y + 20);

      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica-Bold').text('MOBILE NUMBER', 310, y + 8);
      doc.fontSize(9.5).fillColor('#334155').font('Helvetica-Bold').text(data.mobile || '-', 310, y + 20);

      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica-Bold').text('WORKING & LEAVE DAYS', 415, y + 8);
      doc.fontSize(9.5).fillColor('#15803d').font('Helvetica-Bold').text(`Working: ${data.presentDays}d | Abs: ${data.absentDays}d`, 415, y + 20);

      // Financial Details Table
      y += 65;

      // Table Header: Earnings (+) | Amount
      doc.rect(40, y, 250, 22).fill('#1e293b');
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold').text('EARNINGS (+)', 50, y + 6);
      doc.text('AMOUNT (RS.)', 190, y + 6, { width: 90, align: 'right' });

      // Table Header: Deductions (-) | Amount
      doc.rect(305, y, 250, 22).fill('#1e293b');
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold').text('DEDUCTIONS (-)', 315, y + 6);
      doc.text('AMOUNT (RS.)', 455, y + 6, { width: 90, align: 'right' });

      // Row 1: Basic Salary vs Other Deductions
      y += 22;
      doc.rect(40, y, 250, 22).fill('#ffffff').stroke('#e2e8f0');
      doc.rect(305, y, 250, 22).fill('#ffffff').stroke('#e2e8f0');

      doc.fontSize(8.5).fillColor('#334155').font('Helvetica').text('Basic / Monthly Salary', 50, y + 6);
      doc.font('Helvetica-Bold').text(`Rs. ${data.baseSalary.toLocaleString('en-IN')}`, 190, y + 6, { width: 90, align: 'right' });

      doc.font('Helvetica').text('Other Deductions / LOP', 315, y + 6);
      doc.font('Helvetica-Bold').fillColor(data.otherDeduction > 0 ? '#dc2626' : '#64748b');
      doc.text(`Rs. ${data.otherDeduction.toLocaleString('en-IN')}`, 455, y + 6, { width: 90, align: 'right' });

      // Row 2: Daily Batta vs Nil
      y += 22;
      doc.rect(40, y, 250, 22).fill('#ffffff').stroke('#e2e8f0');
      doc.rect(305, y, 250, 22).fill('#ffffff').stroke('#e2e8f0');

      doc.fontSize(8.5).fillColor('#334155').font('Helvetica').text('Daily Batta / Allowance', 50, y + 6);
      doc.font('Helvetica-Bold').fillColor(data.overtimeBonus > 0 ? '#15803d' : '#64748b');
      doc.text(`Rs. ${data.overtimeBonus.toLocaleString('en-IN')}`, 190, y + 6, { width: 90, align: 'right' });

      doc.fontSize(8.5).fillColor('#94a3b8').font('Helvetica-Oblique').text('Nil Other Deductions', 315, y + 6);
      doc.font('Helvetica').fillColor('#94a3b8').text('Rs. 0', 455, y + 6, { width: 90, align: 'right' });

      // Summary Totals Row
      y += 22;
      doc.rect(40, y, 250, 22).fill('#f1f5f9').stroke('#cbd5e1');
      doc.rect(305, y, 250, 22).fill('#f1f5f9').stroke('#cbd5e1');

      doc.fontSize(9).fillColor('#0f172a').font('Helvetica-Bold').text('GROSS EARNINGS', 50, y + 6);
      doc.fillColor('#15803d').text(`Rs. ${data.grossEarnings.toLocaleString('en-IN')}`, 190, y + 6, { width: 90, align: 'right' });

      doc.fillColor('#0f172a').text('TOTAL DEDUCTIONS', 315, y + 6);
      doc.fillColor('#b91c1c').text(`Rs. ${data.totalDeductions.toLocaleString('en-IN')}`, 455, y + 6, { width: 90, align: 'right' });

      // Weekly Salary Payouts Log Box (if weeklyPayouts present)
      const payouts = data.weeklyPayouts && data.weeklyPayouts.length > 0
        ? data.weeklyPayouts.filter((p) => Number(p.amount || 0) > 0)
        : [];
      
      const totalWeeklyDisbursed = data.totalWeeklyPaid !== undefined ? data.totalWeeklyPaid : payouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balanceDue = Math.max(0, data.netPayable - totalWeeklyDisbursed);

      if (payouts.length > 0) {
        y += 30;
        const boxHeight = 22 + (payouts.length * 15);
        doc.rect(40, y, 515, boxHeight).fill('#f8fafc').stroke('#cbd5e1');
        doc.fontSize(8.5).fillColor('#0f172a').font('Helvetica-Bold').text('WEEKLY SALARY PAYOUT LOG (DISBURSED)', 50, y + 6);
        doc.fontSize(8).fillColor('#166534').font('Helvetica-Bold').text(`Total Disbursed: Rs. ${totalWeeklyDisbursed.toLocaleString('en-IN')}`, 380, y + 6, { width: 160, align: 'right' });
        
        let py = y + 20;
        payouts.forEach((p, idx) => {
          doc.fontSize(8).fillColor('#475569').font('Helvetica').text(`Week ${idx + 1} (${p.date || 'Weekly'}):`, 50, py);
          doc.font('Helvetica-Bold').fillColor('#15803d').text(`Rs. ${Number(p.amount).toLocaleString('en-IN')}`, 190, py);
          py += 14;
        });
        y += boxHeight;
      }

      // Net Salary Highlight Box
      y += 25;
      doc.rect(40, y, 515, 45).fill('#0f172a');
      doc.fontSize(8.5).fillColor('#94a3b8').font('Helvetica-Bold').text('NET PAYABLE SALARY', 55, y + 8);
      doc.fontSize(16).fillColor('#4ade80').font('Helvetica-Bold').text(`Rs. ${data.netPayable.toLocaleString('en-IN')}`, 55, y + 20);

      doc.fontSize(8.5).fillColor('#ffffff').font('Helvetica-Bold').text(`STATUS: ${data.paymentStatus.toUpperCase()}`, 380, y + 10, { width: 160, align: 'right' });
      doc.fontSize(8).fillColor('#cbd5e1').font('Helvetica').text(`Mode: ${data.paymentMode}`, 380, y + 24, { width: 160, align: 'right' });

      // Appreciation & Thank You Message Footer
      y += 65;
      doc.rect(40, y, 515, 36).fill('#f8fafc').stroke('#cbd5e1');
      doc.fontSize(9.5).fillColor('#0369a1').font('Helvetica-Bold').text('Thank you for your valuable contribution & dedication to our team!', 40, y + 8, { width: 515, align: 'center' });
      doc.fontSize(8.5).fillColor('#64748b').font('Helvetica-Oblique').text('We truly appreciate your hard work, efficiency, and commitment.', 40, y + 22, { width: 515, align: 'center' });

      // Footer
      y += 50;
      doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica-Oblique').text(`This is a computer generated salary payslip issued by ${shopName}.`, 40, y + 6, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
