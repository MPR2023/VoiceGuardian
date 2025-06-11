import React from 'react';
import { FileAudio, Download, Trash2, Calendar, Clock, HardDrive } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';
import Waveform from './Waveform';

const AudioFiles: React.FC = () => {
  const { audioFiles, selectedFileId, setSelectedFileId, getFile, removeAudioFile } = useAudioStore();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = (file: any) => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.click();
    }
  };

  const handleDelete = (fileId: string) => {
    removeAudioFile(fileId);
  };

  const selectedFile = selectedFileId ? getFile(selectedFileId) : null;

  if (audioFiles.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 text-center">
        <FileAudio className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 md:mb-6 text-gray-300" />
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">No Audio Files</h3>
        <p className="text-gray-600 mb-4 md:mb-6 text-sm md:text-base">
          Upload your first audio file to start analyzing and monitoring content
        </p>
        <button className="inline-flex items-center px-4 md:px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 min-h-[44px]">
          <FileAudio className="h-5 w-5 mr-2" />
          Upload Audio File
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Audio Files</h2>
          <div className="text-sm text-gray-500">
            {audioFiles.length} file{audioFiles.length !== 1 ? 's' : ''} total
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6">
        {audioFiles.map((file) => (
          <div
            key={file.id}
            className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-xl ${
              selectedFileId === file.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedFileId(file.id)}
          >
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
                  <div className={`p-2 md:p-3 rounded-lg flex-shrink-0 ${
                    selectedFileId === file.id ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <FileAudio className={`h-6 w-6 md:h-8 md:w-8 ${
                      selectedFileId === file.id ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate mb-1">
                      {file.name}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(file.duration)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <HardDrive className="h-4 w-4" />
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span className="hidden sm:inline">{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        <span className="sm:hidden">{new Date(file.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Download"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {selectedFileId === file.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">File Type:</span>
                      <p className="font-medium text-gray-900">
                        {file.name.split('.').pop()?.toUpperCase() || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <p className="font-medium text-gray-900">{formatTime(file.duration)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <p className="font-medium text-gray-900">{formatFileSize(file.size)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Uploaded:</span>
                      <p className="font-medium text-gray-900 text-xs md:text-sm">
                        {new Date(file.uploadedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Waveform Player */}
      {selectedFile && (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Audio Player</h3>
          <Waveform audio={{ id: selectedFile.id, blob: selectedFile.blob }} />
        </div>
      )}
    </div>
  );
};

export default AudioFiles;