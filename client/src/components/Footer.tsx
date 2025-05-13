import React from 'react';
import { Link } from 'wouter';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <svg className="h-5 w-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="font-medium text-gray-800">TaskBreaker</span>
          </div>
          <div className="flex space-x-6">
            <Link href="/about">
              <a className="text-gray-500 hover:text-gray-700 text-sm">About</a>
            </Link>
            <Link href="/privacy">
              <a className="text-gray-500 hover:text-gray-700 text-sm">Privacy</a>
            </Link>
            <Link href="/terms">
              <a className="text-gray-500 hover:text-gray-700 text-sm">Terms</a>
            </Link>
            <Link href="/help">
              <a className="text-gray-500 hover:text-gray-700 text-sm">Help</a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
