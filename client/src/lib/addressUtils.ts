import { Property } from "@shared/schema";

export interface AddressData {
  condominiumName?: string | null;
  street?: string | null;
  number?: string | null;
  tower?: string | null;
  unit?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
}

/**
 * Formats address according to the specified format:
 * Nome do Condomínio
 * Logradouro, número - Torre, Ap. unidade, Bairro, Cidade-Estado, País, Cep
 */
export function formatAddress(address: AddressData): string {
  const lines: string[] = [];
  
  // Line 1: Nome do Condomínio (sozinho na primeira linha)
  if (address.condominiumName) {
    lines.push(address.condominiumName);
  }
  
  // Line 2: Logradouro, número - Torre, Ap. unidade, Bairro, Cidade-Estado, País, Cep
  const line2Parts: string[] = [];
  
  // Logradouro, número
  if (address.street && address.number) {
    line2Parts.push(`${address.street}, ${address.number}`);
  } else if (address.street) {
    line2Parts.push(address.street);
  } else if (address.number) {
    line2Parts.push(address.number);
  }
  
  // Torre, Ap. unidade
  const towerUnit: string[] = [];
  if (address.tower) towerUnit.push(`Torre ${address.tower}`);
  if (address.unit) towerUnit.push(`Ap. ${address.unit}`);
  if (towerUnit.length > 0) {
    line2Parts.push(`- ${towerUnit.join(', ')}`);
  }
  
  // Bairro
  if (address.neighborhood) {
    line2Parts.push(address.neighborhood);
  }
  
  // Cidade-Estado
  if (address.city && address.state) {
    line2Parts.push(`${address.city}-${address.state}`);
  } else if (address.city) {
    line2Parts.push(address.city);
  } else if (address.state) {
    line2Parts.push(address.state);
  }
  
  // País
  if (address.country) {
    line2Parts.push(address.country);
  }
  
  // CEP
  if (address.zipCode) {
    line2Parts.push(address.zipCode);
  }
  
  if (line2Parts.length > 0) {
    lines.push(line2Parts.join('   '));
  }
  
  return lines.join('\n');
}

/**
 * Formats address for display in a single line (for compact views)
 */
export function formatAddressInline(address: AddressData): string {
  return formatAddress(address).replace('\n', ', ');
}

/**
 * Checks if address has any filled fields
 */
export function hasAddressData(address: AddressData): boolean {
  return !!(
    address.condominiumName ||
    address.street ||
    address.number ||
    address.tower ||
    address.unit ||
    address.neighborhood ||
    address.city ||
    address.state ||
    address.country ||
    address.zipCode
  );
}