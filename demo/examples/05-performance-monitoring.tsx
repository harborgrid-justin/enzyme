/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePerformanceMonitor } from '@missionfabric-js/enzyme/performance';

export default function PerformanceMonitoringExample() {
  const { metrics, trackMetric } = usePerformanceMonitor({
    enableMemoryMonitoring: true,
    enableLongTaskDetection: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const simulateSlowOperation = async () => {
    setIsLoading(true);
    
    const startTime = performance.now();
    // Simulate API call or heavy computation
    await new Promise(resolve => setTimeout(resolve, 2000));
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Track the operation with Enzyme performance monitoring
    trackMetric('slow_operation_duration', duration);
    
    setIsLoading(false);
    console.log(`Operation completed in ${duration}ms`);
  };

  const handleViewMetrics = () => {
    console.log('Current performance metrics:', metrics);
  };

  const handleClearMetrics = () => {
    console.log('Metrics cleared - this would reset performance tracking');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Performance Monitoring Example
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Track and measure application performance with Enzyme
            </p>
          </div>

          <div className="mt-12 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Performance Actions
              </h2>
              
              <div className="space-y-4">
                <div className="flex space-x-3">
                  <button
                    onClick={simulateSlowOperation}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Running...' : 'Simulate Slow Operation'}
                  </button>
                  <button
                    onClick={handleViewMetrics}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  >
                    View Metrics
                  </button>
                  <button
                    onClick={handleClearMetrics}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Clear Metrics
                  </button>
                </div>

                {metrics && (
                  <div className="p-4 bg-gray-100 rounded-lg">
                    <h3 className="text-md font-medium text-gray-900 mb-2">
                      Performance Metrics
                    </h3>
                    <div className="space-y-2 text-sm">
                      {metrics.customMetrics.size > 0 && (
                        <div>
                          <h4 className="font-medium">Custom Metrics:</h4>
                          {Array.from(metrics.customMetrics.entries()).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {value}
                            </div>
                          ))}
                        </div>
                      )}
                      {metrics.LCP && <div>LCP: {Math.round(metrics.LCP)}ms</div>}
                      {metrics.FCP && <div>FCP: {Math.round(metrics.FCP)}ms</div>}
                      {metrics.CLS && <div>CLS: {metrics.CLS.toFixed(3)}</div>}
                      <div>Long Tasks: {metrics.longTasks.length}</div>
                      {metrics.memoryUsage && (
                        <div>Memory: {Math.round(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB used</div>
                      )}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-gray-600">Measuring performance...</span>
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