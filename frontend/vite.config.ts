import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import EnvironmentPlugin from 'vite-plugin-environment';
import mkcert from 'vite-plugin-mkcert';
import path from "path";
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), EnvironmentPlugin('all', {prefix: 'VITE_'})],
	assetsInclude: ['**/*.md'],
	// preview: {
	// 	https: {
	// 		key: fs.readFileSync(path.resolve(__dirname, 'rootCA-key.pem')),
	// 		cert: fs.readFileSync(path.resolve(__dirname, 'rootCA.pem'))
	// 	},
	// 	host: true // necesario para acceder desde navegador de Windows
	// },
	resolve: {
		alias: {
		  '@': path.join(__dirname, 'src'),
		},
	},
});
