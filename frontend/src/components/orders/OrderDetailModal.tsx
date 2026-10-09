import React, { useState } from 'react';
import { Order, OrderStatus, Setting } from '../../types';
import { StatusBadge } from '../ui/Badge';
import {
  X,
  Printer,
  CreditCard,
  Calendar,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface OrderDetailModalProps {
  order: Order;
  setting?: Setting;
  onClose: () => void;
  onUpdateStatus: (status: OrderStatus) => void;
  onRecordPayment: () => void;
  onOpenInvoice: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  setting,
  onClose,
  onUpdateStatus,
  onRecordPayment,
  onOpenInvoice,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);
  const currencySymbol = setting?.currencySymbol || '₹';

  const statuses: OrderStatus[] = [
    'Received',
    'Washing',
    'Drying',
    'Ironing',
    'Packing',
    'Ready for Delivery',
    'Delivered',
    'Cancelled',
  ];

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                Order #{order.orderNumber}
              </h2>
              <StatusBadge status={order.status} size="sm" />
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Created: {new Date(order.orderDate).toLocaleString('en-GB')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenInvoice}
              className="px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-300 hover:bg-brand-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Status Bar / Switcher */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Update Order Status
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {statuses.map((st) => {
                const isActive = order.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => {
                      setSelectedStatus(st);
                      onUpdateStatus(st);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 scale-105'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-brand-500'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer & Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Customer Details
              </p>
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                <User className="w-4 h-4 text-brand-500 shrink-0" />
                <span>{order.customerSnapshot.name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>+91 {order.customerSnapshot.mobile}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400 text-xs">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{order.customerSnapshot.address}</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Payment Info
              </p>
              <div className="flex items-center gap-2 text-xs">
                <CreditCard className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span>Payment Status:</span>
                <StatusBadge status={order.paymentStatus} size="sm" />
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 pt-1 flex justify-between">
                <span>Advance: {currencySymbol}{order.advancePaid}</span>
                <span className="font-bold text-rose-600">Balance: {currencySymbol}{order.remainingBalance}</span>
              </div>
            </div>
          </div>

          {/* Items Section: Desktop Table & Mobile Cards */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Order Items ({order.items.length})
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Service</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {order.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold">{item.itemName}</td>
                        <td className="py-2.5 px-3 text-brand-600 dark:text-brand-400 font-medium">{item.serviceName}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right">
                          {item.unitPrice === 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">In Kg Pack</span> : `${currencySymbol}${item.unitPrice}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {item.subtotal === 0 ? <span className="text-slate-400 font-normal text-[11px]">-</span> : `${currencySymbol}${item.subtotal}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Touch Cards */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.itemName}</p>
                      <p className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">{item.serviceName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.quantity} {item.unitPrice === 0 ? '(In Kg Pack)' : `× ${currencySymbol}${item.unitPrice}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-900 dark:text-white">
                        {item.subtotal === 0 ? '-' : `${currencySymbol}${item.subtotal}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes & Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-1">
            {order.notes && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 w-full sm:max-w-xs">
                <p className="font-semibold mb-0.5">Special Instructions:</p>
                <p>{order.notes}</p>
              </div>
            )}

            <div className="w-full sm:w-64 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 ml-auto">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{currencySymbol}{order.subtotal}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-{currencySymbol}{order.discount}</span>
                </div>
              )}
              {order.taxPercent > 0 && (
                <div className="flex justify-between">
                  <span>Tax ({order.taxPercent}%):</span>
                  <span>+{currencySymbol}{order.taxAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-2">
                <span>Total Amount:</span>
                <span className="text-brand-600 dark:text-brand-400">{currencySymbol}{order.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Status Timeline History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Order Timeline History
              </p>
              <div className="space-y-3 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {order.statusHistory.map((hist, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative pl-6">
                    <div className="absolute left-1 top-1 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-900" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {hist.status}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(hist.timestamp).toLocaleString('en-GB')}
                        </span>
                      </div>
                      {hist.note && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hist.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-2">
          <div>
            {order.remainingBalance > 0 && (
              <button
                onClick={onRecordPayment}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>Record Pay ({currencySymbol}{order.remainingBalance})</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
