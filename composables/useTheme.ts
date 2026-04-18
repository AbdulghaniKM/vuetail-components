import { ref, computed, watch, onMounted } from 'vue';
import {
  applyThemeToDOM,
  getSystemTheme,
  getColorValue,
  type ColorPalette,
} from '@/utils/theme';
import { appConfig } from '@/config/app.config';

type ThemeMode = 'light' | 'dark' | 'system';

// Persisted theme mode — stored as a raw string ('light' | 'dark') so the
// template's initializeConfig() can read it synchronously on first paint
// without parsing JSON. Using useLocalStorage here would JSON-stringify the
// value (writing '"dark"' with quotes), which the pre-boot reader doesn't
// accept and would cause a FOUC flash of the default theme.
const STORAGE_KEY = 'app-theme';
const readStored = (): ThemeMode | null => {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark') return raw;
  // Tolerate legacy JSON-encoded values written by earlier versions.
  if (raw && raw.startsWith('"')) {
    const unquoted = raw.slice(1, -1);
    if (unquoted === 'light' || unquoted === 'dark') return unquoted;
  }
  return null;
};
const writeStored = (value: ThemeMode | null): void => {
  if (typeof localStorage === 'undefined') return;
  if (value === null || value === 'system') {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, value);
  }
};

const resolveTheme = (mode: ThemeMode | null): 'light' | 'dark' => {
  if (mode === 'light' || mode === 'dark') return mode;
  return getSystemTheme();
};

const defaultMode: ThemeMode = readStored() ?? appConfig.theme.defaultTheme ?? 'system';
// NOTE: Module-scope ref() state. SPA-only — not safe under SSR (state leaks across requests).
const currentTheme = ref<'light' | 'dark'>(resolveTheme(defaultMode));
const themeMode = ref<ThemeMode>(defaultMode);

export const useTheme = () => {
  const isDark = computed(() => currentTheme.value === 'dark');
  const isLight = computed(() => currentTheme.value === 'light');
  const mode = computed(() => themeMode.value);

  const toggleTheme = () => {
    const newTheme = currentTheme.value === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const setTheme = (theme: ThemeMode) => {
    themeMode.value = theme;

    if (theme === 'system') {
      currentTheme.value = getSystemTheme();
      writeStored(null);
    } else {
      currentTheme.value = theme;
      writeStored(theme);
    }

    applyThemeToDOM(theme);
  };

  const getColor = (colorKey: keyof ColorPalette): string => {
    return getColorValue(colorKey, currentTheme.value);
  };

  const colors = computed(() => {
    return appConfig.theme[currentTheme.value];
  });

  // Watch for system theme changes
  onMounted(() => {
    // Apply initial theme to DOM
    applyThemeToDOM(themeMode.value);

    if (themeMode.value === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (themeMode.value === 'system') {
          currentTheme.value = e.matches ? 'dark' : 'light';
          applyThemeToDOM('system');
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else {
        mediaQuery.addListener(handleChange);
      }
    }
  });

  watch(
    () => themeMode.value,
    (newMode) => {
      if (newMode === 'system') {
        currentTheme.value = getSystemTheme();
      }
    }
  );

  return {
    theme: currentTheme,
    mode,
    isDark,
    isLight,
    toggleTheme,
    setTheme,
    getColor,
    colors,
  };
};
