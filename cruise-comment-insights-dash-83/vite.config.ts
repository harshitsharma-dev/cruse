import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 80,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize build for better performance and compression
    rollupOptions: {
      output: {
        // More granular code splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-tooltip', 
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible'
          ],
          'query': ['@tanstack/react-query'],
          'icons': ['lucide-react'],
          'utils': ['clsx', 'tailwind-merge'],
        },
        // Optimize chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.\w+$/, '') : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: 'assets/[name]-[hash].[ext]',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    // Enhanced minification and compression
    minify: 'esbuild',
    target: 'es2020',
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Optimize CSS
    cssMinify: true,
    // Report compressed file sizes
    reportCompressedSize: true,
  },
  // Enhanced dependency optimization for faster cold starts
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
    // Force optimization of certain packages
    force: true,
  },
  // Enable compression in preview mode
  preview: {
    port: 80,
    host: "::",
  },
}));
