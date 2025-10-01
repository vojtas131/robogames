import { createContext } from "react";

export const themes = {
  dark: "dark-content",
  light: "white-content",
};

const savedTheme = localStorage.getItem("theme") || themes.light;

export const ThemeContext = createContext({
  theme: savedTheme,
  changeTheme: () => {},
});
