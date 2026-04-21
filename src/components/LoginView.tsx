import React, { useState } from 'react';
import { LogIn, UserPlus, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { pb } from '../lib/pocketbase';

export function LoginView({ onLogin }: { onLogin: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: ''
  });

  const [serverUrl, setServerUrl] = useState(pb.baseUrl);
  const [showServerConfig, setShowServerConfig] = useState(false);

  const updateServer = () => {
    pb.baseUrl = serverUrl;
    setShowServerConfig(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        // Register logic
        const user = await pb.collection('users').create({
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
          name: formData.name,
        });
        
        // Auto login after register
        await pb.collection('users').authWithPassword(formData.email, formData.password);

        // Create initial store for the user
        const storeSlug = formData.name.toLowerCase().trim().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 5);
        await pb.collection('stores').create({
          name: `Loja do ${formData.name}`,
          slug: storeSlug,
          owner: user.id
        });
      } else {
        // Login logic
        await pb.collection('users').authWithPassword(formData.email, formData.password);
      }
      onLogin();
    } catch (err: any) {
      console.error("Auth Error Details:", err);
      let msg = err.message || "Erro na autenticação. Verifique os dados.";
      
      // Erro de Identidade/Senha no PocketBase
      if (err.status === 400 && !isRegister) {
        msg = "E-mail ou senha incorretos. Se você ainda não tem conta, clique em 'Cadastrar minha loja' abaixo.";
      }

      if (err.status === 400 && isRegister) {
        msg = "Erro ao cadastrar. Verifique se a senha tem 8 caracteres ou se o e-mail já existe.";
      }
      
      if (err.message?.toLowerCase().includes('fetch') || !err.status || err.status === 0) {
        msg = (
          <div className="space-y-4">
            <p>O navegador bloqueou a conexão por segurança (Erro de Certificado SSL).</p>
            <div className="pt-2 border-t border-red-200">
              <p className="text-[10px] font-black uppercase mb-2">Para resolver agora:</p>
              <a 
                href={pb.baseUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-4 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100"
              >
                1. Abrir link e clicar em Avançado
              </a>
              <p className="mt-2 text-[10px] text-red-400">Depois de clicar em "Prosseguir" no link, volte aqui e tente entrar novamente.</p>
            </div>
          </div>
        );
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-6 font-sans">
      <motion.div 
        layout
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
              <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">NinaStore</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Multi-tenant Digital Assets</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {isRegister ? 'Criar sua Loja' : 'Acessar seu Painel'}
            </h2>
            <p className="text-slate-500 font-medium mt-1">
              {isRegister ? 'Cadastre-se para começar a vender hoje.' : 'Seja bem-vindo de volta, lojista.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {isRegister && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-1"
                  >
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Bruno Silva"
                      className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-slate-800"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="lojista@exemplo.com"
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                <input 
                  required
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-slate-800"
                />
              </div>

              {isRegister && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-1"
                >
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                  <input 
                    required
                    type="password" 
                    value={formData.passwordConfirm}
                    onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-bold text-slate-800"
                  />
                </motion.div>
              )}
            </div>

            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 mb-2 relative group">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Servidor:</p>
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

               <AnimatePresence>
                 {showServerConfig && (
                   <motion.div 
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="mt-3 space-y-2 overflow-hidden"
                   >
                     <input 
                       type="text" 
                       value={serverUrl}
                       onChange={(e) => setServerUrl(e.target.value)}
                       className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-100 outline-none"
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
               </AnimatePresence>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-4 pt-4">
              <button 
                disabled={loading}
                type="submit"
                className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    {isRegister ? <UserPlus size={24} /> : <LogIn size={24} />}
                    {isRegister ? 'Criar minha conta' : 'Entrar no sistema'}
                  </>
                )}
              </button>

              <button 
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="w-full py-4 text-slate-400 font-bold hover:text-indigo-600 transition-colors text-sm"
              >
                {isRegister ? 'Já tenho uma loja? Fazer Login' : 'Não tem conta? Cadastrar minha loja'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
