import { BaseService } from "./BaseService";
import type { IStorage } from "../storage";
import { PropertyService } from "./PropertyService";
import { TransactionService } from "./TransactionService";
import { insertPropertySchema, insertTransactionSchema } from "@shared/schema";
import { parseAirbnbCSV, mapListingToProperty } from "../csvParser";
import { parseCleaningPdf } from "../cleaningPdfParser";
import * as XLSX from "xlsx";
import { z } from "zod";
import { db } from "../db";
import { transactions, properties, cleaningServiceDetails } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { format } from "date-fns";

/**
 * Service for handling various data import operations
 */
export class ImportService extends BaseService {
  private propertyService: PropertyService;
  private transactionService: TransactionService;

  constructor(storage: IStorage) {
    super(storage);
    this.propertyService = new PropertyService(storage);
    this.transactionService = new TransactionService(storage);
  }

  /**
   * Import historical data from Excel
   */
  async importHistoricalData(userId: string, fileBuffer: Buffer, format: string = 'consolidated'): Promise<any> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    let importedCount = 0;
    const errors: string[] = [];
    const summary = {
      properties: 0,
      revenues: 0,
      expenses: 0,
      years: [] as string[]
    };

    // Property names from user's list
    const PROPERTY_NAMES = [
      "Sevilha 307", "Sevilha G07", "Málaga M07", "MaxHaus 43R", "Salas Brasal",
      "Next Haddock Lobo ap 33", "Sesimbra ap 505- Portugal", "Thera by You",
      "Casa Ibirapuera torre 3 ap 1411", "Living Full Faria Lima setor 1 res 1808"
    ];

    // Create properties first if they don't exist
    const existingProperties = await this.storage.getProperties(userId);
    const existingPropertyNames = new Set(existingProperties.map(p => p.name));
    
    for (const propertyName of PROPERTY_NAMES) {
      if (!existingPropertyNames.has(propertyName)) {
        try {
          await this.propertyService.createProperty(userId, {
            name: propertyName,
            address: "Endereço a ser preenchido",
            type: "apartment",
            status: "active",
            rentalValue: 0,
            currency: propertyName.includes("Portugal") ? "EUR" : "BRL",
          });
          summary.properties++;
        } catch (error) {
          errors.push(`Erro ao criar imóvel ${propertyName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }

    // Get updated properties list
    const allProperties = await this.storage.getProperties(userId);
    const propertyMap = new Map(allProperties.map(p => [p.name.toLowerCase(), p.id]));

    // Process sheets by year
    const years = ['2022', '2023', '2024', '2025'];
    
    for (const year of years) {
      if (workbook.SheetNames.includes(year)) {
        summary.years.push(year);
        const sheet = workbook.Sheets[year];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        // Process data based on format
        if (format === 'consolidated') {
          await this.processConsolidatedFormat(userId, rows, year, propertyMap, summary, errors);
        } else {
          await this.processPerPropertyFormat(userId, rows, year, propertyMap, summary, errors);
        }
      }
    }

    return {
      success: true,
      importedCount: summary.revenues + summary.expenses,
      summary,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Process consolidated format (all properties in one sheet)
   */
  private async processConsolidatedFormat(
    userId: string,
    rows: any[][],
    year: string,
    propertyMap: Map<string, number>,
    summary: any,
    errors: string[]
  ): Promise<void> {
    const monthColumns = [
      'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
      'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
    ];

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!row || row.length < 2) continue;

      const propertyName = String(row[0] || '').trim();
      if (!propertyName || propertyName === 'TOTAL') continue;

      const propertyId = propertyMap.get(propertyName.toLowerCase());
      if (!propertyId) {
        errors.push(`Propriedade não encontrada: ${propertyName}`);
        continue;
      }

      const transactionType = String(row[1] || '').trim().toLowerCase();
      const isRevenue = transactionType.includes('receita') || transactionType.includes('aluguel');
      const type = isRevenue ? 'revenue' : 'expense';
      const category = this.determineCategory(transactionType);

      // Process each month
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const value = row[monthIndex + 2];
        if (!value || value === 0) continue;

        const amount = Math.abs(typeof value === 'string' 
          ? parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.'))
          : value);

        if (amount > 0) {
          try {
            await this.transactionService.createTransaction(userId, {
              propertyId,
              type,
              category,
              description: `${transactionType} - ${monthColumns[monthIndex]}/${year}`,
              amount,
              date: new Date(parseInt(year), monthIndex, 15),
              isHistorical: true
            });

            if (isRevenue) {
              summary.revenues++;
            } else {
              summary.expenses++;
            }
          } catch (error) {
            errors.push(`Erro ao importar transação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
          }
        }
      }
    }
  }

  /**
   * Process per-property format (each property in separate sheet)
   */
  private async processPerPropertyFormat(
    userId: string,
    rows: any[][],
    year: string,
    propertyMap: Map<string, number>,
    summary: any,
    errors: string[]
  ): Promise<void> {
    // Implementation for per-property format
    // Similar to consolidated but adapted for different sheet structure
  }

  /**
   * Determine transaction category based on type description
   */
  private determineCategory(transactionType: string): string {
    const type = transactionType.toLowerCase();
    
    if (type.includes('aluguel') || type.includes('locação')) return 'rental';
    if (type.includes('airbnb')) return 'airbnb';
    if (type.includes('booking')) return 'booking';
    if (type.includes('condominio') || type.includes('condomínio')) return 'condominium';
    if (type.includes('iptu')) return 'taxes';
    if (type.includes('energia') || type.includes('luz')) return 'utilities';
    if (type.includes('água') || type.includes('agua')) return 'utilities';
    if (type.includes('internet') || type.includes('telefone')) return 'utilities';
    if (type.includes('gestão') || type.includes('gestao') || type.includes('administração')) return 'management';
    if (type.includes('manutenção') || type.includes('manutencao') || type.includes('reparo')) return 'maintenance';
    if (type.includes('limpeza')) return 'cleaning';
    if (type.includes('seguro')) return 'insurance';
    
    return 'other';
  }

  /**
   * Analyze Airbnb CSV for preview
   */
  async analyzeAirbnbCSV(userId: string, csvContent: string, type?: string): Promise<any> {
    // Parse CSV
    const parseResult = parseAirbnbCSV(csvContent);
    
    if (!parseResult.success) {
      throw new Error(parseResult.error || 'Erro ao processar arquivo CSV');
    }

    const propertyMapping = await this.propertyService.buildAirbnbPropertyMapping(userId);
    
    if (type === 'pending') {
      return this.analyzePendingReservations(parseResult.rows, propertyMapping);
    }
    
    return this.analyzePayoutsAndReservations(parseResult.rows, propertyMapping);
  }

  /**
   * Analyze pending reservations
   */
  private analyzePendingReservations(rows: any[], propertyMapping: Record<string, string>): any {
    const futureReservations = rows.filter(row => row.isFutureReservation);
    const mappedReservations = [];
    const unmappedListings = new Set<string>();
    
    for (const reservation of futureReservations) {
      const propertyName = mapListingToProperty(reservation.listing);
      
      if (propertyName) {
        mappedReservations.push({
          data: reservation.date,
          dataInicio: reservation.checkIn,
          dataTermino: reservation.checkOut,
          noites: reservation.nights,
          hospede: reservation.guest,
          anuncio: reservation.listing,
          codigo: reservation.confirmationCode,
          valor: reservation.amount,
          moeda: reservation.currency,
          propertyName: propertyName
        });
      } else {
        unmappedListings.add(reservation.listing);
      }
    }

    const propertiesFound = [...new Set(mappedReservations.map(r => r.propertyName))];
    const periods = [...new Set(mappedReservations.map(r => {
      const date = new Date(r.dataInicio);
      return format(date, 'MM/yyyy');
    }))];
    
    const totalRevenue = mappedReservations.reduce((sum, r) => sum + r.valor, 0);

    return {
      properties: propertiesFound,
      periods,
      totalRevenue,
      reservations: mappedReservations,
      unmappedListings: Array.from(unmappedListings),
      reservationCount: mappedReservations.length
    };
  }

  /**
   * Analyze payouts and completed reservations
   */
  private analyzePayoutsAndReservations(rows: any[], propertyMapping: Record<string, string>): any {
    const payouts = rows.filter(row => row.type === 'payout');
    const reservations = rows.filter(row => row.type === 'reservation');
    
    const propertiesFound = new Set<string>();
    const periods = new Set<string>();
    let totalRevenue = 0;

    // Process payouts
    for (const payout of payouts) {
      const propertyName = mapListingToProperty(payout.listing);
      if (propertyName && propertyName !== 'IGNORE') {
        propertiesFound.add(propertyName);
        const date = new Date(payout.date);
        periods.add(format(date, 'MM/yyyy'));
        totalRevenue += payout.amount;
      }
    }

    // Process reservations
    for (const reservation of reservations) {
      const propertyName = mapListingToProperty(reservation.listing);
      if (propertyName && propertyName !== 'IGNORE') {
        propertiesFound.add(propertyName);
        if (reservation.checkIn) {
          const date = new Date(reservation.checkIn);
          periods.add(format(date, 'MM/yyyy'));
        }
      }
    }

    return {
      properties: Array.from(propertiesFound),
      periods: Array.from(periods).sort(),
      totalRevenue,
      payoutCount: payouts.length,
      reservationCount: reservations.length
    };
  }

  /**
   * Import Airbnb CSV data
   */
  async importAirbnbCSV(userId: string, csvContent: string): Promise<any> {
    const parseResult = parseAirbnbCSV(csvContent);
    
    if (!parseResult.success) {
      throw new Error(parseResult.error || 'Erro ao processar arquivo CSV');
    }

    const payouts = parseResult.rows.filter(row => row.type === 'payout');
    const reservations = parseResult.rows.filter(row => row.type === 'reservation');
    
    let importedPayouts = 0;
    let importedReservations = 0;
    let skippedDuplicates = 0;
    const errors: string[] = [];

    // Import payouts
    for (const payout of payouts) {
      try {
        const propertyName = mapListingToProperty(payout.listing);
        
        if (!propertyName || propertyName === 'IGNORE') {
          continue;
        }

        const property = await this.propertyService.getOrCreateProperty(userId, propertyName);
        
        // Check for duplicate
        const existingTransaction = await db
          .select()
          .from(transactions)
          .where(and(
            eq(transactions.userId, userId),
            eq(transactions.propertyId, property.id),
            eq(transactions.date, format(new Date(payout.date), 'yyyy-MM-dd')),
            eq(transactions.amount, payout.amount.toString()),
            eq(transactions.category, 'airbnb')
          ))
          .limit(1);

        if (existingTransaction.length > 0) {
          skippedDuplicates++;
          continue;
        }

        await this.transactionService.createTransaction(userId, {
          propertyId: property.id,
          type: 'revenue',
          category: 'airbnb',
          description: `Airbnb - ${payout.guest || 'Hóspede'}`,
          amount: payout.amount,
          date: payout.date,
          payerName: payout.guest,
          notes: payout.confirmationCode ? `Código: ${payout.confirmationCode}` : undefined
        });

        importedPayouts++;
      } catch (error) {
        errors.push(`Erro ao importar payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Import reservations
    for (const reservation of reservations) {
      try {
        const propertyName = mapListingToProperty(reservation.listing);
        
        if (!propertyName || propertyName === 'IGNORE' || !reservation.paidOut) {
          continue;
        }

        const property = await this.propertyService.getOrCreateProperty(userId, propertyName);
        
        // Store reservation details for future reference
        if (reservation.checkIn && reservation.checkOut) {
          await db.insert(cleaningServiceDetails).values({
            transactionId: null, // Will be linked later if needed
            date: new Date(reservation.checkIn),
            unit: property.name,
            guestName: reservation.guest,
            checkIn: new Date(reservation.checkIn),
            checkOut: new Date(reservation.checkOut),
            nights: reservation.nights,
            cleaningType: 'standard',
            amount: 0, // Will be filled when cleaning expense is created
            notes: `Reserva Airbnb: ${reservation.confirmationCode || ''}`
          });
        }

        importedReservations++;
      } catch (error) {
        errors.push(`Erro ao importar reserva: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      importedPayouts,
      importedReservations,
      skippedDuplicates,
      totalProcessed: payouts.length + reservations.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Import pending Airbnb reservations
   */
  async importPendingReservations(userId: string, reservations: any[]): Promise<any> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const reservation of reservations) {
      try {
        const property = await this.propertyService.getOrCreateProperty(userId, reservation.propertyName);
        
        // Check if already exists
        const existing = await db
          .select()
          .from(transactions)
          .where(and(
            eq(transactions.userId, userId),
            eq(transactions.propertyId, property.id),
            eq(transactions.accommodationStartDate, format(new Date(reservation.dataInicio), 'yyyy-MM-dd')),
            eq(transactions.payerName, reservation.hospede)
          ))
          .limit(1);

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        await this.transactionService.createTransaction(userId, {
          propertyId: property.id,
          type: 'revenue',
          category: 'airbnb',
          description: `Reserva Futura - ${reservation.hospede}`,
          amount: reservation.valor,
          date: reservation.dataInicio, // Use check-in date as transaction date
          accommodationStartDate: reservation.dataInicio,
          accommodationEndDate: reservation.dataTermino,
          payerName: reservation.hospede,
          notes: `Código: ${reservation.codigo} | ${reservation.noites} noites`
        });

        imported++;
      } catch (error) {
        errors.push(`Erro ao importar reserva: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      imported,
      skipped,
      total: reservations.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Parse and import cleaning expenses from PDF
   */
  async parseCleaningPDF(pdfBuffer: Buffer): Promise<any> {
    return await parseCleaningPdf(pdfBuffer);
  }

  /**
   * Import cleaning expenses from parsed PDF data
   */
  async importCleaningExpenses(userId: string, entries: any[], period: any): Promise<any> {
    const results = [];
    const errors: string[] = [];
    const skipped = [];

    for (const entry of entries) {
      try {
        // Get property by mapped name
        const properties = await this.storage.getProperties(userId);
        const property = properties.find(p => 
          p.name === entry.unit || 
          p.nickname === entry.unit
        );

        if (!property) {
          errors.push(`Propriedade não encontrada: ${entry.unit}`);
          continue;
        }

        // Check for duplicate
        const existingExpense = await db
          .select()
          .from(transactions)
          .where(and(
            eq(transactions.userId, userId),
            eq(transactions.propertyId, property.id),
            eq(transactions.date, entry.date),
            eq(transactions.category, 'cleaning'),
            sql`ABS(${transactions.amount} - ${entry.value}) < 0.01`
          ))
          .limit(1);

        if (existingExpense.length > 0) {
          skipped.push({
            unit: entry.unit,
            date: entry.date,
            value: entry.value,
            reason: 'Despesa já existe'
          });
          continue;
        }

        // Create the transaction
        const transaction = await this.transactionService.createTransaction(userId, {
          propertyId: property.id,
          type: 'expense',
          category: 'cleaning',
          description: `Limpeza - ${format(new Date(entry.date), 'dd/MM/yyyy')}`,
          amount: entry.value,
          date: entry.date,
          supplier: 'Serviço de Limpeza',
          notes: `Importado do PDF - Período: ${period.start} a ${period.end}`
        });

        results.push(transaction);
      } catch (error) {
        errors.push(`Erro ao importar ${entry.unit}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      imported: results.length,
      skipped: skipped.length,
      skippedDetails: skipped,
      errors: errors.length > 0 ? errors : undefined,
      transactions: results
    };
  }

  /**
   * Import detailed cleaning expenses with service records
   */
  async importDetailedCleaningExpenses(userId: string, data: any): Promise<any> {
    const { totalAmount, paymentDate, supplier, cpfCnpj, services } = data;
    
    // Create main transaction
    const mainTransaction = await this.transactionService.createTransaction(userId, {
      propertyId: null,
      type: 'expense',
      category: 'cleaning',
      description: `Limpeza - ${supplier}`,
      amount: totalAmount,
      date: paymentDate,
      supplier,
      cpfCnpj,
      isCompositeParent: true,
      notes: `Pagamento consolidado para ${services.length} serviços`
    });

    // Create service details
    for (const service of services) {
      await db.insert(cleaningServiceDetails).values({
        transactionId: mainTransaction.id,
        date: new Date(service.date),
        unit: service.unit,
        guestName: service.guestName,
        checkIn: service.checkIn ? new Date(service.checkIn) : null,
        checkOut: service.checkOut ? new Date(service.checkOut) : null,
        nights: service.nights,
        cleaningType: service.cleaningType || 'standard',
        amount: service.amount,
        notes: service.notes
      });

      // Create child transaction for the property
      const property = await this.propertyService.getOrCreateProperty(userId, service.unit);
      
      await this.transactionService.createTransaction(userId, {
        propertyId: property.id,
        type: 'expense',
        category: 'cleaning',
        description: `Limpeza - ${service.cleaningType || 'Padrão'}`,
        amount: service.amount,
        date: service.date,
        supplier,
        cpfCnpj,
        parentTransactionId: mainTransaction.id,
        notes: service.guestName ? `Hóspede: ${service.guestName}` : undefined
      });
    }

    return {
      success: true,
      mainTransaction,
      servicesCount: services.length,
      message: 'Despesas de limpeza importadas com sucesso!'
    };
  }
}