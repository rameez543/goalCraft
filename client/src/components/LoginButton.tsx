import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const LoginButton: React.FC = () => {
  const { loginWithGoogle, isAuthenticated, user, logout } = useAuth();

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-3">
        {user.profilePicture ? (
          <img
            src={user.profilePicture}
            alt={user.displayName || user.username}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
            {user.displayName ? user.displayName[0].toUpperCase() : user.username[0].toUpperCase()}
          </div>
        )}
        <div className="hidden md:block">
          <span className="text-sm font-medium text-gray-700">
            {user.displayName || user.username}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={loginWithGoogle} className="flex items-center space-x-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
        className="text-white"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.36 14.8c-1.44 2.41-4.08 4-7.36 4-4.42 0-8-3.58-8-8 0-3.28 1.59-5.92 4-7.36.62-.36 1.27-.65 1.96-.84C9.54 4.21 10.72 4 12 4c1.28 0 2.46.21 3.55.6.69.19 1.34.48 1.96.84 2.41 1.44 4 4.08 4 7.36 0 1.28-.21 2.46-.6 3.55-.19.69-.48 1.34-.84 1.96-.21.35-.42.69-.71 1.09z" />
      </svg>
      <span>Sign in with Google</span>
    </Button>
  );
};

export default LoginButton;