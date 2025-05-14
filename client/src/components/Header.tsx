import React from 'react';
import { Link, useLocation } from 'wouter';
// LoginButton temporarily disabled
// import LoginButton from './LoginButton';

const Header: React.FC = () => {
  const [location] = useLocation();
  
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
          {/* Login button temporarily removed */}
        </nav>
      </div>
    </header>
  );
};

export default Header;
