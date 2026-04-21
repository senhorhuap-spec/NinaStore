import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Store, CreditCard, 
  Bell, Menu, X, LogOut, PlusCircle, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { pb } from '../lib/pocketbase';
import { ProductModal } from './ProductModal';
import { ContextualHelp } from './ContextualHelp';

export function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        setScrolled(mainContent.scrollTop > 20);
      }
    };
    const mainContent = document.getElementById('main-content');
    mainContent?.addEventListener('scroll', handleScroll);
    return () => mainContent?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    // Refresh page to trigger login view
    window.location.href = '/';
  };

  const menuItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Produtos', path: '/app/produtos', icon: Package },
    { name: 'Categorias', path: '/app/categorias', icon: Menu },
    { name: 'Vendas', path: '/app/vendas', icon: ShoppingCart },
    { name: 'Clientes', path: '/app/clientes', icon: Users },
  ];

  const settingItems = [
    { name: 'Minha Loja', path: '/app/minha-loja', icon: Store },
    { name: 'Assinatura', path: '/app/assinatura', icon: CreditCard },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
            N
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">NinaStore</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3">Menu Principal</div>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-left group",
              isActive 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={cn("transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600")} />
                {item.name}
              </>
            )}
          </NavLink>
        ))}

        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mt-10 mb-3">Configurações</div>
        {settingItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-left group",
              isActive 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={cn("transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600")} />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto space-y-4">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all font-medium group"
        >
          <LogOut size={18} className="text-slate-400 group-hover:text-red-500 transition-colors" />
          Sair da Conta
        </button>
        <div className="p-2 flex items-center gap-3 border-t border-slate-50 pt-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-extra-bold border border-white shadow-sm ring-2 ring-indigo-50">
            {pb.authStore.model?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{pb.authStore.model?.name || 'Vendedor'}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase truncate tracking-tight">{pb.authStore.model?.email}</p>
          </div>
        </div>
      </div>
    </>
  );

  let title = "NinaStore";
  let helpDesc = "Bem-vindo(a) à plataforma!";
  if (location.pathname.includes('produtos')) { title = "Produtos"; helpDesc = "Visão geral de produtos."; }
  else if (location.pathname.includes('categorias')) { title = "Categorias"; helpDesc = "Divisões dos seus produtos."; }
  else if (location.pathname.includes('dashboard')) { title = "Dashboard"; helpDesc = "Aqui você tem uma visão unificada de todo o seu desempenho, vendas, métricas de retenção e as últimas movimentações na sua loja."; }
  else if (location.pathname.includes('vendas')) { title = "Vendas"; helpDesc = "Acompanhe todas as transações, boletos, pix e pedidos recebidos em tempo real."; }
  else if (location.pathname.includes('clientes')) { title = "Clientes"; helpDesc = "Veja a lista de seus clientes, verifique os pedidos e histórico de compras."; }
  else if (location.pathname.includes('minha-loja')) { title = "Configurações da Loja"; helpDesc = "Personalize sua vitrine! Altere cores, logotipo, sua biografia e identidade visual."; }

  return (
    <div className="flex h-screen w-full bg-white lg:bg-[#FDFDFD] font-sans overflow-hidden">
      <ProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        onSuccess={() => setIsProductModalOpen(false)} 
      />

      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-100 flex-col shrink-0">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col shadow-2xl lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header 
          className={cn(
            "h-20 shrink-0 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30 transition-all duration-300",
            scrolled ? "bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-100" : "bg-transparent"
          )}
        >
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Menu size={24} />
            </button>
            {/* The main title is now rendered by each individual child route (ProductsView, CategoriesView, etc.)
                so we don't need a global title here anymore. */}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-full text-slate-500">
              <Search size={16} />
              <input type="text" placeholder="Buscar vendas..." className="bg-transparent border-none outline-none text-sm w-48 focus:w-64 transition-all" />
            </div>
            
            {title === 'Produtos' && (
              <button 
                onClick={() => setIsProductModalOpen(true)}
                className="hidden lg:flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl border-b-4 border-indigo-800 shadow-sm active:border-b-0 active:translate-y-[2px] transition-all uppercase tracking-wider"
              >
                <PlusCircle size={16} />
                Adicionar Produto
              </button>
            )}

            <button className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm">
              <Bell size={20} />
            </button>
          </div>
        </header>

        <div id="main-content" className="flex-1 overflow-y-auto px-6 lg:px-10 pb-20">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </div>

        {title === 'Produtos' && (
          <button 
            onClick={() => setIsProductModalOpen(true)}
            className="fixed lg:hidden bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all z-20"
          >
            <PlusCircle size={24} />
          </button>
        )}
      </main>
    </div>
  );
}
