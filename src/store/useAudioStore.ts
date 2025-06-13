import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { FlaggedWord } from '../lib/moderate';

export interface AudioFileData {
  id: string;
  name: string;
  duration: number;
  blob: Blob;
  size: number;
  uploadedAt: Date;
  url?: string;
  flaggedWords?: FlaggedWord[];
}

interface Settings {
  moderationStrictness: 'lenient' | 'medium' | 'strict';
  preferredLanguage: 'english' | 'spanish' | 'french' | 'german' | 'italian' | 'portuguese';
  keepFilesAfterModeration: boolean;
  enableNotifications: boolean;
  preferBrowserTranscription: boolean;
  preferServerTranscription: boolean;
}

interface AudioStore {
  audioFiles: AudioFileData[];
  selectedFile: AudioFileData | null;
  selectedFileId: string | null;
  settings: Settings;
  
  // Audio file methods
  addAudioFile: (file: AudioFileData) => void;
  removeAudioFile: (id: string) => void;
  selectFile: (file: AudioFileData | null) => void;
  setSelectedFileId: (id: string | null) => void;
  getFile: (id: string) => AudioFileData | undefined;
  updateFileFlags: (id: string, flaggedWords: FlaggedWord[]) => void;
  clearFiles: () => void;
  
  // Settings methods
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  moderationStrictness: 'medium',
  preferredLanguage: 'english',
  keepFilesAfterModeration: true,
  enableNotifications: true,
  preferBrowserTranscription: false,
  preferServerTranscription: true,
};

export const useAudioStore = create<AudioStore>()(
  devtools(
    persist(
      (set, get) => ({
        audioFiles: [],
        selectedFile: null,
        selectedFileId: null,
        settings: defaultSettings,

        addAudioFile: (file: AudioFileData) => {
          // Create object URL for the blob
          const fileWithUrl = {
            ...file,
            url: URL.createObjectURL(file.blob)
          };

          set((state) => ({
            audioFiles: [fileWithUrl, ...state.audioFiles],
            selectedFile: fileWithUrl, // Auto-select newly added file
            selectedFileId: fileWithUrl.id
          }));
        },

        removeAudioFile: (id: string) => {
          const { audioFiles, selectedFile } = get();
          const fileToRemove = audioFiles.find(f => f.id === id);
          
          // Revoke object URL to prevent memory leaks
          if (fileToRemove?.url) {
            URL.revokeObjectURL(fileToRemove.url);
          }

          set((state) => ({
            audioFiles: state.audioFiles.filter(f => f.id !== id),
            selectedFile: selectedFile?.id === id ? null : selectedFile,
            selectedFileId: selectedFile?.id === id ? null : state.selectedFileId
          }));
        },

        selectFile: (file: AudioFileData | null) => {
          set({ 
            selectedFile: file,
            selectedFileId: file?.id || null
          });
        },

        setSelectedFileId: (id: string | null) => {
          const { audioFiles } = get();
          const file = id ? audioFiles.find(f => f.id === id) : null;
          set({ 
            selectedFileId: id,
            selectedFile: file || null
          });
        },

        getFile: (id: string) => {
          const { audioFiles } = get();
          return audioFiles.find(f => f.id === id);
        },

        updateFileFlags: (id: string, flaggedWords: FlaggedWord[]) => {
          set((state) => ({
            audioFiles: state.audioFiles.map(file => 
              file.id === id ? { ...file, flaggedWords } : file
            ),
            selectedFile: state.selectedFile?.id === id 
              ? { ...state.selectedFile, flaggedWords }
              : state.selectedFile
          }));
        },

        clearFiles: () => {
          const { audioFiles } = get();
          
          // Revoke all object URLs
          audioFiles.forEach(file => {
            if (file.url) {
              URL.revokeObjectURL(file.url);
            }
          });

          set({
            audioFiles: [],
            selectedFile: null,
            selectedFileId: null
          });
        },

        updateSettings: (newSettings: Partial<Settings>) => {
          set((state) => ({
            settings: { ...state.settings, ...newSettings }
          }));
        },

        resetSettings: () => {
          set({ settings: defaultSettings });
        }
      }),
      {
        name: 'audio-store',
        // Only persist settings, not audio files (they contain blobs)
        partialize: (state) => ({ settings: state.settings }),
      }
    ),
    {
      name: 'audio-store'
    }
  )
);