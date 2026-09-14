import {defineConfig} from 'vite';
export default defineConfig({base:'/xiqianhua/',build:{rollupOptions:{output:{manualChunks:id=>id.includes('node_modules/phaser')?'phaser':undefined}},chunkSizeWarningLimit:1600},server:{host:'127.0.0.1'}});
