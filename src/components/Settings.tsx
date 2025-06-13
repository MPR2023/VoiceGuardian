import React from 'react';
import { Settings as SettingsIcon, Shield, Globe, HardDrive, Bell, Info, Mail, User, Wifi, Mic, Monitor, Server } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';

const Settings: React.FC = () => {
  const { settings, updateSettings } = useAudioStore();

  const handleModerationStrictnessChange = (value: 'lenient' | 'medium' | 'strict') => {
    updateSettings({ moderationStrictness: value });
  };

  const handleLanguageChange = (value: 'english' | 'spanish' | 'french' | 'german' | 'italian' | 'portuguese') => {
    updateSettings({ preferredLanguage: value });
  };

  const handleKeepFilesToggle = () => {
    updateSettings({ keepFilesAfterModeration: !settings.keepFilesAfterModeration });
  };

  const handleNotificationsToggle = () => {
    updateSettings({ enableNotifications: !settings.enableNotifications });
  };

  const handleBrowserTranscriptionToggle = () => {
    updateSettings({ preferBrowserTranscription: !settings.preferBrowserTranscription });
  };

  const handleServerTranscriptionToggle = () => {
    updateSettings({ preferServerTranscription: !settings.preferServerTranscription });
  };

  const ComingSoonBadge = () => (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
      Coming Soon
    </span>
  );

  const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void; disabled?: boolean }> = ({ 
    enabled, 
    onChange, 
    disabled = false 
  }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl text-white p-4 md:p-8">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="h-6 w-6 md:h-8 md:w-8" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
            <p className="text-blue-100 text-base md:text-lg mt-1">
              Configure your Voice Guardian preferences
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4 md:space-y-6">
        
        {/* 1. AI Transcription Mode */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 md:p-3 rounded-lg">
                <Server className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">AI Transcription Mode</h3>
                <p className="text-sm text-gray-600">Choose between server-based or browser-based AI transcription</p>
              </div>
            </div>
          </div>
          
          <div className="ml-0 sm:ml-12 space-y-4">
            {/* Server Transcription Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">AI (Server) - Default</p>
                  <p className="text-xs text-gray-600">Fast, accurate transcription using remote AI servers</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={settings.preferServerTranscription}
                onChange={handleServerTranscriptionToggle}
              />
            </div>

            {/* Browser Transcription Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-3">
                <Monitor className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">AI (Browser) - Privacy Mode</p>
                  <p className="text-xs text-gray-600">Local AI processing with word-level timestamps</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={settings.preferBrowserTranscription}
                onChange={handleBrowserTranscriptionToggle}
              />
            </div>

            {/* Current Mode Display */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>Current Mode:</strong> {
                  settings.preferServerTranscription 
                    ? 'AI (Server) - Fast transcription with automatic browser fallback'
                    : settings.preferBrowserTranscription
                    ? 'AI (Browser) - Privacy-focused with word timestamps'
                    : 'Manual selection required for each transcription'
                }
              </p>
              {!settings.preferServerTranscription && !settings.preferBrowserTranscription && (
                <p className="text-xs text-yellow-600 mt-1">
                  ⚠️ No default mode selected. You'll need to choose manually each time.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 2. Live Speech Recognition */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 md:p-3 rounded-lg">
                <Mic className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Live Speech Recognition</h3>
                <p className="text-sm text-gray-600">Real-time microphone transcription (always available)</p>
              </div>
            </div>
          </div>
          
          <div className="ml-0 sm:ml-12">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-700 leading-relaxed">
                <strong>Live Speech Recognition</strong> is always available as a third option alongside AI transcription modes. 
                It uses your browser's built-in speech recognition for real-time microphone input and works best in Chrome or Edge.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Moderation Strictness */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 md:p-3 rounded-lg">
                <Shield className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Moderation Strictness</h3>
                <p className="text-sm text-gray-600">Control how sensitive the content moderation system is</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
          
          <div className="ml-0 sm:ml-12 space-y-3">
            <select
              value={settings.moderationStrictness}
              onChange={(e) => handleModerationStrictnessChange(e.target.value as any)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm md:text-base opacity-50 cursor-not-allowed min-h-[44px]"
              disabled
            >
              <option value="lenient">Lenient - Only flag severe violations</option>
              <option value="medium">Medium - Balanced detection</option>
              <option value="strict">Strict - Flag all potential issues</option>
            </select>
            <p className="text-xs text-gray-500">
              Currently set to: <span className="font-medium capitalize">{settings.moderationStrictness}</span>
            </p>
          </div>
        </div>

        {/* 4. Preferred Language */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 md:p-3 rounded-lg">
                <Globe className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Preferred Language</h3>
                <p className="text-sm text-gray-600">Select your preferred language for transcription and analysis</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
          
          <div className="ml-0 sm:ml-12 space-y-3">
            <select
              value={settings.preferredLanguage}
              onChange={(e) => handleLanguageChange(e.target.value as any)}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm md:text-base opacity-50 cursor-not-allowed min-h-[44px]"
              disabled
            >
              <option value="english">English</option>
              <option value="spanish">Spanish</option>
              <option value="french">French</option>
              <option value="german">German</option>
              <option value="italian">Italian</option>
              <option value="portuguese">Portuguese</option>
            </select>
            <p className="text-xs text-gray-500">
              Currently set to: <span className="font-medium capitalize">{settings.preferredLanguage}</span>
            </p>
          </div>
        </div>

        {/* 5. Audio Retention */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-100 p-2 md:p-3 rounded-lg">
                <HardDrive className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Keep Audio Files After Moderation</h3>
                <p className="text-sm text-gray-600">Choose whether to retain audio files after content analysis</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
          
          <div className="ml-0 sm:ml-12 flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
            <div>
              <p className="text-sm text-gray-700 mb-1">
                {settings.keepFilesAfterModeration ? 'Files will be kept' : 'Files will be deleted'}
              </p>
              <p className="text-xs text-gray-500">
                This helps manage storage space and privacy
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.keepFilesAfterModeration}
              onChange={handleKeepFilesToggle}
              disabled
            />
          </div>
        </div>

        {/* 6. Notification Preferences */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 md:p-3 rounded-lg">
                <Bell className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Enable Notifications</h3>
                <p className="text-sm text-gray-600">Get notified when content moderation is complete</p>
              </div>
            </div>
            <ComingSoonBadge />
          </div>
          
          <div className="ml-0 sm:ml-12 flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
            <div>
              <p className="text-sm text-gray-700 mb-1">
                {settings.enableNotifications ? 'Notifications enabled' : 'Notifications disabled'}
              </p>
              <p className="text-xs text-gray-500">
                Receive alerts for flagged content and analysis completion
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.enableNotifications}
              onChange={handleNotificationsToggle}
              disabled
            />
          </div>
        </div>

        {/* 7. AI Features Notice */}
        <div className="bg-blue-50 rounded-xl shadow-lg p-4 md:p-6 border border-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-100 p-2 md:p-3 rounded-lg">
              <Wifi className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900">AI Transcription Options</h3>
              <p className="text-sm text-gray-600">Understanding your transcription choices</p>
            </div>
          </div>
          
          <div className="ml-0 sm:ml-12 space-y-3">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-blue-600" />
                <strong className="text-sm text-gray-700">AI (Server) Transcription:</strong>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Uses remote AI servers for fast, high-accuracy transcription. Requires internet connectivity. 
                Automatically falls back to browser AI if server is unavailable. No word-level timestamps.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="h-4 w-4 text-purple-600" />
                <strong className="text-sm text-gray-700">AI (Browser) Transcription:</strong>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Uses local AI models downloaded to your browser. Provides word-level timestamps and waveform markers. 
                Fully private - no data leaves your device. Requires initial model download.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="h-4 w-4 text-green-600" />
                <strong className="text-sm text-gray-700">Live Speech Recognition:</strong>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Real-time microphone transcription using browser's built-in speech recognition. 
                Works offline but requires speaking into microphone. Best in Chrome or Edge.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Privacy:</strong> All processing happens locally in your browser when using Browser AI or Live Speech. 
                Server AI sends audio to remote servers for processing but provides faster results.
              </p>
            </div>
          </div>
        </div>

        {/* 8. About Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex items-center space-x-3 mb-4 md:mb-6">
            <div className="bg-gray-100 p-2 md:p-3 rounded-lg">
              <Info className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900">About Voice Guardian</h3>
              <p className="text-sm text-gray-600">Application information and support</p>
            </div>
          </div>
          
          <div className="ml-0 sm:ml-12 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Application Details</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Build:</span>
                    <span className="font-medium">2024.01.15</span>
                  </div>
                  <div className="flex justify-between">
                    <span>License:</span>
                    <span className="font-medium">MIT</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Developer Information</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Built with ❤️ by the Bolt Team</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <a 
                      href="mailto:support@voiceguardian.ai?subject=Voice Guardian Support"
                      className="text-blue-600 hover:text-blue-700 hover:underline transition-colors min-h-[44px] flex items-center"
                    >
                      Contact Support
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 leading-relaxed">
                Voice Guardian offers multiple AI transcription options: server-based for speed, browser-based for privacy, 
                and live speech recognition for real-time input. All processing can be done locally for maximum privacy and security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;