/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/promise-function-async */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-console */
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { routing } from '@missionfabric-js/enzyme';

// Use Enzyme's routing guard system
const ageGuard = routing.createGuard({
  name: 'age-check',
  description: 'Requires user to be 18 or older',
  priority: 10,
  canActivate: async (context) => {
    const age = localStorage.getItem('userAge');
    if (!age || parseInt(age) < 18) {
      return routing.GuardResult.deny('Must be 18 or older to access this content');
    }
    return routing.GuardResult.allow({ age: parseInt(age) });
  },
});

// Advanced composite guard example
const restrictedAreaGuard = routing.createCompositeGuard({
  guards: [ageGuard],
  strategy: 'all',
  name: 'restricted-area',
  description: 'Composite guard for restricted content'
});

export default function BasicRoutingExample() {
  const navigate = useNavigate();
  const location = useLocation();
  const [age, setAge] = useState(localStorage.getItem('userAge') || '');
  const [showRestricted, setShowRestricted] = useState(false);

  const handleSetAge = () => {
    localStorage.setItem('userAge', age);
    alert(`Age set to ${age}`);
  };

  const tryRestricted = async () => {
    const guardContext = routing.createGuardContext({
      path: '/restricted',
      params: {},
      query: {},
      user: { age: localStorage.getItem('userAge') },
      isInitialLoad: false
    });

    const result = await ageGuard.execute('canActivate', guardContext);

    if (result.type === 'allow') {
      setShowRestricted(true);
      console.log('Access granted with data:', result.data);
    } else if (result.type === 'deny') {
      alert(result.reason || 'Access denied');
    } else if (result.type === 'redirect') {
      navigate(result.path || '/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-purple-600 hover:text-purple-800 mb-6 inline-block">
          ← Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">01. Basic Routing</h1>
          <p className="text-gray-600 mb-6">
            Demonstrates Enzyme's routing system with route guards and navigation utilities.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Navigation Links */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Navigation</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Current Path:</p>
                  <code className="bg-gray-100 px-3 py-1 rounded text-sm">{location.pathname}</code>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
                >
                  Navigate to Home
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
                >
                  Go Back
                </button>
                <button
                  onClick={() => navigate('/example-02')}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                >
                  Next Example →
                </button>
              </div>
            </div>

            {/* Route Guards */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Route Guards</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Set Your Age:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter age"
                    />
                    <button
                      onClick={handleSetAge}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Set
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {localStorage.getItem('userAge') || 'Not set'}
                  </p>
                </div>
                <button
                  onClick={tryRestricted}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                >
                  Try Restricted Area (18+)
                </button>
                {showRestricted && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-green-800 text-sm font-medium">
                      ✓ Access granted! You can view restricted content.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className="bg-gray-900 rounded-lg shadow-xl p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">Code Example</h2>
          <pre className="text-sm overflow-x-auto">
            <code>{`import { routing } from '@missionfabric-js/enzyme';

// Create a route guard using Enzyme's guard system
const ageGuard = routing.createGuard({
  name: 'age-check',
  description: 'Requires user to be 18 or older',
  priority: 10,
  canActivate: async (context) => {
    const age = localStorage.getItem('userAge');
    if (!age || parseInt(age) < 18) {
      return routing.GuardResult.deny('Must be 18 or older');
    }
    return routing.GuardResult.allow({ age: parseInt(age) });
  },
});

// Create composite guards
const restrictedGuard = routing.createCompositeGuard({
  guards: [ageGuard],
  strategy: 'all',
  name: 'restricted-area'
});

// Execute guard
const context = routing.createGuardContext({ path: '/restricted' });
const result = await ageGuard.execute('canActivate', context);`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
