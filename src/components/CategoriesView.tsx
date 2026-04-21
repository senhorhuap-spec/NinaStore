import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  PlusCircle, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Loader2,
  Tag,
  Hash
} from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { cn } from '../lib/utils';
import { ContextualHelp } from './ContextualHelp';

export function CategoriesView() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<React.ReactNode>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    fetchStoreAndCategories();
  }, []);

  const fetchStoreAndCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!pb.authStore.model?.id) {
        setError("Sessão expirada. Por favor, saia e entre novamente.");
        setLoading(false);
        return;
      }

      // Get the current user's store
      let store;
      try {
        store = await pb.collection('stores').getFirstListItem(`owner="${pb.authStore.model?.id}"`);
      } catch (e: any) {
        if (e.isAbort) return;
        if (e.status === 404 || e.status === 0) {
          // Case 404: Not found
          // Case 0: Connection issues (often SSL/HTTPS in this environment)
          console.log("Store not found or connection error, attempting auto-create/recovery...");
          
          if (e.status === 0 && !pb.baseUrl.startsWith('https')) {
            throw new Error("O link do PocketBase PRECISA começar com HTTPS. O navegador bloqueia conexões HTTP por segurança.");
          }

          store = await pb.collection('stores').create({
            name: `Loja do ${pb.authStore.model?.name || 'Vendedor'}`,
            slug: `loja-${Math.random().toString(36).substring(2, 7)}`,
            owner: pb.authStore.model?.id
          });
        } else {
          throw e; // goes to outer catch
        }
      }
      
      setStoreId(store.id);

      let records: any[] = [];
      try {
        records = await pb.collection('categories').getFullList({
          filter: `store="${store.id}"`,
          sort: '-created'
        });
      } catch (catErr: any) {
        if (catErr.isAbort) return;
        console.warn("Erro ao filtrar categorias. Tentando sem filtro...", catErr);
        const allCategories = await pb.collection('categories').getFullList({ sort: '-created' });
        records = allCategories.filter(c => c.store === store.id);
      }
      
      setCategories(records);
    } catch (err: any) {
      if (err.isAbort) return;
      console.error("Full Error:", err);
      const status = err.status || 0;
      let detail = err.data?.message || err.message || "Erro desconhecido";
      
      if (status === 403) {
        detail = "ACESSO NEGADO. Limpe as API Rules no PocketBase (Deixe os campos VAZIOS nas tabelas 'stores' e 'categories').";
      } else if (status === 0) {
        detail = "ERRO DE CONEXÃO/SSL. Seu navegador não confia no certificado do seu servidor PocketBase.";
      }
      
      setError(
        <div className="space-y-2">
          <p>{`Erro ${status}: ${detail}`}</p>
          {status === 0 && (
            <div className="pt-2 border-t border-red-200 mt-2">
              <p className="text-[10px] uppercase font-black mb-2 opacity-70">Como resolver:</p>
              <a 
                href={pb.baseUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 transition-colors"
              >
                1. Abrir Servidor e clicar em "Avançado {'>'} Prosseguir"
              </a>
              <p className="mt-2 opacity-80">Depois de fazer isso, volte aqui e clique em Tentar De Novo.</p>
            </div>
          )}
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    if (!storeId) {
      setError("Sua loja ainda não foi configurada. Tente atualizar a página.");
      return;
    }

    setLoading(true);
    try {
      const slug = newCategoryName.toLowerCase().trim().replace(/\s+/g, '-');
      await pb.collection('categories').create({
        name: newCategoryName,
        slug: slug,
        store: storeId
      });
      setNewCategoryName('');
      setIsAdding(false);
      fetchStoreAndCategories();
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao criar categoria: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria? Os produtos vinculados ficarão sem categoria.")) return;
    
    try {
      await pb.collection('categories').delete(id);
      setCategories(categories.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir categoria.");
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2"
        >
          <div className="p-1 bg-red-100 rounded-lg">
            <Loader2 size={14} className="animate-pulse" />
          </div>
          <div className="flex-1">
            <h4 className="font-black uppercase tracking-widest text-[10px] mb-0.5">Ops! Algo deu errado</h4>
            <div className="font-medium text-xs">{error}</div>
          </div>
          <button 
            onClick={fetchStoreAndCategories}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          >
            Tentar denovo
          </button>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gerenciar Categorias</h2>
            <ContextualHelp 
              title="Dicas sobre Categorias" 
              description="Aqui você divide seus Gift Cards em prateleiras virtuais (ex: 'Assinaturas', 'Jogos'). Isso facilita a vida do seu cliente na hora de navegar e encontrar o produto desejado na vitrine." 
              position="right"
            />
          </div>
          <p className="text-sm text-slate-500 font-medium">Organize seus produtos por grupos personalizados.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-2xl border-b-4 border-indigo-800 shadow-lg shadow-indigo-100 active:border-b-0 active:translate-y-[2px] transition-all uppercase tracking-wider"
        >
          <PlusCircle size={16} />
          Nova Categoria
        </button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4"
        >
          <form onSubmit={handleAddCategory} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1 w-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Categoria</label>
              <input 
                autoFocus
                type="text" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Gift Cards, Jogos Digitais..."
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-slate-800"
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Categoria'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {loading && !isAdding ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Carregando categorias...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-[40px] p-20 text-center border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Tag size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Nenhuma categoria encontrada</h3>
          <p className="text-slate-500 mt-2 max-w-xs mx-auto">Você ainda não criou nenhuma categoria para organizar sua loja.</p>
          <button 
            onClick={() => setIsAdding(true)}
            className="mt-8 text-indigo-600 font-black uppercase text-xs tracking-widest hover:underline"
          >
            Criar minha primeira categoria
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <motion.div 
              key={category.id}
              layout
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group hover:shadow-xl transition-all duration-500"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-500">
                  <Tag size={20} />
                </div>
                <button 
                  onClick={() => handleDelete(category.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {category.name}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Hash size={12} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {category.slug}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
