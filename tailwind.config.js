/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      "light",
      "dark",
      {
        cryptocast: {
          "primary": "#7C3AED",
          "secondary": "#0891B2",
          "accent": "#10B981",
          "neutral": "#1E293B",
          "base-100": "#ffffff",
          "base-200": "#f8fafc",
          "base-300": "#e5e7eb",
          "info": "#3B82F6",
          "success": "#10B981",
          "warning": "#F59E0B",
          "error": "#EF4444",
        },
      },
    ],
    darkTheme: "cryptocast",
    base: true,
    styled: true,
    utils: true,
  },
}
