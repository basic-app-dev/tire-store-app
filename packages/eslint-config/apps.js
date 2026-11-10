/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./index.js'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@tire-store/db',
            message:
              'Architectural Boundary Violation: Client apps (apps/web, apps/mobile) must never import @tire-store/db directly. All data access must pass through @tire-store/api-client or Supabase JS client.',
          },
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
        patterns: [
          {
            group: ['@tire-store/db/*'],
            message:
              'Architectural Boundary Violation: Client apps must never import internal modules from @tire-store/db.',
          },
        ],
      },
    ],
  },
};
