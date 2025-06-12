import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Mic, MicOff, FileAudio, X, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioStore } from '../store/useAudioStore';
import { getFormatWarning, getFormatDisplayName, convertToWavIfNeeded } from '../utils/audioConversion';

const AudioUploader: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [formatWarning, setFormatWarning] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionInfo, setConversionInfo] = useState<{
    originalFormat: string;
    converted: boolean;
  } | null>(null);
  const { isRecording, startRecording, stopRecording, error: recordingError } = useAudioRecorder();
  const addAudioFile = useAudioStore(state => state.addAudioFile);

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio metadata'));
      };
      
      audio.src = url;
    });
  };

  const processAudioFile = useCallback(async (file: File) => {
    setIsConverting(true);
    
    try {
      // Convert to WAV if needed (universal conversion)
      console.log('🔄 Processing uploaded file:', file.name, file.type);
      const conversionResult = await convertToWavIfNeeded(file);
      
      // Create a new File object from the converted blob
      const processedFile = conversionResult.converted 
        ? new File([conversionResult.blob], file.name.replace(/\.[^/.]+$/, '.wav'), { 
            type: 'audio/wav' 
          })
        : file;

      const duration = await getAudioDuration(processedFile);
      
      // Check for format warnings
      const warning = getFormatWarning(file.type);
      setFormatWarning(warning);
      
      // Set conversion info
      setConversionInfo({
        originalFormat: conversionResult.originalFormat,
        converted: conversionResult.converted
      });

      const audioFileData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: conversionResult.converted ? file.name.replace(/\.[^/.]+$/, '.wav') : file.name,
        duration,
        blob: processedFile, // Use the processed (potentially converted) file
        size: processedFile.size,
        uploadedAt: new Date()
      };

      addAudioFile(audioFileData);
      setUploadedFile(processedFile);
      
      console.log('✅ File processed and added to store:', {
        original: file.name,
        processed: audioFileData.name,
        converted: conversionResult.converted
      });
      
    } catch (error) {
      console.error('❌ Error processing audio file:', error);
      alert(`Audio conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try a different file.`);
    } finally {
      setIsConverting(false);
    }
  }, [addAudioFile]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const audioFile = acceptedFiles[0];
    if (audioFile) {
      processAudioFile(audioFile);
    }
  }, [processAudioFile]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.webm']
    },
    multiple: false,
    maxSize: 100 * 1024 * 1024 // 100MB limit
  });

  const handleRecordingToggle = useCallback(async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        setIsConverting(true);
        
        try {
          // Convert recorded audio to WAV (universal conversion)
          console.log('🔄 Processing recorded audio:', blob.type);
          const conversionResult = await convertToWavIfNeeded(blob);
          
          const file = new File([conversionResult.blob], `recording-${Date.now()}.wav`, { 
            type: 'audio/wav' 
          });
          
          // Set conversion info for recordings
          setConversionInfo({
            originalFormat: conversionResult.originalFormat,
            converted: conversionResult.converted
          });
          
          await processAudioFile(file);
          
          console.log('✅ Recording processed:', {
            originalFormat: conversionResult.originalFormat,
            converted: conversionResult.converted
          });
          
        } catch (error) {
          console.error('❌ Error processing recorded audio:', error);
          alert(`Recording conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setIsConverting(false);
        }
      }
    } else {
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording, processAudioFile]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setFormatWarning(null);
    setConversionInfo(null);
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Error Display */}
      {recordingError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Recording Error</p>
            <p className="text-red-700 text-sm">{recordingError}</p>
          </div>
        </div>
      )}

      {/* Conversion Status */}
      {isConverting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 text-blue-600 flex-shrink-0 animate-spin" />
          <div>
            <p className="text-blue-800 font-medium">Converting Audio to WAV...</p>
            <p className="text-blue-700 text-sm">Optimizing for transcription compatibility</p>
          </div>
        </div>
      )}

      {/* Format Warning */}
      {formatWarning && !isConverting && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Format Notice</p>
            <p className="text-yellow-700 text-sm">{formatWarning}</p>
          </div>
        </div>
      )}

      {/* Conversion Info */}
      {conversionInfo && !isConverting && (
        <div className={`rounded-lg p-4 border ${
          conversionInfo.converted 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${
            conversionInfo.converted ? 'text-blue-700' : 'text-green-700'
          }`}>
            <RefreshCw className="h-5 w-5" />
            <span className="font-medium text-sm md:text-base">
              {conversionInfo.converted ? 'Audio Converted to WAV' : 'Audio Format Compatible'}
            </span>
          </div>
          <p className={`text-sm ${
            conversionInfo.converted ? 'text-blue-600' : 'text-green-600'
          }`}>
            {conversionInfo.converted 
              ? `Original format (${getFormatDisplayName(conversionInfo.originalFormat)}) was converted to WAV for optimal transcription.`
              : `Audio format (${getFormatDisplayName(conversionInfo.originalFormat)}) is compatible with AI transcription.`
            }
          </p>
        </div>
      )}

      {/* File Upload Dropzone */}
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-xl p-4 md:p-8 text-center transition-all duration-300 cursor-pointer ${
            isConverting
              ? 'border-blue-500 bg-blue-50 opacity-50 cursor-not-allowed'
              : isDragActive && !isDragReject
              ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
              : isDragReject
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md'
          }`}
        >
          <input {...getInputProps()} disabled={isConverting} />
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={`p-3 md:p-4 rounded-full transition-all duration-300 ${
                isConverting
                  ? 'bg-blue-100'
                  : isDragActive && !isDragReject 
                  ? 'bg-blue-100 scale-110' 
                  : isDragReject
                  ? 'bg-red-100'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}>
                {isConverting ? (
                  <RefreshCw className="h-6 w-6 md:h-8 md:w-8 text-blue-600 animate-spin" />
                ) : (
                  <Upload className={`h-6 w-6 md:h-8 md:w-8 transition-colors ${
                    isDragActive && !isDragReject 
                      ? 'text-blue-600' 
                      : isDragReject
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`} />
                )}
              </div>
            </div>
            
            <div>
              <p className="text-base md:text-lg font-semibold text-gray-900">
                {isConverting
                  ? 'Converting audio to WAV...'
                  : isDragActive && !isDragReject
                  ? 'Drop your audio file here'
                  : isDragReject
                  ? 'Invalid file type'
                  : 'Drop audio files here'
                }
              </p>
              <p className="text-gray-600 mt-1 text-sm md:text-base">
                {isConverting
                  ? 'Please wait while we optimize your audio for transcription'
                  : isDragReject 
                  ? 'Please upload audio files only (MP3, WAV, M4A, etc.)'
                  : 'or click to browse your files'
                }
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Supports MP3, WAV, M4A, AAC, OGG, FLAC, WebM (max 100MB)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                All formats are automatically converted to WAV for optimal transcription
              </p>
            </div>
            
            <button
              type="button"
              disabled={isConverting}
              className="inline-flex items-center px-4 md:px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <FileAudio className="h-5 w-5 mr-2" />
              Choose File
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <FileAudio className="h-6 w-6 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">{uploadedFile.name}</p>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <span>•</span>
                  <span>{getFormatDisplayName(uploadedFile.type)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center space-x-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
        <span className="text-gray-500 text-sm font-medium">OR</span>
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
      </div>

      {/* Recording Section */}
      <div className="text-center">
        <button
          onClick={handleRecordingToggle}
          disabled={!!recordingError || isConverting}
          className={`inline-flex items-center px-6 md:px-8 py-3 md:py-4 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-h-[44px] ${
            isRecording
              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
              : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3" />
              Start Recording
            </>
          )}
        </button>
        
        {isRecording && (
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-600 font-medium text-sm md:text-base">Recording in progress...</span>
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-2">
          Recordings are automatically converted to WAV format for optimal transcription
        </p>
      </div>
    </div>
  );
};

export default AudioUploader;