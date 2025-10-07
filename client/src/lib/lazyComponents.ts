import { lazy } from 'react';

// Lazy load de páginas pesadas
export const Analytics = lazy(() => import('@/pages/analytics'));
export const AnalyticsDashboard = lazy(() => import('@/pages/analytics-dashboard'));
export const TransactionsList = lazy(() => import('@/pages/transactions-list'));
export const PropertiesTable = lazy(() => import('@/pages/properties-table'));

// Componentes carregados normalmente (usados em várias páginas)
export { default as Dashboard } from '@/pages/dashboard';
export { default as CashFlow } from '@/pages/cash-flow';
export { default as Properties } from '@/pages/properties';
export { default as Revenues } from '@/pages/revenues';
export { default as Expenses } from '@/pages/expenses';
