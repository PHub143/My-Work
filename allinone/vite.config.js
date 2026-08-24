import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Render sets RENDER=true automatically during builds; use root base there
// so asset URLs resolve at the static site's own domain. GitHub Pages keeps
// the subpath base since it's served from https://<user>.github.io/My-Work/allinone/.
export default defineConfig({
  base: process.env.RENDER ? '/' : '/My-Work/allinone/',
  plugins: [react()],
})
