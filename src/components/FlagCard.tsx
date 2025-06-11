import React, { useState } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Info, 
  Eye, 
  Play, 
  Pause, 
  ExternalLink, 
  MessageSquare, 
  CheckCircle, 
  ArrowUp, 
  User,
  Calendar,
  Volume2
} from 'lucide-react';

interface FlagCardProps {
  timestamp: string;                           // e.g. "00:33"
  category: 'Profanity' | 'Compliance' | 'Quality';
  severity: 'low' | 'medium' | 'high';
  confidence: number;                          // 0–100
  snippet: string;                             // ~25–30 word transcript snippet
  flaggedPhrase: string;                       // offending word/phrase
  speaker?: string;                            // e.g. "Agent: Jane D."
  policyLink?: string;                         // URL to policy section
  history?: Array<{ reviewer: string; note: string; date: string }>;
  audioRef: React.RefObject<HTMLAudioElement>;
  clipRange: { start: number; end: number };
  onResolve(): void;
  onEscalate(): void;
  onComment(): void;
}

const FlagCard: React.FC<FlagCardProps> = ({
  timestamp,
  category,
  severity,
  confidence,
  snippet,
  flaggedPhrase,
  speaker,
  policyLink,
  history = [],
  audioRef,
  clipRange,
  onResolve,
  onEscalate,
  onComment
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Get severity configuration
  const getSeverityConfig = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return {
          color: 'bg-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          icon: AlertTriangle
        };
      case 'medium':
        return {
          color: 'bg-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          icon: AlertTriangle
        };
      case 'low':
        return {
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          icon: Info
        };
    }
  };

  // Get category configuration
  const getCategoryConfig = (category: 'Profanity' | 'Compliance' | 'Quality') => {
    switch (category) {
      case 'Profanity':
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300'
        };
      case 'Compliance':
        return {
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-300'
        };
      case 'Quality':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-300'
        };
    }
  };

  const severityConfig = getSeverityConfig(severity);
  const categoryConfig = getCategoryConfig(category);
  const SeverityIcon = severityConfig.icon;

  // Handle audio clip playback
  const handlePlayClip = () => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Set audio to start position
      audio.currentTime = clipRange.start;
      
      // Play the clip
      audio.play();
      setIsPlaying(true);

      // Stop at end position
      const handleTimeUpdate = () => {
        if (audio.currentTime >= clipRange.end) {
          audio.pause();
          setIsPlaying(false);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
        }
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);

      // Handle natural pause/end
      const handlePause = () => {
        setIsPlaying(false);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handlePause);
      };

      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handlePause);
    }
  };

  // Highlight flagged phrase in snippet
  const highlightFlaggedPhrase = (text: string, phrase: string) => {
    if (!phrase) return text;
    
    const regex = new RegExp(`(${phrase})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === phrase.toLowerCase()) {
        return (
          <mark key={index} className="bg-red-200 text-red-900 px-1 rounded font-semibold">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border-l-4 ${severityConfig.borderColor} overflow-hidden transition-all duration-200 hover:shadow-xl`}>
      {/* Header */}
      <div className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between mb-4 space-y-3 lg:space-y-0">
          <div className="flex items-center space-x-3">
            <div className={`${severityConfig.bgColor} ${severityConfig.borderColor} border rounded-lg p-2 md:p-3`}>
              <SeverityIcon className={`h-5 w-5 md:h-6 md:w-6 ${severityConfig.textColor}`} />
            </div>
            
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">{category} Flag</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.bgColor} ${categoryConfig.textColor} border ${categoryConfig.borderColor}`}>
                  {category}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityConfig.color} text-white`}>
                  {severity} severity
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{timestamp}</span>
                </div>
                {speaker && (
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{speaker}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{confidence}% confidence</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlayClip}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] text-sm"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Pause Clip</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Play Clip</span>
                </>
              )}
            </button>
            
            <div className="text-xs text-gray-500 hidden sm:block">
              {Math.round(clipRange.end - clipRange.start)}s clip
            </div>
          </div>
        </div>

        {/* Transcript Snippet */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Volume2 className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Transcript</span>
          </div>
          <p className="text-gray-800 leading-relaxed text-sm md:text-base">
            "{highlightFlaggedPhrase(snippet, flaggedPhrase)}"
          </p>
        </div>

        {/* Policy Link */}
        {policyLink && (
          <div className="mb-4">
            <a
              href={policyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline min-h-[44px] py-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View Related Policy</span>
            </a>
          </div>
        )}

        {/* Review History */}
        {history.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 text-sm font-medium min-h-[44px] py-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Review History ({history.length})</span>
            </button>
            
            {showHistory && (
              <div className="mt-3 space-y-2">
                {history.map((entry, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{entry.reviewer}</span>
                      <span className="text-xs text-gray-500">{entry.date}</span>
                    </div>
                    <p className="text-sm text-gray-700">{entry.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onResolve}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-h-[44px] text-sm font-medium"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Mark Resolved</span>
          </button>
          
          <button
            onClick={onEscalate}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[44px] text-sm font-medium"
          >
            <ArrowUp className="h-4 w-4" />
            <span>Escalate</span>
          </button>
          
          <button
            onClick={onComment}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors min-h-[44px] text-sm font-medium"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Add Comment</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlagCard;