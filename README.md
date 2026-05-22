# vuetail-components

Personal component registry for [vuetail-template](https://github.com/AbdulghaniKM/vuetail-template).

Components and composables are fetched on demand via the CLI built into the template — no npm install, no lock files, full ownership of every file.

## Structure

```
/components
  /ui
    AppButton.vue
    AppModal.vue
    AppToast.vue
    ThemeToggle.vue
    ... (all UI components)
    /Fields
      AppForm.vue
      InputField.vue
      Select.vue
      DatePicker.vue
      ... (form fields)
/composables
  useToast.ts
  useTheme.ts
  useAppUi.ts
  ... (all composables)
registry.json   ← index for the `list` command
```

## Usage

From any project cloned from `vuetail-template`:

```bash
# Add a component
pnpm add-component AppButton
pnpm add-component AppModal

# Add a composable
pnpm add-composable useToast
pnpm add-composable useTheme
pnpm add-composable useAppUi

# See what's available
pnpm add-component list
pnpm add-composable list
```

Files are dropped directly into `src/components/ui/` or `src/composables/` — you own the code from that point on.

Some components depend on template libs (`FormModel`, `ThemePersistence`, config/utils). Check `registry.json` → `requires` before fetching.
