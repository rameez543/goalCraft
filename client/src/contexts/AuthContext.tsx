import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  profilePicture: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Temporarily set user to a dummy anonymous user and skip authentication
  const [user, setUser] = useState<User | null>({
    id: 1,
    username: 'anonymous',
    email: 'anonymous@example.com',
    displayName: 'Anonymous User',
    profilePicture: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Authentication check temporarily disabled
  // useEffect(() => {
  //   const checkAuth = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await fetch('/api/user', { credentials: 'include' });
  //       if (response.ok) {
  //         const data = await response.json();
  //         setUser(data.user);
  //       }
  //     } catch (err) {
  //       console.error('Error checking auth:', err);
  //       setError('Failed to check authentication status');
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  // 
  //   checkAuth();
  // }, []);

  // Google login temporarily disabled
  const loginWithGoogle = () => {
    // window.location.href = '/auth/google';
    console.log('Google login temporarily disabled');
    toast({
      title: 'Google Login Disabled',
      description: 'Google login has been temporarily disabled.',
      variant: 'default'
    });
  };

  // Logout temporarily modified
  const logout = async () => {
    try {
      // Logout disabled - just show a toast message
      // await fetch('/auth/logout', { credentials: 'include' });
      // setUser(null);
      
      // Clear any cached user data
      // queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: 'Logout Disabled',
        description: 'Logout functionality has been temporarily disabled.',
      });
    } catch (err) {
      console.error('Error logging out:', err);
      setError('Failed to log out');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log out. Please try again.',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        logout,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};