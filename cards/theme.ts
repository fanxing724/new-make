// 主题色板

import { ARTS, type Art } from "./art.ts";

export interface Theme {
  bg: string;
  card: string;
  border: string;
  title: string;
  text: string;
  accent: string;
  green: string;
  orange: string;
  red: string;
  purple: string;
  /** 有插画背景时卡片底色变半透明,并铺一层遮罩保文字对比度 */
  art?: Art;
}

export const THEMES: Record<string, Theme> = {
  default: {
    bg: "#0d1117",
    card: "#161b22",
    border: "#30363d",
    title: "#f0f6fc",
    text: "#8b949e",
    accent: "#58a6ff",
    green: "#3fb950",
    orange: "#d29922",
    red: "#f85149",
    purple: "#bc8cff",
  },
  light: {
    bg: "#ffffff",
    card: "#f6f8fa",
    border: "#d0d7de",
    title: "#1f2328",
    text: "#656d76",
    accent: "#0969da",
    green: "#1a7f37",
    orange: "#9a6700",
    red: "#cf222e",
    purple: "#8250df",
  },
  dracula: {
    bg: "#282a36",
    card: "#44475a",
    border: "#6272a4",
    title: "#f8f8f2",
    text: "#bd93f9",
    accent: "#ff79c6",
    green: "#50fa7b",
    orange: "#ffb86c",
    red: "#ff5555",
    purple: "#bd93f9",
  },
  nord: {
    bg: "#2e3440",
    card: "#3b4252",
    border: "#4c566a",
    title: "#eceff4",
    text: "#81a1c1",
    accent: "#88c0d0",
    green: "#a3be8c",
    orange: "#d08770",
    red: "#bf616a",
    purple: "#b48ead",
  },
  monokai: {
    bg: "#272822",
    card: "#383830",
    border: "#49483e",
    title: "#f8f8f2",
    text: "#a6e22e",
    accent: "#f92672",
    green: "#a6e22e",
    orange: "#fd971f",
    red: "#f92672",
    purple: "#ae81ff",
  },
  catppuccin: {
    bg: "#1e1e2e",
    card: "#313244",
    border: "#45475a",
    title: "#cdd6f4",
    text: "#a6adc8",
    accent: "#89b4fa",
    green: "#a6e3a1",
    orange: "#fab387",
    red: "#f38ba8",
    purple: "#cba6f7",
  },
  // 带插画背景的一档。色板取的是画面自身的夜色与青绿,不是随便挑的对比色 ——
  // 遮罩用的就是 bg,所以卡片边缘和插画不会看出两层。
  starlight: {
    bg: "#0b1a33",
    card: "#132743",
    border: "#2b4a72",
    title: "#eaf3ff",
    text: "#a9c2e0",
    accent: "#7ce0e8",
    green: "#8ee6a8",
    orange: "#f0b06a",
    red: "#ff8f9c",
    purple: "#b9a6ff",
    art: ARTS.starlight,
  },
};

export const THEME_NAMES: string[] = Object.keys(THEMES);
export const DEFAULT_THEME = "default";

export function getTheme(name: string | null): Theme {
  if (name !== null && name in THEMES) return THEMES[name];
  return THEMES[DEFAULT_THEME];
}
