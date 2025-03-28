import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss({
      content: [
        './src/**/*.{js,jsx,ts,tsx}',
      ],
      safelist: [
        'text-cyan-400',
        'text-emerald-400',
        'text-indigo-400',
        'text-rose-400',
        'text-teal-400',
        'text-amber-400',
      ],
    }),
  ],
})