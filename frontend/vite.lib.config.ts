import path from 'path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        react(),
        dts({
            include: ['src/components/**'],
            outDir: 'dist-lib',
        }),
    ],
    resolve: {
        alias: {
            '@': path.join(__dirname, 'src'),
        },
    },
    build: {
        outDir: 'dist-lib',
        lib: {
            entry: path.resolve(__dirname, 'src/components/index.ts'),
            name: 'SnabbitDS',
            fileName: 'snabbit-ds',
            formats: ['es'],
        },
        rollupOptions: {
            external: [
                'react',
                'react-dom',
                'react/jsx-runtime',
                'react-router-dom',
                'framer-motion',
                'classnames',
                'react-select',
                '@popperjs/core',
                'react-popper',
            ],
        },
    },
});
