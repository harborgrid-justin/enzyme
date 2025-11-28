import { useState } from 'react';
import { Link } from 'react-router-dom';
import { state, utils, monitoring } from '@missionfabric-js/enzyme';
import { create } from 'zustand';

// Use Enzyme's state utilities for enhanced store creation
interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  setCount: (count: number) => void;
  history: number[];
}

// Enhanced store with Enzyme features
const useCounterStore = create<CounterState>((set, get) => ({
  count: 0,
  history: [],
  increment: () => set((state) => ({ 
    count: state.count + 1,
    history: [...state.history, state.count + 1]
  })),
  decrement: () => set((state) => ({ 
    count: state.count - 1,
    history: [...state.history, state.count - 1]
  })),
  reset: () => set({ count: 0, history: [0] }),
  setCount: (count) => set((state) => ({ 
    count, 
    history: [...state.history, count]
  })),
}));

// Enhanced todo store with validation and middleware
interface TodoState {
  todos: Array<{ id: number; text: string; completed: boolean; createdAt: string }>;
  addTodo: (text: string) => void;
  toggleTodo: (id: number) => void;
  removeTodo: (id: number) => void;
  clearCompleted: () => void;
  stats: { total: number; completed: number; pending: number };
}

const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  addTodo: (text) => {
    if (!utils.isNonEmptyString(text.trim())) return;
    set((state) => ({
      todos: [...state.todos, { 
        id: Date.now(), 
        text: text.trim(), 
        completed: false,
        createdAt: new Date().toISOString()
      }],
    }));
  },
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    })),
  removeTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      todos: state.todos.filter((todo) => !todo.completed),
    })),
  get stats() {
    const todos = get().todos;
    return {
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      pending: todos.filter(t => !t.completed).length,
    };
  },
}));

export default function StateManagementExample() {
  const { count, increment, decrement, reset, setCount, history } = useCounterStore();
  const { todos, addTodo, toggleTodo, removeTodo, clearCompleted, stats } = useTodoStore();
  const [newTodo, setNewTodo] = useState('');
  const [customCount, setCustomCount] = useState('');

  const handleAddTodo = () => {
    if (utils.isNonEmptyString(newTodo.trim())) {
      addTodo(newTodo);
      setNewTodo('');
    }
  };

  const handleSetCustomCount = () => {
    const num = parseInt(customCount);
    if (!isNaN(num) && utils.isNumber(num)) {
      setCount(num);
      setCustomCount('');
    }
  };

  return (
    <monitoring.ErrorBoundary
      fallback={(error, retry) => (
        <div className="text-red-600 p-4 border border-red-200 rounded">
          <p>Error in state management: {error.message}</p>
          <button onClick={retry} className="mt-2 px-4 py-2 bg-red-600 text-white rounded">Retry</button>
        </div>
      )}
    >
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="text-green-600 hover:text-green-800 mb-6 inline-block">
            ← Back to Home
          </Link>

          <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">02. State Management</h1>
            <p className="text-gray-600 mb-6">
              Enhanced Zustand integration with Enzyme's state utilities and validation.
            </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enhanced Counter Store */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Enhanced Counter</h2>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">{count}</div>
                  <p className="text-sm text-gray-500">Current Count</p>
                </div>
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={decrement}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    -1
                  </button>
                  <button
                    onClick={increment}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                  >
                    +1
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                  >
                    Reset
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Set Custom Value:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={customCount}
                      onChange={(e) => setCustomCount(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      placeholder="Enter number"
                    />
                    <button
                      onClick={handleSetCustomCount}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Set
                    </button>
                  </div>
                </div>
                {history.length > 1 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium text-gray-700 mb-1">History (last 5):</p>
                    <div className="text-xs text-gray-600">
                      {history.slice(-5).join(' → ')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Todo Store */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Enhanced Todo List</h2>
                <div className="text-sm text-gray-500">
                  {stats.completed}/{stats.total} completed
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                  placeholder="Add a todo..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleAddTodo}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {todos.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No todos yet</p>
                ) : (
                  todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className="w-5 h-5 text-green-600"
                      />
                      <span
                        className={`flex-1 ${
                          todo.completed ? 'line-through text-gray-400' : 'text-gray-700'
                        }`}
                      >
                        {todo.text}
                      </span>
                      <button
                        onClick={() => removeTodo(todo.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {stats.pending} active, {stats.completed} completed
                </div>
                {stats.completed > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    Clear Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className="bg-gray-900 rounded-lg shadow-xl p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">Code Example</h2>
          <pre className="text-sm overflow-x-auto">
            <code>{`import { state, utils, monitoring } from '@missionfabric-js/enzyme';
import { create } from 'zustand';

// Enhanced store with Enzyme utilities
const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  addTodo: (text) => {
    // Use Enzyme validation utilities
    if (!utils.isNonEmptyString(text.trim())) return;
    set((state) => ({
      todos: [...state.todos, { 
        id: Date.now(), 
        text: text.trim(), 
        completed: false,
        createdAt: new Date().toISOString()
      }],
    }));
  },
  get stats() {
    const todos = get().todos;
    return {
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      pending: todos.filter(t => !t.completed).length,
    };
  },
}));

// Use with error boundaries
<monitoring.ErrorBoundary fallback={ErrorFallback}>
  <TodoComponent />
</monitoring.ErrorBoundary>`}</code>
          </pre>
        </div>
        </div>
      </div>
    </monitoring.ErrorBoundary>
  );
}
