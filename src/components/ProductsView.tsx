import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Volume2, 
  Loader2,
  Tag,
  Hash,
  AlertCircle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { generateProductAudio } from '../services/geminiService';
import { pb } from '../lib/pocketbase';
import { ProductModal } from './ProductModal';
import { ContextualHelp } from './ContextualHelp';

// Tipagem baseada no PocketBase
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  collectionId: string;
  store: string;
  category?: string;
  expand?: {
    category?: {
      name: string;
    }
  }
}

export function ProductsView() {
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 6;

  useEffect(() => {
    fetchProducts();
  }, [currentPage]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!pb.authStore.isValid || !pb.authStore.model) {
        setError("Usuário não autenticado.");
        setIsLoading(false);
        return;
      }

      console.log("Iniciando busca de loja para o usuário:", pb.authStore.model.id);
      let store;
      try {
        store = await pb.collection('stores').getFirstListItem(`owner="${pb.authStore.model.id}"`);
      } catch (e: any) {
        if (e.isAbort) return;
        console.error("Loja não encontrada para este usuário:", e);
        setError("Sua loja ainda não foi configurada. Acesse 'Configurações da Loja' para criar sua vitrine.");
        setIsLoading(false);
        return;
      }
      
      console.log("Loja encontrada:", store.id);
      
      // Busca categorias manualmente para não depender do 'expand' que está retornando 400
      let categoriesMap: Record<string, string> = {};
      try {
         const cats = await pb.collection('categories').getFullList();
         cats.forEach(c => { categoriesMap[c.id] = c.name; });
      } catch (e) {
         console.warn("Aviso: Categorias não carregadas", e);
      }
      
      let fetchedProducts: Product[] = [];
      let total = 0;
      let pages = 1;

      try {
        console.log("Tentando carregar produtos (tentativa 1: filter + sort)...");
        const result = await pb.collection('products').getList<Product>(currentPage, perPage, {
          filter: `store="${store.id}"`,
          sort: '-created',
        });
        
        fetchedProducts = result.items;
        pages = result.totalPages;
        total = result.totalItems;
      } catch (fetchErr: any) {
        if (fetchErr.isAbort) return;
        console.warn("Erro na busca primária. Tentando fallback sem sort/filter...", fetchErr);
        
        try {
          // Fallback extremo: Busca absolutamente TUDO sem nenhuma regra no banco.
          // Isso evita o erro 400 causado por ausência de parâmetros como 'created' ou falhas de filtro
          const allRecords = await pb.collection('products').getFullList<Product>();
          
          console.log(`Fallback carregou ${allRecords.length} produtos no total.`);
          
          // Filtra manualmente os produtos que pertencem a esta loja
          let filtered = allRecords.filter(r => {
             const recordStoreId = typeof r.store === 'string' ? r.store : (r as any).store?.id;
             return recordStoreId === store.id;
          });
          
          // Ordena manualmente do mais recente para o mais antigo, baseando no ID ou created se tiver
          filtered = filtered.sort((a, b) => {
             const dateA = a as any;
             const dateB = b as any;
             if (dateA.created && dateB.created) return new Date(dateB.created).getTime() - new Date(dateA.created).getTime();
             return 0; // fallback se created nao existir
          });
          
          total = filtered.length;
          pages = Math.ceil(filtered.length / perPage) || 1;
          
          // Paginação manual no cliente
          fetchedProducts = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
        } catch (fallbackErr: any) {
          console.error("Erro no fallback extremo de produtos:", fallbackErr);
          throw fallbackErr;
        }
      }

      // Aplica mapeamento de categoria
      const finalProducts = fetchedProducts.map(p => {
         if (!p.expand && p.category) {
            p.expand = { category: { name: categoriesMap[p.category] || 'Sem Categoria' } };
         }
         return p;
      });

      setProducts(finalProducts);
      setTotalPages(pages);
      setTotalItems(total);
      
    } catch (err: any) {
      if (err.isAbort) return;
      console.error("Erro fatal em fetchProducts:", err);
      const status = err.status || 0;
      const msg = err.data?.message || err.message || "Erro desconhecido";
      const details = err.data?.data ? JSON.stringify(err.data.data) : "";
      
      if (status === 403) {
        setError(`ACESSO NEGADO (403). Verifique se as API Rules de 'products' e 'stores' permitem leitura.`);
      } else if (status === 0) {
        setError("ERRO DE CONEXÃO. O servidor PocketBase não respondeu.");
      } else {
        setError(`Erro ao carregar produtos (${status}): ${msg} ${details}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayTTS = async (p: Product) => {
    setLoadingAudio(p.id);
    const audioBase64 = await generateProductAudio(`${p.name}. Preço: ${p.price} reais.`);
    if (audioBase64) {
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audio.play();
    }
    setLoadingAudio(null);
  };

  const getImageUrl = (p: Product) => {
    if (!p.image) return `https://picsum.photos/seed/${p.id}/400/400`;
    return pb.files.getURL(p, p.image);
  };

  return (
    <div className="space-y-6">
      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchProducts} 
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Produtos</h2>
            <ContextualHelp 
              title="Dicas sobre Produtos" 
              description="Adicione e organize seus Gift Cards aqui. Preencha título, preço e adicione uma imagem para o produto ficar atraente na vitrine dos seus clientes." 
              position="right"
            />
          </div>
          <p className="text-sm text-slate-500 font-medium tracking-tight font-sans">Gerencie o catálogo de Gift Cards da sua loja.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <List size={18} />
            </button>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={18} />
            <span className="hidden xs:inline">Adicionar Produto</span>
            <span className="xs:hidden">Novo</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col sm:flex-row items-start gap-4 text-amber-800">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div className="flex-1 space-y-1">
            <p className="font-bold text-sm">Atenção</p>
            <p className="text-xs opacity-90 leading-relaxed font-sans">{error}</p>
            {error.includes("CONEXÃO") && (
              <div className="mt-3">
                <a 
                  href={pb.baseUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-amber-700 transition-colors"
                >
                  Autorizar Certificado / Abrir Servidor
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs font-sans">Carregando estoque...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-[40px] p-20 text-center border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6">
            <Package size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight font-sans">Nenhum produto ainda</h3>
          <p className="text-slate-500 text-sm mt-2 font-medium max-w-xs mx-auto font-sans">Comece adicionando seu primeiro Gift Card para vender na sua loja.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-8 text-indigo-600 font-bold hover:underline font-sans"
          >
            Adicionar agora
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
              : "flex flex-col gap-4"
          )}>
            {products.map((p) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group",
                  viewMode === 'grid' ? "rounded-[32px] p-5" : "rounded-2xl p-4 flex items-center gap-4"
                )}
              >
                <div className={cn(
                  "relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-50 shrink-0",
                  viewMode === 'grid' ? "aspect-square mb-4" : "w-20 h-20"
                )}>
                  <img 
                    src={getImageUrl(p)} 
                    alt={p.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button 
                      onClick={() => handlePlayTTS(p)}
                      disabled={loadingAudio === p.id}
                      className="p-1.5 bg-white/90 backdrop-blur-md rounded-lg text-indigo-600 shadow-sm border border-white hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {loadingAudio === p.id ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                    </button>
                  </div>
                </div>

                <div className={cn("flex-1", viewMode === 'list' && "flex items-center justify-between gap-4")}>
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className={cn(
                        "font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight font-sans",
                        viewMode === 'grid' ? "text-sm line-clamp-2 min-h-[40px]" : "text-base"
                      )}>{p.name}</h3>
                    </div>

                    {p.description && viewMode === 'grid' && (
                      <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px] italic font-sans">
                        {p.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Tag size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-wider font-sans">
                        {p.expand?.category?.name || 'Sem Categoria'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={cn(viewMode === 'grid' ? "mt-3 flex items-center justify-end" : "text-right")}>
                    <span className="text-xl font-black text-slate-800 tracking-tight font-sans">R$ {p.price}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">
                Mostrando {products.length} de {totalItems} produtos
              </p>
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={cn(
                        "w-10 h-10 rounded-xl font-bold text-sm transition-all font-sans",
                        currentPage === num 
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

