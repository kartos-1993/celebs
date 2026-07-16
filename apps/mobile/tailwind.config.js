/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        charcoal: '#121212',
        onyx: '#1C1C1C',
        primary: '#F5F5F5',
      },
      fontFamily: {
        display: ['Inter', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
