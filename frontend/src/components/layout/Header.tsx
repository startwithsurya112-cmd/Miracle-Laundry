import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PwaInstallButton } from '../common/PwaInstallButton';
import {
  Sun,
  Moon,
  LogOut,
  User,
  Plus,
  Search,
  WashingMachine,
  Sparkles,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface HeaderProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isSidebarCollapsed, onToggleSidebar }) => {
  const { admin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/orders?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Mobile Brand / Desktop Search & Live Clock */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:flex p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}

        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 overflow-hidden">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-md" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1">
            Miracle Laundry <Sparkles className="w-3 h-3 text-brand-500 fill-brand-500" />
          </span>
        </div>

        {/* Global Search Bar (Desktop & Tablet) */}
        <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative w-56 md:w-72">
          <Search className="w-4 h-4 absolute left-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, customer name..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </form>

        {/* Live Date & Time Display */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5 text-brand-500" />
          <span>{currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span className="opacity-40">•</span>
          <span className="font-mono text-brand-600 dark:text-brand-400">
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* PWA Desktop App Installation Button */}
        <PwaInstallButton className="hidden md:flex" />

        {/* Quick New Order Button */}
        <button
          onClick={() => navigate('/orders/new')}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Order</span>
        </button>

        {/* Dark/Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Dark / Light Theme"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {admin?.name ? admin.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden md:block text-left pr-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {admin?.name || 'Shop Admin'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">Administrator</p>
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{admin?.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{admin?.email}</p>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <User className="w-3.5 h-3.5" />
                Account Settings
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
