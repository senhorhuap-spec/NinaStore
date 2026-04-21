import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { PublicStoreView } from './components/PublicStoreView.tsx';
import { ClientAreaView } from './components/ClientAreaView.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* App contains its own <Routes> for /app/* */}
        <Route path="/*" element={<App />} />
        <Route path="/s/:slug" element={<PublicStoreView />} />
        <Route path="/s/:slug/cliente" element={<ClientAreaView />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
