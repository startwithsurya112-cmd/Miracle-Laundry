import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, Setting } from '../../types';
import { updateOrderApi } from '../../services/api';
import { X, Save, Edit, RefreshCw, Calendar, Plus } from 'lucide-react';

interface EditOrderModalProps {
  order: Order;
  setting?: Setting;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedOrder?: Order) => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  setting,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const currencySymbol = setting?.currencySymbol || '₹';

  const mapInitialItems = (orderItems: any[]) =>
    (orderItems || []).map((item) => {
      const unitP = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(item.price || 0);
      const qty = Number(item.quantity) || 1;
      const sub = item.subtotal !== undefined ? Number(item.subtotal) : unitP * qty;
      return {
        ...item,
        itemName: item.itemName || item.name || item.garmentName || 'Item',
        serviceName: item.serviceName || 'Wash & Iron',
        quantity: qty,
        unitPrice: unitP,
        price: unitP,
        subtotal: sub,
      };
    });

  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paymentStatus, setPaymentStatus] = useState<any>(order.paymentStatus);
  const [paymentMethod, setPaymentMethod] = useState<string>(order.paymentMethod || 'Cash');
  const [advancePaid, setAdvancePaid] = useState<number>(order.advancePaid || 0);
  const [discount, setDiscount] = useState<number>(order.discount || 0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(
    order.expectedDeliveryDate
      ? new Date(order.expectedDeliveryDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>(order.notes || '');
  const [items, setItems] = useState<any[]>(() => mapInitialItems(order.items));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setPaymentStatus(order.paymentStatus);
      setPaymentMethod(order.paymentMethod || 'Cash');
      setAdvancePaid(order.advancePaid || 0);
      setDiscount(order.discount || 0);
      setExpectedDeliveryDate(
        order.expectedDeliveryDate
          ? new Date(order.expectedDeliveryDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setNotes(order.notes || '');
      setItems(mapInitialItems(order.items));
    }
  }, [order]);

  const statusOptions: OrderStatus[] = [
    'Received',
    'Washing',
    'Drying',
    'Ironing',
    'Packing',
    'Ready for Delivery',
    'Delivered',
    'Cancelled',
  ];

  // Math calculations
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.subtotal) !== undefined ? Number(item.subtotal) : Number(item.unitPrice || 0) * Number(item.quantity || 1)),
    0
  );
  const totalAmount = Math.max(0, subtotal - Number(discount || 0));
  const remainingBalance = Math.max(0, totalAmount - Number(advancePaid || 0));

  const handleItemNameChange = (index: number, name: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], itemName: name, name };
    setItems(updated);
  };

  const handleServiceNameChange = (index: number, sName: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], serviceName: sName };
    setItems(updated);
  };

  const handleItemQuantityChange = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    const updated = [...items];
    const item = { ...updated[index] };
    item.quantity = qty;
    const unitP = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(item.price || 0);
    item.unitPrice = unitP;
    item.price = unitP;
    item.subtotal = unitP * qty;
    updated[index] = item;
    setItems(updated);
  };

  const handleItemPriceChange = (index: number, newPrice: number) => {
    const price = Math.max(0, newPrice);
    const updated = [...items];
    const item = { ...updated[index] };
    item.unitPrice = price;
    item.price = price;
    item.subtotal = price * (Number(item.quantity) || 1);
    updated[index] = item;
    setItems(updated);
  };

  const handleItemSubtotalChange = (index: number, newSub: number) => {
    const sub = Math.max(0, newSub);
    const updated = [...items];
    const item = { ...updated[index] };
    const qty = Number(item.quantity) || 1;
    const unitP = Math.round(sub / qty);
    item.subtotal = sub;
    item.unitPrice = unitP;
    item.price = unitP;
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemId: `item-${Date.now()}`,
        itemName: 'New Garment / Service',
        serviceId: 'service',
        serviceName: 'Wash & Iron',
        quantity: 1,
        unitPrice: 0,
        price: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMsg('An order must have at least 1 item.');
      return;
    }
    setErrorMsg('');
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let finalPayStatus = paymentStatus;
      if (remainingBalance === 0 && totalAmount > 0) {
        finalPayStatus = 'Paid';
      } else if (advancePaid > 0 && remainingBalance > 0) {
        finalPayStatus = 'Partially Paid';
      }

      const normalizedItems = items.map((item) => {
        const qty = Number(item.quantity) || 1;
        const unitP = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(item.price || 0);
        const sub = item.subtotal !== undefined ? Number(item.subtotal) : unitP * qty;
        return {
          itemId: item.itemId || `item-${Date.now()}`,
          itemName: item.itemName || item.name || 'Item',
          serviceId: item.serviceId || 'service',
          serviceName: item.serviceName || 'Wash & Iron',
          quantity: qty,
          unitPrice: unitP,
          price: unitP,
          subtotal: sub,
        };
      });

      const updatePayload = {
        status,
        paymentStatus: finalPayStatus,
        paymentMethod,
        advancePaid: Number(advancePaid),
        discount: Number(discount),
        expectedDeliveryDate,
        notes,
        items: normalizedItems,
      };

      const res = await updateOrderApi(order._id, updatePayload);
      if (res.success) {
        onSave(res.order);
        onClose();
      } else {
        setErrorMsg(res.message || 'Failed to update order');
      }
    } catch (err: any) {
      console.error('Failed to update order', err);
      setErrorMsg(err.message || 'Error saving changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[95vh] sm:max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="p-3.5 sm:p-5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600">
              <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Edit Order #{order.orderNumber}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate max-w-[200px] sm:max-w-none">
                Customer: {order.customerSnapshot?.name || 'Customer'} (+91 {order.customerSnapshot?.mobile})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-600 font-bold text-xs">
              {errorMsg}
            </div>
          )}

          {/* Status & Delivery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Order Progress Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
              >
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Expected Delivery Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Status & Method Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
              >
                <option value="Pending">Pending</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Advance Paid ({currencySymbol})</label>
              <input
                type="number"
                min="0"
                value={advancePaid}
                onChange={(e) => setAdvancePaid(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
              />
            </div>
          </div>

          {/* Discount & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Flat Discount ({currencySymbol})</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Order Notes / Instructions</label>
              <input
                type="text"
                placeholder="Special washing remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Items List Section */}
          <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white">
                Order Items ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold text-[11px] flex items-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Desktop / Tablet Table View (hidden sm:block) */}
            <div className="hidden sm:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Item / Service</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price ({currencySymbol})</th>
                    <th className="py-2.5 px-3 text-right">Subtotal ({currencySymbol})</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-semibold">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.itemName || ''}
                          onChange={(e) => handleItemNameChange(idx, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white"
                          placeholder="Item Name (e.g. T-Shirt)"
                        />
                        <input
                          type="text"
                          value={item.serviceName || ''}
                          onChange={(e) => handleServiceNameChange(idx, e.target.value)}
                          className="w-full mt-1 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[10px] font-semibold text-brand-600 dark:text-brand-400 outline-none focus:ring-1 focus:ring-amber-500"
                          placeholder="Service (e.g. Wash & Iron)"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemQuantityChange(idx, Number(e.target.value))}
                          className="w-14 text-center px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold outline-none text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice !== undefined ? item.unitPrice : item.price || 0}
                          onChange={(e) => handleItemPriceChange(idx, Number(e.target.value))}
                          className="w-20 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold outline-none text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.subtotal}
                          onChange={(e) => handleItemSubtotalChange(idx, Number(e.target.value))}
                          className="w-20 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black outline-none text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Stack View (block sm:hidden) */}
            <div className="space-y-3 sm:hidden">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={item.itemName || ''}
                      onChange={(e) => handleItemNameChange(idx, e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                      placeholder="Item Name (e.g. T-Shirt)"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 hover:bg-rose-100 transition-colors shrink-0"
                      title="Remove item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={item.serviceName || ''}
                    onChange={(e) => handleServiceNameChange(idx, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-brand-600 dark:text-brand-400 outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Service (e.g. Wash & Iron)"
                  />

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5 text-center">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemQuantityChange(idx, Number(e.target.value))}
                        className="w-full text-center py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5 text-center">Price ({currencySymbol})</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice !== undefined ? item.unitPrice : item.price || 0}
                        onChange={(e) => handleItemPriceChange(idx, Number(e.target.value))}
                        className="w-full text-center py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5 text-center">Subtotal ({currencySymbol})</label>
                      <input
                        type="number"
                        min="0"
                        value={item.subtotal}
                        onChange={(e) => handleItemSubtotalChange(idx, Number(e.target.value))}
                        className="w-full text-center py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-xs outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary Banner */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between gap-2.5 sm:gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-semibold">Subtotal:</span>{' '}
              <strong className="text-slate-800 dark:text-slate-200">{currencySymbol}{subtotal}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Discount:</span>{' '}
              <strong className="text-rose-600">-{currencySymbol}{discount}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Total Amount:</span>{' '}
              <strong className="text-slate-900 dark:text-white text-sm">{currencySymbol}{totalAmount}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Remaining Bal:</span>{' '}
              <strong className={remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                {currencySymbol}{remainingBalance}
              </strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-center"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-md shadow-amber-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Order Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
