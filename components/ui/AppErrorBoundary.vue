<template>
  <div v-if="hasError" class="p-8 text-center">
    <div class="max-w-md mx-auto">
      <AppIcon name="icon-[mdi--alert-circle]" size="xl" class="text-error mb-4 mx-auto" />
      <h2 class="text-2xl font-bold text-text mb-2">Something went wrong</h2>
      <p class="text-text-secondary mb-4">{{ errorMessage }}</p>
      <div class="flex gap-2 justify-center">
        <button
          @click="handleReset"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
        <button
          v-if="showDetails"
          @click="showDetails = false"
          class="px-4 py-2 border border-border rounded-lg text-text hover:bg-muted transition-colors"
        >
          Hide Details
        </button>
        <button
          v-else
          @click="showDetails = true"
          class="px-4 py-2 border border-border rounded-lg text-text hover:bg-muted transition-colors"
        >
          Show Details
        </button>
      </div>
      <div v-if="showDetails && error" class="mt-4 p-4 bg-muted rounded-lg text-left">
        <pre class="text-xs text-text-secondary whitespace-pre-wrap break-words">{{ error.stack || error.message }}</pre>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import AppIcon from './AppIcon.vue';

interface Props {
  fallback?: string;
  onError?: (error: Error) => void;
}

const props = withDefaults(defineProps<Props>(), {
  fallback: 'An unexpected error occurred',
});

const hasError = ref(false);
const error = ref<Error | null>(null);
const errorMessage = ref(props.fallback);
const showDetails = ref(false);

const handleReset = () => {
  hasError.value = false;
  error.value = null;
  errorMessage.value = props.fallback;
  showDetails.value = false;
};

onErrorCaptured((err: Error) => {
  hasError.value = true;
  error.value = err;
  errorMessage.value = err.message || props.fallback;

  if (props.onError) {
    props.onError(err);
  }

  return false;
});
</script>
