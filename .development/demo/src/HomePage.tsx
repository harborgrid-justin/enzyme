import React, { useState } from 'react';
import { AppLink } from '@missionfabric-js/enzyme/routing';

const examples = [
  { id: '01', name: 'Basic Routing', path: '/example-01', desc: 'Enzyme routing system fundamentals', available: true },
  { id: '02', name: 'State Management', path: '/example-02', desc: 'Zustand integration', available: true },
  { id: '03', name: 'Auth & RBAC', path: '/example-03', desc: 'Authentication and role-based access', available: true },
  { id: '04', name: 'Feature Flags', path: '/example-04', desc: 'A/B testing and feature toggles', available: false },
  { id: '05', name: 'Error Boundaries', path: '/example-05', desc: 'Error handling and recovery', available: false },
  { id: '06', name: 'React Query', path: '/example-06', desc: 'Data fetching and caching', available: false },
  { id: '07', name: 'Performance Monitoring', path: '/example-07', desc: 'Core Web Vitals tracking', available: false },
  { id: '08', name: 'Theme System', path: '/example-08', desc: 'Dynamic theming', available: false },
  { id: '09', name: 'Layout System', path: '/example-09', desc: 'Adaptive layouts', available: false },
  { id: '10', name: 'Security & Validation', path: '/example-10', desc: 'Input sanitization', available: false },
  { id: '11', name: 'Streaming Data', path: '/example-11', desc: 'Progressive rendering', available: false },
  { id: '12', name: 'Real-time Sync', path: '/example-12', desc: 'Multi-tab synchronization', available: false },
  { id: '13', name: 'Hydration & SSR', path: '/example-13', desc: 'Server-side rendering', available: false },
  { id: '14', name: 'VDOM Modules', path: '/example-14', desc: 'Virtual DOM system', available: false },
  { id: '15', name: 'Full Integration', path: '/example-15', desc: 'All features combined', available: false },
];

export default function HomePage(): React.ReactElement {
  const [search, setSearch] = useState('');
  
  const filteredExamples = examples.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    ex.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            @missionfabric-js/enzyme
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Enterprise React Framework
          </p>
          <p className="text-md text-gray-500 mb-8">
            15 Interactive Examples Demonstrating Framework Capabilities
          </p>
          
          <div className="max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search examples..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExamples.map((example) => (
            <AppLink
              key={example.id}
              to={example.path}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 p-6 border border-gray-200 hover:border-blue-400 group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-blue-600 group-hover:text-blue-700">
                  {example.id}
                </span>
                <svg
                  className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {example.name}
              </h3>
              <p className="text-sm text-gray-500">
                {example.desc}
              </p>
            </AppLink>
          ))}
        </div>

        {filteredExamples.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">🔍</div>
            <p className="text-gray-500">No examples found matching "{search}"</p>
          </div>
        )}

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Built with ❤️ using @missionfabric-js/enzyme v1.0.3</p>
          <p className="mt-2">Comprehensive React Enterprise Framework</p>
        </div>
      </div>
    </div>
  );
}
