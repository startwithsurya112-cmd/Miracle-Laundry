import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Plus,
  Users,
  WashingMachine,
  BarChart3,
  Settings,
  MoreHorizontal,
  Wallet,
  X,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);

  return (
    <>
      {/* Slide up More Menu Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMoreMenu(false)}
          />

          {/* Scrollable Drawer Sheet */}
          <div className="relative z-50 w-full max-h-[82vh] overflow-y-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-4 pb-24 shadow-2xl space-y-2.5 touch-pan-y animate-in slide-in-from-bottom duration-200">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />
            
            <div className="flex items-center justify-between px-2 mb-1">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                More Features & Operations
              </h3>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Staff & Attendance */}
            <NavLink
              to="/staff"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100 font-medium text-slate-800 dark:text-slate-100"
            >
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-blue-950 dark:text-blue-200">Staff & Attendance</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Attendance register, table logs & reports</p>
              </div>
            </NavLink>

            {/* 2. Machine & Utilities */}
            <NavLink
              to="/machines"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/50 hover:bg-cyan-100 font-medium text-slate-800 dark:text-slate-100"
            >
              <div className="p-2.5 rounded-xl bg-cyan-600 text-white shadow-xs">
                <WashingMachine className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-cyan-950 dark:text-cyan-200">Machine & Utilities</p>
                <p className="text-xs text-cyan-600 dark:text-cyan-400">Washer runs, Dryer cycles & LPG Gas cost</p>
              </div>
            </NavLink>

            {/* 3. Accounts & Expenses */}
            <NavLink
              to="/accounts"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-100 font-medium text-slate-800 dark:text-slate-100"
            >
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">Accounts & Expenses</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Order incomes, EB bills & wages</p>
              </div>
            </NavLink>

            {/* 4. Services */}
            <NavLink
              to="/services"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 font-medium text-slate-800 dark:text-slate-100"
            >
              <div className="p-2.5 rounded-xl bg-slate-700 text-white shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold">Services Management</p>
                <p className="text-xs text-slate-500">Wash, Iron, Dry Clean pricing</p>
              </div>
            </NavLink>

            {/* 5. Clothing Items */}
            <NavLink
              to="/items"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 font-medium text-slate-800 dark:text-slate-100"
            >
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold">Clothing Items</p>
                <p className="text-xs text-slate-500">Shirts, Pants, Suits, Blankets</p>
              </div>
            </NavLink>

            {/* 6. Categories */}
            <NavLink
              to="/categories"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 font-medium text-slate-800 dark:text-slate-100"
            >
              <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold">Garment Categories</p>
                <p className="text-xs text-slate-500">Regular, Men, Women, Kids, Household</p>
              </div>
            </NavLink>

            {/* 7. Reports */}
            <NavLink
              to="/reports"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 font-medium text-slate-800 dark:text-slate-100"
            >
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold">Reports & Analytics</p>
                <p className="text-xs text-slate-500">Revenue, Charts, CSV Export</p>
              </div>
            </NavLink>

            {/* 8. Shop Settings */}
            <NavLink
              to="/settings"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 font-medium text-slate-800 dark:text-slate-100"
            >
              <div className="p-2.5 rounded-xl bg-slate-600 text-white shadow-xs">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold">Shop Settings</p>
                <p className="text-xs text-slate-500">Logo, Address, Tax, Receipt Prefix</p>
              </div>
            </NavLink>
          </div>
        </div>
      )}

      {/* Fixed Bottom Nav Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around z-30 px-2 shadow-lg">
        <NavLink
          to="/dashboard"
          onClick={() => setShowMoreMenu(false)}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
              isActive ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">Home</span>
        </NavLink>

        <NavLink
          to="/orders"
          onClick={() => setShowMoreMenu(false)}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
              isActive ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">Orders</span>
        </NavLink>

        {/* Center Floating POS New Order Button */}
        <NavLink
          to="/orders/new"
          onClick={() => setShowMoreMenu(false)}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 -mt-5 hover:bg-brand-700 transition-all"
        >
          <Plus className="w-6 h-6" />
        </NavLink>

        <NavLink
          to="/customers"
          onClick={() => setShowMoreMenu(false)}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
              isActive ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">Customers</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${
            showMoreMenu ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-bold">More</span>
        </button>
      </nav>
    </>
  );
};
