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
  },  build: {
    // Optimize build for better performance and compression
    rollupOptions: {      output: {        // Let Vite handle automatic chunking for optimal results
        // manualChunks is disabled to prevent empty chunks
        // Optimize chunk naming for better compression and caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? 
            chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.\w+$/, '') : 'chunk';
          return `assets/js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash].[ext]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash].[ext]`;
          }
          return `assets/[ext]/[name]-[hash].[ext]`;
        },
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
      // Enable tree shaking for better compression
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
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
    reportCompressedSize: true,    // Optimize asset inlining
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    
    // Prevent problematic modulepreload generation
    modulePreload: false,
  },// Enhanced dependency optimization for faster cold starts and better compression
  optimizeDeps: {
    // Pre-bundle these dependencies for faster loading
    include: [
      // Core React
      'react',
      'react-dom',
      'react-router-dom',
      
      // Data fetching
      '@tanstack/react-query',
      
      // UI Libraries - most commonly used
      '@radix-ui/react-dialog',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-select',
      '@radix-ui/react-slider',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      
      // Icons and utilities
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      
      // Forms
      'react-hook-form',
      'zod',
    ],
    // Exclude large libraries from pre-bundling to allow for better chunking
    exclude: [
      // Large icon libraries - let them be chunked separately
      'lucide-react/icons',
      
      // Development only
      'lovable-tagger',
    ],
    // Force optimization of certain packages for better compression
    force: true,
    
    // Enable esbuild optimization
    esbuildOptions: {
      target: 'es2020',
      format: 'esm',
      // Enable tree shaking
      treeShaking: true,
      // Minify identifiers for smaller bundle
      minifyIdentifiers: true,
      // Minify syntax
      minifySyntax: true,
      // Minify whitespace
      minifyWhitespace: true,
    },
  },
  // Enable compression in preview mode
  preview: {
    port: 80,
    host: "::",
  },
}));
