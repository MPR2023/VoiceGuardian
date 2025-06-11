import React from 'react';
import { AlertTriangle, Clock, Info, Eye } from 'lucide-react';
import { FlaggedTimestamp } from '../types';
import { formatTime } from '../utils/audioProcessing';
import FlagCard from './FlagCard';

interface FlaggedTimestampsProps {
  flags: FlaggedTimestamp[];
  onFlagClick: (timestamp: number) => void;
  onViewAll?: () => void;
  currentTime: number;
  showAll?: boolean;
  audioRef?: React.RefObject<HTMLAudioElement>;
}

const FlaggedTimestamps: React.FC<FlaggedTimestampsProps> = ({
  flags,
  onFlagClick,
  onViewAll,
  currentTime,
  showAll = false,
  audioRef
}) => {
  const getSeverityConfig = (severity: FlaggedTimestamp['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          color: 'bg-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          icon: AlertTriangle
        };
      case 'warning':
        return {
          color: 'bg-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          icon: AlertTriangle
        };
      case 'info':
        return {
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          icon: Info
        };
      case 'review':
        return {
          color: 'bg-purple-500',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-700',
          icon: Eye
        };
    }
  };

  const displayFlags = showAll ? flags : flags.slice(0, 5);

  // Handler functions for FlagCard actions
  const handleResolve = (flagId: string) => {
    console.log('Resolving flag:', flagId);
    // TODO: Implement resolve functionality
  };

  const handleEscalate = (flagId: string) => {
    console.log('Escalating flag:', flagId);
    // TODO: Implement escalate functionality
  };

  const handleComment = (flagId: string) => {
    console.log('Adding comment to flag:', flagId);
    // TODO: Implement comment functionality
  };

  if (flags.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-center">
        <div className="text-gray-500">
          <Clock className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 opacity-50" />
          <p className="text-base md:text-lg">No flagged content detected</p>
          <p className="text-sm mt-2">Upload an audio file to begin analysis</p>
        </div>
      </div>
    );
  }

  // Always render FlagCard when audioRef is present and flags have enhanced data
  if (audioRef && displayFlags.some(flag => flag.category && flag.snippet)) {
    return (
      <div className="space-y-4 md:space-y-6">
        {showAll && (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">
                All Flagged Content ({flags.length} total)
              </h3>
            </div>
          </div>
        )}

        {displayFlags.map((flag) => {
          // Log flag values before rendering
          console.log('▶ Flag clipRange (s):', flag.id, flag.startTime, flag.endTime);
          
          // Always render FlagCard if we have the required enhanced data
          if (flag.category && flag.snippet && flag.startTime !== undefined && flag.endTime !== undefined) {
            return (
              <FlagCard
                key={flag.id}
                timestamp={formatTime(flag.timestamp)}
                category={flag.category}
                severity={flag.severity === 'critical' ? 'high' : flag.severity === 'warning' ? 'medium' : 'low'}
                confidence={Math.round(flag.confidence * 100)}
                snippet={flag.snippet}
                flaggedPhrase={flag.flaggedPhrase || ''}
                speaker={flag.speaker}
                policyLink={flag.policyLink}
                history={flag.history}
                audioRef={audioRef}
                clipRange={{ 
                  start: flag.startTime || 0,
                  end: flag.endTime || 0
                }}
                onResolve={() => handleResolve(flag.id)}
                onEscalate={() => handleEscalate(flag.id)}
                onComment={() => handleComment(flag.id)}
              />
            );
          }

          // Fallback to original card design for flags without enhanced data
          const config = getSeverityConfig(flag.severity);
          const Icon = config.icon;
          const isActive = Math.abs(currentTime - flag.timestamp) < 1;

          return (
            <div
              key={flag.id}
              className={`bg-white rounded-xl shadow-lg p-4 md:p-6 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => onFlagClick(flag.timestamp)}
            >
              <div className="flex items-start space-x-3 md:space-x-4">
                <div className={`flex-shrink-0 ${config.bgColor} ${config.borderColor} border rounded-lg p-2 md:p-3`}>
                  <Icon className={`h-4 w-4 md:h-5 md:w-5 ${config.textColor}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {flag.label}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} text-white w-fit`}>
                        {flag.severity}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(flag.timestamp)}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {flag.description}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="text-xs text-gray-500">
                      Confidence: {Math.round(flag.confidence * 100)}%
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlagClick(flag.timestamp);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left sm:text-right"
                    >
                      Jump to timestamp →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Show "View All" button only in non-showAll view */}
        {!showAll && flags.length > 5 && onViewAll && (
          <div className="text-center">
            <button 
              onClick={onViewAll}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium min-h-[44px] px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              View All ({flags.length - 5} more)
            </button>
          </div>
        )}
      </div>
    );
  }

  // Original design for when audioRef is not available or enhanced data is missing
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            Flagged Content {!showAll && `(${Math.min(5, flags.length)} of ${flags.length})`}
          </h3>
          {!showAll && flags.length > 5 && onViewAll && (
            <button 
              onClick={onViewAll}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium min-h-[44px] px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              View All
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {displayFlags.map((flag) => {
          const config = getSeverityConfig(flag.severity);
          const Icon = config.icon;
          const isActive = Math.abs(currentTime - flag.timestamp) < 1;

          return (
            <div
              key={flag.id}
              className={`p-4 md:p-6 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => onFlagClick(flag.timestamp)}
            >
              <div className="flex items-start space-x-3 md:space-x-4">
                <div className={`flex-shrink-0 ${config.bgColor} ${config.borderColor} border rounded-lg p-2 md:p-3`}>
                  <Icon className={`h-4 w-4 md:h-5 md:w-5 ${config.textColor}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {flag.label}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} text-white w-fit`}>
                        {flag.severity}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(flag.timestamp)}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {flag.description}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="text-xs text-gray-500">
                      Confidence: {Math.round(flag.confidence * 100)}%
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlagClick(flag.timestamp);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left sm:text-right"
                    >
                      Jump to timestamp →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAll && flags.length > 10 && (
        <div className="p-4 bg-gray-50 text-center">
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium min-h-[44px] px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">
            Load More Results
          </button>
        </div>
      )}
    </div>
  );
};

export default FlaggedTimestamps;