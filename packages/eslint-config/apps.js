/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./index.js'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'postgres',
            message:
              'Architectural Boundary Violation: Client apps must not establish direct database connections or execute raw SQL.',
          },
          {
            name: 'drizzle-orm',
            message:
              'Architectural Boundary Violation: Client apps must not import Drizzle ORM directly.',
          },
          {
            name: 'drizzle-orm/postgres-js',
            message:
              'Architectural Boundary Violation: Client apps must not import Drizzle database drivers directly.',
          },
        ],
      },
    ],
  },
};
