import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reportError, addBreadcrumb, reportInfo } from '@missionfabric-js/enzyme/monitoring';

// Error component that can throw errors for demonstration
function ErrorProneComponent({ shouldError }: { shouldError: boolean }) {
  useEffect(() => {
    if (shouldError) {
      throw new Error('Simulated component error!');
    }
  }, [shouldError]);

  return (
    <div className="p-4 bg-green-100 border border-green-300 rounded">
      <p className="text-green-700">Component is working correctly!</p>
    </div>
  );
}

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  // Track error with Enzyme monitoring
  React.useEffect(() => {
    reportError(error, {
      component: 'ErrorProneComponent',
      action: 'component_error_boundary',
      severity: 'error'
    });
    
    addBreadcrumb('error', `Component error: ${error.message}`, {
      component: 'ErrorProneComponent',
      stack: error.stack
    });
  }, [error]);

  return (
    <div className="p-4 bg-red-100 border border-red-300 rounded">
      <h3 className="text-lg font-medium text-red-800 mb-2">Something went wrong:</h3>
      <p className="text-red-700 mb-4">{error.message}</p>
      <button
        onClick={() => {
          addBreadcrumb('user', 'Error boundary reset triggered');
          reportInfo('Error recovery attempted', { action: 'reset_error_boundary' });
          resetErrorBoundary();
        }}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

// Async function that sometimes fails
const fetchDataWithErrors = async (shouldFail: boolean): Promise<{ data: string; timestamp: number }> => {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  
  if (shouldFail) {
    throw new Error('Network request failed!');
  }
  
  return {
    data: 'Successfully fetched data!',
    timestamp: Date.now()
  };
};

export default function ErrorHandlingExample() {
  const [shouldComponentError, setShouldComponentError] = useState(false);
  const [shouldQueryError, setShouldQueryError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const queryClient = useQueryClient();

  // React Query with error handling and retry logic
  const { 
    data, 
    isLoading, 
    error, 
    isError, 
    refetch,
    failureCount
  } = useQuery({
    queryKey: ['errorProneData', shouldQueryError],
    queryFn: () => fetchDataWithErrors(shouldQueryError),
    retry: (failureCount) => {
      // Retry up to 3 times
      if (failureCount < 3) {
        console.log(`Retry attempt ${failureCount + 1}`);
        return true;
      }
      return false;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Track errors when they occur
  useEffect(() => {
    if (error) {
      setErrorCount(prev => prev + 1);
      console.error('Query error:', error);
      
      // Track query errors with Enzyme monitoring
      reportError(error, {
        component: 'ErrorHandlingExample',
        action: 'query_error',
        severity: 'warning',
        attemptCount: failureCount + 1
      });
      
      addBreadcrumb('error', `Query failed: ${error.message}`, {
        attemptCount: failureCount + 1,
        shouldQueryError
      });
    }
  }, [error, failureCount, shouldQueryError]);

  const handleComponentErrorToggle = () => {
    setShouldComponentError(!shouldComponentError);
  };

  const handleQueryErrorToggle = () => {
    setShouldQueryError(!shouldQueryError);
    // Reset the query when toggling
    queryClient.resetQueries({ queryKey: ['errorProneData'] });
  };

  const handleManualRefetch = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Error Handling Example
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Robust error handling with Error Boundaries and React Query retry logic
            </p>
          </div>

          <div className="mt-12 space-y-6">
            {/* Component Error Boundary */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Component Error Boundary
              </h2>
              <div className="mb-4">
                <button
                  onClick={handleComponentErrorToggle}
                  className={`px-4 py-2 rounded font-medium ${
                    shouldComponentError
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {shouldComponentError ? 'Fix Component' : 'Break Component'}
                </button>
              </div>
              <ErrorBoundary
                FallbackComponent={ErrorFallback}
                onReset={() => setShouldComponentError(false)}
                resetKeys={[shouldComponentError]}
              >
                <ErrorProneComponent shouldError={shouldComponentError} />
              </ErrorBoundary>
            </div>

            {/* Query Error Handling */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Query Error Handling with Retry
              </h2>
              <div className="mb-4 flex space-x-3">
                <button
                  onClick={handleQueryErrorToggle}
                  className={`px-4 py-2 rounded font-medium ${
                    shouldQueryError
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  {shouldQueryError ? 'Fix Query' : 'Break Query'}
                </button>
                <button
                  onClick={handleManualRefetch}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Refetch'}
                </button>
              </div>
              
              <div className="space-y-3">
                {isLoading && (
                  <div className="p-4 bg-blue-100 border border-blue-300 rounded flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-blue-700">
                      Loading... {failureCount > 0 && `(Retry ${failureCount})`}
                    </span>
                  </div>
                )}
                
                {isError && (
                  <div className="p-4 bg-red-100 border border-red-300 rounded">
                    <h3 className="text-lg font-medium text-red-800 mb-2">Query Error:</h3>
                    <p className="text-red-700 mb-2">{error.message}</p>
                    <p className="text-sm text-red-600">Failed after {failureCount} attempts</p>
                  </div>
                )}
                
                {data && (
                  <div className="p-4 bg-green-100 border border-green-300 rounded">
                    <p className="text-green-700 font-medium">{data.data}</p>
                    <p className="text-sm text-green-600 mt-1">
                      Retrieved at: {new Date(data.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Statistics */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Error Statistics
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-gray-100 rounded text-center">
                  <p className="text-2xl font-bold text-gray-700">{errorCount}</p>
                  <p className="text-sm text-gray-600">Total Errors</p>
                </div>
                <div className="p-4 bg-gray-100 rounded text-center">
                  <p className="text-2xl font-bold text-gray-700">{failureCount}</p>
                  <p className="text-sm text-gray-600">Query Failures</p>
                </div>
              </div>
              
              {/* Enzyme Monitoring Errors */}
              <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-900 mb-2">
                  Enzyme Error Tracking
                </h3>
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-sm text-blue-700">
                    Errors and breadcrumbs are being tracked by Enzyme's monitoring system.
                    Check the browser console or your configured error reporting service for details.
                  </p>
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-md font-medium text-blue-900 mb-2">
                Error Handling Best Practices:
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Use Error Boundaries for component-level error catching</li>
                <li>• Implement retry logic with exponential backoff</li>
                <li>• Provide meaningful error messages to users</li>
                <li>• Log errors for debugging and monitoring</li>
                <li>• Offer recovery actions when possible</li>
                <li>• Gracefully degrade functionality when errors occur</li>
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