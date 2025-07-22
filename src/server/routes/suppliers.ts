import { Router } from 'express';
import { z } from 'zod';
import { db } from '../database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { 
  asyncHandler, 
  successResponse, 
  paginatedResponse,
  ValidationError, 
  NotFoundError,
  ConflictError 
} from '../middleware/errorHandler';
import { 
  CreateSupplierSchema, 
  UpdateSupplierSchema, 
  PaginationSchema 
} from '../../shared/schema';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all suppliers
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page = 1, limit = 10, search, type } = PaginationSchema.extend({
    search: z.string().optional(),
    type: z.enum(['maintenance', 'cleaning', 'management', 'insurance', 'other']).optional()
  }).parse(req.query);

  let whereClause = 'WHERE userId = ?';
  const params: any[] = [req.user!.id];

  if (search) {
    whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (type) {
    whereClause += ' AND type = ?';
    params.push(type);
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM suppliers ${whereClause}`;
  const { total } = db.prepare(countQuery).get(...params) as { total: number };

  // Get suppliers
  const offset = (page - 1) * limit;
  const query = `
    SELECT 
      id, name, type, email, phone, address, 
      createdAt, updatedAt
    FROM suppliers 
    ${whereClause}
    ORDER BY name ASC
    LIMIT ? OFFSET ?
  `;
  
  const suppliers = db.prepare(query).all(...params, limit, offset);

  paginatedResponse(res, suppliers, { page, limit, total });
}));

// Get supplier by ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const supplier = db.prepare(`
    SELECT * FROM suppliers 
    WHERE id = ? AND userId = ?
  `).get(id, req.user!.id);

  if (!supplier) {
    throw new NotFoundError('Fornecedor não encontrado');
  }

  successResponse(res, supplier);
}));

// Create supplier
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const supplierData = CreateSupplierSchema.parse(req.body);

  // Check if supplier with same email already exists for this user
  if (supplierData.email) {
    const existingSupplier = db.prepare(`
      SELECT id FROM suppliers 
      WHERE email = ? AND userId = ?
    `).get(supplierData.email, req.user!.id);

    if (existingSupplier) {
      throw new ConflictError('Já existe um fornecedor com este email');
    }
  }

  const result = db.prepare(`
    INSERT INTO suppliers (
      userId, name, type, email, phone, address
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    req.user!.id,
    supplierData.name,
    supplierData.type,
    supplierData.email || null,
    supplierData.phone || null,
    supplierData.address || null
  );

  const newSupplier = db.prepare(`
    SELECT * FROM suppliers WHERE id = ?
  `).get(result.lastInsertRowid);

  successResponse(res, newSupplier, 'Fornecedor criado com sucesso', 201);
}));

// Update supplier
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updateData = UpdateSupplierSchema.parse(req.body);

  // Check if supplier exists and belongs to user
  const existingSupplier = db.prepare(`
    SELECT id, email FROM suppliers 
    WHERE id = ? AND userId = ?
  `).get(id, req.user!.id);

  if (!existingSupplier) {
    throw new NotFoundError('Fornecedor não encontrado');
  }

  // Check if new email conflicts with another supplier
  if (updateData.email && updateData.email !== existingSupplier.email) {
    const emailConflict = db.prepare(`
      SELECT id FROM suppliers 
      WHERE email = ? AND userId = ? AND id != ?
    `).get(updateData.email, req.user!.id, id);

    if (emailConflict) {
      throw new ConflictError('Já existe um fornecedor com este email');
    }
  }

  // Build update query dynamically
  const updateFields = Object.keys(updateData)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const updateValues = Object.values(updateData);

  db.prepare(`
    UPDATE suppliers 
    SET ${updateFields}, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ? AND userId = ?
  `).run(...updateValues, id, req.user!.id);

  // Get updated supplier
  const updatedSupplier = db.prepare(`
    SELECT * FROM suppliers WHERE id = ?
  `).get(id);

  successResponse(res, updatedSupplier, 'Fornecedor atualizado com sucesso');
}));

// Delete supplier
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Check if supplier exists and belongs to user
  const existingSupplier = db.prepare(`
    SELECT id FROM suppliers 
    WHERE id = ? AND userId = ?
  `).get(id, req.user!.id);

  if (!existingSupplier) {
    throw new NotFoundError('Fornecedor não encontrado');
  }

  // Check if supplier has transactions
  const hasTransactions = db.prepare(`
    SELECT COUNT(*) as count FROM transactions 
    WHERE supplierId = ?
  `).get(id) as { count: number };

  if (hasTransactions.count > 0) {
    throw new ValidationError('Não é possível excluir fornecedor com transações associadas');
  }

  // Delete supplier
  db.prepare(`
    DELETE FROM suppliers 
    WHERE id = ? AND userId = ?
  `).run(id, req.user!.id);

  successResponse(res, null, 'Fornecedor excluído com sucesso');
}));

// Get supplier statistics
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { startDate, endDate } = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }).parse(req.query);

  // Check if supplier exists and belongs to user
  const supplier = db.prepare(`
    SELECT * FROM suppliers 
    WHERE id = ? AND userId = ?
  `).get(id, req.user!.id);

  if (!supplier) {
    throw new NotFoundError('Fornecedor não encontrado');
  }

  let dateFilter = '';
  const params: any[] = [id];

  if (startDate && endDate) {
    dateFilter = 'AND date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  // Get transaction statistics
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as totalTransactions,
      SUM(amount) as totalAmount,
      AVG(amount) as averageAmount,
      MIN(amount) as minAmount,
      MAX(amount) as maxAmount,
      MIN(date) as firstTransaction,
      MAX(date) as lastTransaction
    FROM transactions 
    WHERE supplierId = ? ${dateFilter}
  `).get(...params) as any;

  // Get transactions by property
  const propertyBreakdown = db.prepare(`
    SELECT 
      p.id,
      p.name as propertyName,
      COUNT(t.id) as transactionCount,
      SUM(t.amount) as totalAmount
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    WHERE t.supplierId = ? ${dateFilter}
    GROUP BY p.id, p.name
    ORDER BY totalAmount DESC
  `).all(...params);

  // Get recent transactions
  const recentTransactions = db.prepare(`
    SELECT 
      t.id, t.description, t.amount, t.date, t.status,
      p.name as propertyName
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    WHERE t.supplierId = ?
    ORDER BY t.date DESC, t.createdAt DESC
    LIMIT 5
  `).all(id);

  successResponse(res, {
    supplier,
    stats: {
      totalTransactions: stats.totalTransactions || 0,
      totalAmount: stats.totalAmount || 0,
      averageAmount: stats.averageAmount ? parseFloat(stats.averageAmount.toFixed(2)) : 0,
      minAmount: stats.minAmount || 0,
      maxAmount: stats.maxAmount || 0,
      firstTransaction: stats.firstTransaction,
      lastTransaction: stats.lastTransaction
    },
    propertyBreakdown,
    recentTransactions
  });
}));

// Get suppliers summary
router.get('/summary/overview', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  // Get suppliers count by type
  const typeDistribution = db.prepare(`
    SELECT 
      type,
      COUNT(*) as count
    FROM suppliers 
    WHERE userId = ?
    GROUP BY type
    ORDER BY count DESC
  `).all(userId);

  // Get top suppliers by transaction volume
  const topSuppliers = db.prepare(`
    SELECT 
      s.id,
      s.name,
      s.type,
      COUNT(t.id) as transactionCount,
      SUM(t.amount) as totalAmount
    FROM suppliers s
    LEFT JOIN transactions t ON s.id = t.supplierId
    WHERE s.userId = ?
    GROUP BY s.id, s.name, s.type
    HAVING transactionCount > 0
    ORDER BY totalAmount DESC
    LIMIT 5
  `).all(userId);

  // Get total statistics
  const totals = db.prepare(`
    SELECT 
      COUNT(DISTINCT s.id) as totalSuppliers,
      COUNT(t.id) as totalTransactions,
      SUM(t.amount) as totalAmount
    FROM suppliers s
    LEFT JOIN transactions t ON s.id = t.supplierId
    WHERE s.userId = ?
  `).get(userId) as any;

  successResponse(res, {
    typeDistribution,
    topSuppliers,
    totals: {
      suppliers: totals.totalSuppliers || 0,
      transactions: totals.totalTransactions || 0,
      amount: totals.totalAmount || 0
    }
  });
}));

export default router;