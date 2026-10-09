import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  PlusCircle,
  Users,
  WashingMachine,
  Shirt,
  Layers,
  BarChart3,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  PackageSearch,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggleCollapse }) => {
  const location = useLocation();

  // Check if current path belongs to Catalog & Services group
  const isCatalogRoute = ['/services', '/items', '/categories'].includes(location.pathname);
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(true);

  useEffect(() => {
    if (isCatalogRoute) {
      setIsCatalogOpen(true);
    }
  }, [location.pathname]);

  const mainNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'New Order', path: '/orders/new', icon: PlusCircle },
    { label: 'Orders', path: '/orders', icon: ShoppingBag, end: true },
    { label: 'Staff & Attendance', path: '/staff', icon: Users },
    { label: 'Machine & Utilities', path: '/machines', icon: WashingMachine },
    { label: 'Accounts & Expenses', path: '/accounts', icon: Wallet },
    { label: 'Customers', path: '/customers', icon: Users },
  ];

  const catalogNavItems = [
    { label: 'Services', path: '/services', icon: WashingMachine },
    { label: 'Clothing Items', path: '/items', icon: Shirt },
    { label: 'Garment Categories', path: '/categories', icon: Layers },
  ];

  const systemNavItems = [
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Shop Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 select-none transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-white p-0.5 border border-slate-200 dark:border-slate-700 shadow-md shrink-0 overflow-hidden">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-lg" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <h1 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                Miracle Laundry <Sparkles className="w-3 h-3 text-brand-500 fill-brand-500 shrink-0" />
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Laundry Admin POS</p>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Nav Menu Container */}
      <div className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {/* SECTION 1: CORE OPERATIONS */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              Core Operations
            </div>
          )}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isCollapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* SECTION 2: CATALOG & SERVICES (COLLAPSIBLE DROPDOWN GROUP) */}
        <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {!isCollapsed ? (
            <div>
              {/* Dropdown Header Button */}
              <button
                type="button"
                onClick={() => setIsCatalogOpen(!isCatalogOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  isCatalogRoute
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-50/60 dark:bg-brand-950/40'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PackageSearch className="w-4 h-4 text-brand-500" />
                  <span className="uppercase tracking-wider">Catalog & Pricing</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isCatalogOpen ? 'rotate-180 text-brand-600 dark:text-brand-400' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Dropdown Sub-Items List */}
              {isCatalogOpen && (
                <div className="mt-1 pl-3 space-y-1 border-l-2 border-slate-200 dark:border-slate-800 ml-4">
                  {catalogNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                            isActive
                              ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Collapsed view icons for catalog items */
            <div className="space-y-1">
              {catalogNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={item.label}
                    className={({ isActive }) =>
                      `flex items-center justify-center p-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: REPORTS & SYSTEM */}
        <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {!isCollapsed && (
            <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
              Analytics & Config
            </div>
          )}
          {systemNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isCollapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-3 m-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300">Miracle Laundry v1.0</p>
          <p className="mt-0.5 text-[11px]">Express Laundry POS</p>
        </div>
      )}
    </aside>
  );
};
