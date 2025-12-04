/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-nested-ternary */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePerformanceMonitor } from '@missionfabric-js/enzyme/performance';
import { addBreadcrumb, reportInfo } from '@missionfabric-js/enzyme/monitoring';

interface LiveData {
  timestamp: number;
  value: number;
  status: 'online' | 'offline';
  message: string;
}

export default function RealtimeDataExample(): React.ReactElement {
  const [isConnected, setIsConnected] = useState(false);
  const [liveData, setLiveData] = useState<LiveData[]>([]);
  const queryClient = useQueryClient();
  const { metrics: performanceMetrics, trackMetric } = usePerformanceMonitor({
    enableMemoryMonitoring: true,
    enableLongTaskDetection: true,
    sampleRate: 1.0, // Always collect for demo
  });

  // Simulate real-time data updates
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isConnected) {
      interval = setInterval(() => {
        const newData: LiveData = {
          timestamp: Date.now(),
          value: Math.floor(Math.random() * 100),
          status: Math.random() > 0.1 ? 'online' : 'offline',
          message: `Update at ${new Date().toLocaleTimeString()}`
        };
        
        setLiveData(prev => [newData, ...prev.slice(0, 9)]); // Keep last 10 items
        
        // Track data updates with Enzyme performance monitoring
        trackMetric(`realtime_data_value`, newData.value);
        trackMetric('connection_updates', 1);
        
        // Track data updates with Enzyme monitoring breadcrumbs
        addBreadcrumb('data', `Real-time value: ${newData.value}`, {
          status: newData.status,
          value: newData.value,
        });
        
        reportInfo('Real-time data update', {
          status: newData.status,
          value: newData.value,
          timestamp: newData.timestamp
        });
        
        // Invalidate queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['liveMetrics'] });
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, queryClient]);

  // React Query for fetching metrics
  const { data: apiMetrics, isLoading, error } = useQuery({
    queryKey: ['liveMetrics'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        totalConnections: Math.floor(Math.random() * 1000),
        activeUsers: Math.floor(Math.random() * 500),
        serverLoad: Math.floor(Math.random() * 100),
        responseTime: Math.floor(Math.random() * 200)
      };
    },
    refetchInterval: isConnected ? 3000 : false,
    enabled: isConnected
  });

  const toggleConnection = () => {
    const newConnectionState = !isConnected;
    setIsConnected(newConnectionState);
    
    // Track connection events with Enzyme monitoring
    addBreadcrumb('navigation', `Connection ${newConnectionState ? 'established' : 'closed'}`, {
      action: newConnectionState ? 'connect' : 'disconnect',
      timestamp: Date.now()
    });
    
    reportInfo(`Connection ${newConnectionState ? 'started' : 'stopped'}`, {
      isConnected: newConnectionState,
      timestamp: Date.now()
    });
    
    if (!newConnectionState) {
      setLiveData([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Real-time Data Example
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Live data updates with React Query and simulated WebSocket connection
            </p>
          </div>

          <div className="mt-12 space-y-6">
            {/* Connection Control */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Connection Status
                  </h2>
                  <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
                <button
                  onClick={toggleConnection}
                  className={`px-4 py-2 rounded-md font-medium ${
                    isConnected 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Live Metrics */}
            {isConnected && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Live Metrics
                </h2>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span>Loading metrics...</span>
                  </div>
                ) : error ? (
                  <p className="text-red-600">Error loading metrics</p>
                ) : apiMetrics ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded">
                      <p className="text-2xl font-bold text-blue-600">{apiMetrics.totalConnections}</p>
                      <p className="text-sm text-gray-600">Total Connections</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded">
                      <p className="text-2xl font-bold text-green-600">{apiMetrics.activeUsers}</p>
                      <p className="text-sm text-gray-600">Active Users</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded">
                      <p className="text-2xl font-bold text-yellow-600">{apiMetrics.serverLoad}%</p>
                      <p className="text-sm text-gray-600">Server Load</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded">
                      <p className="text-2xl font-bold text-purple-600">{apiMetrics.responseTime}ms</p>
                      <p className="text-sm text-gray-600">Response Time</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Enzyme Performance Monitoring */}
            {performanceMetrics && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Performance Monitoring Metrics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-4 bg-blue-50 rounded">
                    <p className="text-2xl font-bold text-blue-600">{performanceMetrics.LCP ? Math.round(performanceMetrics.LCP) : 'N/A'}</p>
                    <p className="text-sm text-gray-600">LCP (ms)</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded">
                    <p className="text-2xl font-bold text-green-600">{performanceMetrics.FCP ? Math.round(performanceMetrics.FCP) : 'N/A'}</p>
                    <p className="text-sm text-gray-600">FCP (ms)</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded">
                    <p className="text-2xl font-bold text-yellow-600">{performanceMetrics.CLS ? Math.round(performanceMetrics.CLS * 1000) / 1000 : 'N/A'}</p>
                    <p className="text-sm text-gray-600">CLS</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded">
                    <p className="text-2xl font-bold text-purple-600">{performanceMetrics.longTasks.length}</p>
                    <p className="text-sm text-gray-600">Long Tasks</p>
                  </div>
                </div>
                
                {/* Custom Metrics */}
                {performanceMetrics.customMetrics.size > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Custom Metrics:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from(performanceMetrics.customMetrics.entries()).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium">{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Memory Usage */}
                {performanceMetrics.memoryUsage && (
                  <div className="mt-4 p-4 bg-gray-100 rounded">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Memory Usage:</h3>
                    <div className="text-sm space-y-1">
                      <div>Used: {Math.round(performanceMetrics.memoryUsage.usedJSHeapSize / 1024 / 1024)} MB</div>
                      <div>Total: {Math.round(performanceMetrics.memoryUsage.totalJSHeapSize / 1024 / 1024)} MB</div>
                      <div>Limit: {Math.round(performanceMetrics.memoryUsage.jsHeapSizeLimit / 1024 / 1024)} MB</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Data Stream */}
            {isConnected && liveData.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Live Data Stream
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {liveData.map((data) => (
                    <div 
                      key={data.timestamp} 
                      className={`p-3 rounded border-l-4 ${
                        data.status === 'online' 
                          ? 'border-green-400 bg-green-50' 
                          : 'border-red-400 bg-red-50'
                      } animate-fadeIn`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">Value: {data.value}</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            data.status === 'online'
                              ? 'bg-green-200 text-green-800'
                              : 'bg-red-200 text-red-800'
                          }`}>
                            {data.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {data.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Information Panel */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-md font-medium text-blue-900 mb-2">
                Real-time Features Demonstrated:
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Simulated WebSocket connection</li>
                <li>• React Query with auto-refetch</li>
                <li>• Live data streaming and updates</li>
                <li>• Connection state management</li>
                <li>• Animated UI updates</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
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
  );
}