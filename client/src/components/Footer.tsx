import React from 'react';
import { Link } from 'wouter';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo and tagline */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm mr-2">
              <span className="text-sm text-white">✓</span>
            </div>
            <div>
              <div className="font-medium text-gray-800">TaskBreaker</div>
              <div className="text-xs text-gray-500">Break tasks, achieve goals</div>
            </div>
          </div>
          
          {/* Quick links in mobile-friendly grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:flex sm:space-x-6 text-center sm:text-left">
            <Link href="/about">
              <div className="text-gray-500 hover:text-blue-600 text-sm flex items-center justify-center sm:justify-start cursor-pointer">
                <span className="text-lg mr-1">📄</span> About
              </div>
            </Link>
            <Link href="/privacy">
              <div className="text-gray-500 hover:text-blue-600 text-sm flex items-center justify-center sm:justify-start cursor-pointer">
                <span className="text-lg mr-1">🔒</span> Privacy
              </div>
            </Link>
            <Link href="/terms">
              <div className="text-gray-500 hover:text-blue-600 text-sm flex items-center justify-center sm:justify-start cursor-pointer">
                <span className="text-lg mr-1">📝</span> Terms
              </div>
            </Link>
            <Link href="/help">
              <div className="text-gray-500 hover:text-blue-600 text-sm flex items-center justify-center sm:justify-start cursor-pointer">
                <span className="text-lg mr-1">❓</span> Help
              </div>
            </Link>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
          © {new Date().getFullYear()} TaskBreaker. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
