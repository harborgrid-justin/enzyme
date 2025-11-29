/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ConfigurationExample() {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({
    theme: 'light',
    language: 'en',
    notifications: true,
    autoSave: false,
  });
  const [newValue, setNewValue] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  const handleUpdate = () => {
    if (selectedKey && newValue) {
      if (selectedKey === 'newCustomKey') {
        const [key, value] = newValue.split(':');
        if (key && value) {
          setLocalConfig(prev => ({ ...prev, [key.trim()]: value.trim() }));
        }
      } else {
        setLocalConfig(prev => ({ ...prev, [selectedKey]: newValue }));
      }
      setNewValue('');
    }
  };

  const handleReset = () => {
    setLocalConfig({
      theme: 'light',
      language: 'en', 
      notifications: true,
      autoSave: false,
    });
  };

  const configKeys = Object.keys(localConfig);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Configuration Management Example
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Manage application configuration with Enzyme's config utilities
            </p>
          </div>

          <div className="mt-12 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Configuration Controls
              </h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Configuration Key
                    </label>
                    <select
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a key...</option>
                      {configKeys.map((key) => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                      <option value="newCustomKey">Add Custom Key</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Value
                    </label>
                    <input
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder={selectedKey === 'newCustomKey' ? 'key:value' : 'Enter new value'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleUpdate}
                    disabled={!selectedKey || !newValue}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Config
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Reset to Defaults
                  </button>
                </div>

                <div className="p-4 bg-gray-100 rounded-lg">
                  <h3 className="text-md font-medium text-gray-900 mb-2">
                    Current Configuration
                  </h3>
                  {localConfig ? (
                    <pre className="text-sm text-gray-700 overflow-auto">
                      {JSON.stringify(localConfig, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-gray-500">No configuration available</p>
                  )}
                </div>

                <div className="p-4 bg-blue-100 border-l-4 border-blue-500">
                  <h4 className="text-sm font-semibold text-blue-800">Configuration Tips:</h4>
                  <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
                    <li>Changes are applied immediately</li>
                    <li>Configuration persists across page reloads</li>
                    <li>Use custom keys for new configuration values</li>
                    <li>Reset button restores factory defaults</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <Link
                to="/"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to Examples
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}