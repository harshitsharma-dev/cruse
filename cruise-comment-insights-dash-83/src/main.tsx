import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Hide initial loader when React app loads
const hideInitialLoader = () => {
  const loader = document.querySelector('.initial-loader');
  if (loader) {
    loader.classList.add('hidden');
  }
};

// Register service worker for caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Hide the initial loader after React has loaded
setTimeout(hideInitialLoader, 100);
