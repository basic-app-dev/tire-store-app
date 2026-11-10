/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./apps.js', 'next/core-web-vitals'],
  settings: {
    next: {
      rootDir: ['apps/*/'],
    },
  },
};
