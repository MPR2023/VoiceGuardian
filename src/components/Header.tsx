import React from 'react';
import { Shield, Settings, Bell, User, Menu, X } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, isSidebarOpen }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Mobile Menu Button */}
          <button
            id="hamburger-button"
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {isSidebarOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Voice Guardian
            </h1>
          </div>
          
          <div className="hidden md:block h-6 w-px bg-gray-300 ml-6"></div>
          <div className="hidden md:block text-sm text-gray-600">
            Advanced Audio Analysis & Monitoring
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <Settings className="h-5 w-5" />
          </button>
          <button className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]">
            <User className="h-5 w-5" />
            <span className="hidden sm:block text-sm font-medium">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;