import { db } from './db';
import { transactions, properties } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

interface AirbnbSession {
  cookies: string;
  xCsrfToken: string;
  userId: string;
  lastUpdated: Date;
}

interface AirbnbTransaction {
  propertyName: string;
  amount: number;
  date: string;
  description: string;
  type: 'payout' | 'reservation';
  reservationCode?: string;
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  status?: string;
}

export class AirbnbIntegration {
  private sessionFile = path.join(process.cwd(), '.airbnb-session.json');
  private session: AirbnbSession | null = null;

  /**
   * Save session after manual login
   * User needs to:
   * 1. Login to Airbnb manually
   * 2. Open DevTools (F12)
   * 3. Go to Network tab
   * 4. Find any request to airbnb.com
   * 5. Copy Cookie header and X-Csrf-Token
   */
  async saveSession(cookies: string, csrfToken: string, userId: string) {
    this.session = {
      cookies,
      xCsrfToken: csrfToken,
      userId,
      lastUpdated: new Date()
    };

    await fs.writeFile(this.sessionFile, JSON.stringify(this.session, null, 2));
    console.log('✅ Session saved successfully');
    return true;
  }

  async loadSession(): Promise<boolean> {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf-8');
      this.session = JSON.parse(data);
      
      // Check if session is still valid (less than 7 days old)
      if (this.session) {
        const daysSinceUpdate = (Date.now() - new Date(this.session.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 7) {
          console.warn('⚠️ Session is older than 7 days, may need refresh');
          return false;
        }
        console.log('✅ Session loaded successfully');
        return true;
      }
    } catch (error) {
      console.log('📝 No saved session found');
    }
    return false;
  }

  /**
   * Try to fetch data using Airbnb's internal API
   * This uses the saved session cookies
   */
  async fetchTransactionHistory(): Promise<AirbnbTransaction[]> {
    if (!this.session) {
      throw new Error('No session available. Please login first.');
    }

    const transactions: AirbnbTransaction[] = [];
    
    try {
      // Try to use Airbnb's internal API endpoints
      // These endpoints may change, so we need error handling
      const response = await axios.get('https://www.airbnb.com/api/v2/earnings/transaction_history', {
        headers: {
          'Cookie': this.session.cookies,
          'X-Csrf-Token': this.session.xCsrfToken,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        params: {
          limit: 1000,
          offset: 0,
          year: 'all' // Try to get all years
        }
      });

      if (response.data && response.data.transactions) {
        for (const item of response.data.transactions) {
          transactions.push({
            propertyName: item.listing_name || item.property_name,
            amount: parseFloat(item.amount || item.payout_amount || 0),
            date: this.formatDate(item.date || item.payout_date),
            description: this.buildDescription(item),
            type: 'payout',
            reservationCode: item.confirmation_code,
            guestName: item.guest_name
          });
        }
      }

      console.log(`✅ Fetched ${transactions.length} transactions via API`);
    } catch (error: any) {
      console.error('❌ API fetch failed:', error.message);
      console.log('💡 Falling back to CSV import method');
      throw new Error('API_FAILED');
    }

    return transactions;
  }

  /**
   * Fetch future reservations
   */
  async fetchFutureReservations(): Promise<AirbnbTransaction[]> {
    if (!this.session) {
      throw new Error('No session available. Please login first.');
    }

    const reservations: AirbnbTransaction[] = [];
    
    try {
      const response = await axios.get('https://www.airbnb.com/api/v2/reservations', {
        headers: {
          'Cookie': this.session.cookies,
          'X-Csrf-Token': this.session.xCsrfToken,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        params: {
          collection: 'upcoming',
          limit: 100
        }
      });

      if (response.data && response.data.reservations) {
        for (const item of response.data.reservations) {
          reservations.push({
            propertyName: item.listing_name,
            amount: parseFloat(item.expected_payout || item.total_price || 0),
            date: this.formatDate(item.start_date || item.check_in),
            description: `Reserva futura - ${item.guest_name || 'Hóspede'} (${item.nights || 1} noites)`,
            type: 'reservation',
            reservationCode: item.confirmation_code,
            guestName: item.guest_name,
            checkIn: item.start_date,
            checkOut: item.end_date,
            nights: item.nights,
            status: item.status
          });
        }
      }

      console.log(`✅ Fetched ${reservations.length} future reservations`);
    } catch (error: any) {
      console.error('❌ Failed to fetch reservations:', error.message);
    }

    return reservations;
  }

  private formatDate(dateStr: any): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
  }

  private buildDescription(item: any): string {
    const parts = ['Airbnb'];
    
    if (item.type) parts.push(item.type);
    if (item.guest_name) parts.push(`- ${item.guest_name}`);
    if (item.confirmation_code) parts.push(`(${item.confirmation_code})`);
    
    return parts.join(' ').trim();
  }

  /**
   * Map property names using fuzzy matching
   */
  async mapProperties(airbnbTransactions: AirbnbTransaction[], userId: string) {
    const allProperties = await db.select().from(properties).where(eq(properties.userId, userId));
    const propertiesWithAirbnb = allProperties.filter(p => p.airbnbName);
    
    const propertyMap = new Map<string, typeof properties.$inferSelect>();
    
    const normalizeString = (str: string) => {
      return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
    };

    const calculateSimilarity = (str1: string, str2: string): number => {
      const norm1 = normalizeString(str1);
      const norm2 = normalizeString(str2);
      
      if (norm1 === norm2) return 1.0;
      if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
      
      // Levenshtein distance for fuzzy matching
      const matrix: number[][] = [];
      for (let i = 0; i <= norm2.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= norm1.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= norm2.length; i++) {
        for (let j = 1; j <= norm1.length; j++) {
          if (norm2.charAt(i - 1) === norm1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      
      const maxLen = Math.max(norm1.length, norm2.length);
      if (maxLen === 0) return 1.0;
      return 1 - (matrix[norm2.length][norm1.length] / maxLen);
    };

    // Match properties
    for (const transaction of airbnbTransactions) {
      let bestMatch: typeof properties.$inferSelect | null = null;
      let bestScore = 0;
      
      for (const property of propertiesWithAirbnb) {
        if (!property.airbnbName) continue;
        
        const score = calculateSimilarity(transaction.propertyName, property.airbnbName);
        if (score > bestScore && score > 0.6) { // 60% minimum similarity
          bestScore = score;
          bestMatch = property;
        }
      }
      
      if (bestMatch) {
        propertyMap.set(transaction.propertyName, bestMatch);
        console.log(`✅ Matched "${transaction.propertyName}" to "${bestMatch.name}" (${(bestScore * 100).toFixed(0)}% match)`);
      } else {
        console.warn(`⚠️ No match for: "${transaction.propertyName}"`);
      }
    }

    return propertyMap;
  }

  /**
   * Save transactions to database
   */
  async saveTransactions(
    airbnbTransactions: AirbnbTransaction[], 
    propertyMap: Map<string, any>,
    userId: string
  ) {
    // Delete existing Airbnb transactions
    const propertyIds = Array.from(new Set(Array.from(propertyMap.values()).map(p => p.id)));
    
    if (propertyIds.length > 0) {
      console.log(`🗑️ Removing old Airbnb transactions...`);
      
      for (const propertyId of propertyIds) {
        await db.delete(transactions).where(
          and(
            eq(transactions.propertyId, propertyId),
            eq(transactions.userId, userId),
            eq(transactions.category, 'airbnb')
          )
        );
      }
    }

    // Insert new transactions
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const transaction of airbnbTransactions) {
      const property = propertyMap.get(transaction.propertyName);
      
      if (!property) {
        skipped++;
        errors.push(`Não encontrado: ${transaction.propertyName}`);
        continue;
      }

      try {
        await db.insert(transactions).values({
          userId,
          propertyId: property.id,
          type: 'revenue',
          category: 'airbnb',
          description: transaction.description,
          amount: transaction.amount,
          date: transaction.date,
          currency: 'BRL'
        });
        imported++;
      } catch (error) {
        console.error(`Erro ao inserir:`, error);
        errors.push(`Falha: ${transaction.description}`);
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Main sync function
   */
  async syncAirbnbData(userId: string) {
    try {
      // Try to load saved session
      const hasSession = await this.loadSession();
      
      if (!hasSession) {
        return {
          success: false,
          requiresLogin: true,
          message: 'Sessão expirada ou não encontrada. Por favor, faça login manualmente no Airbnb primeiro.'
        };
      }

      // Fetch data from Airbnb
      console.log('📊 Buscando dados do Airbnb...');
      const historicalData = await this.fetchTransactionHistory();
      const futureData = await this.fetchFutureReservations();
      
      const allTransactions = [...historicalData, ...futureData];
      
      if (allTransactions.length === 0) {
        return {
          success: false,
          message: 'Nenhuma transação encontrada. Verifique se a sessão ainda é válida.'
        };
      }

      // Map properties
      console.log('🔄 Mapeando propriedades...');
      const propertyMap = await this.mapProperties(allTransactions, userId);
      
      // Save to database
      console.log('💾 Salvando no banco de dados...');
      const result = await this.saveTransactions(allTransactions, propertyMap, userId);
      
      return {
        success: true,
        totalFound: allTransactions.length,
        ...result
      };
    } catch (error: any) {
      if (error.message === 'API_FAILED') {
        return {
          success: false,
          fallbackToCsv: true,
          message: 'API do Airbnb não acessível. Use o método de importação CSV.'
        };
      }
      
      console.error('❌ Erro na sincronização:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }
}

export const airbnbIntegration = new AirbnbIntegration();