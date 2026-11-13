<template>
  <div class="flex w-full flex-col gap-1.5">
    <label v-if="label" :id="labelId" :for="inputId" class="text-control font-medium text-text">{{ label }}</label>

    <div class="relative">
      <!-- The frame: the ring shows while the text input has focus; a focused remove button draws its own. -->
      <div
        class="flex min-h-control-md w-full flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 transition-colors duration-(--vt-duration) has-[input:focus]:outline-2 has-[input:focus]:-outline-offset-1"
        :class="[
          disabled ? 'cursor-not-allowed bg-muted opacity-60' : 'cursor-text bg-surface',
          error
            ? 'border-danger-text has-[input:focus]:outline-danger-text'
            : `border-border-strong has-[input:focus]:outline-ring ${disabled ? '' : 'hover:border-[color-mix(in_srgb,var(--color-border-strong),var(--color-text)_25%)]'}`,
        ]"
        @pointerdown="onFramePointerdown"
      >
        <ul
          v-if="modelValue.length"
          class="flex min-w-0 max-w-full flex-wrap gap-1.5"
          :aria-labelledby="label ? labelId : undefined"
          :aria-label="label ? undefined : 'Tags'"
        >
          <li
            v-for="(tag, index) in modelValue"
            :key="`${index}-${tag}`"
            class="inline-flex min-h-7 min-w-0 max-w-full items-center gap-0.5 rounded-sm bg-muted ps-2 text-sm text-text"
          >
            <span class="wrap-anywhere">{{ tag }}</span>
            <button
              :ref="(el) => (removeButtons[index] = el as HTMLButtonElement | null)"
              type="button"
              :disabled="disabled"
              :aria-label="`Remove ${tag}`"
              class="relative flex size-7 shrink-0 items-center justify-center rounded-sm text-text-muted transition-colors duration-(--vt-duration) after:absolute after:-inset-2 enabled:hover:bg-[color-mix(in_srgb,var(--color-muted),var(--color-text)_8%)] enabled:hover:text-text disabled:cursor-not-allowed"
              @click="removeAt(index, true)"
              @keydown="onTagKeydown(index, $event)"
            >
              <AppIcon name="icon-[heroicons--x-mark]" :size="0.875" aria-hidden="true" />
            </button>
          </li>
        </ul>

        <input
          :id="inputId"
          ref="inputRef"
          v-model="text"
          type="text"
          :role="hasSuggestions ? 'combobox' : undefined"
          :aria-autocomplete="hasSuggestions ? 'list' : undefined"
          :aria-expanded="hasSuggestions ? open : undefined"
          :aria-controls="open ? listId : undefined"
          :aria-activedescendant="open && active >= 0 ? optionId(active) : undefined"
          :autocomplete="hasSuggestions ? 'off' : undefined"
          enterkeyhint="enter"
          :placeholder="modelValue.length ? undefined : placeholder"
          :disabled="disabled"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="describedBy"
          class="h-7 min-w-[8ch] flex-1 bg-transparent px-1 text-control text-text outline-none placeholder:text-text-subtle disabled:cursor-not-allowed"
          @input="onInput"
          @keydown="onKeydown"
          @blur="onBlur"
        />
      </div>

      <Transition
        enter-active-class="transition duration-(--vt-duration-enter) ease-standard"
        enter-from-class="translate-y-1 opacity-0 motion-reduce:translate-y-0"
        leave-active-class="transition duration-(--vt-duration-exit) ease-exit"
        leave-to-class="opacity-0"
      >
        <ul
          v-if="open"
          :id="listId"
          role="listbox"
          :aria-labelledby="label ? labelId : undefined"
          :aria-label="label ? undefined : 'Suggestions'"
          class="scrollbar-thin absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface-raised p-1 shadow-lg"
        >
          <li
            v-for="(option, index) in options"
            :id="optionId(index)"
            :key="option"
            role="option"
            :aria-selected="index === active"
            class="flex min-h-control-md cursor-pointer items-center rounded-md px-3 text-sm text-text transition-colors duration-(--vt-duration)"
            :class="index === active ? 'bg-muted' : 'hover:bg-muted'"
            @pointerdown.prevent
            @pointerenter="active = index"
            @click="pick(option)"
          >
            {{ option }}
          </li>
        </ul>
      </Transition>
    </div>

    <div v-if="description || notice || max" class="flex items-start justify-between gap-3">
      <p v-if="notice" :id="noticeId" class="text-sm text-text-muted">{{ notice }}</p>
      <p v-else-if="description" :id="descriptionId" class="text-sm text-text-muted">{{ description }}</p>
      <span v-else />
      <span v-if="max" :id="countId" class="shrink-0 text-xs tabular-nums text-text-muted">
        {{ modelValue.length }} of {{ max }}<span class="sr-only"> tags</span>
      </span>
    </div>
    <p v-if="error" :id="errorId" class="mt-0.5 flex items-center gap-1.5 text-sm text-danger-text">
      <AppIcon name="icon-[heroicons--exclamation-circle]" :size="1" aria-hidden="true" />
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue';
import AppIcon from '../AppIcon.vue';
import { useAnnouncer } from '@/composables/useAnnouncer';

const props = withDefaults(
  defineProps<{
    /** The tags (v-model). */
    modelValue?: string[];
    label?: string;
    placeholder?: string;
    description?: string;
    error?: string;
    /** Most tags allowed; a counter shows beside the field. */
    max?: number;
    /** Let the same tag appear twice. Compared without case when off. */
    allowDuplicates?: boolean;
    /** Offered in a listbox as the user types (APG Combobox, list autocomplete). */
    suggestions?: string[];
    /** Add what is typed when the field loses focus, so a form submit does not drop it. */
    addOnBlur?: boolean;
    disabled?: boolean;
  }>(),
  { modelValue: () => [], placeholder: '', allowDuplicates: false, addOnBlur: true, disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  add: [tag: string];
  remove: [tag: string];
}>();

const { announce } = useAnnouncer();

const inputId = useId();
const labelId = `${inputId}-label`;
const listId = `${inputId}-listbox`;
const errorId = `${inputId}-error`;
const descriptionId = `${inputId}-description`;
const noticeId = `${inputId}-notice`;
const countId = `${inputId}-count`;
const optionId = (index: number) => `${inputId}-option-${index}`;

const inputRef = ref<HTMLInputElement | null>(null);
const removeButtons: (HTMLButtonElement | null)[] = [];
const text = ref('');
/** Why the last add was refused ("design is already added"). Cleared by the next keystroke. */
const notice = ref('');

const describedBy = computed(
  () =>
    [
      notice.value ? noticeId : props.description ? descriptionId : '',
      props.max ? countId : '',
      props.error ? errorId : '',
    ]
      .filter(Boolean)
      .join(' ') || undefined,
);

const same = (a: string, b: string) => (props.allowDuplicates ? a === b : a.toLocaleLowerCase() === b.toLocaleLowerCase());
const has = (tag: string) => props.modelValue.some((t) => same(t, tag));
const count = (n: number) => `${n} ${n === 1 ? 'tag' : 'tags'}`;

/** Add tags in one update. Returns the ones refused, as duplicates or over the limit, with a notice. */
function add(raw: string[]): string[] {
  const next = [...props.modelValue];
  const added: string[] = [];
  const refused: string[] = [];
  let reason = '';
  for (const tag of raw.map((t) => t.trim()).filter(Boolean)) {
    if (!props.allowDuplicates && next.some((t) => same(t, tag))) {
      reason ||= `${tag} is already added.`;
      refused.push(tag);
    } else if (props.max && next.length >= props.max) {
      reason ||= `You can add up to ${count(props.max)}.`;
      refused.push(tag);
    } else {
      next.push(tag);
      added.push(tag);
    }
  }
  if (added.length) {
    emit('update:modelValue', next);
    added.forEach((tag) => emit('add', tag));
  }
  if (reason) refuse(added.length ? `Added ${added.join(', ')}. ${reason}` : reason);
  else if (added.length) announce(`Added ${added.join(', ')}. ${count(next.length)}.`);
  return refused;
}

function refuse(message: string) {
  notice.value = message;
  announce(message);
}

function removeAt(index: number, fromButton = false) {
  const tag = props.modelValue[index];
  if (tag === undefined || props.disabled) return;
  const next = props.modelValue.filter((_, i) => i !== index);
  emit('update:modelValue', next);
  emit('remove', tag);
  announce(`Removed ${tag}. ${count(next.length)}.`);
  if (fromButton) {
    // The button that had focus is gone: move to the tag that took its place, the one before, or the input.
    nextTick(() => (removeButtons[Math.min(index, next.length - 1)] ?? inputRef.value)?.focus());
  }
}

// Suggestions: the ones that contain the typed text and are not added yet.
const hasSuggestions = computed(() => !!props.suggestions?.length);
const open = ref(false);
const active = ref(-1);
const options = computed(() => {
  const query = text.value.trim().toLocaleLowerCase();
  return (props.suggestions ?? []).filter(
    (s) => (props.allowDuplicates || !has(s)) && (!query || s.toLocaleLowerCase().includes(query)),
  );
});
watch(options, (list) => {
  if (!list.length) open.value = false;
  if (active.value >= list.length) active.value = -1;
});
const close = () => {
  open.value = false;
  active.value = -1;
};

function pick(option: string) {
  if (!add([option]).length) text.value = '';
  close();
  inputRef.value?.focus();
}

function commitText() {
  if (!add([text.value]).length) text.value = '';
}

function onInput() {
  notice.value = '';
  // A comma adds, including pasted "a, b, c": every part before the last comma becomes a tag.
  if (text.value.includes(',')) {
    const parts = text.value.split(',');
    const rest = parts.pop() ?? '';
    text.value = [...add(parts), rest].filter(Boolean).join(', ');
  }
  if (hasSuggestions.value) {
    open.value = !!text.value.trim() && options.value.length > 0;
    active.value = -1;
  }
}

const isRtl = (el: HTMLElement) => getComputedStyle(el).direction === 'rtl';

function onKeydown(event: KeyboardEvent) {
  const input = event.currentTarget as HTMLInputElement;
  // Safari ends the composition before the keydown and marks that key with keyCode 229.
  if (event.isComposing || event.keyCode === 229) return;
  switch (event.key) {
    case 'Enter':
      // Enter never submits the surrounding form from here; it adds the tag or the highlighted option.
      event.preventDefault();
      if (open.value && active.value >= 0) pick(options.value[active.value]);
      else commitText();
      break;
    case 'ArrowDown':
      if (!hasSuggestions.value || !options.value.length) break;
      event.preventDefault();
      if (!open.value) {
        open.value = true;
        active.value = event.altKey ? -1 : 0;
      } else if (!event.altKey) {
        active.value = (active.value + 1) % options.value.length;
      }
      break;
    case 'ArrowUp':
      if (!open.value) break;
      event.preventDefault();
      active.value = active.value <= 0 ? options.value.length - 1 : active.value - 1;
      break;
    case 'Escape':
      // APG combobox: the first Escape closes the list, the next one clears the text.
      if (open.value) {
        event.preventDefault();
        close();
      } else if (text.value) {
        event.preventDefault();
        text.value = '';
        notice.value = '';
      }
      break;
    case 'Backspace':
      if (!text.value && props.modelValue.length) {
        event.preventDefault();
        removeAt(props.modelValue.length - 1);
      }
      break;
    case 'ArrowLeft':
    case 'ArrowRight': {
      // From the start of an empty field, the arrow toward the tags moves onto the last one.
      const towardTags = event.key === (isRtl(input) ? 'ArrowRight' : 'ArrowLeft');
      if (towardTags && !text.value && props.modelValue.length) {
        event.preventDefault();
        removeButtons[props.modelValue.length - 1]?.focus();
      }
      break;
    }
    case 'Tab':
      close();
      break;
  }
}

function onTagKeydown(index: number, event: KeyboardEvent) {
  const rtl = isRtl(event.currentTarget as HTMLElement);
  const step = event.key === 'ArrowLeft' ? (rtl ? 1 : -1) : event.key === 'ArrowRight' ? (rtl ? -1 : 1) : 0;
  if (step) {
    event.preventDefault();
    const target = index + step;
    if (target >= props.modelValue.length) inputRef.value?.focus();
    else removeButtons[Math.max(0, target)]?.focus();
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    removeAt(index, true);
  }
}

function onBlur() {
  close();
  if (props.addOnBlur && text.value.trim()) commitText();
}

// A click on the frame's empty space puts the caret in the input, as a single text field would.
function onFramePointerdown(event: PointerEvent) {
  if (props.disabled) return;
  const target = event.target as HTMLElement;
  if (target.closest('button, input')) return;
  event.preventDefault();
  inputRef.value?.focus();
}

defineExpose({ focus: () => inputRef.value?.focus() });
</script>
