import React, { useRef, useEffect, useState } from 'react';
import { FileText, Loader2, Shield, AlertTriangle, Flag, Mic, MicOff, Globe, Monitor, Wifi, WifiOff } from 'lucide-react';
import { transcribeAudio, transcribeWithWebSpeech, TranscriptionResult } from '../lib/transcribe';
import { moderateTranscript } from '../lib/moderate';
import { useAudioStore } from '../store/useAudioStore';

interface WaveformProps {
  audio: { id: string; blob: Blob };
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const Waveform: React.FC<WaveformProps> = ({ audio }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [isModerating, setIsModerating] = useState(false);
  const [flaggedWords, setFlaggedWords] = useState<any[]>([]);
  const [isUsingWebSpeech, setIsUsingWebSpeech] = useState(false);
  const [isListeningForSpeech, setIsListeningForSpeech] = useState(false);
  const [isUsingKeywordModeration, setIsUsingKeywordModeration] = useState(false);
  const [transcriptionMode, setTranscriptionMode] = useState<'server' | 'browser'>('server');
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');

  const { settings } = useAudioStore();

  useEffect(() => {
    const initWaveSurfer = async () => {
      if (!containerRef.current) return;

      try {
        // Lazy import WaveSurfer
        const WaveSurfer = (await import('wavesurfer.js')).default;

        // Destroy existing instance
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }

        // Create new WaveSurfer instance
        const ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor: '#64748b',
          progressColor: '#3b82f6',
          height: 120,
          cursorWidth: 1,
        });

        wavesurferRef.current = ws;

        // Set up event listeners
        ws.on('ready', () => {
          setDuration(ws.getDuration());
        });

        ws.on('timeupdate', (time: number) => {
          setCurrentTime(time);
        });

        ws.on('play', () => {
          setIsPlaying(true);
        });

        ws.on('pause', () => {
          setIsPlaying(false);
        });

        ws.on('finish', () => {
          setIsPlaying(false);
        });

        // Load the audio blob
        ws.loadBlob(audio.blob);

      } catch (error) {
        console.error('Error initializing WaveSurfer:', error);
      }
    };

    initWaveSurfer();

    // Cleanup function
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audio.blob, audio.id]);

  // Add word markers and flagged regions to waveform
  useEffect(() => {
    if (!wavesurferRef.current || !containerRef.current) return;

    try {
      // Clear existing markers and regions
      const existingMarkers = containerRef.current.querySelectorAll('.word-marker, .flagged-region');
      existingMarkers?.forEach(marker => marker.remove());

      const container = containerRef.current.querySelector('canvas')?.parentElement;
      if (!container) return;

      container.style.position = 'relative';

      // Add word markers (only for browser transcription with timestamps)
      if (transcription?.words && transcription.words.length > 0 && transcriptionMode === 'browser') {
        transcription.words.forEach((word) => {
          if (word.start >= 0 && word.start <= duration) {
            const marker = document.createElement('div');
            marker.className = 'word-marker absolute top-0 w-0.5 h-full bg-yellow-400 opacity-70 pointer-events-none z-10';
            marker.style.left = `${(word.start / duration) * 100}%`;
            marker.title = word.word;
            container.appendChild(marker);
          }
        });
      }

      // Add flagged regions (only if we have timing information)
      if (flaggedWords.length > 0 && transcriptionMode === 'browser') {
        flaggedWords.forEach((flagged) => {
          if (flagged.start >= 0 && flagged.start <= duration) {
            const region = document.createElement('div');
            const width = Math.max(2, ((flagged.end - flagged.start) / duration) * 100);
            
            // Color based on severity
            let bgColor = 'bg-red-500';
            if (flagged.label === 'warning' || flagged.label === 'profanity') {
              bgColor = 'bg-yellow-500';
            } else if (flagged.label === 'toxic' || flagged.label === 'hate') {
              bgColor = 'bg-red-500';
            }

            region.className = `flagged-region absolute top-0 h-full ${bgColor} opacity-40 pointer-events-none z-20`;
            region.style.left = `${(flagged.start / duration) * 100}%`;
            region.style.width = `${width}%`;
            region.title = `${flagged.label}: ${flagged.word} (${Math.round((flagged.score || 0.8) * 100)}%)`;
            container.appendChild(region);
          }
        });
      }
    } catch (error) {
      console.error('Error adding markers and regions:', error);
    }
  }, [transcription, flaggedWords, duration, transcriptionMode]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  // Smart transcription function that respects user settings
  const handleSmartTranscribe = async () => {
    console.log("Smart Transcribe button clicked");
    
    if (isTranscribing) return;

    setIsTranscribing(true);
    setIsUsingWebSpeech(false);
    setTranscriptionError(null);
    setTranscriptionStatus('');
    
    // Determine which mode to use based on settings
    let useServer = settings.preferServerTranscription;
    let useBrowser = settings.preferBrowserTranscription;
    
    // If both are enabled, prefer server
    if (useServer && useBrowser) {
      useServer = true;
      useBrowser = false;
    }
    
    // If neither is enabled, default to server
    if (!useServer && !useBrowser) {
      useServer = true;
    }
    
    const mode = useServer ? 'server' : 'browser';
    setTranscriptionMode(mode);
    
    if (mode === 'server') {
      setTranscriptionStatus('Connecting to transcription server...');
    } else {
      setTranscriptionStatus('Loading AI models in browser...');
    }
    
    try {
      console.log(`🎯 Using ${mode} transcription based on settings`);
      
      if (mode === 'server') {
        setTranscriptionStatus('Transcribing on server...');
      } else {
        setTranscriptionStatus('Processing with browser AI...');
      }
      
      const result = await transcribeAudio(audio.blob, useServer);
      setTranscription(result);
      // Clear previous moderation results when new transcription is done
      setFlaggedWords([]);
      setIsUsingKeywordModeration(false);
      setTranscriptionStatus('');
    } catch (error) {
      console.error(`${mode} Transcription Error:`, error);
      
      // Set user-friendly error message
      if (mode === 'server') {
        if (error instanceof Error && error.message.includes('fetch')) {
          setTranscriptionError('Could not reach transcription server. Please check your internet connection and try again later.');
        } else if (error instanceof Error && error.message.includes('API error')) {
          setTranscriptionError('Transcription server is temporarily unavailable. Please try again later.');
        } else {
          setTranscriptionError('Server transcription failed. The system will automatically try browser transcription as backup.');
        }
      } else {
        setTranscriptionError('Browser AI transcription failed. Please try the server option or live speech recognition.');
      }
      
      // If server failed and we haven't tried browser yet, offer browser as fallback
      if (mode === 'server') {
        const tryBrowser = confirm(
          'Server transcription failed. Would you like to try browser-based AI transcription instead? ' +
          'Note: This will download AI models to your browser and may take longer.'
        );
        
        if (tryBrowser) {
          try {
            setTranscriptionMode('browser');
            setTranscriptionError(null);
            setTranscriptionStatus('Loading browser AI models...');
            const result = await transcribeAudio(audio.blob, false);
            setTranscription(result);
            setFlaggedWords([]);
            setIsUsingKeywordModeration(false);
            setTranscriptionStatus('');
          } catch (browserError) {
            console.error('Browser transcription also failed:', browserError);
            setTranscriptionError('Browser AI transcription also failed. Please try live speech recognition.');
            
            // Final fallback to Web Speech API
            const useWebSpeech = confirm(
              'Browser AI transcription also failed. Would you like to try live speech recognition instead? ' +
              'Note: This requires speaking into your microphone and may be less accurate.'
            );
            
            if (useWebSpeech) {
              try {
                await handleWebSpeechTranscribe();
              } catch (webSpeechError) {
                console.error('Web Speech transcription also failed:', webSpeechError);
                setTranscriptionError('All transcription methods failed. Please check your audio file and try again.');
              }
            }
          }
        }
      } else {
        // Browser mode failed, offer Web Speech API
        const useWebSpeech = confirm(
          'Browser AI transcription failed. Would you like to try live speech recognition instead? ' +
          'Note: This requires speaking into your microphone and may be less accurate.'
        );
        
        if (useWebSpeech) {
          try {
            await handleWebSpeechTranscribe();
          } catch (webSpeechError) {
            console.error('Web Speech transcription also failed:', webSpeechError);
            setTranscriptionError('All transcription methods failed. Please check your audio file and try again.');
          }
        }
      }
    } finally {
      setIsTranscribing(false);
      setTranscriptionStatus('');
    }
  };

  const handleServerTranscribe = async () => {
    console.log("Server Transcribe button clicked");
    
    if (isTranscribing) return;

    setIsTranscribing(true);
    setIsUsingWebSpeech(false);
    setTranscriptionMode('server');
    setTranscriptionError(null);
    setTranscriptionStatus('Connecting to transcription server...');
    
    try {
      console.log('🌐 Using server transcription');
      setTranscriptionStatus('Transcribing on server...');
      const result = await transcribeAudio(audio.blob, true); // Use server
      setTranscription(result);
      // Clear previous moderation results when new transcription is done
      setFlaggedWords([]);
      setIsUsingKeywordModeration(false);
      setTranscriptionStatus('');
    } catch (error) {
      console.error('Server Transcription Error:', error);
      
      // Set user-friendly error message
      if (error instanceof Error && error.message.includes('fetch')) {
        setTranscriptionError('Could not reach transcription server. Please check your internet connection and try again later.');
      } else if (error instanceof Error && error.message.includes('API error')) {
        setTranscriptionError('Transcription server is temporarily unavailable. Please try again later.');
      } else {
        setTranscriptionError('Server transcription failed. Please try browser transcription or live speech recognition.');
      }
    } finally {
      setIsTranscribing(false);
      setTranscriptionStatus('');
    }
  };

  const handleBrowserTranscribe = async () => {
    console.log("Browser Transcribe button clicked");
    
    if (isTranscribing) return;

    setIsTranscribing(true);
    setIsUsingWebSpeech(false);
    setTranscriptionMode('browser');
    setTranscriptionError(null);
    setTranscriptionStatus('Loading AI models in browser...');
    
    try {
      console.log('🖥️ Using browser transcription');
      setTranscriptionStatus('Processing with browser AI...');
      const result = await transcribeAudio(audio.blob, false); // Use browser
      setTranscription(result);
      // Clear previous moderation results when new transcription is done
      setFlaggedWords([]);
      setIsUsingKeywordModeration(false);
      setTranscriptionStatus('');
    } catch (error) {
      console.error('Browser Transcription Error:', error);
      setTranscriptionError('Browser AI transcription failed. Please try server transcription or live speech recognition.');
      
      // Check if Web Speech API is available as fallback
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        // Offer Web Speech API as fallback
        const useWebSpeech = confirm(
          'Browser AI transcription failed. Would you like to try browser-based speech recognition instead? ' +
          'Note: This requires speaking into your microphone and may be less accurate.'
        );
        
        if (useWebSpeech) {
          try {
            await handleWebSpeechTranscribe();
          } catch (webSpeechError) {
            console.error('Web Speech transcription also failed:', webSpeechError);
          }
        }
      }
    } finally {
      setIsTranscribing(false);
      setTranscriptionStatus('');
    }
  };

  const handleWebSpeechTranscribe = async () => {
    if (isListeningForSpeech) return;

    setIsListeningForSpeech(true);
    setIsUsingWebSpeech(true);
    setTranscriptionMode('browser');
    setTranscriptionError(null);
    
    try {
      const result = await transcribeWithWebSpeech();
      
      // Convert to our format (without timestamps for Web Speech API)
      setTranscription({
        text: result.text,
        words: [] // Web Speech API doesn't provide word-level timestamps
      });
      
      // Clear previous moderation results
      setFlaggedWords([]);
      setIsUsingKeywordModeration(false);
    } catch (error) {
      console.error('Web Speech transcription failed:', error);
      setTranscriptionError(`Live speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsListeningForSpeech(false);
    }
  };

  const handleModerate = async () => {
    console.log("Moderate button clicked");
    
    if (isModerating || !transcription?.text) return;

    setIsModerating(true);
    setIsUsingKeywordModeration(false);
    
    try {
      // Use the new transcript-based moderation function
      const flagged = await moderateTranscript(transcription.text, transcription.words);
      setFlaggedWords(flagged);
    } catch (error) {
      console.error('Moderation Error:', error);
      
      // Check if this was an AI model failure and we fell back to keywords
      if (error instanceof Error && error.message.includes('keyword-based moderation')) {
        setIsUsingKeywordModeration(true);
      }
      
      alert(`Content moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsModerating(false);
    }
  };

  const getSeverityColor = (label: string) => {
    switch (label) {
      case 'toxic':
      case 'hate':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
      case 'profanity':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full h-20 md:h-24" />
      
      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
        <button
          onClick={togglePlay}
          className="rounded px-3 py-2 bg-slate-700 text-white hover:bg-slate-800 transition-colors min-h-[44px] text-sm md:text-base"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        {/* Smart Transcribe Button - Uses settings preference */}
        <button
          onClick={handleSmartTranscribe}
          disabled={isTranscribing || isListeningForSpeech}
          className="flex items-center gap-2 rounded px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm md:text-base"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {transcriptionMode === 'server' ? 'Server...' : 'Browser...'}
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              AI Transcribe
              {settings.preferServerTranscription && (
                <span className="text-xs bg-blue-500 px-1 rounded">Server</span>
              )}
              {settings.preferBrowserTranscription && !settings.preferServerTranscription && (
                <span className="text-xs bg-blue-500 px-1 rounded">Browser</span>
              )}
            </>
          )}
        </button>

        {/* Manual Server Transcribe Button */}
        <button
          onClick={handleServerTranscribe}
          disabled={isTranscribing || isListeningForSpeech}
          className="flex items-center gap-2 rounded px-3 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm md:text-base"
        >
          {isTranscribing && transcriptionMode === 'server' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Server...
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              Server
            </>
          )}
        </button>

        {/* Manual Browser Transcribe Button */}
        <button
          onClick={handleBrowserTranscribe}
          disabled={isTranscribing || isListeningForSpeech}
          className="flex items-center gap-2 rounded px-3 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm md:text-base"
        >
          {isTranscribing && transcriptionMode === 'browser' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Browser...
            </>
          ) : (
            <>
              <Monitor className="h-4 w-4" />
              Browser
            </>
          )}
        </button>

        {/* Live Speech Button */}
        <button
          onClick={handleWebSpeechTranscribe}
          disabled={isTranscribing || isListeningForSpeech}
          className="flex items-center gap-2 rounded px-3 py-2 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm md:text-base"
        >
          {isListeningForSpeech ? (
            <>
              <MicOff className="h-4 w-4" />
              Listening...
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Live Speech
            </>
          )}
        </button>

        {transcription && (
          <button
            onClick={handleModerate}
            disabled={isModerating}
            className="flex items-center gap-2 rounded px-3 py-2 bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm md:text-base"
          >
            {isModerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Moderating...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Moderate
              </>
            )}
          </button>
        )}
        
        <span className="text-sm text-gray-600">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Transcription Status */}
      {isTranscribing && transcriptionStatus && (
        <div className={`rounded-lg p-4 border ${
          transcriptionMode === 'server' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-purple-50 border-purple-200'
        }`}>
          <div className={`flex items-center gap-3 ${
            transcriptionMode === 'server' ? 'text-green-700' : 'text-purple-700'
          }`}>
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {transcriptionMode === 'server' ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <Monitor className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm md:text-base">
                {transcriptionMode === 'server' ? 'Server Transcription' : 'Browser Transcription'}
              </p>
              <p className={`text-sm ${
                transcriptionMode === 'server' ? 'text-green-600' : 'text-purple-600'
              }`}>
                {transcriptionStatus}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transcription Error */}
      {transcriptionError && (
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center gap-3 text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm md:text-base">Transcription Failed</p>
              <p className="text-sm text-red-600">{transcriptionError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Audio Format Info */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-700 mb-1">
          <FileText className="h-4 w-4" />
          <span className="font-medium text-sm">Audio File</span>
        </div>
        <p className="text-sm text-gray-600">
          Audio format: {audio.blob.type || 'Unknown'} • 
          Size: {(audio.blob.size / (1024 * 1024)).toFixed(2)} MB
        </p>
      </div>

      {/* Settings Info */}
      {(settings.preferServerTranscription || settings.preferBrowserTranscription) && !transcriptionError && (
        <div className={`rounded-lg p-3 border ${
          settings.preferServerTranscription 
            ? 'bg-green-50 border-green-200' 
            : 'bg-purple-50 border-purple-200'
        }`}>
          <div className={`flex items-center gap-2 mb-1 ${
            settings.preferServerTranscription ? 'text-green-700' : 'text-purple-700'
          }`}>
            {settings.preferServerTranscription ? (
              <Globe className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
            <span className="font-medium text-sm">
              Default Mode: {settings.preferServerTranscription ? 'AI (Server)' : 'AI (Browser)'}
            </span>
          </div>
          <p className={`text-sm ${
            settings.preferServerTranscription ? 'text-green-600' : 'text-purple-600'
          }`}>
            The "AI Transcribe" button will use {settings.preferServerTranscription ? 'server' : 'browser'} transcription by default. 
            You can change this in Settings or use the manual buttons above.
          </p>
        </div>
      )}

      {/* Transcription Mode Info */}
      {transcription && !transcriptionError && (
        <div className={`rounded-lg p-3 border ${
          transcriptionMode === 'server' 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-purple-50 border-purple-200'
        }`}>
          <div className={`flex items-center gap-2 mb-1 ${
            transcriptionMode === 'server' ? 'text-blue-700' : 'text-purple-700'
          }`}>
            {transcriptionMode === 'server' ? (
              <Globe className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
            <span className="font-medium text-sm">
              {transcriptionMode === 'server' ? 'Server Transcription Active' : 'Browser Transcription Active'}
            </span>
          </div>
          <p className={`text-sm ${
            transcriptionMode === 'server' ? 'text-blue-600' : 'text-purple-600'
          }`}>
            {transcriptionMode === 'server' 
              ? 'Using remote AI server for high-accuracy transcription with automatic fallback to browser if needed.'
              : 'Using local browser AI models for privacy-focused transcription with word-level timestamps.'
            }
          </p>
        </div>
      )}

      {/* Keyword Moderation Notice */}
      {isUsingKeywordModeration && (
        <div className="bg-yellow-50 rounded-lg p-3 md:p-4 border border-yellow-200">
          <div className="flex items-center gap-2 text-yellow-700 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium text-sm md:text-base">Keyword-based Moderation Active</span>
          </div>
          <p className="text-sm text-yellow-600">
            Keyword-based moderation is active. For demo use; AI model moderation is available in production.
          </p>
        </div>
      )}

      {/* Browser Transcription Notice */}
      {isUsingWebSpeech && (
        <div className="bg-green-50 rounded-lg p-3 md:p-4 border border-green-200">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <Mic className="h-5 w-5" />
            <span className="font-medium text-sm md:text-base">Live Speech Recognition Active</span>
          </div>
          <p className="text-sm text-green-600">
            Running browser-native speech recognition (accuracy may vary). Live speech recognition uses built-in speech recognition and is fully free, but may be less accurate. Works best in Chrome or Edge.
          </p>
        </div>
      )}

      {/* Listening Indicator */}
      {isListeningForSpeech && (
        <div className="bg-blue-50 rounded-lg p-3 md:p-4 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium text-sm md:text-base">Listening for Speech...</span>
          </div>
          <p className="text-sm text-blue-600">
            Please speak clearly into your microphone. The system will automatically stop listening after 30 seconds or when you finish speaking.
          </p>
        </div>
      )}

      {/* Transcription Results */}
      {transcription && (
        <div className="bg-gray-50 rounded-lg p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900 text-sm md:text-base">
              Transcription {isUsingWebSpeech ? '(Live Speech)' : transcriptionMode === 'server' ? '(Server AI)' : '(Browser AI)'}
            </h4>
            {!isUsingWebSpeech && transcriptionMode === 'browser' && (
              <span className="text-sm text-gray-500">
                ({transcription.words.length} words)
              </span>
            )}
          </div>
          
          <div className="bg-white rounded p-3 border">
            <p className="text-gray-800 leading-relaxed text-sm md:text-base">
              {transcription.text}
            </p>
          </div>
          
          {transcription.words.length > 0 && !isUsingWebSpeech && transcriptionMode === 'browser' && (
            <div className="text-xs text-gray-500">
              💡 Yellow markers on the waveform show word positions
            </div>
          )}
          
          {(isUsingWebSpeech || transcriptionMode === 'server') && (
            <div className="text-xs text-gray-500">
              ℹ️ {isUsingWebSpeech ? 'Live speech recognition' : 'Server transcription'} doesn't provide word timing information
            </div>
          )}
        </div>
      )}

      {/* Moderation Results */}
      {flaggedWords.length > 0 && (
        <div className="bg-red-50 rounded-lg p-3 md:p-4 space-y-3 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h4 className="font-semibold text-gray-900 text-sm md:text-base">Content Flags</h4>
            <span className="text-sm text-gray-500">
              ({flaggedWords.length} flagged)
            </span>
            {isUsingKeywordModeration && (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                Keyword-based
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            {flaggedWords.map((flagged, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${getSeverityColor(flagged.label)}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 space-y-1 sm:space-y-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Flag className="h-4 w-4" />
                    <span className="font-medium text-sm md:text-base">{flagged.word}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white border">
                      {flagged.label}
                    </span>
                  </div>
                  <div className="text-sm">
                    {!isUsingWebSpeech && transcriptionMode === 'browser' && typeof flagged.start === 'number' && formatTime(flagged.start)} • {Math.round((flagged.score || 0.8) * 100)}%
                  </div>
                </div>
                {flagged.context && (
                  <p className="text-sm opacity-75">
                    Context: "{flagged.context}"
                  </p>
                )}
              </div>
            ))}
          </div>
          
          {!isUsingWebSpeech && transcriptionMode === 'browser' && (
            <div className="text-xs text-gray-600">
              🔴 Red regions = toxic/hate speech • 🟡 Yellow regions = warnings/profanity
            </div>
          )}
        </div>
      )}

      {/* Show message when moderation finds no issues */}
      {transcription && flaggedWords.length === 0 && !isModerating && (
        <div className="bg-green-50 rounded-lg p-3 md:p-4 border border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <Shield className="h-5 w-5" />
            <span className="font-medium text-sm md:text-base">Content appears clean</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            No inappropriate content detected in this audio.
          </p>
        </div>
      )}

      {/* empty div reserved for future region highlights */}
      <div></div>
    </div>
  );
};

export default Waveform;