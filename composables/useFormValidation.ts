import { watch, type Ref } from 'vue';
import type { ZodType } from 'zod';

/**
 * Watches form fields and clears error messages when a field becomes valid.
 * Only clears existing errors — does not set new ones (use validate on submit for that).
 *
 * Error keys are field paths: `email`, or `address.city` for a nested field. A top-level key
 * (`address`) stays while anything under it is invalid.
 */
export function useFormValidation(
  form: Record<string, unknown>,
  schema: ZodType | undefined,
  errors: Ref<Record<string, string>>,
) {
  watch(
    form,
    (val) => {
      if (!schema) return;
      const result = schema.safeParse(val);
      const errs = errors.value;
      if (result.success) {
        for (const key of Object.keys(errs)) errs[key] = '';
        return;
      }
      const failing = result.error.issues.map((issue) => issue.path.map(String));
      // A key is still failing when an issue sits at it or anywhere beneath it.
      const stillFailing = (key: string) => {
        const parts = key.split('.');
        return failing.some((path) => parts.every((part, i) => path[i] === part));
      };
      for (const key of Object.keys(errs)) {
        if (!stillFailing(key)) errs[key] = '';
      }
    },
    { deep: true },
  );
}
