import React from 'react';
import { BarChart3, FileAudio, Flag, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { AudioFile, FlaggedTimestamp } from '../types';
import { formatTime } from '../utils/audioProcessing';

interface DashboardProps {
  audioFiles: AudioFile[];
  flaggedTimestamps: FlaggedTimestamp[];
}

const Dashboard: React.FC<DashboardProps> = ({ audioFiles, flaggedTimestamps }) => {
  const totalDuration = audioFiles.reduce((acc, file) => acc + file.duration, 0);
  const criticalFlags = flaggedTimestamps.filter(flag => 
    flag.severity === 'critical' || flag.label?.includes('toxic') || flag.label?.includes('hate')
  ).length;
  const warningFlags = flaggedTimestamps.filter(flag => 
    flag.severity === 'warning' || flag.label?.includes('warning') || flag.label?.includes('profanity')
  ).length;
  const recentFiles = audioFiles.slice(0, 5);

  const stats = [
    {
      label: 'Total Files',
      value: audioFiles.length,
      icon: FileAudio,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Total Duration',
      value: formatTime(totalDuration),
      icon: Clock,
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Critical Flags',
      value: criticalFlags,
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Warning Flags',
      value: warningFlags,
      icon: Flag,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50'
    }
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl text-white p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Voice Guardian Dashboard</h1>
            <p className="text-blue-100 text-base md:text-lg">
              Monitor and analyze audio content with advanced AI-powered detection
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <BarChart3 className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-lg p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-2 md:p-3 rounded-lg`}>
                  <Icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Recent Files */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Files</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {recentFiles.length > 0 ? (
              recentFiles.map((file) => (
                <div key={file.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <FileAudio className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatTime(file.duration)} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 flex-shrink-0 ml-2">
                      <span className="hidden sm:inline">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </span>
                      <span className="sm:hidden">
                        {new Date(file.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 md:p-8 text-center text-gray-500">
                <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No files uploaded yet</p>
                <p className="text-sm mt-1">Upload your first audio file to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Flags */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Flags</h3>
              <AlertTriangle className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {flaggedTimestamps.slice(0, 5).length > 0 ? (
              flaggedTimestamps.slice(0, 5).map((flag) => {
                const severityColors = {
                  critical: 'bg-red-100 text-red-800',
                  warning: 'bg-yellow-100 text-yellow-800',
                  info: 'bg-blue-100 text-blue-800',
                  review: 'bg-purple-100 text-purple-800'
                };

                // Handle moderation flags
                let displaySeverity = flag.severity;
                let colorClass = severityColors[flag.severity];
                
                if (flag.label?.includes('toxic') || flag.label?.includes('hate')) {
                  displaySeverity = 'critical';
                  colorClass = severityColors.critical;
                } else if (flag.label?.includes('warning') || flag.label?.includes('profanity')) {
                  displaySeverity = 'warning';
                  colorClass = severityColors.warning;
                }

                return (
                  <div key={flag.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                        {displaySeverity}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTime(flag.timestamp)}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mb-1 text-sm md:text-base">{flag.label}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{flag.description}</p>
                  </div>
                );
              })
            ) : (
              <div className="p-6 md:p-8 text-center text-gray-500">
                <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No flags detected</p>
                <p className="text-sm mt-1">Upload and analyze audio files to see flagged content</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;