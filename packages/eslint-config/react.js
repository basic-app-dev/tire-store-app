/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./index.js'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
