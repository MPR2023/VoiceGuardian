import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { WaveformData } from '../types';
import { formatTime } from '../utils/audioProcessing';

interface WaveformViewerProps {
  waveformData: WaveformData | null;
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  onPlayPause: () => void;
  onTimeChange: (time: number) => void;
}

const WaveformViewer: React.FC<WaveformViewerProps> = ({
  waveformData,
  audioUrl,
  isPlaying,
  currentTime,
  onPlayPause,
  onTimeChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  const drawWaveform = useCallback(() => {
    if (!waveformData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { peaks, duration } = waveformData;

    ctx.clearRect(0, 0, width, height);

    const barWidth = width / peaks.length;
    const maxHeight = height * 0.8;

    // Draw waveform bars
    peaks.forEach((peak, index) => {
      const barHeight = peak * maxHeight;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;

      // Determine color based on position relative to current time
      const timeAtBar = (index / peaks.length) * duration;
      const isPlayed = timeAtBar <= currentTime;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      if (isPlayed) {
        gradient.addColorStop(0, '#3B82F6');
        gradient.addColorStop(1, '#1D4ED8');
      } else {
        gradient.addColorStop(0, '#E5E7EB');
        gradient.addColorStop(1, '#9CA3AF');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight);
    });

    // Draw progress line
    const progressX = (currentTime / duration) * width;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

    // Draw hover indicator
    if (hoveredTime !== null) {
      const hoverX = (hoveredTime / duration) * width;
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [waveformData, currentTime, hoveredTime]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!waveformData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = (x / canvas.width) * waveformData.duration;
    
    onTimeChange(clickTime);
  }, [waveformData, onTimeChange]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!waveformData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hoverTime = (x / canvas.width) * waveformData.duration;
    
    setHoveredTime(hoverTime);
  }, [waveformData]);

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredTime(null);
  }, []);

  if (!waveformData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-center">
        <div className="h-32 flex items-center justify-center">
          <div className="text-gray-500">
            <Volume2 className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm md:text-base">Upload an audio file to view waveform</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Audio Waveform</h3>
          <div className="text-sm text-gray-600">
            {formatTime(currentTime)} / {formatTime(waveformData.duration)}
          </div>
        </div>
        
        <div className="relative bg-gray-50 rounded-lg p-2 md:p-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={120}
            className="w-full cursor-pointer"
            style={{ height: '80px', maxHeight: '120px' }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />
          
          {hoveredTime !== null && (
            <div
              className="absolute top-0 bg-yellow-500 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
              style={{
                left: `${(hoveredTime / waveformData.duration) * 100}%`,
                transform: 'translateX(-50%)',
                marginTop: '-2rem'
              }}
            >
              {formatTime(hoveredTime)}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center space-x-3 md:space-x-4">
          <button
            onClick={() => onTimeChange(Math.max(0, currentTime - 10))}
            className="p-2 md:p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          
          <button
            onClick={onPlayPause}
            className="p-3 md:p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 md:h-6 md:w-6" />
            ) : (
              <Play className="h-5 w-5 md:h-6 md:w-6 ml-1" />
            )}
          </button>
          
          <button
            onClick={() => onTimeChange(Math.min(waveformData.duration, currentTime + 10))}
            className="p-2 md:p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaveformViewer;