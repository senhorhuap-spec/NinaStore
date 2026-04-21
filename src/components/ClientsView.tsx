import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Calendar,
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { ContextualHelp } from './ContextualHelp';

interface Customer {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  created: string;
}

export function ClientsView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      // First, get the store ID of the current user
      const store = await pb.collection('stores').getFirstListItem(`owner="${pb.authStore.model?.id}"`, { requestKey: null });
      
      const records = await pb.collection('customers').getFullList<Customer>({
        filter: `store="${store.id}"`,
        sort: '-created',
        requestKey: null
      });
      setCustomers(records);
    } catch (err: any) {
      if (err.isAbort) return;
      console.error("Erro ao carregar clientes:", err);
      // If store not found, it's a different error
      if (err.status === 404) {
         setCustomers([]);
      } else {
         setError("Não foi possível carregar a lista de clientes.");
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.whatsapp.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Carregando base de clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Clientes</h2>
            <ContextualHelp 
              title="Base de Dados" 
              description="Visualize todos os usuários que se cadastraram no portal da sua loja." 
              position="right"
            />
          </div>
          <p className="text-sm text-slate-500 font-medium font-sans">Acompanhe quem são seus compradores ativos.</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, e-mail ou whatsapp..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-600"
            />
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest">
            <Users size={16} />
            <span>{customers.length} Clientes</span>
          </div>
        </div>

        {error ? (
          <div className="p-20 text-center space-y-4">
            <AlertCircle size={40} className="text-red-500 mx-auto" />
            <p className="text-slate-500 font-bold">{error}</p>
            <button onClick={fetchCustomers} className="text-indigo-600 font-black text-xs uppercase tracking-widest">Tentar Novamente</button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
               <Users size={32} />
            </div>
            <p className="text-slate-400 font-bold italic">Nenhum cliente {searchTerm ? 'encontrado' : 'cadastrado ainda'}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Contato</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cadastrado em</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-sm shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{customer.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                            <Mail size={12} />
                            {customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                          <Phone size={14} className="text-emerald-500" />
                          {customer.whatsapp}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                          <Calendar size={14} />
                          {new Date(customer.created).toLocaleDateString()}
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <a 
                        href={`https://wa.me/${customer.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all inline-flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
                       >
                         <ExternalLink size={16} />
                         Chamar
                       </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
