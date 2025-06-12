import React, { useRef, useEffect, useState } from 'react';
import { FileText, Loader2, Shield, AlertTriangle, Flag, Mic, MicOff, RefreshCw } from 'lucide-react';
import { transcribeAudio, transcribeWithWebSpeech, TranscriptionResult } from '../lib/transcribe';
import { moderateTranscript } from '../lib/moderate';
import { getFormatDisplayName } from '../utils/audioConversion';

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

      // Add word markers (only for AI transcription with timestamps)
      if (transcription?.words && transcription.words.length > 0 && !isUsingWebSpeech) {
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
      if (flaggedWords.length > 0 && !isUsingWebSpeech) {
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
  }, [transcription, flaggedWords, duration, isUsingWebSpeech]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleTranscribe = async () => {
    console.log("AI Transcribe button clicked");
    
    if (isTranscribing) return;

    setIsTranscribing(true);
    setIsUsingWebSpeech(false);
    
    try {
      // Note: Audio conversion now happens inside transcribeAudio()
      // No need to convert here as it's handled universally in the transcribe function
      console.log('🎯 Sending audio to transcription (conversion handled internally)');
      const result = await transcribeAudio(audio.blob);
      setTranscription(result);
      // Clear previous moderation results when new transcription is done
      setFlaggedWords([]);
      setIsUsingKeywordModeration(false);
    } catch (error) {
      console.error('Transcription Error:', error);
      
      // Check if Web Speech API is available as fallback
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        // Offer Web Speech API as fallback
        const useWebSpeech = confirm(
          'AI transcription failed. Would you like to try browser-based transcription instead? ' +
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
    }
  };

  const handleWebSpeechTranscribe = async () => {
    if (isListeningForSpeech) return;

    setIsListeningForSpeech(true);
    setIsUsingWebSpeech(true);
    
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
      alert(`Speech recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        
        <button
          onClick={handleTranscribe}
          disabled={isTranscribing || isListeningForSpeech}
          className="flex items-center gap-2 rounded px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm md:text-base"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Transcribing...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              AI Transcribe
            </>
          )}
        </button>

        <button
          onClick={handleWebSpeechTranscribe}
          disabled={isTranscribing || isListeningForSpeech}
          className="flex items-center gap-2 rounded px-3 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm md:text-base"
        >
          {isListeningForSpeech ? (
            <>
              <MicOff className="h-4 w-4" />
              Listening...
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Browser Transcribe
            </>
          )}
        </button>

        {transcription && (
          <button
            onClick={handleModerate}
            disabled={isModerating}
            className="flex items-center gap-2 rounded px-3 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm md:text-base"
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

      {/* Audio Format Info */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-700 mb-1">
          <RefreshCw className="h-4 w-4" />
          <span className="font-medium text-sm">Audio Processing</span>
        </div>
        <p className="text-sm text-gray-600">
          Audio format: {getFormatDisplayName(audio.blob.type)} • 
          All audio is automatically converted to WAV before AI transcription for optimal compatibility.
        </p>
      </div>

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
            <span className="font-medium text-sm md:text-base">Browser-based Transcription Active</span>
          </div>
          <p className="text-sm text-green-600">
            Running browser-native transcription (accuracy may vary). Browser-based transcription uses built-in speech recognition and is fully free, but may be less accurate. Works best in Chrome or Edge.
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
              Transcription {isUsingWebSpeech ? '(Browser-based)' : '(AI-powered)'}
            </h4>
            {!isUsingWebSpeech && (
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
          
          {transcription.words.length > 0 && !isUsingWebSpeech && (
            <div className="text-xs text-gray-500">
              💡 Yellow markers on the waveform show word positions
            </div>
          )}
          
          {isUsingWebSpeech && (
            <div className="text-xs text-gray-500">
              ℹ️ Browser-based transcription doesn't provide word timing information
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
                    {!isUsingWebSpeech && typeof flagged.start === 'number' && formatTime(flagged.start)} • {Math.round((flagged.score || 0.8) * 100)}%
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
          
          {!isUsingWebSpeech && (
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