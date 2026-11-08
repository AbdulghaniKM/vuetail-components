import { getCurrentInstance, h, ref, render, type AppContext, type VNode } from 'vue';
import ConfirmDangerModal from '@/components/ui/ConfirmDangerModal.vue';
import { parseCssTime } from './useMotionTokens';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` (the default) for destructive actions, `primary` for an ordinary yes or no. */
  variant?: 'danger' | 'primary';
  /** Extra content under the message: a list of what will be deleted, a checkbox… */
  body?: () => VNode | VNode[];
}

interface Active {
  container: HTMLElement;
  settle: (answer: boolean) => void;
}

// One dialog at a time, app-wide: a second confirm() answers the first with `false`.
let active: Active | null = null;

/** How long the modal's exit takes in the current preset, so it is not cut off mid-fade. */
const exitMs = (): number => {
  if (typeof document === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--vt-duration-exit');
  return parseCssTime(raw, 130) * 1000 + 50;
};

/**
 * `await confirm({...})` resolves `true` or `false`. Call `useConfirm()` in `setup` so the dialog
 * is rendered with the caller's app context: its router, plugins, global components and
 * app-level provides all reach the dialog, which a separate `createApp` would cut off.
 */
export const useConfirm = () => {
  const appContext: AppContext | null = getCurrentInstance()?.appContext ?? null;

  const confirm = (options: ConfirmOptions = {}): Promise<boolean> => {
    active?.settle(false);

    return new Promise((resolve) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const isOpen = ref(true);
      let settled = false;

      const settle = (answer: boolean) => {
        if (settled) return;
        settled = true;
        isOpen.value = false;
        if (active?.container === container) active = null;
        resolve(answer);
        // Unmount after the exit animation, so the dialog fades out rather than vanishing.
        setTimeout(() => {
          render(null, container);
          container.remove();
        }, exitMs());
      };

      const Root = {
        setup() {
          return () =>
            h(
              ConfirmDangerModal,
              {
                isOpen: isOpen.value,
                title: options.title ?? 'Are you sure?',
                message: options.message ?? 'This action cannot be undone.',
                confirmLabel: options.confirmLabel ?? 'Confirm',
                cancelLabel: options.cancelLabel ?? 'Cancel',
                variant: options.variant ?? 'danger',
                onClose: () => settle(false),
                onConfirm: () => settle(true),
              },
              options.body ? { default: options.body } : undefined,
            );
        },
      };

      const vnode = h(Root);
      vnode.appContext = appContext;
      render(vnode, container);
      active = { container, settle };
    });
  };

  return { confirm };
};
