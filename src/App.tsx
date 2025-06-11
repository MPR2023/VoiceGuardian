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
import { processAudioFile } from './utils/audioProcessing';
import { transcribeAudio } from './lib/transcribe';
import { moderateTranscript } from './lib/moderate';
import { useAudioStore } from './store/useAudioStore';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [flaggedTimestamps, setFlaggedTimestamps] = useState<FlaggedTimestamp[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [processingError, setProcessingError] = useState<string | null>(null);
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
      setProcessingError(null);
      return;
    }

    const processFile = async () => {
      setIsProcessing(true);
      setProcessingError(null);
      setProcessingStep('Generating waveform...');
      
      try {
        // 1️⃣ Generate waveform
        console.log('🎵 Starting waveform generation for file:', selectedFile.name);
        const waveform = await processAudioFile(selectedFile.blob);
        setWaveformData(waveform);
        console.log('✅ Waveform generated:', { duration: waveform.duration, peaks: waveform.peaks.length });

        // 2️⃣ Transcribe audio
        setProcessingStep('Transcribing audio with AI...');
        console.log('🎤 Starting transcription...');
        const transcriptionResult = await transcribeAudio(selectedFile.blob);
        console.log('✅ Transcription complete:', { 
          text: transcriptionResult.text.substring(0, 100) + '...', 
          wordCount: transcriptionResult.words.length 
        });

        // Check if we got meaningful transcription
        if (!transcriptionResult.text || transcriptionResult.text.trim().length < 3) {
          throw new Error('No speech detected in audio file. Please ensure the audio contains clear speech.');
        }

        // 3️⃣ Moderate transcript
        setProcessingStep('Analyzing content for inappropriate material...');
        console.log('🛡️ Starting moderation...');
        const flaggedWords = await moderateTranscript(transcriptionResult.text, transcriptionResult.words);
        console.log('✅ Moderation complete:', { flaggedCount: flaggedWords.length, flaggedWords });

        // 4️⃣ Map into FlaggedTimestamp shape
        setProcessingStep('Processing results...');
        const flags = flaggedWords.map((fw, idx) => {
          // Create context snippet around the flagged word
          const wordIndex = transcriptionResult.text.toLowerCase().indexOf(fw.word.toLowerCase());
          const contextStart = Math.max(0, wordIndex - 30);
          const contextEnd = Math.min(transcriptionResult.text.length, wordIndex + fw.word.length + 30);
          const snippet = transcriptionResult.text.substring(contextStart, contextEnd).trim();
          
          // Create a longer snippet for better context
          const extendedSnippet = transcriptionResult.text.substring(
            Math.max(0, wordIndex - 30), 
            Math.min(transcriptionResult.text.length, wordIndex + fw.word.length + 60)
          ).trim();

          return {
            id: `flag-${idx}`,
            timestamp: fw.start,
            startTime: fw.start,
            endTime: fw.end,
            label: fw.word,
            flaggedPhrase: fw.word,
            description: (fw as any).context || snippet,
            snippet: extendedSnippet || transcriptionResult.text.substring(0, 100),
            confidence: Math.round(((fw as any).score || 0.8) * 100) / 100,
            severity: fw.label === 'toxic' || fw.label === 'hate' ? 'critical' :
                     fw.label === 'warning' || fw.label === 'profanity' ? 'warning' :
                     'info',
            category: fw.label === 'profanity' ? 'Profanity' :
                     fw.label === 'warning' ? 'Quality' :
                     fw.label === 'hate' ? 'Compliance' :
                     'Quality',
            speaker: undefined,
            policyLink: undefined,
            history: [],
          } as FlaggedTimestamp;
        });

        console.log('✅ Processing complete! Mapped', flags.length, 'flags');
        setFlaggedTimestamps(flags);
        setCurrentTime(0);
        setIsPlaying(false);
        
        // Show success message
        if (flags.length > 0) {
          console.log(`🎯 Analysis complete: Found ${flags.length} flagged content items`);
        } else {
          console.log('✅ Analysis complete: No inappropriate content detected');
        }
        
      } catch (error) {
        console.error('❌ Error processing audio file:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setProcessingError(errorMessage);
        
        // On error, clear flags but keep waveform if it was generated
        setFlaggedTimestamps([]);
      } finally {
        setIsProcessing(false);
        setProcessingStep('');
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

  const handleViewAllFlags = useCallback(() => {
    setActiveTab('flags');
  }, []);

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
            {/* Processing Status */}
            {isProcessing && (
              <div className="bg-blue-50 rounded-xl shadow-lg p-4 md:p-6 border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">Processing Audio</h3>
                    <p className="text-blue-700">{processingStep || 'Analyzing content...'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Error */}
            {processingError && (
              <div className="bg-red-50 rounded-xl shadow-lg p-4 md:p-6 border border-red-200">
                <div className="flex items-center space-x-3">
                  <div className="text-red-600">⚠️</div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Processing Failed</h3>
                    <p className="text-red-700">{processingError}</p>
                    <p className="text-red-600 text-sm mt-2">
                      Try uploading a different audio file or check your internet connection.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
              onViewAll={handleViewAllFlags}
              currentTime={currentTime}
              audioRef={audioRef}
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
              audioRef={audioRef}
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