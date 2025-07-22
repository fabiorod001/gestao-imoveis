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
  CreateTransactionSchema, 
  UpdateTransactionSchema, 
  TransactionFilterSchema 
} from '../../shared/schema';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all transactions
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const filters = TransactionFilterSchema.parse(req.query);
  const { page = 1, limit = 10 } = filters;

  let whereClause = `
    WHERE p.userId = ?
  `;
  const params: any[] = [req.user!.id];

  if (filters.propertyId) {
    whereClause += ' AND t.propertyId = ?';
    params.push(filters.propertyId);
  }

  if (filters.category) {
    whereClause += ' AND t.category = ?';
    params.push(filters.category);
  }

  if (filters.status) {
    whereClause += ' AND t.status = ?';
    params.push(filters.status);
  }

  if (filters.startDate && filters.endDate) {
    whereClause += ' AND t.date BETWEEN ? AND ?';
    params.push(filters.startDate, filters.endDate);
  }

  if (filters.search) {
    whereClause += ' AND (t.description LIKE ? OR s.name LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    LEFT JOIN suppliers s ON t.supplierId = s.id
    ${whereClause}
  `;
  const { total } = db.prepare(countQuery).get(...params) as { total: number };

  // Get transactions
  const offset = (page - 1) * limit;
  const query = `
    SELECT 
      t.id, t.propertyId, t.supplierId, t.description, 
      t.amount, t.category, t.status, t.date, t.createdAt,
      p.name as propertyName,
      s.name as supplierName
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    LEFT JOIN suppliers s ON t.supplierId = s.id
    ${whereClause}
    ORDER BY t.date DESC, t.createdAt DESC
    LIMIT ? OFFSET ?
  `;
  
  const transactions = db.prepare(query).all(...params, limit, offset);

  paginatedResponse(res, transactions, { page, limit, total });
}));

// Get transaction by ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const transaction = db.prepare(`
    SELECT 
      t.*,
      p.name as propertyName,
      s.name as supplierName
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    LEFT JOIN suppliers s ON t.supplierId = s.id
    WHERE t.id = ? AND p.userId = ?
  `).get(id, req.user!.id);

  if (!transaction) {
    throw new NotFoundError('Transação não encontrada');
  }

  successResponse(res, transaction);
}));

// Create transaction
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const transactionData = CreateTransactionSchema.parse(req.body);

  // Verify property belongs to user
  const property = db.prepare(`
    SELECT id FROM properties 
    WHERE id = ? AND userId = ?
  `).get(transactionData.propertyId, req.user!.id);

  if (!property) {
    throw new ValidationError('Propriedade não encontrada ou não pertence ao usuário');
  }

  // Verify supplier exists if provided
  if (transactionData.supplierId) {
    const supplier = db.prepare(`
      SELECT id FROM suppliers 
      WHERE id = ? AND userId = ?
    `).get(transactionData.supplierId, req.user!.id);

    if (!supplier) {
      throw new ValidationError('Fornecedor não encontrado ou não pertence ao usuário');
    }
  }

  const result = db.prepare(`
    INSERT INTO transactions (
      propertyId, supplierId, description, amount, 
      category, status, date
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    transactionData.propertyId,
    transactionData.supplierId || null,
    transactionData.description,
    transactionData.amount,
    transactionData.category,
    transactionData.status || 'pending',
    transactionData.date
  );

  const newTransaction = db.prepare(`
    SELECT 
      t.*,
      p.name as propertyName,
      s.name as supplierName
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    LEFT JOIN suppliers s ON t.supplierId = s.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  successResponse(res, newTransaction, 'Transação criada com sucesso', 201);
}));

// Update transaction
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updateData = UpdateTransactionSchema.parse(req.body);

  // Check if transaction exists and belongs to user's property
  const existingTransaction = db.prepare(`
    SELECT t.id, t.propertyId
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    WHERE t.id = ? AND p.userId = ?
  `).get(id, req.user!.id);

  if (!existingTransaction) {
    throw new NotFoundError('Transação não encontrada');
  }

  // Verify new property belongs to user if propertyId is being updated
  if (updateData.propertyId && updateData.propertyId !== existingTransaction.propertyId) {
    const property = db.prepare(`
      SELECT id FROM properties 
      WHERE id = ? AND userId = ?
    `).get(updateData.propertyId, req.user!.id);

    if (!property) {
      throw new ValidationError('Propriedade não encontrada ou não pertence ao usuário');
    }
  }

  // Verify supplier exists if provided
  if (updateData.supplierId) {
    const supplier = db.prepare(`
      SELECT id FROM suppliers 
      WHERE id = ? AND userId = ?
    `).get(updateData.supplierId, req.user!.id);

    if (!supplier) {
      throw new ValidationError('Fornecedor não encontrado ou não pertence ao usuário');
    }
  }

  // Build update query dynamically
  const updateFields = Object.keys(updateData)
    .map(key => `${key} = ?`)
    .join(', ');
  
  const updateValues = Object.values(updateData);

  db.prepare(`
    UPDATE transactions 
    SET ${updateFields}, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(...updateValues, id);

  // Get updated transaction
  const updatedTransaction = db.prepare(`
    SELECT 
      t.*,
      p.name as propertyName,
      s.name as supplierName
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    LEFT JOIN suppliers s ON t.supplierId = s.id
    WHERE t.id = ?
  `).get(id);

  successResponse(res, updatedTransaction, 'Transação atualizada com sucesso');
}));

// Delete transaction
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  // Check if transaction exists and belongs to user's property
  const existingTransaction = db.prepare(`
    SELECT t.id
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    WHERE t.id = ? AND p.userId = ?
  `).get(id, req.user!.id);

  if (!existingTransaction) {
    throw new NotFoundError('Transação não encontrada');
  }

  // Delete transaction
  db.prepare(`
    DELETE FROM transactions WHERE id = ?
  `).run(id);

  successResponse(res, null, 'Transação excluída com sucesso');
}));

// Get transaction summary
router.get('/summary/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { startDate, endDate, propertyId } = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    propertyId: z.string().optional()
  }).parse(req.query);

  let whereClause = 'WHERE p.userId = ?';
  const params: any[] = [req.user!.id];

  if (propertyId) {
    whereClause += ' AND t.propertyId = ?';
    params.push(propertyId);
  }

  if (startDate && endDate) {
    whereClause += ' AND t.date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  // Get summary statistics
  const summary = db.prepare(`
    SELECT 
      SUM(CASE WHEN t.category = 'income' THEN t.amount ELSE 0 END) as totalIncome,
      SUM(CASE WHEN t.category = 'expense' THEN t.amount ELSE 0 END) as totalExpenses,
      COUNT(CASE WHEN t.category = 'income' THEN 1 END) as incomeCount,
      COUNT(CASE WHEN t.category = 'expense' THEN 1 END) as expenseCount,
      COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pendingCount,
      COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completedCount
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    ${whereClause}
  `).get(...params) as any;

  const netIncome = (summary.totalIncome || 0) - (summary.totalExpenses || 0);

  // Get monthly breakdown
  const monthlyData = db.prepare(`
    SELECT 
      strftime('%Y-%m', t.date) as month,
      SUM(CASE WHEN t.category = 'income' THEN t.amount ELSE 0 END) as income,
      SUM(CASE WHEN t.category = 'expense' THEN t.amount ELSE 0 END) as expenses
    FROM transactions t
    JOIN properties p ON t.propertyId = p.id
    ${whereClause}
    GROUP BY strftime('%Y-%m', t.date)
    ORDER BY month DESC
    LIMIT 12
  `).all(...params);

  successResponse(res, {
    summary: {
      totalIncome: summary.totalIncome || 0,
      totalExpenses: summary.totalExpenses || 0,
      netIncome,
      transactionCounts: {
        income: summary.incomeCount || 0,
        expenses: summary.expenseCount || 0,
        pending: summary.pendingCount || 0,
        completed: summary.completedCount || 0
      }
    },
    monthlyData
  });
}));

export default router;