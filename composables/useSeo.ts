import { onBeforeUnmount, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { useSeo as applySeoConfig, clearSeo, type SeoConfig } from '@/utils/seo';

/**
 * Applies page metadata (title, description, Open Graph…) and clears it on unmount.
 *
 * Pass a getter when the metadata depends on data: `useSeo(() => ({ title: post.value?.title }))`
 * re-applies when `post` loads, as well as on every navigation.
 */
export const useSeo = (config: SeoConfig | (() => SeoConfig)) => {
  const route = useRoute();
  const read = () => (typeof config === 'function' ? config() : config);
  const applySeo = () => applySeoConfig(read());

  // Tracks the route and whatever the getter reads, so a title from fetched data updates too.
  watchEffect(() => {
    void route.path;
    applySeo();
  });

  onBeforeUnmount(() => {
    clearSeo();
  });

  return {
    updateSeo: applySeo,
  };
};
