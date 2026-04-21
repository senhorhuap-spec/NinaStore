import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Store, 
  Tag, 
  Info, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  Package,
  Volume2,
  X,
  Minus,
  Plus,
  Wallet,
  CheckCircle2,
  User,
  Heart,
  LogOut,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { pb } from '../lib/pocketbase';
import { cn } from '../lib/utils';
import { generateProductAudio } from '../services/geminiService';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  collectionId: string;
  category?: string;
  expand?: {
    category?: {
      name: string;
    }
  }
}

export function PublicStoreView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);

  // Cart & Checkout States
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [saldo, setSaldo] = useState(500); // Saldo inicial simulado
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Client Area States
  const [clientEmail, setClientEmail] = useState(localStorage.getItem('nina_client_email') || '');
  const [isLogged, setIsLogged] = useState(!!localStorage.getItem('nina_client_email'));
  
  const [favorites, setFavorites] = useState<string[]>(JSON.parse(localStorage.getItem('nina_client_favs') || '[]'));

  useEffect(() => {
    // Carrega saldo salvo localmente para o email simulado
    const savedSaldo = localStorage.getItem('user_saldo');
    if (savedSaldo) setSaldo(Number(savedSaldo));
  }, []);

  const handleUpdateSaldo = (newSaldo: number) => {
    setSaldo(newSaldo);
    localStorage.setItem('user_saldo', String(newSaldo));
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!checkoutEmail || !checkoutEmail.includes('@')) {
      alert('Por favor, informe um email válido.');
      return;
    }
    if (saldo < cartTotal) {
      alert('Saldo insuficiente na carteira. Por favor, adicione fundos.');
      return;
    }

    setProcessingPayment(true);
    try {
      // Registrar vendas no PocketBase
      for (const item of cart) {
        for (let i = 0; i < item.quantity; i++) {
          await pb.collection('sales').create({
            store: store!.id,
            product: item.product.id,
            customer_email: checkoutEmail,
            amount: item.product.price,
            code_delivered: 'MOCK-CODE-' + Math.random().toString(36).substring(2, 8).toUpperCase()
          });
        }
      }

      handleUpdateSaldo(saldo - cartTotal);
      setCart([]);
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setIsCheckoutOpen(false);
      }, 3000);
    } catch (err) {
      console.error("Erro no checkout", err);
      alert('Houve um erro ao processar seu pagamento. Tente novamente.');
    } finally {
      setProcessingPayment(false);
    }
  };

  useEffect(() => {
    if (isLogged) setCheckoutEmail(clientEmail);
  }, [isLogged, clientEmail]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLogged) {
      navigate(`/s/${slug}/cliente`);
      return;
    }
    setFavorites(prev => {
      const isFav = prev.includes(id);
      const newFavs = isFav ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('nina_client_favs', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  useEffect(() => {
    if (slug) fetchStoreData();
  }, [slug]);

  const fetchStoreData = async () => {
    setLoading(true);
    setError(null);
    try {
      let storeRecord;
      try {
        storeRecord = await pb.collection('stores').getFirstListItem(`slug="${slug}"`, { requestKey: null });
      } catch (e: any) {
        if (e.isAbort) return;
        console.error("Erro ao buscar a loja:", e);
        if (e.status === 404) {
          setError(`A loja "${slug}" não foi encontrada. Verifique se o link está correto.`);
        } else if (e.status === 403) {
          setError(`Acesso negado. A loja "${slug}" não é pública. (Aviso ao Lojista: limpe o campo 'List Rule' na tabela stores)`);
        } else {
          setError(`Erro ${e.status}: Não foi possível carregar a loja. ${e.message}`);
        }
        setLoading(false);
        return;
      }
      setStore(storeRecord as any);
      
      let categoriesMap: Record<string, string> = {};
      try {
         const cats = await pb.collection('categories').getFullList({ requestKey: null });
         cats.forEach(c => { categoriesMap[c.id] = c.name; });
      } catch (e) {
         console.warn("Categorias não carregadas", e);
      }
      
      let productRecords: Product[] = [];
      try {
        productRecords = await pb.collection('products').getFullList<Product>({
          filter: `store="${storeRecord.id}"`,
          sort: '-created',
          requestKey: null
        });
      } catch (err: any) {
        if (err.isAbort) return;
        console.warn("Erro no filtro de produtos. Tentando sem nenhum filtro...", err);
        // Fallback extremo sem NENHUMA option (nem sort) para evitar 400 Bad Request
        const allRecords = await pb.collection('products').getFullList<Product>({ requestKey: null });
        productRecords = allRecords.filter((r: any) => r.store === storeRecord.id);
        
        // Aplica o sort localmente
        productRecords = productRecords.sort((a: any, b: any) => {
           if (a.created && b.created) return new Date(b.created).getTime() - new Date(a.created).getTime();
           return 0;
        });
      }
      
      const finalProducts = productRecords.map(p => {
         if (!p.expand && p.category) {
            p.expand = { category: { name: categoriesMap[p.category] || 'Sem Categoria' } };
         }
         return p;
      });
      
      setProducts(finalProducts);
    } catch (err: any) {
      console.error(err);
      setError("Página não encontrada ou loja temporariamente indisponível.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTTS = async (p: Product) => {
    setLoadingAudio(p.id);
    const audioBase64 = await generateProductAudio(`${p.name}. Preço: ${p.price} reais. ${p.description || ''}`);
    if (audioBase64) {
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audio.play();
    }
    setLoadingAudio(null);
  };

  const categories = ['todos', ...Array.from(new Set(products.map(p => p.expand?.category?.name).filter(Boolean)))];
  
  const filteredProducts = activeCategory === 'todos' 
    ? products 
    : products.filter(p => p.expand?.category?.name === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white mb-6 shadow-2xl shadow-indigo-200"
        >
          <ShoppingBag size={40} />
        </motion.div>
        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Carregando Vitrine...</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ops! Página inexistente</h2>
        <p className="text-slate-500 font-medium max-w-sm mt-2">{error || "Loja não encontrada."}</p>
        <a href="/" className="mt-8 text-indigo-600 font-bold hover:underline">Voltar para o início</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans pb-20">
      {/* Header da Loja */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">
              {store.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{store.name}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/s/${slug}/cliente`)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wider border border-slate-100 hover:bg-slate-100 transition-colors"
            >
              <User size={14} />
              <span className="hidden sm:inline">{isLogged ? 'Minha Conta' : 'Entrar'}</span>
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-100 hover:bg-indigo-100 transition-colors"
            >
              <ShoppingBag size={14} />
              <span className="hidden sm:inline">Carrinho</span>
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black">
                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-12">
        {/* Banner/Hero */}
        <section className="bg-indigo-600 rounded-[40px] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
              <Store size={12} />
              <span>Loja Oficial</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight italic">
              {store.description || "Bem-vindo à minha loja de Gift Cards!"}
            </h2>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-indigo-400 overflow-hidden shadow-lg">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="user" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium text-indigo-100">+240 vendas realizadas este mês</p>
            </div>
          </div>
          
          {/* Decoração visual */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
            <ShoppingBag className="w-full h-full -rotate-12 translate-x-1/4" />
          </div>
        </section>

        {/* Categorias e Produtos */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide py-1">
            {categories.map((cat: any) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeCategory === cat 
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                    : "bg-white text-slate-400 border border-slate-100 hover:border-slate-200"
                )}
              >
                {cat === 'todos' ? 'Todos os Itens' : cat}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-[40px] p-20 text-center border border-slate-100 shadow-sm">
              <Package size={40} className="text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-800 italic">Nenhum produto nesta categoria</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-2xl transition-all duration-500 group flex flex-col h-full"
                  >
                    <div className="relative aspect-square rounded-[24px] overflow-hidden mb-6 bg-slate-50 border border-slate-50 shrink-0">
                      <img 
                        src={p.image ? pb.files.getURL(p, p.image) : `https://picsum.photos/seed/${p.id}/500/500`}
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <button 
                          onClick={(e) => toggleFavorite(p.id, e)}
                          className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white flex items-center justify-center hover:bg-white transition-all active:scale-90 text-slate-400 hover:text-red-500"
                        >
                          <Heart size={16} className={favorites.includes(p.id) ? "fill-red-500 text-red-500" : ""} />
                        </button>
                        <button 
                          onClick={() => handlePlayTTS(p)}
                          disabled={loadingAudio === p.id}
                          className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl text-indigo-600 shadow-lg border border-white flex items-center justify-center hover:bg-white transition-all active:scale-90"
                        >
                          {loadingAudio === p.id ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 opacity-40">
                        <Tag size={12} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{p.expand?.category?.name || "Premium"}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{p.name}</h3>
                        <p className="text-sm text-slate-400 font-medium line-clamp-2 italic">{p.description || "Gift Card digital com entrega instantânea."}</p>
                      </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-slate-50 pt-6">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Valor</p>
                        <span className="text-2xl font-black text-slate-800">R$ {p.price}</span>
                      </div>
                      
                      <button 
                        onClick={() => addToCart(p)}
                        className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-slate-100 hover:bg-slate-800 transition-all active:scale-95 group/btn"
                      >
                        Comprar
                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-slate-100 text-center">
        <div className="flex flex-col items-center gap-4 opacity-30">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xs">N</div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Ambiente Seguro & Protegido por NinaStore</p>
        </div>
      </footer>

      {/* Cart Overlay */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="text-indigo-600" />
                  <h2 className="text-xl font-black text-slate-800">Seu Carrinho</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Package size={48} className="opacity-20" />
                    <p className="font-bold text-sm">Seu carrinho está vazio.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex gap-4 items-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shrink-0">
                         <img 
                            src={item.product.image ? pb.files.getURL(item.product, item.product.image) : `https://picsum.photos/seed/${item.product.id}/100/100`}
                            alt={item.product.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-800 truncate">{item.product.name}</h4>
                        <p className="text-indigo-600 font-black text-sm">R$ {item.product.price}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => {
                          const existing = cart.find(i => i.product.id === item.product.id);
                          if (existing && existing.quantity === 1) removeFromCart(item.product.id);
                          else setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity - 1 } : i));
                        }} className="w-8 h-8 rounded-full bg-white text-slate-600 shadow flex items-center justify-center hover:bg-slate-100">
                          <Minus size={14} />
                        </button>
                        <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart(item.product)} className="w-8 h-8 rounded-full bg-indigo-600 text-white shadow flex items-center justify-center hover:bg-indigo-700">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total</span>
                    <span className="text-3xl font-black text-slate-800">R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    Ir para Pagamento
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Checkout Overlay */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl"
              >
                {paymentSuccess ? (
                  <div className="p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto">
                      <CheckCircle2 size={40} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pagamento Aprovado!</h2>
                      <p className="text-slate-500 font-medium text-sm mt-2">Sua compra foi finalizada com sucesso. Acesse seu e-mail para resgatar.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Checkout</h2>
                      <button onClick={() => setIsCheckoutOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-colors">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <Wallet size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seu Saldo</p>
                          <p className="text-xl font-black text-slate-800">R$ {saldo.toFixed(2)}</p>
                        </div>
                        <button 
                          onClick={() => handleUpdateSaldo(saldo + 100)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-50 transition-colors"
                        >
                          + R$ 100
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase tracking-widest text-slate-400">E-mail de recebimento</label>
                          <input 
                            type="email" 
                            value={checkoutEmail}
                            onChange={e => setCheckoutEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700"
                            placeholder="seu@email.com"
                          />
                        </div>
                        
                        <div className="flex justify-between items-center py-4 border-y border-slate-100">
                          <span className="text-slate-500 font-bold text-sm">Total da Compra</span>
                          <span className="text-2xl font-black text-slate-800">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleCheckout}
                        disabled={processingPayment || saldo < cartTotal}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingPayment ? (
                          <><Loader2 size={18} className="animate-spin" /> Processando...</>
                        ) : saldo < cartTotal ? (
                          'Saldo Insuficiente'
                        ) : (
                          'Confirmar Pagamento'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
