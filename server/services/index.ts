/**
 * Service layer exports
 * All business logic is encapsulated in these services
 */

export { BaseService } from "./BaseService";
export { PropertyService } from "./PropertyService";
export { TransactionService } from "./TransactionService";
export { ImportService } from "./ImportService";
export { AnalyticsService } from "./AnalyticsService";
export { TaxService } from "./TaxService";
export { CashFlowService } from "./CashFlowService";

import { PropertyService } from "./PropertyService";
import { TransactionService } from "./TransactionService";
import { ImportService } from "./ImportService";
import { AnalyticsService } from "./AnalyticsService";
import { TaxService } from "./TaxService";
import { CashFlowService } from "./CashFlowService";
import type { IStorage } from "../storage";

/**
 * Service factory to create all services with proper dependencies
 */
export class ServiceFactory {
  private storage: IStorage;
  
  // Service instances (singleton pattern)
  private propertyService?: PropertyService;
  private transactionService?: TransactionService;
  private importService?: ImportService;
  private analyticsService?: AnalyticsService;
  private taxService?: TaxService;
  private cashFlowService?: CashFlowService;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  getPropertyService(): PropertyService {
    if (!this.propertyService) {
      this.propertyService = new PropertyService(this.storage);
    }
    return this.propertyService;
  }

  getTransactionService(): TransactionService {
    if (!this.transactionService) {
      this.transactionService = new TransactionService(this.storage);
      // Inject TaxService to enable automatic tax recalculation
      this.transactionService.setTaxService(this.getTaxService());
    }
    return this.transactionService;
  }

  getImportService(): ImportService {
    if (!this.importService) {
      this.importService = new ImportService(this.storage);
    }
    return this.importService;
  }

  getAnalyticsService(): AnalyticsService {
    if (!this.analyticsService) {
      this.analyticsService = new AnalyticsService(this.storage);
    }
    return this.analyticsService;
  }

  getTaxService(): TaxService {
    if (!this.taxService) {
      this.taxService = new TaxService(this.storage);
    }
    return this.taxService;
  }

  getCashFlowService(): CashFlowService {
    if (!this.cashFlowService) {
      this.cashFlowService = new CashFlowService(this.storage);
    }
    return this.cashFlowService;
  }
}