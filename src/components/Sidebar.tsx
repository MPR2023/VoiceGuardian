import React from 'react';
import { Home, Upload, BarChart3, Flag, Settings, FileAudio } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isMobile = false }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'upload', label: 'Upload Audio', icon: Upload },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'flags', label: 'Flags', icon: Flag },
    { id: 'files', label: 'Audio Files', icon: FileAudio },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarClasses = isMobile
    ? "w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-full"
    : "w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white min-h-screen";

  return (
    <aside className={sidebarClasses}>
      <div className="p-4 md:p-6">
        <nav className="space-y-1 md:space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3 md:px-4 py-3 md:py-3 rounded-lg transition-all duration-200 min-h-[44px] text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;