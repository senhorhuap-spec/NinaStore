import { pb } from './pocketbase';

export async function runMigrations() {
  const collectionDefinitions = [
    {
      name: 'stores',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'owner', type: 'relation', options: { collectionId: 'users', cascadeDelete: true, maxSelect: 1 } }
      ],
      listRule: '', 
      viewRule: '', 
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && owner = @request.auth.id',
      deleteRule: '@request.auth.id != "" && owner = @request.auth.id',
    },
    {
      name: 'categories',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true },
        { name: 'store', type: 'relation', required: true, options: { minSelect: null, maxSelect: 1, collectionId: 'stores', cascadeDelete: true } }
      ],
      listRule: '', 
      viewRule: '', 
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'products',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'price', type: 'number', required: true },
        { name: 'image', type: 'file', options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/jpg', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/gif'] } },
        { name: 'category', type: 'relation', options: { minSelect: null, maxSelect: 1, collectionId: 'categories', cascadeDelete: false } },
        { name: 'store', type: 'relation', options: { minSelect: null, maxSelect: 1, collectionId: 'stores', cascadeDelete: true } }
      ],
      listRule: '', 
      viewRule: '', 
      createRule: '@request.auth.id != ""', 
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'inventory',
      type: 'base',
      schema: [
        { name: 'product', type: 'relation', required: true, options: { minSelect: null, maxSelect: 1, collectionId: 'products', cascadeDelete: true } },
        { name: 'code', type: 'text', required: true },
        { name: 'status', type: 'select', required: true, options: { values: ['available', 'sold'], maxSelect: 1 } }
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
    },
    {
      name: 'sales',
      type: 'base',
      schema: [
        { name: 'store', type: 'relation', required: true, options: { minSelect: null, maxSelect: 1, collectionId: 'stores', cascadeDelete: false } },
        { name: 'product', type: 'relation', required: true, options: { minSelect: null, maxSelect: 1, collectionId: 'products', cascadeDelete: false } },
        { name: 'customer_email', type: 'email', required: true },
        { name: 'amount', type: 'number', required: true },
        { name: 'code_delivered', type: 'text' }
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '', 
      updateRule: null,
      deleteRule: null,
    },
    {
      name: 'customers',
      type: 'base',
      schema: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'whatsapp', type: 'text', required: true },
        { name: 'password', type: 'text', required: true },
        { name: 'store', type: 'relation', required: true, options: { minSelect: null, maxSelect: 1, collectionId: 'stores', cascadeDelete: true } }
      ],
      listRule: '@request.auth.id != ""', 
      viewRule: '@request.auth.id != ""',
      createRule: '', 
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
    }
  ];

  const results = [];
  
  for (const colData of collectionDefinitions) {
    try {
      // 1. Try to check if it exists
      try {
        const existing = await pb.collections.getOne(colData.name);
        // Atualiza a coleção existente para garantir que o esquema e as regras estejam corretos
        await pb.collections.update(existing.id, colData as any);
        results.push({ name: colData.name, status: 'updated' });
      } catch (getErr: any) {
        // 2. If it doesn't exist (404), create it
        if (getErr.status === 404) {
          await pb.collections.create(colData as any);
          results.push({ name: colData.name, status: 'created' });
        } else {
          throw getErr;
        }
      }
    } catch (err: any) {
      console.error(`Erro na coleção ${colData.name}:`, err);
      // Detailed error for debugging
      const errorMsg = err.data?.message || err.message || "Erro desconhecido";
      results.push({ name: colData.name, status: 'error', message: errorMsg });
    }
  }

  return results;
}
