/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFeatureFlags } from '@missionfabric-js/enzyme/flags';

export default function FeatureFlagsExample() {
  const { isEnabled, setFlag, flags } = useFeatureFlags();
  const [localFlags, setLocalFlags] = useState(flags);

  const featuresToDemo = [
    { key: 'newDashboard', label: 'New Dashboard UI' },
    { key: 'betaFeatures', label: 'Beta Features' },
    { key: 'darkMode', label: 'Dark Mode' },
    { key: 'advancedAnalytics', label: 'Advanced Analytics' },
  ];

  const handleToggle = (flagKey: string) => {
    const newValue = !isEnabled(flagKey);
    setFlag(flagKey, newValue);
    setLocalFlags(prev => ({ ...prev, [flagKey]: newValue }));
  };

  const handleEnable = (flagKey: string) => {
    setFlag(flagKey, true);
    setLocalFlags(prev => ({ ...prev, [flagKey]: true }));
  };

  const handleDisable = (flagKey: string) => {
    setFlag(flagKey, false);
    setLocalFlags(prev => ({ ...prev, [flagKey]: false }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Feature Flags Example
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Control application features dynamically with Enzyme's feature flag system
            </p>
          </div>

          <div className="mt-12 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Feature Flag Controls
              </h2>
              
              <div className="space-y-6">
                {featuresToDemo.map((feature) => {
                  const enabled = isEnabled(feature.key);
                  return (
                    <div key={feature.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="text-md font-medium text-gray-900">
                          {feature.label}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Status: <span className={`font-semibold ${enabled ? 'text-green-600' : 'text-red-600'}`}>
                            {enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEnable(feature.key)}
                          disabled={enabled}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Enable
                        </button>
                        <button
                          onClick={() => handleDisable(feature.key)}
                          disabled={!enabled}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Disable
                        </button>
                        <button
                          onClick={() => handleToggle(feature.key)}
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Toggle
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="p-4 bg-gray-100 rounded-lg">
                  <h3 className="text-md font-medium text-gray-900 mb-2">
                    Current Flag State
                  </h3>
                  <pre className="text-sm text-gray-700 overflow-auto">
                    {JSON.stringify(localFlags, null, 2)}
                  </pre>
                </div>

                {/* Example of conditional rendering based on flags */}
                {isEnabled('newDashboard') && (
                  <div className="p-4 bg-blue-100 border-l-4 border-blue-500">
                    <p className="text-blue-700">
                      🎉 New Dashboard UI is enabled! This content is only visible when the feature flag is active.
                    </p>
                  </div>
                )}

                {isEnabled('betaFeatures') && (
                  <div className="p-4 bg-purple-100 border-l-4 border-purple-500">
                    <p className="text-purple-700">
                      🚀 Beta Features are unlocked! You have access to experimental functionality.
                    </p>
                  </div>
                )}
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