import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Globe, 
  AlertCircle, 
  Save, 
  Loader2, 
  ExternalLink,
  CheckCircle2,
  Info,
  Database,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { pb } from '../lib/pocketbase';
import { cn } from '../lib/utils';
import { ContextualHelp } from './ContextualHelp';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string;
  theme_color?: string;
}

export function StoreSettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<StoreData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    setLoading(true);
    try {
      const record = await pb.collection('stores').getFirstListItem(`owner="${pb.authStore.model?.id}"`, { requestKey: null });
      setStore(record as any);
      setFormData({
        name: record.name || '',
        slug: record.slug || ''
      });
    } catch (err: any) {
      if (err.isAbort) return;
      if (err.status === 404) {
        // Criar loja inicial se não existir
        try {
          const newStore = await pb.collection('stores').create({
            owner: pb.authStore.model?.id,
            name: 'Minha Nova Loja',
            slug: `loja-${Math.random().toString(36).substring(2, 7)}`
          });
          setStore(newStore as any);
          setFormData({
            name: newStore.name,
            slug: newStore.slug
          });
        } catch (createErr: any) {
          console.error("Erro ao criar a loja:", createErr);
          if (createErr.status === 400) {
             setError("Erro crítico: As colunas necessárias (como 'slug' ou 'name') não existem na sua tabela 'stores' no PocketBase. Rode o Setup Inicial novamente.");
          } else {
             setError("Erro ao inicializar configurações da loja.");
          }
        }
      } else {
        console.error("Erro ao carregar dados da loja:", err);
        setError("Erro ao carregar dados da loja. Verifique o console.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Validação básica do slug
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(formData.slug)) {
        throw new Error("O link deve conter apenas letras minúsculas, números e hífens.");
      }

      await pb.collection('stores').update(store.id, formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      if (err.status === 400) {
        setError("Erro de salvamento. Alguns dos campos obrigatórios podem estar faltando no seu PocketBase.");
      } else {
        setError(err.message || "Erro ao salvar alterações.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs font-sans">Carregando configurações...</p>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/s/${formData.slug}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configurações da Loja</h2>
            <ContextualHelp 
              title="Ajustes de Identidade" 
              description="Defina como sua loja aparece para o público. Nome, biografia e o link exclusivo de vendas." 
              position="right"
            />
          </div>
          <p className="text-sm text-slate-500 font-medium font-sans">Personalize sua vitrine e gerencie seu link público.</p>
        </div>

        <a 
          href={`/s/${store?.slug}`} 
          target="_blank"
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all border border-slate-200"
        >
          <ExternalLink size={16} />
          Ver Loja Online
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nome da Loja</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-slate-800"
                  placeholder="Ex: Nina Store, Gift Cards Oficial..."
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Link da Loja (Slug)</label>
                  <span className="text-[10px] bg-amber-100 text-amber-700 font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Atenção</span>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                    ninastore.com/s/
                  </div>
                  <input 
                    type="text" 
                    disabled={store !== null && store.slug !== '' && !store.slug.startsWith('loja-')}
                    value={formData.slug}
                    onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                    className="w-full pl-32 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-black text-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex items-start gap-2 mt-2 px-1">
                  <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
                    {store !== null && store.slug !== '' && !store.slug.startsWith('loja-') 
                      ? "O link da sua loja já foi definido e não pode ser alterado por motivos de segurança." 
                      : "O link é único. Escolha com cuidado: após salvo, ele ficará bloqueado permanentemente para evitar fraudes."}
                  </p>
                </div>
              </div>

            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold font-sans">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Salvando...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={18} />
                  Alterações Salvas!
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Configurações
                </>
              )}
            </button>
          </form>
        </div>

        <div className="space-y-6">

          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Globe size={24} />
            </div>
            <h4 className="font-bold text-slate-800 font-sans">Compartilhe sua Loja</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
              Use o botão abaixo para copiar o link e colar na bio do seu Instagram ou enviar no grupo de clientes.
            </p>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                alert("Link copiado!");
              }}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-200"
            >
              Copiar Link Público
            </button>
          </div>

          <div className="bg-slate-900 rounded-[32px] p-8 shadow-sm space-y-4 text-white">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
              <Database size={24} />
            </div>
            <h4 className="font-bold font-sans">Sincronizar Banco</h4>
            <p className="text-xs text-slate-400 font-medium leading-relaxed font-sans">
              Caso queira atualizar a estrutura do seu banco de dados ou criar novas tabelas do sistema.
            </p>
            <button 
              onClick={() => {
                if(confirm("Isso abrirá a tela de configuração do banco. Você precisará da senha de admin do PocketBase. Deseja continuar?")) {
                  // Forçamos o redirecionamento para a raiz com o parâmetro de setup para garantir que o App.tsx capture
                  window.location.href = '/?setup=1';
                }
              }}
              className="w-full p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              Iniciar Sincronização
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
