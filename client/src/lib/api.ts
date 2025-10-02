// Helper para buscar usuário atual (fixo para dev)
export async function getCurrentUser() {
  const response = await fetch('/api/auth/user');
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

// Buscar todas as propriedades
export async function getProperties() {
  const response = await fetch('/api/properties');
  if (!response.ok) throw new Error('Failed to fetch properties');
  return response.json();
}

// Buscar todas as contas
export async function getAccounts() {
  const response = await fetch('/api/accounts');
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
}

// Buscar marco zero ativo
export async function getMarcoZero() {
  const response = await fetch('/api/marco-zero/active');
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch marco zero');
  }
  return response.json();
}

// Salvar marco zero
export async function saveMarcoZero(data: any) {
  const response = await fetch('/api/marco-zero', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to save marco zero');
  return response.json();
}