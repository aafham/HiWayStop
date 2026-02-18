/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefbf8',
          100: '#d7f4ec',
          500: '#159570',
          700: '#0f6d53',
          900: '#0b3f32',
        },
      },
      boxShadow: {
        sheet: '0 -10px 30px rgba(0, 0, 0, 0.14)',
      },
    },
  },
  plugins: [],
};
