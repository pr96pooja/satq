/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tactical: {
          bg: "#090d16",
          card: "#0f172a",
          border: "#1e293b",
          accent: "#00f0ff",
          magenta: "#ff007f",
          green: "#00ff66",
          amber: "#ffb700",
          blue: "#3b82f6"
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}
