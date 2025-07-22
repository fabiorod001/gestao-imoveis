import { Router } from 'express';
import { z } from 'zod';
import { db } from '../database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { 
  asyncHandler, 
  successResponse, 
  paginatedResponse,
  ValidationError, 
  NotFoundError 
} from '../middleware/errorHandler';
import { 
  CreatePropertySchema, 
  UpdatePropertySchema, 
  PaginationSchema 
} from '../../shared/schema';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all properties
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = 1, limit = 10, search, status, type } = PaginationSchema.extend({
    search: z.string().optional(),
    status: z.enum(['active', 'inactive', 'maintenance']).optional(),
    type: z.enum(['apartment', 'house', 'commercial', 'land']).optional()
  }).parse(req.query);

  let whereClause = 'WHERE userId = ?';
  const params: any[] = [req.user!.id];

  if (search) {
    whereClause += ' AND (name LIKE ? OR address LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  if (type) {
    whereClause += ' AND type = ?';
    params.push(type);
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM properties ${whereClause}`;
  const { total } = db.prepare(countQuery).get(...params) as { total: number };

  // Get properties
  const offset = (page - 1) * limit;
  const query = `
    SELECT 
      id, name, type, address, purchasePrice, currentValue, 
      monthlyRent, status, createdAt, updatedAt
    FROM properties 
    ${whereClause}
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `;
  
  const properties = db.prepare(query).all(...params, limit, offset);

  paginatedResponse(res, properties, { page, limit, total });
}));

// Get property by ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const property = db.prepare(`
    SELECT * FROM properties 
    WHERE id = ? AND userId = ?
  `).get(id, req.user!.id);

  if (!property) {
    throw new NotFoundError('Propriedade não encontrada');
  }

  successResponse(res, property);
}));

// Create property
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const propertyData = CreatePropertySchema.parse(req.body);

  const result = db.prepare(`
    INSERT INTO properties (
      userId, name, type, address, purchasePrice, 
      currentValue, monthlyRent, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user!.id,
    propertyData.name,
    propertyData.type,
    propertyData.address,
    propertyData.purchasePrice,
    propertyData.currentValue,
    propertyData.monthlyRent,
    propertyData.status || 'active'
  );

  const newProperty = db.prepare(`
    SELECT * FROM properties WHERE id = ?
  `).get(result.lastInsertRowid);

  successResponse(res, newProperty, 'Propriedade criada com sucesso', 201);
}));

// Update property
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updateData = UpdatePropertySchema.parse(req.body);

  // Check if property exists and belongs to user
  const existingProperty = db.prepare(`
    SELECT id FROM properties 
    WHERE id = ? AND userId = ?
  `).get(id, req.user!.id);

  if (!existingProperty) {
    throw new NotFoundError('Propriedade não encontrada');
  }

  // Build update query dynamically
  const updateFields = Object.keys(updateData)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const updateValues = Object.values(updateData);

  db.prepare(`
    UPDATE properties 
    SET ${updateFields}, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ? AND userId = ?
  `).run(...updateValues, id, req.user!.id);

  // Get updated property
  const updatedProperty = db.prepare(`
    SELECT * FROM properties WHERE id = ?
  `).get(id);

  successResponse(res, updatedProperty, 'Propriedade atualizada com sucesso');
}));

// Delete property
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Check if property exists and belongs to user
  const existingProperty = db.prepare(`
    SELECT id FROM properties 
    WHERE id = ? AND userId = ?
  `).get(id, req.user!.id);

  if (!existingProperty) {
    throw new NotFoundError('Propriedade não encontrada');
  }

  // Check if property has transactions
  const hasTransactions = db.prepare(`
    SELECT COUNT(*) as count FROM transactions 
    WHERE propertyId = ?
  `).get(id) as { count: number };

  if (hasTransactions.count > 0) {
    throw new ValidationError('Não é possível excluir propriedade com transações associadas');
  }

  // Delete property
  db.prepare(`
    DELETE FROM properties 
    WHERE id = ? AND userId = ?
  `).run(id, req.user!.id);

  successResponse(res, null, 'Propriedade excluída com sucesso');
}));

// Get property statistics
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { startDate, endDate } = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }).parse(req.query);

  // Check if property exists and belongs to user
  const property = db.prepare(`
    SELECT * FROM properties 
    WHERE id = ? AND userId = ?
  `).get(id, req.user!.id);

  if (!property) {
    throw new NotFoundError('Propriedade não encontrada');
  }

  let dateFilter = '';
  const params: any[] = [id];

  if (startDate && endDate) {
    dateFilter = 'AND date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  // Get income and expenses
  const stats = db.prepare(`
    SELECT 
      SUM(CASE WHEN category = 'income' THEN amount ELSE 0 END) as totalIncome,
      SUM(CASE WHEN category = 'expense' THEN amount ELSE 0 END) as totalExpenses,
      COUNT(CASE WHEN category = 'income' THEN 1 END) as incomeCount,
      COUNT(CASE WHEN category = 'expense' THEN 1 END) as expenseCount
    FROM transactions 
    WHERE propertyId = ? ${dateFilter}
  `).get(...params) as any;

  const netIncome = (stats.totalIncome || 0) - (stats.totalExpenses || 0);
  const roi = property.purchasePrice > 0 
    ? ((netIncome / property.purchasePrice) * 100)
    : 0;

  successResponse(res, {
    property,
    stats: {
      totalIncome: stats.totalIncome || 0,
      totalExpenses: stats.totalExpenses || 0,
      netIncome,
      roi: parseFloat(roi.toFixed(2)),
      transactionCounts: {
        income: stats.incomeCount || 0,
        expenses: stats.expenseCount || 0
      }
    }
  });
}));

export default router;