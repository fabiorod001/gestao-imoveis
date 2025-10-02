import {
  users,
  properties,
  transactions,
  expenseComponents,
  taxSettings,
  taxProjections,
  cleaningServices,
  cleaningBatches,
  propertyNameMappings,
  type User,
  type UpsertUser,
  type Property,
  type InsertProperty,
  type Transaction,
  type InsertTransaction,
  type TaxSettings,
  type InsertTaxSettings,
  type TaxProjection,
  type InsertTaxProjection,
  type CleaningService,
  type InsertCleaningService,
  type CleaningBatch,
  type InsertCleaningBatch,
  type PropertyNameMapping,
  type InsertPropertyNameMapping,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sum, sql, gte, lte, or, inArray, exists, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Property operations
  getProperties(userId: string): Promise<Property[]>;
  getProperty(id: number, userId: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>, userId: string): Promise<Property | undefined>;
  deleteProperty(id: number, userId: string): Promise<boolean>;

  // Transaction operations
  getTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  getTransactionsByType(userId: string, type: string, limit?: number): Promise<Transaction[]>;
  getTransactionsByProperty(propertyId: number, userId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>, userId: string): Promise<Transaction | undefined>;
  deleteTransaction(id: number, userId: string): Promise<boolean>;

  // Analytics operations
  getFinancialSummary(userId: string, startDate?: string, endDate?: string): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    activeProperties: number;
    totalProperties: number;
  }>;
  getMonthlyData(userId: string, year: number): Promise<{
    month: number;
    revenue: number;
    expenses: number;
  }[]>;
  getPropertyStatusDistribution(userId: string): Promise<{
    status: string;
    count: number;
  }[]>;



  // Pivot table data
  getPivotTableData(userId: string, month: number, year: number): Promise<{
    propertyName: string;
    revenue: number;
    expenses: number;
    netResult: number;
    profitPercentage: number;
    purchasePrice: number;
  }[]>;

  // Advanced pivot table data for multi-dimensional analysis
  getTransactionsByPeriods(
    userId: string, 
    months: string[], // format: ["MM/YYYY", "MM/YYYY"]
    propertyIds?: number[],
    transactionTypes?: string[], // ["revenue", "expense"]
    categories?: string[]
  ): Promise<{
    propertyId: number;
    propertyName: string;
    month: number;
    year: number;
    type: string;
    category: string;
    amount: number;
  }[]>;

  // Property acquisition cost calculation
  calculateTotalAcquisitionCost(property: Property): number;
  
  // Calculate IPCA-corrected acquisition cost for profit margin calculations
  calculateIPCACorrectedAcquisitionCost(property: Property): Promise<number>;

  // Expense components management
  getExpenseComponents(propertyId: number, userId: string): Promise<any[]>;
  saveExpenseComponents(propertyId: number, userId: string, components: any[]): Promise<any>;
  copyExpenseTemplate(sourcePropertyId: number, targetPropertyIds: number[], userId: string): Promise<any>;
  createCompositeExpense(data: {
    userId: string;
    propertyId: number;
    description: string;
    date: string;
    supplier?: string;
    cpfCnpj?: string;
    totalAmount: number;
    components: any[];
  }): Promise<any>;

  // Tax settings operations
  getTaxSettings(userId: string, taxType?: string, effectiveDate?: string): Promise<TaxSettings[]>;
  createTaxSettings(settings: InsertTaxSettings): Promise<TaxSettings>;
  updateTaxSettings(id: number, settings: Partial<InsertTaxSettings>, userId: string): Promise<TaxSettings | undefined>;
  
  // Tax projections operations
  getTaxProjections(userId: string, filters?: {
    startDate?: string;
    endDate?: string;
    taxType?: string;
    status?: string;
  }): Promise<TaxProjection[]>;
  getTaxProjection(id: number, userId: string): Promise<TaxProjection | undefined>;
  createTaxProjection(projection: InsertTaxProjection): Promise<TaxProjection>;
  updateTaxProjection(id: number, projection: Partial<InsertTaxProjection>, userId: string): Promise<TaxProjection | undefined>;
  deleteTaxProjection(id: number, userId: string): Promise<boolean>;
  
  // Batch operations for tax projections
  createTaxProjections(projections: InsertTaxProjection[]): Promise<TaxProjection[]>;
  deleteProjectionsForMonth(userId: string, referenceMonth: string): Promise<boolean>;
  
  // Cleaning services operations
  getCleaningServices(userId: string, filters?: {
    propertyId?: number;
    startDate?: string;
    endDate?: string;
    batchId?: number;
  }): Promise<CleaningService[]>;
  createCleaningService(service: InsertCleaningService): Promise<CleaningService>;
  createCleaningServices(services: InsertCleaningService[]): Promise<CleaningService[]>;
  updateCleaningService(id: number, service: Partial<InsertCleaningService>, userId: string): Promise<CleaningService | undefined>;
  deleteCleaningService(id: number, userId: string): Promise<boolean>;
  
  // Cleaning batches operations
  getCleaningBatches(userId: string): Promise<CleaningBatch[]>;
  getCleaningBatch(id: number, userId: string): Promise<CleaningBatch | undefined>;
  createCleaningBatch(batch: InsertCleaningBatch): Promise<CleaningBatch>;
  updateCleaningBatch(id: number, batch: Partial<InsertCleaningBatch>, userId: string): Promise<CleaningBatch | undefined>;
  deleteCleaningBatch(id: number, userId: string): Promise<boolean>;
  
  // Property name mappings operations
  getPropertyNameMappings(userId: string, propertyId?: number): Promise<PropertyNameMapping[]>;
  createPropertyNameMapping(mapping: InsertPropertyNameMapping): Promise<PropertyNameMapping>;
  findPropertyByVariation(userId: string, variation: string): Promise<Property | undefined>;
}

export class DatabaseStorage implements IStorage {
  private db = db;
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      // Retry once on connection error
      if (error instanceof Error && error.message.includes('Connection terminated')) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
      }
      throw error;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Property operations
  async getProperties(userId: string): Promise<Property[]> {
    console.log('[Storage] getProperties - userId:', userId);
    const result = await db.execute(
      sql.raw(`SELECT * FROM properties WHERE user_id = '${userId}' ORDER BY created_at DESC`)
    );
    console.log('[Storage] Query returned:', result.rows?.length || 0, 'rows');
    return (result.rows || []) as Property[];
  }

  async getProperty(id: number, userId: string): Promise<Property | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.userId, userId)));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }

  async updateProperty(id: number, property: Partial<InsertProperty>, userId: string): Promise<Property | undefined> {
    const [updatedProperty] = await db
      .update(properties)
      .set({ ...property, updatedAt: new Date() })
      .where(and(eq(properties.id, id), eq(properties.userId, userId)))
      .returning();
    return updatedProperty;
  }

  async deleteProperty(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(properties)
      .where(and(eq(properties.id, id), eq(properties.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Transaction operations
  async getTransactions(userId: string, limit = 1000): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(limit);
  }

  async getTransactionsByType(userId: string, type: string, limit = 1000): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, type)))
      .orderBy(desc(transactions.date))
      .limit(limit);
  }

  async getTransactionsByProperty(propertyId: number, userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.propertyId, propertyId), eq(transactions.userId, userId)))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    const [newTransaction] = result as Transaction[];
    return newTransaction;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>, userId: string): Promise<Transaction | undefined> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set({ ...transaction, updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return updatedTransaction;
  }

  async deleteTransaction(id: number, userId: string): Promise<boolean> {
    // First check if this is a parent transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1);
    
    if (!transaction) {
      return false;
    }

    // If it's a parent transaction, delete all child transactions first
    if (transaction.isCompositeParent) {
      await db
        .delete(transactions)
        .where(and(
          eq(transactions.parentTransactionId, id),
          eq(transactions.userId, userId)
        ));
    }

    // Now delete the transaction itself
    const result = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Analytics operations
  async getFinancialSummary(userId: string, startDate?: string, endDate?: string): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    activeProperties: number;
    totalProperties: number;
  }> {
    let baseConditions = [eq(transactions.userId, userId)];
    
    if (startDate) {
      baseConditions.push(gte(transactions.date, startDate));
    }
    
    if (endDate) {
      baseConditions.push(lte(transactions.date, endDate));
    }

    const transactionQuery = db
      .select({
        type: transactions.type,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(...baseConditions))
      .groupBy(transactions.type);

    const financialData = await transactionQuery;
    
    const totalRevenue = Number(financialData.find(d => d.type === 'revenue')?.total || 0);
    const totalExpenses = Number(financialData.find(d => d.type === 'expense')?.total || 0);

    const [propertyStats] = await db
      .select({
        activeProperties: sql<number>`count(case when status = 'active' then 1 end)`,
        totalProperties: sql<number>`count(*)`,
      })
      .from(properties)
      .where(eq(properties.userId, userId));

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      activeProperties: Number(propertyStats?.activeProperties || 0),
      totalProperties: Number(propertyStats?.totalProperties || 0),
    };
  }

  async getMonthlyData(userId: string, year: number): Promise<{
    month: number;
    revenue: number;
    expenses: number;
  }[]> {
    const monthlyData = await db
      .select({
        month: sql<number>`extract(month from date)`,
        type: transactions.type,
        total: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        sql`extract(year from date) = ${year}`
      ))
      .groupBy(sql`extract(month from date)`, transactions.type)
      .orderBy(sql`extract(month from date)`);

    const result: { month: number; revenue: number; expenses: number; }[] = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthData = monthlyData.filter(d => d.month === month);
      const revenue = Number(monthData.find(d => d.type === 'revenue')?.total || 0);
      const expenses = Number(monthData.find(d => d.type === 'expense')?.total || 0);
      
      result.push({ month, revenue, expenses });
    }

    return result;
  }

  async getPropertyStatusDistribution(userId: string): Promise<{
    status: string;
    count: number;
  }[]> {
    return await db
      .select({
        status: properties.status,
        count: sql<number>`count(*)`,
      })
      .from(properties)
      .where(eq(properties.userId, userId))
      .groupBy(properties.status);
  }


  async getPivotTableData(userId: string, month: number, year: number): Promise<{
    propertyName: string;
    revenue: number;
    expenses: number;
    netResult: number;
    profitPercentage: number;
    purchasePrice: number;
  }[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const result = await db
      .select({
        propertyName: properties.name,
        purchasePrice: properties.purchasePrice,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'revenue' THEN ${transactions.amount} ELSE 0 END), 0)`,
        expenses: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(properties)
      .leftJoin(transactions, and(
        eq(transactions.propertyId, properties.id),
        gte(transactions.date, startDate.toISOString().split('T')[0]),
        lte(transactions.date, endDate.toISOString().split('T')[0])
      ))
      .where(eq(properties.userId, userId))
      .groupBy(properties.id, properties.name, properties.purchasePrice)
      .orderBy(properties.name);

    return result.map((row: any) => {
      const revenue = Number(row.revenue) || 0;
      const expenses = Number(row.expenses) || 0;
      const netResult = revenue - expenses;
      const purchasePrice = Number(row.purchasePrice) || 0;
      const profitPercentage = purchasePrice > 0 ? (netResult / purchasePrice) * 100 : 0;

      return {
        propertyName: row.propertyName,
        revenue,
        expenses,
        netResult,
        profitPercentage,
        purchasePrice,
      };
    });
  }

  async getTransactionsByPeriods(
    userId: string, 
    months: string[], // format: ["MM/YYYY", "MM/YYYY"]
    propertyIds?: number[],
    transactionTypes?: string[], // ["revenue", "expense"]
    categories?: string[]
  ): Promise<{
    propertyId: number;
    propertyName: string;
    month: number;
    year: number;
    type: string;
    category: string;
    amount: number;
    description: string;
  }[]> {
    // Build where conditions
    const conditions = [eq(properties.userId, userId)];

    // Filter by months if provided
    if (months.length > 0) {
      const monthConditions = months.map(monthYear => {
        const [month, year] = monthYear.split('/');
        return and(
          eq(sql`EXTRACT(MONTH FROM ${transactions.date})`, parseInt(month)),
          eq(sql`EXTRACT(YEAR FROM ${transactions.date})`, parseInt(year))
        );
      });
      if (monthConditions.length === 1) {
        conditions.push(monthConditions[0]!);
      } else {
        conditions.push(or(...monthConditions)!);
      }
    }

    // Filter by properties if provided
    if (propertyIds && propertyIds.length > 0) {
      conditions.push(inArray(transactions.propertyId, propertyIds));
    }

    // Filter by transaction types if provided
    if (transactionTypes && transactionTypes.length > 0) {
      conditions.push(inArray(transactions.type, transactionTypes));
    }

    // Filter by categories if provided
    if (categories && categories.length > 0) {
      conditions.push(inArray(transactions.category, categories));
    }

    const results = await db
      .select({
        propertyId: transactions.propertyId,
        propertyName: sql<string>`CASE WHEN ${properties.nickname} IS NOT NULL AND ${properties.nickname} != '' THEN ${properties.nickname} ELSE ${properties.name} END`,
        month: sql<number>`EXTRACT(MONTH FROM ${transactions.date})`,
        year: sql<number>`EXTRACT(YEAR FROM ${transactions.date})`,
        type: transactions.type,
        category: transactions.category,
        amount: sql<number>`CAST(${transactions.amount} AS NUMERIC)`,
        description: transactions.description,
      })
      .from(transactions)
      .innerJoin(properties, eq(transactions.propertyId, properties.id))
      .where(and(...conditions))
      .orderBy(sql`COALESCE(${properties.nickname}, ${properties.name})`, transactions.date);

    return results.map(row => ({
      ...row,
      propertyId: row.propertyId!
    }));
  }

  // Property acquisition cost calculation
  calculateTotalAcquisitionCost(property: Property): number {
    const purchasePrice = parseFloat(property.purchasePrice || '0');
    const commissionValue = parseFloat(property.commissionValue || '0');
    const taxesAndRegistration = parseFloat(property.taxesAndRegistration || '0');
    const renovationAndDecoration = parseFloat(property.renovationAndDecoration || '0');
    const otherInitialValues = parseFloat(property.otherInitialValues || '0');

    return purchasePrice + commissionValue + taxesAndRegistration + renovationAndDecoration + otherInitialValues;
  }

  // Calculate IPCA-corrected acquisition cost for profit margin calculations
  async calculateIPCACorrectedAcquisitionCost(property: Property): Promise<number> {
    const totalCost = this.calculateTotalAcquisitionCost(property);
    
    if (!totalCost || !property.purchaseDate) {
      return totalCost;
    }

    try {
      // Calculate current previous month
      const now = new Date();
      const prevMonth = now.getMonth();
      const year = prevMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = prevMonth === 0 ? 12 : prevMonth;

      // Format dates for IBGE API (YYYYMM format)
      const purchase = new Date(property.purchaseDate);
      const startPeriod = `${purchase.getFullYear()}${(purchase.getMonth() + 1).toString().padStart(2, '0')}`;
      const endPeriod = `${year}${month.toString().padStart(2, '0')}`;

      // IBGE IPCA API - Aggregated data ID 1737, Variable 63 (monthly variation)
      const apiUrl = `https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/${startPeriod}-${endPeriod}/variaveis/63?localidades=N1%5Ball%5D`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data || !data[0] || !data[0].resultados || !data[0].resultados[0]) {
        return totalCost; // Return original value if IPCA data unavailable
      }

      const series = data[0].resultados[0].series[0].serie;
      let accumulatedFactor = 1;

      // Calculate accumulated IPCA from purchase date to current previous month
      Object.entries(series).forEach(([period, ipcaValue]: [string, any]) => {
        if (ipcaValue && !isNaN(parseFloat(ipcaValue))) {
          const monthlyRate = parseFloat(ipcaValue) / 100; // Convert percentage to decimal
          accumulatedFactor *= (1 + monthlyRate);
        }
      });

      return totalCost * accumulatedFactor;
    } catch (error) {
      console.error('Error calculating IPCA correction for property:', property.name, error);
      return totalCost; // Return original value on error
    }
  }

  // Expense components management
  async getExpenseComponents(propertyId: number, userId: string): Promise<any[]> {
    const result = await this.db
      .select()
      .from(expenseComponents)
      .where(and(
        eq(expenseComponents.propertyId, propertyId),
        exists(
          this.db
            .select()
            .from(properties)
            .where(and(
              eq(properties.id, propertyId),
              eq(properties.userId, userId)
            ))
        )
      ))
      .orderBy(expenseComponents.displayOrder, expenseComponents.name);
    
    return result;
  }

  async saveExpenseComponents(propertyId: number, userId: string, components: any[]): Promise<any> {
    // Verify property ownership
    const property = await this.getProperty(propertyId, userId);
    if (!property) {
      throw new Error('Property not found or access denied');
    }

    // Delete existing components for this property
    await this.db
      .delete(expenseComponents)
      .where(eq(expenseComponents.propertyId, propertyId));

    // Insert new components
    if (components.length > 0) {
      const componentsToInsert = components
        .filter(comp => comp.name && comp.name.trim())
        .map((comp, index) => ({
          propertyId,
          name: comp.name.trim(),
          category: comp.category || 'utilities',
          isActive: comp.isActive !== false,
          displayOrder: index
        }));

      if (componentsToInsert.length > 0) {
        await this.db
          .insert(expenseComponents)
          .values(componentsToInsert);
      }
    }

    return { success: true, message: 'Components saved successfully' };
  }

  async copyExpenseTemplate(sourcePropertyId: number, targetPropertyIds: number[], userId: string): Promise<any> {
    // Get source components
    const sourceComponents = await this.getExpenseComponents(sourcePropertyId, userId);
    
    if (sourceComponents.length === 0) {
      throw new Error('No components found in source property');
    }

    // Verify target properties ownership and copy components
    const results = [];
    for (const targetId of targetPropertyIds) {
      const targetProperty = await this.getProperty(targetId, userId);
      if (!targetProperty) {
        results.push({ propertyId: targetId, success: false, message: 'Property not found or access denied' });
        continue;
      }

      // Delete existing components for target property
      await this.db
        .delete(expenseComponents)
        .where(eq(expenseComponents.propertyId, targetId));

      // Copy components from source
      const componentsToInsert = sourceComponents.map(comp => ({
        propertyId: targetId,
        name: comp.name,
        category: comp.category,
        isActive: comp.isActive,
        displayOrder: comp.displayOrder
      }));

      await this.db
        .insert(expenseComponents)
        .values(componentsToInsert);

      results.push({ 
        propertyId: targetId, 
        propertyName: targetProperty.name,
        success: true, 
        message: `${sourceComponents.length} components copied successfully` 
      });
    }

    return { 
      success: true, 
      message: `Template copied to ${results.filter(r => r.success).length} properties`,
      results 
    };
  }

  async createCompositeExpense(data: {
    userId: string;
    propertyId: number;
    description: string;
    date: string;
    supplier?: string;
    cpfCnpj?: string;
    totalAmount: number;
    components: any[];
  }): Promise<any> {
    // Verify property ownership
    const property = await this.getProperty(data.propertyId, data.userId);
    if (!property) {
      throw new Error('Property not found or access denied');
    }

    // Create parent transaction
    const parentTransactionResult = await this.db
      .insert(transactions)
      .values({
        userId: data.userId,
        propertyId: data.propertyId,
        type: 'expense',
        category: 'composite',
        description: data.description,
        amount: data.totalAmount.toString(),
        date: data.date,
        supplier: data.supplier || null,
        cpfCnpj: data.cpfCnpj || null,
        isCompositeParent: true,
        currency: 'BRL'
      })
      .returning();

    const parentTransaction = parentTransactionResult as Transaction[];
    const parentId = parentTransaction[0].id;

    // Create component transactions
    const componentTransactions = [];
    for (const component of data.components) {
      if (parseFloat(component.amount) > 0) {
        const componentTransactionResult = await this.db
          .insert(transactions)
          .values({
            userId: data.userId,
            propertyId: data.propertyId,
            type: 'expense',
            category: component.category,
            description: `${data.description} - ${component.name}`,
            amount: component.amount,
            date: data.date,
            supplier: data.supplier || null,
            cpfCnpj: data.cpfCnpj || null,
            parentTransactionId: parentId,
            isCompositeParent: false,
            currency: 'BRL'
          })
          .returning();
        
        const componentTransaction = componentTransactionResult as Transaction[];
        componentTransactions.push(componentTransaction[0]);
      }
    }

    return {
      success: true,
      message: `Composite expense created with ${componentTransactions.length} components`,
      parentTransaction: parentTransaction[0],
      componentTransactions
    };
  }

  // Tax settings operations
  async getTaxSettings(userId: string, taxType?: string, effectiveDate?: string): Promise<TaxSettings[]> {
    const date = effectiveDate || new Date().toISOString().split('T')[0];
    
    const conditions = [
      eq(taxSettings.userId, userId),
      lte(taxSettings.effectiveDate, date),
      or(isNull(taxSettings.endDate), gte(taxSettings.endDate, date))
    ];

    if (taxType) {
      conditions.push(eq(taxSettings.taxType, taxType));
    }

    return await this.db
      .select()
      .from(taxSettings)
      .where(and(...conditions))
      .orderBy(desc(taxSettings.effectiveDate));
  }

  async createTaxSettings(settings: InsertTaxSettings): Promise<TaxSettings> {
    const result = await this.db.insert(taxSettings).values(settings).returning();
    const [newSettings] = result as TaxSettings[];
    return newSettings;
  }

  async updateTaxSettings(id: number, settings: Partial<InsertTaxSettings>, userId: string): Promise<TaxSettings | undefined> {
    const [updatedSettings] = await this.db
      .update(taxSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(and(eq(taxSettings.id, id), eq(taxSettings.userId, userId)))
      .returning();
    return updatedSettings;
  }

  // Tax projections operations
  async getTaxProjections(userId: string, filters?: {
    startDate?: string;
    endDate?: string;
    taxType?: string;
    status?: string;
  }): Promise<TaxProjection[]> {
    const conditions = [eq(taxProjections.userId, userId)];

    if (filters?.startDate) {
      conditions.push(gte(taxProjections.dueDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(taxProjections.dueDate, filters.endDate));
    }
    if (filters?.taxType) {
      conditions.push(eq(taxProjections.taxType, filters.taxType));
    }
    if (filters?.status) {
      conditions.push(eq(taxProjections.status, filters.status));
    }

    return await this.db
      .select()
      .from(taxProjections)
      .where(and(...conditions))
      .orderBy(taxProjections.dueDate, taxProjections.taxType);
  }

  async getTaxProjection(id: number, userId: string): Promise<TaxProjection | undefined> {
    const [projection] = await this.db
      .select()
      .from(taxProjections)
      .where(and(eq(taxProjections.id, id), eq(taxProjections.userId, userId)));
    return projection;
  }

  async createTaxProjection(projection: InsertTaxProjection): Promise<TaxProjection> {
    const result = await this.db.insert(taxProjections).values(projection).returning();
    const [newProjection] = result as TaxProjection[];
    return newProjection;
  }

  async updateTaxProjection(id: number, projection: Partial<InsertTaxProjection>, userId: string): Promise<TaxProjection | undefined> {
    const [updatedProjection] = await this.db
      .update(taxProjections)
      .set({ ...projection, updatedAt: new Date() })
      .where(and(eq(taxProjections.id, id), eq(taxProjections.userId, userId)))
      .returning();
    return updatedProjection;
  }

  async deleteTaxProjection(id: number, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(taxProjections)
      .where(and(eq(taxProjections.id, id), eq(taxProjections.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Batch operations for tax projections
  async createTaxProjections(projections: InsertTaxProjection[]): Promise<TaxProjection[]> {
    const result = await this.db.insert(taxProjections).values(projections).returning();
    return result as TaxProjection[];
  }

  async deleteProjectionsForMonth(userId: string, referenceMonth: string): Promise<boolean> {
    const result = await this.db
      .delete(taxProjections)
      .where(and(
        eq(taxProjections.userId, userId),
        eq(taxProjections.referenceMonth, referenceMonth),
        eq(taxProjections.status, 'projected'),
        eq(taxProjections.manualOverride, false)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Cleaning services operations
  async getCleaningServices(userId: string, filters?: {
    propertyId?: number;
    startDate?: string;
    endDate?: string;
    batchId?: number;
  }): Promise<CleaningService[]> {
    const conditions = [eq(cleaningServices.userId, userId)];

    if (filters?.propertyId) {
      conditions.push(eq(cleaningServices.propertyId, filters.propertyId));
    }
    if (filters?.startDate) {
      conditions.push(gte(cleaningServices.executionDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(cleaningServices.executionDate, filters.endDate));
    }
    if (filters?.batchId) {
      conditions.push(eq(cleaningServices.batchId, filters.batchId));
    }

    return await this.db
      .select()
      .from(cleaningServices)
      .where(and(...conditions))
      .orderBy(desc(cleaningServices.executionDate));
  }

  async createCleaningService(service: InsertCleaningService): Promise<CleaningService> {
    const result = await this.db.insert(cleaningServices).values(service).returning();
    const [newService] = result as CleaningService[];
    return newService;
  }

  async createCleaningServices(services: InsertCleaningService[]): Promise<CleaningService[]> {
    const result = await this.db.insert(cleaningServices).values(services).returning();
    return result as CleaningService[];
  }

  async updateCleaningService(id: number, service: Partial<InsertCleaningService>, userId: string): Promise<CleaningService | undefined> {
    const [updatedService] = await this.db
      .update(cleaningServices)
      .set({ ...service, updatedAt: new Date() })
      .where(and(eq(cleaningServices.id, id), eq(cleaningServices.userId, userId)))
      .returning();
    return updatedService;
  }

  async deleteCleaningService(id: number, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(cleaningServices)
      .where(and(eq(cleaningServices.id, id), eq(cleaningServices.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Cleaning batches operations
  async getCleaningBatches(userId: string): Promise<CleaningBatch[]> {
    return await this.db
      .select()
      .from(cleaningBatches)
      .where(eq(cleaningBatches.userId, userId))
      .orderBy(desc(cleaningBatches.paymentDate));
  }

  async getCleaningBatch(id: number, userId: string): Promise<CleaningBatch | undefined> {
    const [batch] = await this.db
      .select()
      .from(cleaningBatches)
      .where(and(eq(cleaningBatches.id, id), eq(cleaningBatches.userId, userId)));
    return batch;
  }

  async createCleaningBatch(batch: InsertCleaningBatch): Promise<CleaningBatch> {
    const result = await this.db.insert(cleaningBatches).values(batch).returning();
    const [newBatch] = result as CleaningBatch[];
    return newBatch;
  }

  async updateCleaningBatch(id: number, batch: Partial<InsertCleaningBatch>, userId: string): Promise<CleaningBatch | undefined> {
    const [updatedBatch] = await this.db
      .update(cleaningBatches)
      .set({ ...batch, updatedAt: new Date() })
      .where(and(eq(cleaningBatches.id, id), eq(cleaningBatches.userId, userId)))
      .returning();
    return updatedBatch;
  }

  async deleteCleaningBatch(id: number, userId: string): Promise<boolean> {
    // First delete all associated cleaning services
    await this.db
      .delete(cleaningServices)
      .where(and(eq(cleaningServices.batchId, id), eq(cleaningServices.userId, userId)));
    
    // Then delete the batch
    const result = await this.db
      .delete(cleaningBatches)
      .where(and(eq(cleaningBatches.id, id), eq(cleaningBatches.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Property name mappings operations
  async getPropertyNameMappings(userId: string, propertyId?: number): Promise<PropertyNameMapping[]> {
    const conditions = [eq(propertyNameMappings.userId, userId)];
    
    if (propertyId) {
      conditions.push(eq(propertyNameMappings.propertyId, propertyId));
    }

    return await this.db
      .select()
      .from(propertyNameMappings)
      .where(and(...conditions));
  }

  async createPropertyNameMapping(mapping: InsertPropertyNameMapping): Promise<PropertyNameMapping> {
    const result = await this.db.insert(propertyNameMappings).values(mapping).returning();
    const [newMapping] = result as PropertyNameMapping[];
    return newMapping;
  }

  async findPropertyByVariation(userId: string, variation: string): Promise<Property | undefined> {
    // First check for exact mapping
    const [mapping] = await this.db
      .select()
      .from(propertyNameMappings)
      .where(and(
        eq(propertyNameMappings.userId, userId),
        eq(propertyNameMappings.variation, variation.toUpperCase())
      ));

    if (mapping) {
      const [property] = await this.db
        .select()
        .from(properties)
        .where(and(eq(properties.id, mapping.propertyId), eq(properties.userId, userId)));
      return property;
    }

    // If no mapping found, try fuzzy search on property names
    const allProperties = await this.db
      .select()
      .from(properties)
      .where(eq(properties.userId, userId));

    const normalizedVariation = variation.toUpperCase().replace(/\s+/g, ' ').trim();
    
    // Try exact match first
    const exactMatch = allProperties.find(p => 
      p.name?.toUpperCase() === normalizedVariation ||
      p.nickname?.toUpperCase() === normalizedVariation ||
      p.airbnbName?.toUpperCase() === normalizedVariation
    );

    if (exactMatch) return exactMatch;

    // Try partial match
    const partialMatch = allProperties.find(p => 
      p.name?.toUpperCase().includes(normalizedVariation) ||
      p.nickname?.toUpperCase().includes(normalizedVariation) ||
      p.airbnbName?.toUpperCase().includes(normalizedVariation) ||
      normalizedVariation.includes(p.name?.toUpperCase() || '') ||
      normalizedVariation.includes(p.nickname?.toUpperCase() || '') ||
      normalizedVariation.includes(p.airbnbName?.toUpperCase() || '')
    );

    return partialMatch;
  }
}

export const storage = new DatabaseStorage();
