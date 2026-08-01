/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  plugins: [],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 20px 60px -32px rgba(15, 23, 42, 0.28)",
      },
      colors: {
        accent: "#5B5BD6",
        "accent-soft": "#EEEEFF",
        canvas: "#F5F5F2",
        charcoal: "#242426",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
    },
  },
};
