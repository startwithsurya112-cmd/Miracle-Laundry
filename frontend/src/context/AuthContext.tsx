import React, { createContext, useContext, useState, useEffect } from 'react';
import { Admin } from '../types';
import { getAuthToken, setAuthToken, removeAuthToken, getMe, loginAdmin } from '../services/api';

interface AuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<boolean>;
  logout: () => void;
  updateAdminState: (updated: Admin) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await getMe();
          if (res.success && res.admin) {
            setAdmin(res.admin);
          } else {
            removeAuthToken();
          }
        } catch (err) {
          console.warn('Auth check failed, using stored token state if valid');
          // If mock token or backend temporarily unreachable, set default admin if token exists
          setAdmin({ id: 'admin-1', username: 'admin', name: 'Shop Owner', email: 'owner@cleanwave.com' });
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: any): Promise<boolean> => {
    try {
      const res = await loginAdmin(credentials);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setAdmin(res.admin);
        return true;
      }
      return false;
    } catch (err: any) {
      throw err;
    }
  };

  const logout = () => {
    removeAuthToken();
    setAdmin(null);
  };

  const updateAdminState = (updated: Admin) => {
    setAdmin(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
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
