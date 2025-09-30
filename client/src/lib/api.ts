import { supabase } from './supabase';

// Helper para buscar usuário atual (fixo para dev)
export async function getCurrentUser() {
  return {
    id: 'dev-user-001',
    email: 'fabiorod001@example.com',
    first_name: 'Fabio',
    last_name: 'Rodrigues'
  };
}

// Buscar todas as propriedades
export async function getProperties() {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', user.id)
    .order('name');
  
  if (error) throw error;
  return data;
}

// Buscar todas as contas
export async function getAccounts() {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('display_order');
  
  if (error) throw error;
  return data;
}

// Buscar marco zero ativo
export async function getMarcoZero() {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('marco_zero')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // Ignora "não encontrado"
  return data;
}

// Buscar transações
export async function getTransactions(filters?: any) {
  const user = await getCurrentUser();
  let query = supabase
    .from('transactions')
    .select('*, property:properties(*)')
    .eq('user_id', user.id);
  
  if (filters?.propertyId) {
    query = query.eq('property_id', filters.propertyId);
  }
  
  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }
  
  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }
  
  const { data, error } = await query.order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Criar conta
export async function createAccount(accountData: any) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      ...accountData,
      user_id: user.id
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Atualizar conta
export async function updateAccount(id: number, accountData: any) {
  const { data, error } = await supabase
    .from('accounts')
    .update(accountData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Salvar marco zero
export async function saveMarcoZero(marcoData: any) {
  const user = await getCurrentUser();
  
  // Desativar marcos anteriores
  await supabase
    .from('marco_zero')
    .update({ is_active: false })
    .eq('user_id', user.id);
  
  // Criar novo marco
  const { data, error } = await supabase
    .from('marco_zero')
    .insert({
      ...marcoData,
      user_id: user.id,
      is_active: true
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
