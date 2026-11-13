<template>
  <fieldset
    class="flex min-w-0 flex-col gap-1.5"
    :disabled="disabled"
  >
    <legend v-if="label" class="mb-1.5 text-control font-medium text-text">{{ label }}</legend>
    <!-- A code reads left to right on any page, so the arrows keep their meaning in a right-to-left layout. -->
    <div dir="ltr" class="flex min-w-0 gap-2" @paste="onPaste">
      <input
        v-for="(cell, index) in cells"
        :key="index"
        :ref="(el) => (boxes[index] = el as HTMLInputElement | null)"
        :value="cell"
        type="text"
        :inputmode="inputmode"
        :autocomplete="index === 0 ? 'one-time-code' : 'off'"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        :name="name ? `${name}-${index + 1}` : undefined"
        :aria-label="`${unit} ${index + 1} of ${length}`"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        class="h-control-lg w-control-lg min-w-0 shrink rounded-md border bg-surface text-center font-mono text-lg tabular-nums text-text transition-colors duration-(--vt-duration) focus-visible:-outline-offset-1 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
        :class="
          error
            ? 'border-danger-text focus-visible:outline-danger-text'
            : 'border-border-strong enabled:hover:border-[color-mix(in_srgb,var(--color-border-strong),var(--color-text)_25%)]'
        "
        @focus="selectBox(index)"
        @click="selectBox(index)"
        @input="onInput(index, $event)"
        @keydown="onKeydown(index, $event)"
      />
    </div>
    <p v-if="description" :id="descriptionId" class="text-sm text-text-muted">{{ description }}</p>
    <p v-if="error" :id="errorId" class="mt-0.5 flex items-center gap-1.5 text-sm text-danger-text">
      <AppIcon name="icon-[heroicons--exclamation-circle]" :size="1" aria-hidden="true" />
      {{ error }}
    </p>
  </fieldset>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue';
import AppIcon from '../AppIcon.vue';

const props = withDefaults(
  defineProps<{
    /** The code typed so far (v-model). */
    modelValue?: string;
    /** Number of boxes. */
    length?: number;
    /** The group's name, shown as the fieldset's legend. */
    label?: string;
    /** Help below the boxes ("We sent a code to …"). */
    description?: string;
    error?: string;
    /** `numeric` takes digits only and opens the number pad; `text` takes letters and digits. */
    inputmode?: 'numeric' | 'text';
    disabled?: boolean;
    /** Native name prefix; each box posts as `<name>-<n>`. */
    name?: string;
  }>(),
  { modelValue: '', length: 6, inputmode: 'numeric', disabled: false },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  /** Every box is filled. */
  complete: [value: string];
}>();

const id = useId();
const errorId = `${id}-error`;
const descriptionId = `${id}-description`;
const describedBy = computed(
  () => [props.description ? descriptionId : '', props.error ? errorId : ''].filter(Boolean).join(' ') || undefined,
);
const unit = computed(() => (props.inputmode === 'numeric' ? 'Digit' : 'Character'));

const boxes: (HTMLInputElement | null)[] = [];
const allowed = (text: string) =>
  [...text].filter((ch) => (props.inputmode === 'numeric' ? /\d/.test(ch) : /[\p{L}\p{N}]/u.test(ch)));

// The boxes are the source of truth: a cleared middle box leaves a hole, which a plain string
// could not hold without shifting every later digit one box to the left.
const cells = ref<string[]>([]);
const fromModel = (value: string) => {
  const chars = allowed(value ?? '').slice(0, props.length);
  cells.value = Array.from({ length: props.length }, (_, i) => chars[i] ?? '');
};
fromModel(props.modelValue);
const joined = () => cells.value.join('');
watch(
  () => [props.modelValue, props.length] as const,
  ([value]) => {
    if (value !== joined() || cells.value.length !== props.length) fromModel(value);
  },
);

const commit = () => {
  const value = joined();
  emit('update:modelValue', value);
  if (cells.value.every(Boolean)) emit('complete', value);
};

const focusBox = (index: number) => {
  const box = boxes[Math.max(0, Math.min(props.length - 1, index))];
  box?.focus();
  box?.select();
};
// Selecting the box's content means the next key replaces it instead of being appended.
const selectBox = (index: number) => boxes[index]?.select();

/** Write `chars` from box `start` on, then move to the box after the last one written. */
const spread = (chars: string[], start: number) => {
  const from = chars.length >= props.length ? 0 : start;
  const next = [...cells.value];
  chars.slice(0, props.length - from).forEach((ch, i) => (next[from + i] = ch));
  cells.value = next;
  commit();
  nextTick(() => focusBox(Math.min(from + chars.length, props.length - 1)));
};

function onInput(index: number, event: Event) {
  const box = event.target as HTMLInputElement;
  const old = cells.value[index];
  const chars = allowed(box.value);
  if (chars.length > 1 && !(chars.length === 2 && old && chars.includes(old))) {
    // Autofill (`one-time-code`) and some keyboards put the whole code into one box.
    spread(chars, index);
    return;
  }
  // Two characters: the old one plus the one just typed beside it, when the caret was not selecting.
  const typed = chars.length === 2 ? (chars[0] === old ? chars[1] : chars[0]) : (chars[0] ?? '');
  const next = [...cells.value];
  next[index] = typed;
  cells.value = next;
  // Vue skips writing a bound value that did not change, so a rejected letter would stay in the box.
  box.value = typed;
  commit();
  if (typed && index < props.length - 1) focusBox(index + 1);
}

function onPaste(event: ClipboardEvent) {
  const target = event.target as HTMLInputElement;
  const index = boxes.indexOf(target);
  event.preventDefault();
  const chars = allowed(event.clipboardData?.getData('text') ?? '');
  if (chars.length) spread(chars, Math.max(index, 0));
}

const clear = (index: number) => {
  const next = [...cells.value];
  next[index] = '';
  cells.value = next;
  commit();
};

function onKeydown(index: number, event: KeyboardEvent) {
  switch (event.key) {
    case 'Backspace':
      // A filled box clears itself; an empty one clears the box before it and moves there.
      event.preventDefault();
      if (cells.value[index]) clear(index);
      else if (index > 0) {
        clear(index - 1);
        focusBox(index - 1);
      }
      break;
    case 'Delete':
      event.preventDefault();
      if (cells.value[index]) clear(index);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      focusBox(index - 1);
      break;
    case 'ArrowRight':
      event.preventDefault();
      focusBox(index + 1);
      break;
    case 'Home':
      event.preventDefault();
      focusBox(0);
      break;
    case 'End':
      event.preventDefault();
      focusBox(props.length - 1);
      break;
    default:
      // The same character again: the input event would see no change, so move on by hand.
      if (event.key.length === 1 && event.key === cells.value[index] && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        if (index < props.length - 1) focusBox(index + 1);
      }
  }
}

defineExpose({ focus: () => focusBox(Math.min(joined().length, props.length - 1)) });
</script>
