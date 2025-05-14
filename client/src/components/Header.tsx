import React from 'react';
import { Link } from 'wouter';
// LoginButton temporarily disabled
// import LoginButton from './LoginButton';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/">
          <div className="flex items-center space-x-2 cursor-pointer">
            <span className="text-2xl">✅</span>
            <h1 className="text-xl font-bold text-gradient bg-gradient-to-r from-blue-600 to-primary bg-clip-text text-transparent">TaskBreaker</h1>
          </div>
        </Link>
        <div className="flex space-x-3 items-center">
          <Link href="/settings">
            <button className="flex items-center bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors" title="Settings">
              <span className="text-lg">⚙️</span>
            </button>
          </Link>
          <button className="flex items-center bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors" title="Help">
            <span className="text-lg">❓</span>
          </button>
          {/* Login button temporarily removed */}
        </div>
      </div>
    </header>
  );
};

export default Header;
