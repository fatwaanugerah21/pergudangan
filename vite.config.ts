import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    preview: {
      host: true,
      port: Number(env.VITE_PREVIEW_PORT) || 3009,
      allowedHosts: [
        'gudang-konda.ftsdigihouse.com',
        'www.gudang-konda.ftsdigihouse.com',
      ],
    },
  }
})
