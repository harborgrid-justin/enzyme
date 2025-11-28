import { Link } from 'react-router-dom';
import { useThemeContext } from '@missionfabric-js/enzyme/theme';

export default function ThemeSystemExample() {
  const { theme, setTheme, resolvedTheme, toggleTheme } = useThemeContext();
  const isDark = resolvedTheme === 'dark';

  const handleSetTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Theme System Example
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Dynamic theming with Enzyme's theme utilities
            </p>
          </div>

          <div className="mt-12 bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Theme Controls
              </h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Current Theme: <span className="font-semibold">{theme}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Resolved Theme: <span className="font-semibold">{resolvedTheme}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Is Dark Mode: <span className="font-semibold">{isDark ? 'Yes' : 'No'}</span>
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleSetTheme('light')}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Light Mode
                  </button>
                  <button
                    onClick={() => handleSetTheme('dark')}
                    className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Dark Mode
                  </button>
                  <button
                    onClick={() => handleSetTheme('system')}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  >
                    System
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                  >
                    Toggle
                  </button>
                </div>

                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                    Theme Preview
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    This content adapts to the current theme. Text, backgrounds, and borders
                    all respond to theme changes automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-right sm:px-6">
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