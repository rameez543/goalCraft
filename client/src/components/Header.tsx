import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Settings, HelpCircle } from 'lucide-react';

const Header: React.FC = () => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <Link href="/">
          <div className="flex items-center space-x-2 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-xl text-white">✓</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gradient bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              TaskBreaker
            </h1>
          </div>
        </Link>
        
        <nav className="flex space-x-2 sm:space-x-4 items-center">
          <Link href="/">
            <div className={`flex items-center ${location === '/' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'} hover:bg-blue-50 hover:text-blue-600 rounded-full p-2.5 transition-colors cursor-pointer`} title="Home">
              <span className="text-lg">🏠</span>
              <span className="ml-1 text-sm font-medium hidden sm:inline">Home</span>
            </div>
          </Link>
          
          <Link href="/settings">
            <div className={`flex items-center ${location === '/settings' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'} hover:bg-blue-50 hover:text-blue-600 rounded-full p-2.5 transition-colors cursor-pointer`} title="Settings">
              <span className="text-lg">⚙️</span>
              <span className="ml-1 text-sm font-medium hidden sm:inline">Settings</span>
            </div>
          </Link>
          
          <button className="flex items-center bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-full p-2.5 transition-colors" title="Help">
            <span className="text-lg">❓</span>
            <span className="ml-1 text-sm font-medium hidden sm:inline">Help</span>
          </button>
          
          {/* User account dropdown or login button */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.displayName || user.username} />
                    ) : (
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(user.displayName || user.username)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Login / Register
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
