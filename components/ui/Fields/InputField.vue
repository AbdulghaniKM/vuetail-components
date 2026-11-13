<template>
 <div class="flex flex-col gap-1.5 w-full">
 <label v-if="label" :for="fieldId" class="text-control font-medium text-text">
 {{ label }}
 </label>
 <div class="relative w-full">
 <input
 :id="fieldId"
 :type="type === 'password' ? (showPassword ? 'text' : 'password') : type"
 :value="type === 'datetime-local' && modelValue ? datetimeLocalValue : modelValue"
 :placeholder="placeholder"
 :readonly="readonly"
 :disabled="readonly"
 :aria-invalid="error ? 'true' : undefined"
 :aria-describedby="describedBy"
 @input="handleInput"
 class="h-control-md w-full rounded-md border border-border-strong bg-surface text-control text-text placeholder:text-text-subtle transition-colors duration-(--vt-duration) hover:border-[color-mix(in_srgb,var(--color-border-strong),var(--color-text)_25%)] focus-visible:-outline-offset-1 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
 :class="[customClass, type === 'password' ? 'ps-3 pe-10' : 'px-3', { 'border-danger-text focus-visible:outline-danger-text': error }]"
 />
 <button
 v-if="type === 'password'"
 type="button"
 tabindex="-1"
 :aria-label="showPassword ? 'Hide password' : 'Show password'"
 :aria-pressed="showPassword"
 class="absolute end-0 top-1/2 -translate-y-1/2 flex items-center justify-center px-3 text-text-muted hover:text-text transition-colors"
 @click="showPassword = !showPassword"
 >
 <AppIcon
 :name="showPassword ? 'icon-[heroicons--eye-slash]' : 'icon-[heroicons--eye]'"
 :size="1.125"
 aria-hidden="true"
 />
 </button>
 </div>
 <div v-if="strengthOn" class="flex flex-col gap-2 pt-0.5">
 <div class="flex items-center gap-3">
 <!-- A meter, not a progressbar: strength is a level on a fixed scale, not a task moving toward done. -->
 <div
 role="meter"
 aria-label="Password strength"
 aria-valuemin="0"
 :aria-valuemax="STRENGTH_LABELS.length - 1"
 :aria-valuenow="strength.score"
 :aria-valuetext="strengthText"
 class="grid flex-1 grid-cols-4 gap-1"
 >
 <span
 v-for="segment in STRENGTH_LABELS.length - 1"
 :key="segment"
 class="h-1.5 rounded-full transition-colors duration-(--vt-duration)"
 :class="modelValue && segment <= Math.max(strength.score, 1) ? STRENGTH_TONE[strength.score] : 'bg-border'"
 />
 </div>
 <span aria-hidden="true" class="shrink-0 text-xs text-text-muted">
 Strength: <span class="font-medium text-text">{{ modelValue ? strength.label : 'none yet' }}</span>
 </span>
 </div>
 <ul :id="rulesId" class="flex flex-col gap-1">
 <li
 v-for="(rule, index) in strengthRules"
 :key="rule.label"
 class="flex items-center gap-1.5 text-sm"
 :class="strength.met[index] ? 'text-text' : 'text-text-muted'"
 >
 <AppIcon
 :name="strength.met[index] ? 'icon-[heroicons--check-circle]' : 'icon-[heroicons--x-circle]'"
 :size="1"
 aria-hidden="true"
 class="shrink-0"
 :class="strength.met[index] ? 'text-success-text' : 'text-text-subtle'"
 />
 <span class="sr-only">{{ strength.met[index] ? 'Done:' : 'Not yet:' }}</span>
 {{ rule.label }}
 </li>
 </ul>
 </div>
 <span
 :id="errorId"
 role="alert"
 class="block min-h-[1.25rem] text-xs text-danger-text"
 :class="{ invisible: !error }"
 >{{ error }}</span>
 </div>
</template>

<script lang="ts">
/** One line of the password rules list. */
export interface PasswordRule {
 label: string;
 test: (value: string) => boolean;
}

export interface PasswordStrengthOptions {
 /** Replaces the default rules. */
 rules?: PasswordRule[];
}

export interface PasswordStrength {
 /** 0 (very weak) to 4 (strong). */
 score: 0 | 1 | 2 | 3 | 4;
 label: string;
 /** Whether each rule holds, in the order of the rules. */
 met: boolean[];
}

export const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

export const DEFAULT_PASSWORD_RULES: PasswordRule[] = [
 { label: 'At least 8 characters', test: (v) => [...v].length >= 8 },
 { label: 'A lowercase letter', test: (v) => /\p{Ll}/u.test(v) },
 { label: 'An uppercase letter', test: (v) => /\p{Lu}/u.test(v) },
 { label: 'A number', test: (v) => /\p{N}/u.test(v) },
 { label: 'A symbol', test: (v) => /[^\p{L}\p{N}]/u.test(v) },
];

// The passwords every cracking list tries first. Each one found counts as a single guess.
const COMMON = [
 'password', 'passw0rd', 'qwertyuiop', 'qwerty', 'asdfgh', 'zxcvbn', '123456789', '12345678', '123456', '654321', '111111',
 '000000', 'abc123', 'letmein', 'welcome', 'admin', 'iloveyou', 'monkey', 'dragon', 'football', 'baseball', 'sunshine',
 'princess', 'master', 'login', 'starwars', 'trustno1', 'superman', 'freedom', 'whatever', 'shadow', 'hello',
];

/**
 * A rough guess count in bits: length × log2(the character pool), where a repeated or sequential
 * character ("aaa", "abc", "321") counts a quarter and a common password counts as one word.
 * Pure and dependency-free; it is a nudge, not a cracking model like zxcvbn.
 */
export function passwordBits(value: string): number {
 if (!value) return 0;
 let rest = value.toLocaleLowerCase();
 let bits = 0;
 for (const word of COMMON) {
 while (rest.includes(word)) {
 rest = rest.replace(word, ' ');
 bits += 10;
 }
 }
 const pool =
 (/\p{Ll}/u.test(value) ? 26 : 0) +
 (/\p{Lu}/u.test(value) ? 26 : 0) +
 (/\p{N}/u.test(value) ? 10 : 0) +
 (/[^\p{L}\p{N}]/u.test(value) ? 33 : 0) +
 (/[^\x00-\x7F]/.test(value) ? 100 : 0);
 let length = 0;
 let prev: number | undefined;
 for (const ch of rest) {
 if (ch === ' ') {
 prev = undefined;
 continue;
 }
 const code = ch.codePointAt(0)!;
 length += prev !== undefined && Math.abs(code - prev) <= 1 ? 0.25 : 1;
 prev = code;
 }
 return bits + length * Math.log2(Math.max(pool, 2));
}

/** Score a password against the rules. Until every rule holds, the score stops at Fair. */
export function scorePassword(value: string, rules: PasswordRule[] = DEFAULT_PASSWORD_RULES): PasswordStrength {
 const met = rules.map((rule) => rule.test(value));
 const bits = passwordBits(value);
 let score = (bits < 28 ? 0 : bits < 36 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4) as PasswordStrength['score'];
 if (met.includes(false) && score > 2) score = 2;
 return { score, label: STRENGTH_LABELS[score], met };
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import AppIcon from '../AppIcon.vue';
import { useAnnouncer } from '@/composables/useAnnouncer';

interface Props {
 modelValue: string | number;
 label?: string;
 type?: 'text' | 'password' | 'email' | 'number' | 'datetime-local';
 placeholder?: string;
 readonly?: boolean;
 error?: string;
 customClass?: string;
 /** Password only: a strength meter and the rules as a checklist under the field. */
 strength?: boolean | PasswordStrengthOptions;
}

const props = withDefaults(defineProps<Props>(), {
 type: 'text',
 placeholder: '',
 readonly: false,
});

const emit = defineEmits<{
 'update:modelValue': [value: string | number];
}>();

// Use Vue 3.5 useId for SSR-stable, hydration-safe IDs.
const fieldId = useId();
const errorId = `${fieldId}-error`;
const showPassword = ref(false);

// Password strength. Colour backs up the words; it never carries the level alone.
const STRENGTH_TONE = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success'];
const rulesId = `${fieldId}-rules`;
const strengthOn = computed(() => props.type === 'password' && !!props.strength);
const strengthRules = computed(() =>
 typeof props.strength === 'object' && props.strength.rules ? props.strength.rules : DEFAULT_PASSWORD_RULES,
);
const strength = computed(() => scorePassword(String(props.modelValue ?? ''), strengthRules.value));
const strengthText = computed(() => {
 if (!props.modelValue) return 'No password yet';
 const met = strength.value.met.filter(Boolean).length;
 return `${strength.value.label}, ${met} of ${strength.value.met.length} rules met`;
});
const describedBy = computed(
 () => [strengthOn.value ? rulesId : '', props.error ? errorId : ''].filter(Boolean).join(' ') || undefined,
);

// Say the new level once typing pauses, and only when it changed: per keystroke would talk over the typing echo.
const { announce } = useAnnouncer();
let spoken = -1;
let pause: ReturnType<typeof setTimeout> | undefined;
watch(strength, () => {
 if (!strengthOn.value) return;
 clearTimeout(pause);
 pause = setTimeout(() => {
 if (!props.modelValue || strength.value.score === spoken) return;
 spoken = strength.value.score;
 announce(`Password strength: ${strengthText.value}.`);
 }, 1000);
});
onBeforeUnmount(() => clearTimeout(pause));

const pad = (n: number) => String(n).padStart(2, '0');
const datetimeLocalValue = computed(() => {
 if (props.type !== 'datetime-local' || !props.modelValue) return '';
 const d = new Date(String(props.modelValue));
 return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
});

const handleInput = (event: Event) => {
 const target = event.target as HTMLInputElement;
 if (props.type === 'number') {
 emit('update:modelValue', Number(target.value));
 } else if (props.type === 'datetime-local') {
 const val = target.value;
 emit('update:modelValue', val ? new Date(val).toISOString() : '');
 } else {
 emit('update:modelValue', target.value);
 }
};
</script>
