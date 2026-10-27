import { defineConfig } from 'vite';
export default defineConfig({esbuild:{jsx:"automatic"},server:{proxy:{'/api':{target:'http://127.0.0.1:3000',changeOrigin:true}}}});