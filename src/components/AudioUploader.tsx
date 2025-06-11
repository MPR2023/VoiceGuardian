import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Mic, MicOff, FileAudio, X, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioStore } from '../store/useAudioStore';

const AudioUploader: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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
    try {
      const duration = await getAudioDuration(file);
      
      const audioFileData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        duration,
        blob: file,
        size: file.size,
        uploadedAt: new Date()
      };

      addAudioFile(audioFileData);
      setUploadedFile(file);
    } catch (error) {
      console.error('Error processing audio file:', error);
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
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']
    },
    multiple: false,
    maxSize: 100 * 1024 * 1024 // 100MB limit
  });

  const handleRecordingToggle = useCallback(async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        const file = new File([blob], `recording-${Date.now()}.wav`, { 
          type: blob.type || 'audio/wav' 
        });
        await processAudioFile(file);
      }
    } else {
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording, processAudioFile]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
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

      {/* File Upload Dropzone */}
      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-xl p-4 md:p-8 text-center transition-all duration-300 cursor-pointer ${
            isDragActive && !isDragReject
              ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
              : isDragReject
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={`p-3 md:p-4 rounded-full transition-all duration-300 ${
                isDragActive && !isDragReject 
                  ? 'bg-blue-100 scale-110' 
                  : isDragReject
                  ? 'bg-red-100'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}>
                <Upload className={`h-6 w-6 md:h-8 md:w-8 transition-colors ${
                  isDragActive && !isDragReject 
                    ? 'text-blue-600' 
                    : isDragReject
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`} />
              </div>
            </div>
            
            <div>
              <p className="text-base md:text-lg font-semibold text-gray-900">
                {isDragActive && !isDragReject
                  ? 'Drop your audio file here'
                  : isDragReject
                  ? 'Invalid file type'
                  : 'Drop audio files here'
                }
              </p>
              <p className="text-gray-600 mt-1 text-sm md:text-base">
                {isDragReject 
                  ? 'Please upload audio files only (MP3, WAV, M4A, etc.)'
                  : 'or click to browse your files'
                }
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Supports MP3, WAV, M4A, AAC, OGG, FLAC (max 100MB)
              </p>
            </div>
            
            <button
              type="button"
              className="inline-flex items-center px-4 md:px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl min-h-[44px]"
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
                <p className="text-sm text-gray-600">
                  {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
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
          disabled={!!recordingError}
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
      </div>
    </div>
  );
};

export default AudioUploader;