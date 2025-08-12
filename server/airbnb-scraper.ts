import puppeteer from 'puppeteer';
import { db } from './db';
import { transactions, properties } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

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

interface AirbnbCredentials {
  email: string;
  password: string;
}

export class AirbnbScraper {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private credentials: AirbnbCredentials;

  constructor(credentials: AirbnbCredentials) {
    this.credentials = credentials;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set viewport and user agent to appear more like a real browser
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  }

  async login() {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🔐 Logging into Airbnb...');
    
    // Navigate to Airbnb host login
    await this.page.goto('https://www.airbnb.com/login', { waitUntil: 'networkidle2' });
    
    // Wait for login form
    await this.page.waitForSelector('[data-testid="email-login-email"]', { timeout: 30000 });
    
    // Enter email
    await this.page.type('[data-testid="email-login-email"]', this.credentials.email);
    
    // Click continue
    await this.page.click('[data-testid="signup-login-submit-btn"]');
    
    // Wait for password field
    await this.page.waitForSelector('[data-testid="email-signup-password"]', { timeout: 10000 });
    
    // Enter password
    await this.page.type('[data-testid="email-signup-password"]', this.credentials.password);
    
    // Submit login
    await this.page.click('[data-testid="signup-login-submit-btn"]');
    
    // Wait for navigation to complete
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('✅ Successfully logged into Airbnb');
  }

  async navigateToPayouts() {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('📊 Navigating to payouts section...');
    
    // Go to host dashboard
    await this.page.goto('https://www.airbnb.com/hosting/listings', { waitUntil: 'networkidle2' });
    
    // Navigate to earnings/payouts section
    await this.page.goto('https://www.airbnb.com/hosting/earnings', { waitUntil: 'networkidle2' });
    
    console.log('✅ Reached payouts section');
  }

  async scrapePayoutHistory(): Promise<AirbnbTransaction[]> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🔍 Scraping payout history...');
    const payouts: AirbnbTransaction[] = [];

    try {
      // Navigate to transaction history
      await this.page.goto('https://www.airbnb.com/hosting/earnings/transaction-history', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      // Wait for the table to load
      await this.page.waitForSelector('[data-testid="transaction-history-table"]', { timeout: 30000 });

      // Keep scrolling to load all transactions
      let previousHeight = 0;
      let currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      
      while (previousHeight !== currentHeight) {
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await this.page.waitForTimeout(2000); // Wait for new content to load
        previousHeight = currentHeight;
        currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      }

      // Extract transaction data
      const transactions = await this.page.evaluate(() => {
        const rows = document.querySelectorAll('[data-testid="transaction-row"]');
        const data: any[] = [];
        
        rows.forEach(row => {
          const dateElement = row.querySelector('[data-testid="transaction-date"]');
          const propertyElement = row.querySelector('[data-testid="listing-name"]');
          const amountElement = row.querySelector('[data-testid="transaction-amount"]');
          const typeElement = row.querySelector('[data-testid="transaction-type"]');
          const guestElement = row.querySelector('[data-testid="guest-name"]');
          const reservationElement = row.querySelector('[data-testid="reservation-code"]');
          
          if (dateElement && propertyElement && amountElement) {
            data.push({
              date: dateElement.textContent?.trim(),
              propertyName: propertyElement.textContent?.trim(),
              amount: parseFloat(amountElement.textContent?.replace(/[^0-9.-]/g, '') || '0'),
              type: typeElement?.textContent?.trim() || 'payout',
              guestName: guestElement?.textContent?.trim(),
              reservationCode: reservationElement?.textContent?.trim()
            });
          }
        });
        
        return data;
      });

      // Convert to our transaction format
      transactions.forEach(t => {
        payouts.push({
          propertyName: t.propertyName,
          amount: t.amount,
          date: this.parseAirbnbDate(t.date),
          description: `Airbnb ${t.type} - ${t.guestName || 'Guest'} ${t.reservationCode ? `(${t.reservationCode})` : ''}`.trim(),
          type: 'payout',
          guestName: t.guestName,
          reservationCode: t.reservationCode
        });
      });

      console.log(`✅ Found ${payouts.length} historical payouts`);
    } catch (error) {
      console.error('❌ Error scraping payout history:', error);
    }

    return payouts;
  }

  async scrapeFutureReservations(): Promise<AirbnbTransaction[]> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🔮 Scraping future reservations...');
    const reservations: AirbnbTransaction[] = [];

    try {
      // Navigate to reservations
      await this.page.goto('https://www.airbnb.com/hosting/reservations/upcoming', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      // Wait for reservations to load
      await this.page.waitForSelector('[data-testid="reservation-item"]', { timeout: 30000 });

      // Load all reservations by scrolling
      let previousHeight = 0;
      let currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      
      while (previousHeight !== currentHeight) {
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await this.page.waitForTimeout(2000);
        previousHeight = currentHeight;
        currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      }

      // Extract reservation data
      const futureReservations = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[data-testid="reservation-item"]');
        const data: any[] = [];
        
        items.forEach(item => {
          const propertyElement = item.querySelector('[data-testid="listing-name"]');
          const guestElement = item.querySelector('[data-testid="guest-name"]');
          const checkInElement = item.querySelector('[data-testid="check-in-date"]');
          const checkOutElement = item.querySelector('[data-testid="check-out-date"]');
          const amountElement = item.querySelector('[data-testid="payout-amount"]');
          const statusElement = item.querySelector('[data-testid="reservation-status"]');
          const codeElement = item.querySelector('[data-testid="confirmation-code"]');
          const nightsElement = item.querySelector('[data-testid="nights-count"]');
          
          if (propertyElement && checkInElement && amountElement) {
            data.push({
              propertyName: propertyElement.textContent?.trim(),
              guestName: guestElement?.textContent?.trim() || 'Guest',
              checkIn: checkInElement.textContent?.trim(),
              checkOut: checkOutElement?.textContent?.trim(),
              amount: parseFloat(amountElement.textContent?.replace(/[^0-9.-]/g, '') || '0'),
              status: statusElement?.textContent?.trim() || 'confirmed',
              reservationCode: codeElement?.textContent?.trim(),
              nights: parseInt(nightsElement?.textContent?.replace(/[^0-9]/g, '') || '1')
            });
          }
        });
        
        return data;
      });

      // Convert to our transaction format
      futureReservations.forEach(r => {
        // Create a transaction for the payout date (usually check-in date)
        reservations.push({
          propertyName: r.propertyName,
          amount: r.amount,
          date: this.parseAirbnbDate(r.checkIn),
          description: `Airbnb Reservation - ${r.guestName} (${r.nights} nights) ${r.reservationCode ? `- ${r.reservationCode}` : ''}`.trim(),
          type: 'reservation',
          guestName: r.guestName,
          reservationCode: r.reservationCode,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          nights: r.nights,
          status: r.status
        });
      });

      console.log(`✅ Found ${reservations.length} future reservations`);
    } catch (error) {
      console.error('❌ Error scraping future reservations:', error);
    }

    return reservations;
  }

  private parseAirbnbDate(dateStr: string): string {
    // Parse various Airbnb date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Try parsing "MMM DD, YYYY" format
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = dateStr.split(/[\s,]+/);
    if (parts.length >= 3) {
      const monthIndex = monthNames.findIndex(m => parts[0].startsWith(m));
      if (monthIndex !== -1) {
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        if (!isNaN(day) && !isNaN(year)) {
          return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    }
    
    // Default to today if parsing fails
    console.warn(`Could not parse date: ${dateStr}`);
    return new Date().toISOString().split('T')[0];
  }

  async mapAndSaveTransactions(airbnbTransactions: AirbnbTransaction[], userId: string) {
    console.log('💾 Mapping properties and saving transactions...');
    
    // Get all properties with Airbnb names
    const allProperties = await db.select().from(properties).where(eq(properties.userId, userId));
    const propertiesWithAirbnb = allProperties.filter(p => p.airbnbName);
    
    if (propertiesWithAirbnb.length === 0) {
      console.warn('⚠️ No properties with Airbnb names found');
      return { imported: 0, skipped: 0, errors: [] };
    }

    // Create a map for fuzzy matching
    const propertyMap = new Map<string, typeof properties.$inferSelect>();
    
    // Helper function for fuzzy matching
    const normalizeString = (str: string) => {
      return str.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
    };

    const calculateSimilarity = (str1: string, str2: string): number => {
      const norm1 = normalizeString(str1);
      const norm2 = normalizeString(str2);
      
      // Exact match
      if (norm1 === norm2) return 1.0;
      
      // Check if one contains the other
      if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
      
      // Calculate word overlap
      const words1 = new Set(norm1.split(' '));
      const words2 = new Set(norm2.split(' '));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      
      if (union.size === 0) return 0;
      return intersection.size / union.size;
    };

    // Build property map with fuzzy matching
    for (const transaction of airbnbTransactions) {
      let bestMatch: typeof properties.$inferSelect | null = null;
      let bestScore = 0;
      
      for (const property of propertiesWithAirbnb) {
        if (!property.airbnbName) continue;
        
        const score = calculateSimilarity(transaction.propertyName, property.airbnbName);
        if (score > bestScore && score > 0.5) { // Minimum 50% similarity
          bestScore = score;
          bestMatch = property;
        }
      }
      
      if (bestMatch) {
        propertyMap.set(transaction.propertyName, bestMatch);
        console.log(`✅ Matched "${transaction.propertyName}" to "${bestMatch.name}" (score: ${(bestScore * 100).toFixed(1)}%)`);
      } else {
        console.warn(`⚠️ Could not match property: "${transaction.propertyName}"`);
      }
    }

    // Delete existing Airbnb transactions for matched properties
    const propertyIds = Array.from(new Set(Array.from(propertyMap.values()).map(p => p.id)));
    
    if (propertyIds.length > 0) {
      console.log(`🗑️ Removing old Airbnb transactions for ${propertyIds.length} properties...`);
      
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
        errors.push(`Property not matched: ${transaction.propertyName}`);
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
        console.error(`Error inserting transaction:`, error);
        errors.push(`Failed to insert: ${transaction.description}`);
        skipped++;
      }
    }

    console.log(`✅ Import complete: ${imported} imported, ${skipped} skipped`);
    return { imported, skipped, errors };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async scrapeAll(userId: string) {
    try {
      await this.initialize();
      await this.login();
      await this.navigateToPayouts();
      
      // Scrape both historical and future data
      const payouts = await this.scrapePayoutHistory();
      const reservations = await this.scrapeFutureReservations();
      
      // Combine all transactions
      const allTransactions = [...payouts, ...reservations];
      
      console.log(`📊 Total transactions found: ${allTransactions.length}`);
      
      // Map and save to database
      const result = await this.mapAndSaveTransactions(allTransactions, userId);
      
      return {
        success: true,
        totalFound: allTransactions.length,
        ...result
      };
    } catch (error) {
      console.error('❌ Scraping failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalFound: 0,
        imported: 0,
        skipped: 0,
        errors: []
      };
    } finally {
      await this.cleanup();
    }
  }
}