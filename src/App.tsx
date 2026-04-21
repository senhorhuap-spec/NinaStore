import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Store, Loader2, ExternalLink } from 'lucide-react';
import { pb } from './lib/pocketbase';
import { ProductsView } from './components/ProductsView';
import { CategoriesView } from './components/CategoriesView';
import { LoginView } from './components/LoginView';
import { DatabaseSetup } from './components/DatabaseSetup';
import { DashboardLayout } from './components/DashboardLayout';
import { StoreSettingsView } from './components/StoreSettingsView';
import { ClientsView } from './components/ClientsView';

import { ContextualHelp } from './components/ContextualHelp';

function PlaceholderView({ title, description, icon: Icon, help }: { title: string, description: string, icon: any, help: string }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
            <ContextualHelp 
              title={`Dica: ${title}`}
              description={help} 
              position="right"
            />
          </div>
          <p className="text-sm text-slate-500 font-medium">Você está visualizando a seção de {title.toLowerCase()}.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[32px] border border-slate-100 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center mb-6">
          <Icon size={32} className="text-slate-300" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
        <p className="text-slate-500 font-medium max-w-md mt-2">{description}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid);
  const [needsSetup, setNeedsSetup] = useState(() => {
    return new URLSearchParams(window.location.search).get('setup') === '1';
  });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('setup') === '1') {
      setIsChecking(false);
    } else {
      checkSystemStatus();
    }
  }, []);

  const checkSystemStatus = async () => {
    setIsChecking(true);
    try {
      // Verifica se as coleções principais existem
      await pb.collection('products').getList(1, 1);
      await pb.collection('customers').getList(1, 1);
      setNeedsSetup(false);
    } catch (err: any) {
      if (err.isAbort) return; 
      // Se qualquer uma der 404, precisamos rodar a migração
      if (err.status === 404) {
        setNeedsSetup(true);
      }
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FDFDFD] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">NinaStore Loading...</p>
      </div>
    );
  }

  if (needsSetup) {
    return <DatabaseSetup onComplete={() => setNeedsSetup(false)} />;
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/produtos" replace />} />
      
      <Route path="/app" element={<DashboardLayout />}>
        <Route path="dashboard" element={
          <PlaceholderView 
            title="Visão Geral (Em Breve)" 
            description="Os gráficos de vendas e acessos ficarão nesta página dedicada." 
            icon={LayoutDashboard} 
            help="Aqui você terá uma visão unificada do desempenho da sua loja."
          />
        } />
        <Route path="produtos" element={<ProductsView />} />
        <Route path="categorias" element={<CategoriesView />} />
        <Route path="vendas" element={
          <PlaceholderView 
            title="Vendas e Transações" 
            description="A lista de pedidos será exibida aqui em página dedicada." 
            icon={ShoppingCart} 
            help="Acompanhe todas as transações, boletos, pix e pedidos."
          />
        } />
        <Route path="clientes" element={<ClientsView />} />
        <Route path="minha-loja" element={<StoreSettingsView />} />
        <Route path="assinatura" element={
          <PlaceholderView 
            title="Assinatura" 
            description="Configurações do plano da plataforma." 
            icon={ExternalLink} 
            help="Sua central de faturamento e expansão de recursos."
          />
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/app/produtos" replace />} />
    </Routes>
  );
}
