import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Store, 
  Loader2, 
  AlertCircle,
  History,
  Heart,
  LogOut,
  User,
  ArrowLeft,
  ChevronRight,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { pb } from '../lib/pocketbase';

export function ClientAreaView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any | null>(null);
  
  const [clientEmail, setClientEmail] = useState(localStorage.getItem('nina_client_email') || '');
  const [clientName, setClientName] = useState(localStorage.getItem('nina_client_name') || '');
  const [isLogged, setIsLogged] = useState(!!localStorage.getItem('nina_client_email'));
  
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', whatsapp: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'pedidos' | 'favoritos'>('pedidos');
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  const [favorites, setFavorites] = useState<string[]>(JSON.parse(localStorage.getItem('nina_client_favs') || '[]'));
  const [favoriteProducts, setFavoriteProducts] = useState<any[]>([]);

  useEffect(() => {
    if (slug) fetchStoreData();
  }, [slug]);

  const fetchStoreData = async () => {
    setLoading(true);
    try {
      const storeRecord = await pb.collection('stores').getFirstListItem(`slug="${slug}"`, { requestKey: null });
      setStore(storeRecord);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientData = async () => {
    if (!clientEmail || !store) return;
    setLoadingOrders(true);
    try {
      // Pedidos
      const fetchedOrders = await pb.collection('sales').getFullList({
        filter: `customer_email="${clientEmail}" && store="${store.id}"`,
        sort: '-created',
        expand: 'product',
        requestKey: null
      });
      setOrders(fetchedOrders);
      
      // Produtos favoritos
      if (favorites.length > 0) {
        const filters = favorites.map(f => `id="${f}"`).join(' || ');
        const favProds = await pb.collection('products').getFullList({
          filter: `store="${store.id}" && (${filters})`,
          requestKey: null
        });
        setFavoriteProducts(favProds);
      } else {
        setFavoriteProducts([]);
      }
    } catch(e) {
      console.warn("Erro ao buscar dados do cliente", e);
    }
    setLoadingOrders(false);
  };

  useEffect(() => {
    if (isLogged && store) fetchClientData();
  }, [isLogged, store, activeTab]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password || !store) return;
    
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'register') {
        if (!authForm.name || !authForm.whatsapp) {
          setAuthError("Por favor, preencha todos os campos.");
          setAuthLoading(false);
          return;
        }

        try {
          const existing = await pb.collection('customers').getFirstListItem(`email="${authForm.email}" && store="${store.id}"`, { requestKey: null });
          if (existing) {
             setAuthError("Este e-mail já está cadastrado nesta loja.");
             setAuthLoading(false);
             return;
          }
        } catch (e) { /* Not found is good */ }

        const customer = await pb.collection('customers').create({
          name: authForm.name,
          email: authForm.email,
          whatsapp: authForm.whatsapp,
          password: authForm.password,
          store: store.id
        });

        localStorage.setItem('nina_client_email', customer.email);
        localStorage.setItem('nina_client_name', customer.name);
        setClientEmail(customer.email);
        setClientName(customer.name);
        setIsLogged(true);
      } else {
        const customers = await pb.collection('customers').getList(1, 1, {
          filter: `email="${authForm.email}" && password="${authForm.password}" && store="${store.id}"`,
          requestKey: null
        });

        if (customers.items.length > 0) {
          const customer = customers.items[0];
          localStorage.setItem('nina_client_email', customer.email);
          localStorage.setItem('nina_client_name', customer.name);
          setClientEmail(customer.email);
          setClientName(customer.name);
          setIsLogged(true);
        } else {
          setAuthError("E-mail ou senha incorretos para esta loja.");
        }
      }
    } catch (err: any) {
      console.error("Erro na autenticação:", err);
      setAuthError("Houve um erro ao processar sua solicitação.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nina_client_email');
    localStorage.removeItem('nina_client_name');
    setIsLogged(false);
    setClientEmail('');
    setClientName('');
  };

  const removeFromFavorites = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavs = favorites.filter(f => f !== id);
    setFavorites(newFavs);
    localStorage.setItem('nina_client_favs', JSON.stringify(newFavs));
    setFavoriteProducts(prev => prev.filter(p => p.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Carregando...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10">
        <AlertCircle className="text-slate-400 mb-4" size={40} />
        <p className="text-slate-600 font-bold">Loja não encontrada.</p>
        <Link to="/" className="mt-4 text-indigo-600 font-bold hover:underline">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans flex flex-col">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to={`/s/${slug}`} className="flex items-center gap-3 group text-slate-500 hover:text-slate-800 transition-colors">
             <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-colors border border-slate-100">
               <ArrowLeft size={18} />
             </div>
             <span className="font-bold text-sm hidden sm:inline">Voltar para {store.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <User size={20} className="text-indigo-600" />
            <h1 className="font-black text-slate-800 tracking-tight">Portal do Cliente</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 flex flex-col">
        {!isLogged ? (
          <div className="max-w-md w-full mx-auto mt-10">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  {authMode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}
                </h2>
                <p className="text-slate-500 font-medium text-sm mt-2">
                  Acesse suas compras e produtos favoritos da loja <b className="text-indigo-600">{store.name}</b>.
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
                    <AlertCircle size={18} />
                    {authError}
                  </div>
                )}
                {authMode === 'register' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Seu Nome</label>
                      <input type="text" required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" placeholder="Como quer ser chamado?" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp</label>
                      <input type="tel" required value={authForm.whatsapp} onChange={e => setAuthForm({...authForm, whatsapp: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" placeholder="(00) 00000-0000" />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">E-mail</label>
                  <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" placeholder="seu@email.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Senha</label>
                  <input type="password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" placeholder="••••••••" />
                </div>
                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full py-4 mt-2 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {authLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (authMode === 'login' ? 'Acessar Conta' : 'Concluir Cadastro')}
                </button>
              </form>
              <div className="mt-8 text-center pt-6 border-t border-slate-50">
                <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-slate-500 font-bold text-sm hover:text-indigo-600 transition-colors">
                  {authMode === 'login' ? 'Primeira vez aqui? Crie sua conta' : 'Já tem conta? Faça Login'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-200 shrink-0">
                  {clientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Olá, {clientName}!</h2>
                  <p className="text-slate-500 font-medium">{clientEmail}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-100 transition-colors text-sm">
                <LogOut size={16} />
                Sair
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6 border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('pedidos')} 
                className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'pedidos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Meus Pedidos
              </button>
              <button 
                onClick={() => setActiveTab('favoritos')} 
                className={`pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'favoritos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Favoritos
              </button>
            </div>

            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full"
                >
                  {activeTab === 'pedidos' ? (
                    loadingOrders ? (
                      <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                    ) : orders.length === 0 ? (
                      <div className="bg-white rounded-[32px] p-20 text-center border border-slate-100 shadow-sm h-full flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center mb-6">
                           <History size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800">Nenhuma compra ainda</h3>
                        <p className="text-slate-500 mt-2 max-w-sm mb-6">Você ainda não realizou compras. Quando finalizar seu primeiro pedido, ele aparecerá aqui.</p>
                        <Link to={`/s/${slug}`} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">Voltar para a Loja</Link>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {orders.map(order => (
                          <div key={order.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
                                {order.expand?.product?.image ? (
                                  <img src={pb.files.getURL(order.expand.product, order.expand.product.image)} alt="Product" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Package className="text-slate-300" /></div>
                                )}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-800 text-lg">{order.expand?.product?.name || 'Produto Excluído'}</h4>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Pedido #{order.id.slice(0,8)} • {new Date(order.created).toLocaleDateString()}</p>
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest rounded-xl border border-emerald-100">
                                  Cod: {order.code_delivered || 'Processando'}
                                </div>
                              </div>
                            </div>
                            <div className="text-left sm:text-right w-full sm:w-auto">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Valor</p>
                              <span className="text-2xl font-black text-indigo-600">R$ {order.amount.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    loadingOrders ? (
                      <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                    ) : favoriteProducts.length === 0 ? (
                       <div className="bg-white rounded-[32px] p-20 text-center border border-slate-100 shadow-sm h-full flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center mb-6">
                           <Heart size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800">Nenhum favorito</h3>
                        <p className="text-slate-500 mt-2 max-w-sm mb-6">Salve os produtos que você mais gostou para encontrá-los facilmente depois.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {favoriteProducts.map(p => (
                          <Link to={`/s/${slug}`} key={p.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex gap-4 items-center cursor-pointer hover:border-indigo-300 transition-colors group">
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                              <img src={p.image ? pb.files.getURL(p, p.image) : `https://picsum.photos/seed/${p.id}/100/100`} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-slate-800 line-clamp-2">{p.name}</h4>
                              <p className="text-sm font-black text-indigo-600 mt-1">R$ {p.price}</p>
                            </div>
                            <button onClick={(e) => removeFromFavorites(p.id, e)} className="p-3 text-red-500 hover:bg-red-50 rounded-full transition-colors self-start shrink-0">
                               <Heart size={20} className="fill-red-500" />
                            </button>
                          </Link>
                        ))}
                      </div>
                    )
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
