// Minimal stub for eslint-plugin-no-barrel-imports
export default {
  meta: {
    name: 'no-barrel-imports',
    version: '1.0.0',
  },
  rules: {
    'no-barrel-imports': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Discourage barrel imports for better tree-shaking',
        },
        schema: [
          {
            type: 'object',
            properties: {
              severity: { type: 'string' },
              allowTypes: { type: 'boolean' },
            },
          },
        ],
      },
      create() {
        // Stub implementation - does nothing
        return {};
      },
    },
  },
};
