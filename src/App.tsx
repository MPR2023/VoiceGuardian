import React, { useState, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AudioUploader from './components/AudioUploader';
import WaveformViewer from './components/WaveformViewer';
import FlaggedTimestamps from './components/FlaggedTimestamps';
import Dashboard from './components/Dashboard';
import AudioFiles from './components/AudioFiles';
import Settings from './components/Settings';
import { FlaggedTimestamp, WaveformData } from './types';
import { processAudioFile, generateMockFlags } from './utils/audioProcessing';
import { useAudioStore } from './store/useAudioStore';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [flaggedTimestamps, setFlaggedTimestamps] = useState<FlaggedTimestamp[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { audioFiles, selectedFile, selectFile } = useAudioStore();

  // Audio playback effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedFile]);

  // Process selected file for waveform and flags
  useEffect(() => {
    if (!selectedFile) {
      setWaveformData(null);
      setFlaggedTimestamps([]);
      return;
    }

    const processFile = async () => {
      try {
        const waveform = await processAudioFile(selectedFile.blob);
        const flags = generateMockFlags(waveform.duration);
        
        setWaveformData(waveform);
        setFlaggedTimestamps(flags);
        setCurrentTime(0);
        setIsPlaying(false);
      } catch (error) {
        console.error('Error processing audio file:', error);
      }
    };

    processFile();
  }, [selectedFile]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSidebarOpen && window.innerWidth < 1024) {
        const sidebar = document.getElementById('mobile-sidebar');
        const hamburger = document.getElementById('hamburger-button');
        
        if (sidebar && !sidebar.contains(event.target as Node) && 
            hamburger && !hamburger.contains(event.target as Node)) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [activeTab]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !selectedFile) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, selectedFile]);

  const handleTimeChange = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleFileSelect = useCallback((file: any) => {
    selectFile(file);
  }, [selectFile]);

  const handleFlagClick = useCallback((timestamp: number) => {
    handleTimeChange(timestamp);
  }, [handleTimeChange]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard audioFiles={audioFiles} flaggedTimestamps={flaggedTimestamps} />;
      
      case 'upload':
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Upload Audio File</h2>
              <AudioUploader />
            </div>
          </div>
        );
      
      case 'analysis':
        return (
          <div className="space-y-4 md:space-y-6">
            <WaveformViewer
              waveformData={waveformData}
              audioUrl={selectedFile?.url || ''}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onPlayPause={handlePlayPause}
              onTimeChange={handleTimeChange}
            />
            <FlaggedTimestamps
              flags={flaggedTimestamps}
              onFlagClick={handleFlagClick}
              currentTime={currentTime}
            />
          </div>
        );
      
      case 'flags':
        return (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">All Flagged Content</h2>
            <FlaggedTimestamps
              flags={flaggedTimestamps}
              onFlagClick={handleFlagClick}
              currentTime={currentTime}
              showAll
            />
          </div>
        );
      
      case 'files':
        return (
          <AudioFiles
            audioFiles={audioFiles}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
          />
        );
      
      case 'settings':
        return <Settings />;
      
      default:
        return <Dashboard audioFiles={audioFiles} flaggedTimestamps={flaggedTimestamps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header 
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />
      
      <div className="flex relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" />
            <div id="mobile-sidebar" className="relative">
              <Sidebar 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
                isMobile={true}
              />
            </div>
          </div>
        )}
        
        <main className="flex-1 w-full min-w-0 p-4 md:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
      
      {/* Hidden audio element for playback */}
      {selectedFile && (
        <audio
          ref={audioRef}
          src={selectedFile.url}
          preload="metadata"
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setCurrentTime(0);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;