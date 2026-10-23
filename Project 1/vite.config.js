import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        allowedHosts: ['alot-sea-redhead-pubs.trycloudflare.com'],
        proxy: {
            '/api': 'http://localhost:3001',
        },
    },
});
