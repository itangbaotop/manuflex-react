import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// mode 也就是 'development' 或 'production'
export default defineConfig(({ mode }) => {
  // 加载当前目录下的 .env 文件
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          // ✅ 这里从环境变量读取真实后端地址
          target: env.VITE_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        }
      }
    }
  };
});