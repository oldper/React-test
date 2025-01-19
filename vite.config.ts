import { reactRouter } from '@react-router/dev/vite';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
    // Load environment variables based on the mode (e.g. development, production)
    const env = loadEnv(mode, process.cwd(), '');

    return {
        server: {
            host: '127.0.0.1',
            port: Number(env.PORT) || 3000,
            strictPort: true
        },
        define: {
            'process.env': env
        },
        css: {
            postcss: {
                plugins: [tailwindcss, autoprefixer]
            }
        },
        plugins: [reactRouter(), tsconfigPaths()]
    }
});
