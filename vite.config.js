import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// ============================================================================
// AUTOMATIC BRANCH DETECTION: Never manually edit after merging!
// Automatically checks the current Git branch name ('dev' vs 'main').
// ============================================================================
let IS_DEV_BRANCH = false;
try {
  const branchName = execSync('git branch --show-current', { stdio: 'pipe' }).toString().trim();
  IS_DEV_BRANCH = branchName === 'dev' || branchName.includes('dev');
} catch (e) {
  IS_DEV_BRANCH = process.env.PORT === '3001' || process.env.DEV_BRANCH === 'true';
}

const PORT = IS_DEV_BRANCH ? 3001 : 3000;
const API_HOST = IS_DEV_BRANCH ? 'api.meheraz733.com' : 'api.lyfflow.com';
const SITE_HOST = IS_DEV_BRANCH ? 'www.meheraz733.com' : 'www.lyfflow.com';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: PORT,
    allowedHosts: ['lyfflow.com', 'www.lyfflow.com', 'meheraz733.com', 'www.meheraz733.com', 'meharaz733.com', 'www.meharaz733.com'],
    proxy: {
      '/v1': {
        target: `https://${SITE_HOST}`,
        changeOrigin: true,
        secure: false,
        headers: {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': API_HOST
        }
      },
      '/api/auth': {
        target: `https://${API_HOST}`,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/auth/, '/v1/auth'),
        headers: {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': API_HOST
        }
      }
    }
  }
})
