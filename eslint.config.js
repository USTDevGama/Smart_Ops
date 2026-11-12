import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Agents are developed by separate teams. An agent may use the shared UI kit,
// auth and styles, but never another agent's code. See docs/adding-an-agent.md.
const agentIds = ['agent1', 'agent2', 'agent3', 'agent4', '_template'];
const isolationOverrides = agentIds.map((id) => ({
  files: [`src/agents/${id}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '@/agents/*',
              '!@/agents/' + id,
              '!@/agents/' + id + '/*',
              '@/shell/*',
              '@/home/*',
            ],
            message:
              'Agents may only import from their own folder, @/components/ui, @/auth and @/styles.',
          },
        ],
      },
    ],
  },
}));

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  ...isolationOverrides,
);
