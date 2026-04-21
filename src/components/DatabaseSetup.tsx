import React, { useState } from 'react';
import { Database, ShieldCheck, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { pb } from '../lib/pocketbase';
import { runMigrations } from '../lib/migrations';

export function DatabaseSetup({ onComplete }: { onComplete: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{name: string, status: string, message?: string}[] | null>(null);
  const [serverUrl, setServerUrl] = useState(pb.baseUrl);
  const [showServerConfig, setShowServerConfig] = useState(false);

  const updateServer = () => {
    pb.baseUrl = serverUrl;
    setShowServerConfig(false);
    setError(null);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Auth as Admin
      await pb.admins.authWithPassword(email, password);
      
      // Step 2: Run Migrations
      const migrationResults = await runMigrations();
      setResults(migrationResults);
      
      // Step 3: Logout admin
      pb.authStore.clear();

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao conectar.");
      
      if (err.message?.includes('fetch') || !err.status) {
        setError("Erro de Conexão: O navegador bloqueou a requisição. Como o NinaStore usa HTTPS, seu PocketBase também deve usar HTTPS (SSL).");
      }
    } finally {
      setLoading(false);
    }
  };

  if (results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100"
        >
          <div className="p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Banco Configurado!</h2>
              <p className="text-slate-500 font-medium">As coleções foram criadas com sucesso no seu PocketBase.</p>
            </div>

            <div className="space-y-3 text-left">
              {results.map((r) => (
                <div key={r.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-700 uppercase text-xs tracking-widest">{r.name}</span>
                  <div className="flex items-center gap-2">
                    {r.status === 'error' ? (
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter bg-red-50 px-2 py-1 rounded-full">Erro: {r.message}</span>
                    ) : (
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-2 py-1 rounded-full">
                        {r.status === 'created' ? 'Criado' : 'Já Existia'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={onComplete}
              className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              Começar a usar a NinaStore
              <ArrowRight size={20} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-200">
              N
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Setup Inicial</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração do Banco</p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-3xl p-6 mb-8 border border-amber-100/50 flex gap-4">
             <AlertCircle className="text-amber-500 shrink-0" size={24} />
             <div className="space-y-1">
               <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Aviso de Administrador</p>
               <p className="text-xs text-amber-700 leading-relaxed font-semibold">
                 Para criar as coleções automaticamente via código, precisamos da sua conta de **ADMIN** do PocketBase. 
                 Não se preocupe, esses dados não ficam salvos, são usados apenas agora.
               </p>
             </div>
          </div>

          <form onSubmit={handleSetup} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Admin Email</label>
                <input 
                  required
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Admin Senha</label>
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 mb-2 relative group">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Conectando em:</p>
               <div className="flex items-center justify-between">
                 <p className="text-xs font-mono font-bold text-indigo-600 truncate">{pb.baseUrl}</p>
                 <button 
                   type="button"
                   onClick={() => setShowServerConfig(!showServerConfig)}
                   className="text-[10px] font-bold text-indigo-600 hover:underline"
                 >
                   Alterar
                 </button>
               </div>

               {showServerConfig && (
                 <motion.div 
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   className="mt-3 space-y-2 overflow-hidden"
                 >
                   <input 
                     type="text" 
                     value={serverUrl}
                     onChange={(e) => setServerUrl(e.target.value)}
                     className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-100 outline-none underline decoration-indigo-200"
                   />
                   <button 
                     type="button"
                     onClick={updateServer}
                     className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
                   >
                     Confirmar Novo Servidor
                   </button>
                 </motion.div>
               )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Configurando...
                </>
              ) : (
                <>
                  <Database size={24} />
                  Configurar Coleções
                </>
              )}
            </button>

            <button 
              type="button"
              onClick={onComplete}
              className="w-full py-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors text-xs"
            >
              Já configurei manualmente? Pular Setup
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
