<template>
 <div
 role="radiogroup"
 aria-label="Theme preference"
 class="flex items-center gap-1 rounded-full bg-surface border border-border p-1"
 @keydown="handleKeydown"
 >
 <button
 v-for="(option, index) in options"
 :key="option.value"
 type="button"
 role="radio"
 :aria-checked="mode === option.value"
 :tabindex="mode === option.value ? 0 : -1"
 class="flex size-7 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
 :class="mode === option.value ? 'bg-surface-raised shadow-sm text-text' : 'text-text-muted hover:text-text'"
 @click="setTheme(option.value)"
 :title="option.label"
 :ref="(el) => { if (el) buttonRefs[index] = el as HTMLButtonElement }"
 >
 <AppIcon :name="option.icon" :size="1" />
 <span class="sr-only">{{ option.label }}</span>
 </button>
 </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppIcon from './AppIcon.vue';
import { useTheme } from '@/composables/useTheme';
import { type ThemeMode } from '@/theme';

const { mode, setTheme } = useTheme();

const options: { value: ThemeMode; label: string; icon: string }[] = [
 { value: 'light', label: 'Light theme', icon: 'icon-[solar--sun-linear]' },
 { value: 'system', label: 'System theme', icon: 'icon-[solar--monitor-linear]' },
 { value: 'dark', label: 'Dark theme', icon: 'icon-[solar--moon-linear]' },
];

const buttonRefs = ref<HTMLButtonElement[]>([]);

function handleKeydown(e: KeyboardEvent) {
 const currentIdx = options.findIndex(o => o.value === mode.value);
 if (currentIdx === -1) return;

 let nextIdx = currentIdx;
 if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
 nextIdx = (currentIdx + 1) % options.length;
 e.preventDefault();
 } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
 nextIdx = (currentIdx - 1 + options.length) % options.length;
 e.preventDefault();
 } else {
 return;
 }

 setTheme(options[nextIdx].value);
 buttonRefs.value[nextIdx]?.focus();
}
</script>