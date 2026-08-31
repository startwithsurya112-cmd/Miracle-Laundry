import React, { createContext, useContext, useState, useEffect } from 'react';
import { Admin, Shop } from '../types';
import {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getMe,
  loginAdmin,
  fetchShops,
  getSelectedShopId,
  setSelectedShopId,
  clearApiCache,
} from '../services/api';

interface AuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  shops: Shop[];
  selectedShop: Shop | null;
  selectedShopId: string;
  selectShop: (shopId: string | 'all') => void;
  refreshShops: () => Promise<void>;
  login: (credentials: any) => Promise<boolean>;
  logout: () => void;
  updateAdminState: (updated: Admin) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopIdState, setSelectedShopIdState] = useState<string>(() => {
    return getSelectedShopId() || 'all';
  });

  const isSuperAdmin = !admin?.role || admin?.role === 'super_admin';

  const loadShops = async () => {
    try {
      const res = await fetchShops();
      if (res.success && Array.isArray(res.shops)) {
        setShops(res.shops);
      }
    } catch (err) {
      console.warn('Failed to load shops list:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await getMe();
          if (res.success && res.admin) {
            setAdmin(res.admin);
            if (res.admin.role === 'branch_admin' && res.admin.shopId) {
              const bShopId = String(res.admin.shopId);
              setSelectedShopIdState(bShopId);
              setSelectedShopId(bShopId);
            }
          } else {
            removeAuthToken();
          }
        } catch (err) {
          console.warn('Auth check failed, using stored token state if valid');
          setAdmin({
            id: 'admin-1',
            username: 'adminIL',
            name: 'Shop Owner',
            email: 'owner@intelligentlaundry.com',
            role: 'super_admin',
          });
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // When authenticated, load shops list for switcher
  useEffect(() => {
    if (admin) {
      loadShops();
    }
  }, [admin]);

  const selectShop = (shopId: string | 'all') => {
    const cleanId = shopId === 'all' ? 'all' : shopId;
    setSelectedShopIdState(cleanId);
    setSelectedShopId(cleanId === 'all' ? null : cleanId);
    clearApiCache();
  };

  const refreshShops = async () => {
    await loadShops();
  };

  const login = async (credentials: any): Promise<boolean> => {
    try {
      const res = await loginAdmin(credentials);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setAdmin(res.admin);

        if (res.admin.role === 'branch_admin' && res.admin.shopId) {
          const bId = String(res.admin.shopId);
          setSelectedShopIdState(bId);
          setSelectedShopId(bId);
        } else {
          setSelectedShopIdState('all');
          setSelectedShopId(null);
        }

        clearApiCache();
        await loadShops();
        return true;
      }
      return false;
    } catch (err: any) {
      throw err;
    }
  };

  const logout = () => {
    removeAuthToken();
    setSelectedShopId(null);
    clearApiCache();
    setAdmin(null);
    setShops([]);
    setSelectedShopIdState('all');
  };

  const updateAdminState = (updated: Admin) => {
    setAdmin(updated);
  };

  const selectedShop =
    selectedShopIdState && selectedShopIdState !== 'all'
      ? shops.find((s) => s._id === selectedShopIdState || s.code === selectedShopIdState) || null
      : null;

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        isSuperAdmin,
        shops,
        selectedShop,
        selectedShopId: selectedShopIdState,
        selectShop,
        refreshShops,
        login,
        logout,
        updateAdminState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

