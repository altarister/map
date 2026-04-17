import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        // SPA 히스토리 폴백: /inseong 등 직접 접근 시 index.html로 리디렉트
        historyApiFallback: true,
    },
})
