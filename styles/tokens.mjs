// VueTail design tokens: the single source for styles/tokens.css.
//
// Font stacks name the Fontsource variable family first ("<Name> Variable"), then the plain
// family Google Fonts serves, so either way of loading the face works.
//
// Edit values here, then run `node scripts/tokens.mjs build`. `node scripts/tokens.mjs check`
// fails when the CSS is stale, when a preset is missing a token Ink defines, or when a
// foreground and background pair drops below WCAG AA. DESIGN.md explains every choice.

/** Semantic status colours. Shared by every preset; separate from the accent on purpose. */
export const status = {
  light: {
    success: '#1E7F47', 'success-fg': '#FFFFFF', 'success-text': '#17703E', 'success-subtle': '#E2F3E7',
    warning: '#E0A21B', 'warning-fg': '#231800', 'warning-text': '#8A5700', 'warning-subtle': '#FBF0D6',
    danger: '#C4321F', 'danger-hover': '#A82A19', 'danger-fg': '#FFFFFF', 'danger-text': '#B42318', 'danger-subtle': '#FCE8E5',
    info: '#2468B8', 'info-fg': '#FFFFFF', 'info-text': '#1C5CA6', 'info-subtle': '#E3EDF9',
  },
  dark: {
    'success-text': '#5FCF8E', 'success-subtle': 'rgb(95 207 142 / .14)',
    'warning-text': '#F2BC4B', 'warning-subtle': 'rgb(242 188 75 / .14)',
    'danger-text': '#FF8B7B', 'danger-subtle': 'rgb(255 139 123 / .14)',
    'info-text': '#7DB2F2', 'info-subtle': 'rgb(125 178 242 / .14)',
  },
};

/**
 * Presets. Ink is the default and must define everything; Pine and Console are switched with
 * `<html data-vt-preset="…">` and may only override tokens Ink already has.
 */
export const presets = {
  ink: {
    fonts: {
      sans: '"Schibsted Grotesk Variable", "Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif',
      display: '"Schibsted Grotesk Variable", "Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif',
      mono: '"Spline Sans Mono Variable", "Spline Sans Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
    },
    radius: { sm: '2px', md: '3px', lg: '4px', xl: '6px', '2xl': '8px', badge: '2px', switch: '3px' },
    density: { 'control-sm': '32px', 'control-md': '40px', 'control-lg': '48px', 'control-pad': '16px', 'text-control': '0.875rem' },
    motion: { duration: '160ms', 'duration-enter': '200ms', 'duration-exit': '130ms', 'press-y': '1px', 'press-scale': '1' },
    light: {
      colors: {
        bg: '#EDEFF2', surface: '#F6F7F9', 'surface-raised': '#F9FAFB', muted: '#E3E6EB', overlay: 'rgb(12 16 20 / .42)',
        border: '#D6DAE0', 'border-strong': '#848992',
        text: '#0E1014', 'text-muted': '#464B56', 'text-subtle': '#6A707C',
        accent: '#0E1014', 'accent-hover': '#2C3038', 'accent-fg': '#F6F7F9', 'accent-subtle': '#DFE4FA', 'accent-text': '#2440D2',
        ring: '#2440D2',
      },
      shadows: {
        1: '0 0 #0000',
        2: '0 8px 24px rgb(14 16 20 / .10)',
        3: '0 24px 64px rgb(14 16 20 / .18)',
      },
    },
    dark: {
      colors: {
        bg: '#0C0D10', surface: '#121418', 'surface-raised': '#16181D', muted: '#1A1D22', overlay: 'rgb(0 0 0 / .6)',
        border: '#262A31', 'border-strong': '#5D636D',
        text: '#F2F3F5', 'text-muted': '#A6ACB8', 'text-subtle': '#7A8190',
        accent: '#F2F3F5', 'accent-hover': '#D5D8DE', 'accent-fg': '#0C0D10', 'accent-subtle': '#1A2042', 'accent-text': '#8C9DFF',
        ring: '#8C9DFF',
      },
      shadows: {
        1: '0 0 #0000',
        2: '0 8px 24px rgb(0 0 0 / .5)',
        3: '0 24px 64px rgb(0 0 0 / .6)',
      },
    },
  },

  pine: {
    fonts: {
      sans: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
      display: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
      mono: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
    },
    radius: { sm: '6px', md: '8px', lg: '10px', xl: '14px', '2xl': '18px', badge: '9999px', switch: '9999px' },
    motion: { 'duration-enter': '220ms', 'duration-exit': '140ms', 'press-y': '0px', 'press-scale': '.98' },
    light: {
      colors: {
        bg: '#F5F7F6', surface: '#FFFFFF', 'surface-raised': '#FFFFFF', muted: '#ECF0EE', overlay: 'rgb(12 20 16 / .42)',
        border: '#DCE3E0', 'border-strong': '#86918C',
        text: '#14201C', 'text-muted': '#4E5D57', 'text-subtle': '#75837D',
        accent: '#1F6E5A', 'accent-hover': '#185A4A', 'accent-fg': '#FFFFFF', 'accent-subtle': '#E1F0EA', 'accent-text': '#1A6553',
        ring: '#2F8F75',
      },
      shadows: {
        1: '0 1px 2px rgb(20 32 28 / .05), 0 2px 6px rgb(20 32 28 / .05)',
        2: '0 2px 4px rgb(20 32 28 / .05), 0 10px 24px rgb(20 32 28 / .09)',
        3: '0 4px 10px rgb(20 32 28 / .06), 0 24px 56px rgb(20 32 28 / .16)',
      },
    },
    dark: {
      colors: {
        bg: '#0F1513', surface: '#151D1A', 'surface-raised': '#1A2420', muted: '#1D2723', overlay: 'rgb(0 0 0 / .6)',
        border: '#26322D', 'border-strong': '#5D6964',
        text: '#E8EFEC', 'text-muted': '#A3B2AC', 'text-subtle': '#7A8983',
        accent: '#4FBF98', 'accent-hover': '#6BD0AD', 'accent-fg': '#06140F', 'accent-subtle': '#17302A', 'accent-text': '#6FD3AE',
        ring: '#6FD3AE',
      },
      shadows: {
        1: '0 1px 2px rgb(0 0 0 / .3)',
        2: '0 10px 24px rgb(0 0 0 / .4)',
        3: '0 24px 56px rgb(0 0 0 / .55)',
      },
    },
  },

  console: {
    fonts: {
      sans: '"IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      display: '"IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
      mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
    },
    radius: { sm: '3px', md: '4px', lg: '5px', xl: '8px', '2xl': '10px', badge: '3px', switch: '9999px' },
    density: { 'control-sm': '26px', 'control-md': '32px', 'control-lg': '38px', 'control-pad': '12px', 'text-control': '0.8125rem' },
    motion: { duration: '110ms', 'duration-enter': '140ms', 'duration-exit': '90ms', 'press-y': '0px', 'press-scale': '.98' },
    light: {
      colors: {
        bg: '#F4F5F8', surface: '#FFFFFF', 'surface-raised': '#FFFFFF', muted: '#ECEEF3', overlay: 'rgb(12 16 24 / .42)',
        border: '#E0E3EA', 'border-strong': '#888D98',
        text: '#161A22', 'text-muted': '#4B5363', 'text-subtle': '#737C8D',
        accent: '#2A62E0', 'accent-hover': '#1F51C2', 'accent-fg': '#FFFFFF', 'accent-subtle': '#E6EDFD', 'accent-text': '#2456C9',
        ring: '#2A62E0',
      },
      shadows: {
        1: '0 1px 2px rgb(22 26 34 / .05)',
        2: '0 6px 16px rgb(22 26 34 / .10)',
        3: '0 16px 40px rgb(22 26 34 / .18)',
      },
    },
    dark: {
      colors: {
        bg: '#0F1218', surface: '#151922', 'surface-raised': '#1A1F29', muted: '#1D222D', overlay: 'rgb(0 0 0 / .6)',
        border: '#262C38', 'border-strong': '#5E6574',
        text: '#E6E9EF', 'text-muted': '#A0A8B8', 'text-subtle': '#778196',
        accent: '#5B8CFF', 'accent-hover': '#7AA2FF', 'accent-fg': '#08101F', 'accent-subtle': '#18233F', 'accent-text': '#86A8FF',
        ring: '#86A8FF',
      },
      shadows: {
        1: '0 1px 2px rgb(0 0 0 / .3)',
        2: '0 6px 16px rgb(0 0 0 / .4)',
        3: '0 16px 40px rgb(0 0 0 / .55)',
      },
    },
  },
};

/** Motion curves. Not preset-specific. */
export const easing = {
  standard: 'cubic-bezier(.2, 0, 0, 1)',
  // Exits use the same ease-out curve as entrances, only shorter (--vt-duration-exit).
  exit: 'cubic-bezier(.2, 0, 0, 1)',
};

/**
 * Under `prefers-reduced-motion: reduce`, in every preset: no press movement, and durations
 * shortened rather than zeroed, so a fade still reads as a change and not as a flash.
 * Components drop their movement (rise, scale, slide) themselves and keep the fade.
 */
export const reducedMotion = {
  duration: '80ms',
  'duration-enter': '100ms',
  'duration-exit': '70ms',
  'press-y': '0px',
  'press-scale': '1',
};
