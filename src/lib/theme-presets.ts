// Color-scheme presets for the `data-theme` switcher.
//
// Each entry maps to a `[data-theme="<id>"]` block in `src/app/globals.css`.
// "taupe" is the built-in default and is represented by the absence of the
// `data-theme` attribute (so it has no CSS block of its own).
//
// To add a color scheme you like:
//   1. Add a `[data-theme="<id>"]` (light) and `[data-theme="<id>"].dark`
//      (dark) block to `src/app/globals.css` (copy an existing pair).
//   2. Add an entry below with the same `id`.
export type ColorTheme = {
  id: string;
  label: string;
  /** Accent color shown as a swatch in the selector (light-mode primary). */
  swatch: string;
};

export const COLOR_THEMES: ColorTheme[] = [
  { id: "taupe", label: "Taupe", swatch: "#111111" },
  { id: "ocean", label: "Ocean", swatch: "#0e4d92" },
  { id: "forest", label: "Forest", swatch: "#1c6f4b" },
  { id: "sunset", label: "Sunset", swatch: "#b3541c" },
  { id: "violet", label: "Violet", swatch: "#6d28d9" },
];

export const DEFAULT_COLOR_THEME = "taupe";

export const COLOR_THEME_STORAGE_KEY = "radikal-color-theme";

export function isColorThemeId(value: unknown): value is ColorTheme["id"] {
  return typeof value === "string" && COLOR_THEMES.some((t) => t.id === value);
}
