import React, { useState, useEffect } from 'react';
import { X, Upload, Save, Loader2, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { pb } from '../lib/pocketbase';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductModal({ isOpen, onClose, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
  });
  const [error, setError] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    try {
      // Get store
      let store;
      try {
        store = await pb.collection('stores').getFirstListItem(`owner="${pb.authStore.model?.id}"`);
      } catch (e: any) {
        if (e.status === 404 || e.status === 0) {
          store = await pb.collection('stores').create({
            name: `Loja do ${pb.authStore.model?.name || 'Vendedor'}`,
            slug: `loja-${Math.random().toString(36).substring(2, 7)}`,
            owner: pb.authStore.model?.id
          });
        } else {
          throw e;
        }
      }
      
      setStoreId(store.id);

      // Get categories for this store
      const records = await pb.collection('categories').getFullList({
        filter: `store="${store.id}"`,
        sort: 'name'
      });
      setCategories(records);
      
      // Default category if any
      if (records.length > 0) {
        setFormData(prev => ({ ...prev, category: records[0].id }));
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados iniciais:", err);
      const status = err.status || 0;
      if (status === 403) {
        setError("ACESSO NEGADO. Limpe as API Rules da tabela 'stores' e 'categories' no PocketBase.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.category) {
      setError("Por favor, crie uma categoria antes de cadastrar um produto.");
      return;
    }
    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description || '');
      data.append('price', formData.price);
      data.append('category', formData.category);
      data.append('store', storeId!);
      
      if (file) {
        data.append('image', file);
      }

      await pb.collection('products').create(data);
      
      onSuccess();
      onClose();
      setFormData({ name: '', description: '', price: '', category: '' });
      setFile(null);
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      const status = err.status || 0;
      let detail = err.data?.message || err.message || "Erro desconhecido";

      if (status === 403) {
        detail = "ACESSO NEGADO. Você precisa limpar as API Rules da tabela 'products' no PocketBase (Deixe os campos de texto VAZIOS).";
      } else if (status === 0) {
        detail = "ERRO DE CONEXÃO/SSL. Clique no botão abaixo para autorizar o certificado.";
      } else if (status === 400 && err.data?.data) {
        // Validation errors
        const fields = Object.keys(err.data.data).join(', ');
        detail = `Campos inválidos no banco: ${fields}. Verifique se os nomes dos campos na tabela 'products' estão corretos.`;
      }

      setError(
        <div className="space-y-2">
          <p>{`Erro ${status}: ${detail}`}</p>
          {status === 0 && (
            <a 
              href={pb.baseUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-3 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase"
            >
              Autorizar Certificado
            </a>
          )}
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Novo Produto</h2>
                <p className="text-sm text-slate-500 font-medium tracking-tight">Preencha os detalhes do seu Gift Card.</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 italic">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Gift Card Netflix R$ 50"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="50,00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                    <div className="relative">
                      <select 
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-800 appearance-none pl-12"
                      >
                        {categories.length === 0 && <option value="">Crie uma categoria primeiro</option>}
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <Tag size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Produto</label>
                  <textarea
                    placeholder="Descreva detalhes, termos de uso ou instruções de resgate..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-indigo-50 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-800 resize-none"
                    data-testid="product-description-field"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Imagem do Produto (Opcional)</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50 group-hover:bg-indigo-50/30 group-hover:border-indigo-200 transition-all">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <Upload size={20} />
                      </div>
                      <p className="text-xs font-bold text-slate-500 tracking-tight">
                        {file ? file.name : "Arraste ou clique para enviar"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
