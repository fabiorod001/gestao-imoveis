import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, getUserByEmail, createUser } from '../database';
import { generateToken } from '../middleware/auth';
import { asyncHandler, successResponse, ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandler';
import { LoginSchema, CreateUserSchema } from '../../shared/schema';

const router = Router();

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = LoginSchema.parse(req.body);

  // Get user by email
  const user = getUserByEmail(email);
  
  if (!user) {
    throw new UnauthorizedError('Email ou senha inválidos');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    throw new UnauthorizedError('Email ou senha inválidos');
  }

  // Generate token
  const token = generateToken(user.id);

  successResponse(res, {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    }
  }, 'Login realizado com sucesso');
}));

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const userData = CreateUserSchema.parse(req.body);

  // Check if user already exists
  const existingUser = getUserByEmail(userData.email);
  
  if (existingUser) {
    throw new ConflictError('Email já está em uso');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 12);

  // Create user
  const userId = createUser({
    ...userData,
    password: hashedPassword
  });

  // Generate token
  const token = generateToken(userId);

  // Get created user (without password)
  const newUser = db.prepare(`
    SELECT id, name, email, createdAt 
    FROM users 
    WHERE id = ?
  `).get(userId) as any;

  successResponse(res, {
    token,
    user: newUser
  }, 'Usuário criado com sucesso', 201);
}));

// Verify token
router.get('/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token não fornecido');
  }

  const token = authHeader.substring(7);
  
  try {
    const { verifyToken } = await import('../middleware/auth');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      throw new UnauthorizedError('Token inválido');
    }

    // Get user
    const user = db.prepare(`
      SELECT id, name, email, createdAt 
      FROM users 
      WHERE id = ?
    `).get(decoded.userId) as any;

    if (!user) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    successResponse(res, { user }, 'Token válido');
  } catch (error) {
    throw new UnauthorizedError('Token inválido');
  }
}));

// Change password
router.post('/change-password', asyncHandler(async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres')
  });

  const { currentPassword, newPassword } = schema.parse(req.body);
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token não fornecido');
  }

  const token = authHeader.substring(7);
  const { verifyToken } = await import('../middleware/auth');
  const decoded = verifyToken(token);
  
  if (!decoded) {
    throw new UnauthorizedError('Token inválido');
  }

  // Get user with password
  const user = db.prepare(`
    SELECT id, password 
    FROM users 
    WHERE id = ?
  `).get(decoded.userId) as any;

  if (!user) {
    throw new UnauthorizedError('Usuário não encontrado');
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  
  if (!isValidPassword) {
    throw new UnauthorizedError('Senha atual incorreta');
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  db.prepare(`
    UPDATE users 
    SET password = ?, updatedAt = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(hashedNewPassword, user.id);

  successResponse(res, null, 'Senha alterada com sucesso');
}));

export default router;