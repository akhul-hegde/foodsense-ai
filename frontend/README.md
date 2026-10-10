# FoodSense AI frontend

See the Frontend section of the root README for setup.

- `src/components/shell/`: app shell (sidebar, data-source bar, page header).
- `src/components/data/`: shared cards, charts, table and state views; every card takes
  `loading`, `error`, `onRetry` and `empty`.
- `src/components/ui/`: shadcn/ui primitives, with shadows removed and an 8px radius.
- `src/lib/`: API client, dataset context, `useApi` hook, navigation.
- `src/dev/component-preview.tsx`: development-only gallery at `#/preview`, left out of production builds.
