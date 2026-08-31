import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { sendOrderWhatsAppPdfApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Order, Setting } from '../../types';
import { StatusBadge } from '../ui/Badge';
import { Printer, Smartphone, X, CheckCircle, Sparkles, Phone, Mail, MapPin, FileText, Send } from 'lucide-react';

interface InvoiceViewProps {
  order: Order;
  setting?: Setting;
  onClose?: () => void;
  isPublicView?: boolean;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({ order, setting, onClose, isPublicView = false }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const currencySymbol = setting?.currencySymbol || '₹';

  // UPI Payment Details & QR Code Generator
  const shopUpiId = setting?.upiId || '9876543210@paytm';
  const shopGPayPhone = setting?.gpayNumber || setting?.phone || '9876543210';
  const shopName = setting?.shopName || 'Miracle Laundry';
  const dueAmount = order.remainingBalance > 0 ? order.remainingBalance : order.totalAmount;
  const upiPaymentUrl = `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent(shopName)}&am=${dueAmount}&cu=INR&tn=${encodeURIComponent('Order #' + order.orderNumber)}`;

  // Handle standard browser printing
  const handlePrint = () => {
    window.print();
  };

  // Generate A4 PDF File Blob cleanly from off-screen desktop clone
  const generatePDFBlob = async (): Promise<{ pdf: jsPDF; file: File } | null> => {
    if (!receiptRef.current) return null;
    const element = receiptRef.current;

    // Create temporary off-screen clone with fixed 794px desktop A4 width
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = '794px';
    clone.style.maxWidth = 'none';
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.background = '#ffffff';
    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        windowWidth: 794,
      });

      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `Invoice_${order.orderNumber}.pdf`, {
        type: 'application/pdf',
      });

      return { pdf, file: pdfFile };
    } catch (err) {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
      console.error('PDF generation error:', err);
      return null;
    }
  };

  // Handle PDF Invoice Download
  const handleDownloadPDF = async () => {
    const res = await generatePDFBlob();
    if (res) {
      res.pdf.save(`Invoice_${order.orderNumber}.pdf`);
    } else {
      window.print();
    }
  };

  // Handle Smart WhatsApp Share targeted directly to customer phone number
  const handleWhatsAppShare = async () => {
    try {
      const res = await sendOrderWhatsAppPdfApi(order._id);
      if (res.success) {
        showToast(`✅ PDF Invoice sent directly to +${order.customerSnapshot.mobile} via WhatsApp!`, 'success');
      } else {
        // Fallback to wa.me if gateway is not connected
        const mobile = order.customerSnapshot.mobile.replace(/\D/g, '');
        const phoneWithCountry = mobile.length === 10 ? '91' + mobile : mobile;
        const receiptUrl = `${window.location.origin}/receipt/${order.orderNumber}?r=${order.orderNumber}`;
        const text = `Hello *${order.customerSnapshot.name}*,\n\nYour official laundry invoice & receipt for Order *#${order.orderNumber}* is ready!\n\n🔗 *View & Print Invoice*:\n${receiptUrl}`;
        const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        showToast(res.message || 'WhatsApp Gateway disconnected. Opened WhatsApp Web fallback.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send WhatsApp message', 'error');
    }
  };

  const cardContent = (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col">
      {/* Action Header Bar (Hidden during window.print()) */}
      <div className="no-print p-3 sm:p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2.5">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
            <h2 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              Tax Invoice & Receipt
            </h2>
          </div>
          {onClose && !isPublicView && (
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {!isPublicView && (
            <button
              onClick={handleWhatsAppShare}
              title="Share via WhatsApp"
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          )}

          <button
            onClick={handleDownloadPDF}
            title="Download PDF Invoice"
            className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print Receipt"
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          {onClose && !isPublicView && (
            <button
              onClick={onClose}
              className="hidden sm:block p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors ml-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

        {/* Printable Mobile-First Professional Invoice Area */}
        <div
          className="p-4 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans space-y-6"
          id="printable-invoice"
          ref={receiptRef}
        >
          {/* Header Banner */}
          <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="w-full sm:w-auto">
              <div className="flex items-center gap-3 text-slate-900 font-black text-xl sm:text-2xl tracking-tight">
                <img
                  src={
                    setting?.logoUrl && !setting.logoUrl.includes('unsplash.com')
                      ? setting.logoUrl
                      : "/logo.jpg"
                  }
                  alt="Miracle Laundry Logo"
                  className="h-10 sm:h-12 w-auto object-contain rounded-xl border border-slate-200 shadow-xs"
                />
                <span className="text-brand-700 font-black tracking-tight">
                  {setting?.shopName || 'Miracle Laundry'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {setting?.shopTagline || 'Express & Premium Laundry Services'}
              </p>

              <div className="mt-2.5 text-xs text-slate-600 space-y-1">
                <p className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{setting?.address || '123 Sparkle Avenue, Suite 4B, Commercial Hub'}</span>
                </p>
                <p className="flex flex-wrap items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{setting?.phone || '+91 98765 43210'}</span>
                  <span className="text-slate-300">•</span>
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="break-all">{setting?.email || 'contact@intelligentlaundry.com'}</span>
                </p>
                {setting?.gstNumber && (
                  <p className="text-[11px] font-bold text-slate-700 pt-0.5">
                    GSTIN: <span className="font-mono text-slate-900">{setting.gstNumber}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Invoice Meta Pill & Status */}
            <div className="w-full sm:w-auto text-left sm:text-right flex flex-col items-start sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div className="px-3 py-1 rounded-xl bg-slate-900 text-white font-mono font-black text-xs sm:text-sm tracking-wider shadow-sm mb-2">
                INVOICE #{order.orderNumber}
              </div>
              <p className="text-xs text-slate-500">
                Order Date: <strong className="text-slate-800">{new Date(order.orderDate).toLocaleDateString('en-GB')}</strong>
              </p>
              <div className="mt-2">
                <StatusBadge status={order.paymentStatus} size="sm" />
              </div>
            </div>
          </div>

          {/* Customer & Order Status Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">
                Billed To Customer
              </p>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">{order.customerSnapshot.name}</h3>
              <p className="text-xs text-slate-600 mt-0.5">Mobile: +91 {order.customerSnapshot.mobile}</p>
              {order.customerSnapshot.address && (
                <p className="text-xs text-slate-600 mt-0.5">{order.customerSnapshot.address}</p>
              )}
            </div>

            <div className="sm:text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">
                Current Status
              </p>
              <div className="mt-1">
                <StatusBadge status={order.status} size="md" />
              </div>
            </div>
          </div>

          {/* Laundry Items Desktop Table & Mobile Cards */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {/* Desktop / Tablet Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item & Service Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{item.itemName}</p>
                        <p className="text-[11px] text-brand-600 font-semibold">{item.serviceName}</p>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-medium">
                        {currencySymbol}{item.unitPrice}
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                        {currencySymbol}{item.subtotal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch Cards View */}
            <div className="sm:hidden divide-y divide-slate-100 bg-white">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{item.itemName}</p>
                    <p className="text-[11px] text-brand-600 font-semibold">{item.serviceName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.quantity} × {currencySymbol}{item.unitPrice}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-sm text-slate-900">{currencySymbol}{item.subtotal}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculation Breakdown */}
          <div className="border-t border-slate-200 pt-5 flex justify-end">
            {/* Calculations Breakdown */}
            <div className="w-full sm:w-64 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-800">{currencySymbol}{order.subtotal}</span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount:</span>
                  <span>-{currencySymbol}{order.discount}</span>
                </div>
              )}

              {order.taxPercent > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({order.taxPercent}% GST):</span>
                  <span>+{currencySymbol}{order.taxAmount}</span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Tax (0% GST):</span>
                  <span>{currencySymbol}0</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-900 border-t border-b border-slate-200 py-2">
                <span>Total Amount:</span>
                <span className="text-brand-700 text-base">{currencySymbol}{order.totalAmount}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Advance Paid:</span>
                <span className="font-bold text-emerald-700">{currencySymbol}{order.advancePaid}</span>
              </div>

              <div className="flex justify-between text-slate-900 font-black text-xs pt-1">
                <span>Remaining Balance:</span>
                <span className={order.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                  {currencySymbol}{order.remainingBalance}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Terms & Thank You */}
          <div className="mt-6 pt-4 border-t border-dashed border-slate-200 text-[10px] text-slate-500 text-center leading-relaxed">
            <p className="font-bold text-slate-800 mb-1.5 text-xs">
              Thank you for choosing {setting?.shopName || 'IntelligentLaundry'}!
            </p>
            <div className="space-y-1 text-slate-600 font-semibold max-w-md mx-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-left sm:text-center">
              <p>1. Please inspect clothes upon delivery.</p>
              <p>2. Clothes not collected within 30 days are subject to storage charges.</p>
              <p>3. Colors may bleed on delicate items if not pre-informed.</p>
            </div>
          </div>
        </div>
      </div>
    );

    if (isPublicView) {
      return cardContent;
    }

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        {cardContent}
      </div>
    );
  };
