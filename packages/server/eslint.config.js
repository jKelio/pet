import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    files: ['src/infrastructure/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
