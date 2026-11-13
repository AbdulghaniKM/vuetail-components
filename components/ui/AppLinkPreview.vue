<template>
  <!-- Loading: the same frame and layout, in skeletons, so nothing jumps when the data lands. -->
  <div
    v-if="loading"
    class="app-link-preview flex w-full overflow-hidden border border-border bg-surface shadow-sm"
    :class="frameClass"
    aria-busy="true"
  >
    <span v-if="layout === 'large'" class="block aspect-[1.91/1] w-full">
      <AppSkeleton variant="rect" width="100%" height="100%" container-class="rounded-none!" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-2.5" :class="bodyClass">
      <AppSkeleton width="70%" />
      <AppSkeleton :lines="2" />
      <span class="flex items-center gap-1.5">
        <AppSkeleton variant="circle" width="1rem" height="1rem" />
        <AppSkeleton width="6rem" />
      </span>
    </span>
    <span v-if="layout === 'compact'" class="block w-24 shrink-0 self-stretch sm:w-36">
      <AppSkeleton variant="rect" width="100%" height="100%" container-class="rounded-none!" />
    </span>
    <span class="sr-only">{{ loadingLabel }}</span>
  </div>

  <a
    v-else
    :href="url"
    class="app-link-preview group flex w-full overflow-hidden border border-border bg-surface text-start shadow-sm transition-colors duration-(--vt-duration) hover:border-border-strong"
    :class="frameClass"
    :target="newTab ? '_blank' : undefined"
    :rel="newTab ? 'noopener noreferrer' : undefined"
    :aria-labelledby="newTab ? `${titleId} ${hintId}` : titleId"
    :aria-describedby="describedBy"
  >
    <span v-if="layout === 'large' && showImage" class="block aspect-[1.91/1] w-full shrink-0 overflow-hidden border-b border-border bg-muted">
      <img :src="image" :alt="imageAlt" class="size-full object-cover" loading="lazy" decoding="async" @error="imageFailed = true" />
    </span>

    <span class="flex min-w-0 flex-1 flex-col gap-1" :class="bodyClass">
      <span :id="titleId" class="font-semibold text-text decoration-1 underline-offset-2 group-hover:underline" :class="layout === 'large' ? 'line-clamp-2 text-base' : 'line-clamp-1 text-sm'">
        {{ displayTitle }}
      </span>
      <span v-if="description" :id="descriptionId" class="text-sm text-text-muted" :class="layout === 'large' ? 'line-clamp-3' : 'line-clamp-2'">
        {{ description }}
      </span>
      <span :id="siteId" class="mt-auto flex min-w-0 items-center gap-1.5 pt-1 text-xs text-text-muted">
        <img
          v-if="favicon && !faviconFailed"
          :src="favicon"
          alt=""
          class="size-4 shrink-0 rounded-sm object-contain"
          loading="lazy"
          decoding="async"
          @error="faviconFailed = true"
        />
        <span v-else class="icon-[heroicons--globe-alt] size-4 shrink-0" aria-hidden="true" />
        <span class="truncate">{{ siteLabel }}</span>
      </span>
    </span>

    <span v-if="layout === 'compact' && showImage" class="block w-24 shrink-0 self-stretch overflow-hidden border-s border-border bg-muted sm:w-36">
      <img :src="image" :alt="imageAlt" class="size-full object-cover" loading="lazy" decoding="async" @error="imageFailed = true" />
    </span>

    <span v-if="newTab" :id="hintId" class="sr-only">{{ newTabLabel }}</span>
  </a>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import AppSkeleton from '@/components/ui/AppSkeleton.vue';

export type LinkPreviewLayout = 'compact' | 'large';

/** The shape your unfurl endpoint (Open Graph, oEmbed) returns. The component never fetches. */
export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

const props = withDefaults(
  defineProps<
    LinkPreviewData & {
      /** `large`: the image on top, as a chat unfurl. `compact`: one row with a thumbnail at the end. */
      layout?: LinkPreviewLayout;
      /** Show skeletons while your app fetches the metadata. */
      loading?: boolean;
      /** Open in a new tab. Adds `rel="noopener noreferrer"` and tells screen readers. */
      newTab?: boolean;
      /** Alt text for the image. Empty by default: the title already names the link. */
      imageAlt?: string;
      /** Read by screen readers after the title when `newTab` is set. */
      newTabLabel?: string;
      /** Read by screen readers while `loading`. */
      loadingLabel?: string;
    }
  >(),
  {
    layout: 'large',
    loading: false,
    newTab: false,
    imageAlt: '',
    newTabLabel: '(opens in a new tab)',
    loadingLabel: 'Loading link preview',
  },
);

const id = useId();
const titleId = `${id}-title`;
const descriptionId = `${id}-description`;
const siteId = `${id}-site`;
const hintId = `${id}-hint`;

const imageFailed = ref(false);
const faviconFailed = ref(false);
watch(
  () => props.image,
  () => (imageFailed.value = false),
);
watch(
  () => props.favicon,
  () => (faviconFailed.value = false),
);

/** "github.com" from "https://www.github.com/vuejs/core", or the raw string when it is not a URL. */
const host = computed(() => {
  try {
    return new URL(props.url).hostname.replace(/^www\./, '');
  } catch {
    return props.url;
  }
});

const displayTitle = computed(() => props.title?.trim() || host.value);
const siteLabel = computed(() => props.siteName?.trim() || host.value);
const showImage = computed(() => !!props.image && !imageFailed.value);
const describedBy = computed(() => [props.description ? descriptionId : '', siteId].filter(Boolean).join(' '));

const frameClass = computed(() => (props.layout === 'large' ? 'max-w-md flex-col rounded-xl' : 'max-w-xl flex-row rounded-lg'));
const bodyClass = computed(() => (props.layout === 'large' ? 'p-4' : 'px-4 py-3'));
</script>
