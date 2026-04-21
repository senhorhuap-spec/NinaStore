import PocketBase from 'pocketbase';

// Substitua pela URL do seu servidor PocketBase se estiver rodando externamente.
// Por padrão, se estiver rodando localmente, seria algo como http://127.0.0.1:8090
// Use a URL salva no localStorage ou a nova URL corrigida como padrão
const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('pb_url') : null;
const url = savedUrl || 'https://pb.botando.online'; 

export const pb = new PocketBase(url);

/**
 * NinaStore - Estrutura de Coleções Sugerida:
 * 
 * 1. stores (Tabela de Lojas)
 *    - name (text)
 *    - slug (text, index unique)
 *    - description (text)
 *    - logo (file)
 *    - owner (relation -> users)
 * 
 * 2. products (Tabela de Produtos/Gift Cards)
 *    - store (relation -> stores)
 *    - name (text)
 *    - description (text)
 *    - price (number)
 *    - image (file)
 *    - category (select/text)
 * 
 * 3. inventory (Tabela de Códigos/Estoque)
 *    - product (relation -> products)
 *    - code (text)
 *    - is_sold (bool)
 * 
 * 4. sales (Tabela de Vendas)
 *    - store (relation -> stores)
 *    - product (relation -> products)
 *    - customer_email (email)
 *    - code_delivered (text)
 *    - amount (number)
 */
