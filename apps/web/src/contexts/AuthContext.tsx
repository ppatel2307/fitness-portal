/**
 * Authentication context
 * Manages user authentication state and provides auth methods
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAccessToken, setRefreshToken, getRefreshToken } from '@/lib/api';
import type { LoginResponse, ApiResponse, User, Role } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Try to refresh the access token
        const response = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          '/auth/refresh',
          { refreshToken }
        );

        if (response.data.success && response.data.data) {
          setAccessToken(response.data.data.accessToken);
          setRefreshToken(response.data.data.refreshToken);

          // Get user profile
          const profileResponse = await api.get<ApiResponse<User>>('/users/profile');
          if (profileResponse.data.success && profileResponse.data.data) {
            setUser(profileResponse.data.data);
          }
        }
      } catch (error) {
        // Token refresh failed, clear stored tokens
        setAccessToken(null);
        setRefreshToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
      email,
      password,
      rememberMe,
    });

    if (response.data.success && response.data.data) {
      const { accessToken, refreshToken, user: userData } = response.data.data;
      
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      
      // Fetch full user profile
      const profileResponse = await api.get<ApiResponse<User>>('/users/profile');
      if (profileResponse.data.success && profileResponse.data.data) {
        setUser(profileResponse.data.data);
      }
      
      // Navigate based on role
      navigate(userData.role === 'ADMIN' ? '/admin' : '/dashboard');
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      navigate('/login');
    }
  }, [navigate]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRequireAuth(requiredRole?: Role) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (requiredRole && user?.role !== requiredRole) {
        navigate(user?.role === 'ADMIN' ? '/admin' : '/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, navigate]);

  return { user, isLoading };
}
