# Working conventions

Use names that describe the role of a file or value. Keep changes focused so a naming cleanup does not alter application behavior.

## Names

- React components and their files use PascalCase, such as `DashboardListPage.tsx` and `CsvImportDialog.tsx`. Treat abbreviations as words in component names: `KpiWidget`.
- Route screens end in `Page`. The dashboard list and editor are separate screens.
- Hooks use camelCase with a `use` prefix, following `useDatasets.ts`.
- General utility modules use kebab-case, such as `dataset-search.ts`.
- Functions and local values use camelCase. Prefer `dashboardDraftName` to an ambiguous `newName`.
- Boolean names should describe a condition, such as `isCreateDialogOpen`. Event handlers should describe the action, such as `handleCreateDashboard`.
- Keep database columns, stored widget types, URL paths, and environment variable names consistent with their existing contracts.

Shared UI primitives retain their library conventions. Generated Supabase types should be regenerated from the schema rather than renamed by hand. Older application code can adopt these conventions when it is next edited.

## Writing

Use sentence case for interface labels and documentation headings. Describe what a feature does in concrete terms. Comments should explain constraints or reasoning rather than advertise an implementation.

Keep setup instructions in the root README. Put focused maintenance notes in `docs/`; retain historical investigations in `docs/archive/` with their original context.

## Checking a change

Run the build, lint checks, and relevant tests. When renaming a module, update its imports and search for the old name. For changes to collaboration or permissions, also check the behavior with different signed-in users against a configured Supabase project.
