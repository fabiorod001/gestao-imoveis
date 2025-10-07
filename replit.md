# RentManager - Property Management System
**QUICK START:** Veja `QUICK_START.md` para contexto rápido do projeto

## Overview
RentManager is a comprehensive financial management system for rental properties. It enables property owners to manage multiple properties, track financial transactions (revenues and expenses), generate analytical reports, and handle currency conversions. The project aims to provide a robust, modern, and user-friendly solution for efficient property financial management. Features intelligent expense suggestions with 116+ common descriptions, optimized for 99% mobile usage with exceptional performance (39x faster cash flow).

## User Preferences
Preferred communication style: Simple, everyday language.
Work approach: Thorough, systematic implementation with attention to detail.
Priority: Data accuracy and comprehensive expense management system.
UI Design preference: Minimalist design with thin bars instead of large buttons, drag-and-drop reordering functionality.
**Mobile-First Usage**: **CRITICAL** - User will use the system 99% of the time on mobile/smartphone. All interfaces must be optimized for mobile experience, touch interactions, and small screens.
Platform Independence: **CRITICAL REQUIREMENT** - System must be 1000% independent and extractable to other platforms without any proprietary dependencies.

## System Architecture
The application features a monorepo structure separating client and server code.

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Responsive design, dark/light theme support, accessible components (WAI-ARIA), minimalist design with thin bars and drag-and-drop reordering.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect (for Replit environment) or Simple Session-based Auth (for local/portable environment)
- **Session Management**: Express sessions with PostgreSQL storage
- **Environment Variables**: dotenv-safe for robust environment variable loading with validation against .env.example

### Database Architecture
- **ORM**: Drizzle ORM with code-first schema definition
- **Database**: PostgreSQL (configured for Neon serverless, but flexible)
- **Migrations**: Drizzle Kit
- **Connection**: Connection pooling with @neondatabase/serverless (or standard `pg` driver for portability)

### Key Features & Design Patterns
- **Authentication System**: Replit OAuth integration with OpenID Connect and a platform-independent simple session-based authentication for local development.
- **Property Management**: CRUD operations for rental properties, categorization, status tracking, and rental type classification. Includes detailed address management and additional identification fields.
- **Financial Transaction System**: Revenue and expense tracking with categorized transaction types. Features comprehensive composite expense management with property-specific configurable categories. All transactions in BRL (Brazilian Real) only.
- **Universal Transaction Editor**: Single unified dialog component (`EditTransactionDialog`) for editing any transaction (revenue or expense) across all system pages. Provides complete field editing (property, value, date, category, description, supplier, CPF/CNPJ) with delete functionality and data integrity preservation. Opened by clicking on transaction values throughout the system.
- **Analytics & Reporting**: Financial summaries, monthly data aggregation, interactive charts, and pivot tables with advanced filtering, column resizing, sorting, and Excel/PDF export capabilities. Includes IPCA integration for margin calculations.
- **Data Import Systems**: Robust parsers for Excel (.xlsx) historical data and Airbnb CSV reports (both historical payouts and future reservations) with intelligent data cleaning and proportional distribution.
- **Tax Management System**: Comprehensive tax calculation and proportional distribution based on gross revenue, including PIS, COFINS, CSLL, IRPJ.
- **Cash Flow System**: Optimized cash flow chart and table with configurable periods (D-1 to D+5, 2 weeks, current month, 2 months), daily balance table, and "Today" highlighting.
- **Platform Portability**: Designed for 100% independence from proprietary Replit services, supporting any PostgreSQL instance and standard Node.js environments.

## External Dependencies

- **Database**:
    - `@neondatabase/serverless`: PostgreSQL connection for serverless environments (used in Replit deployment)
    - `drizzle-orm`: Type-safe database ORM
    - `drizzle-kit`: Database schema migrations
    - `pg`: Universal PostgreSQL driver (used in independent/portable version)
- **Frontend**:
    - `@tanstack/react-query`: Server state management
    - `@radix-ui/*`: Headless UI components for accessibility
    - `react-hook-form`: Form state management
    - `zod`: Runtime type validation
    - `vite`: Build tool and dev server
    - `tailwindcss`: CSS framework
    - `shadcn/ui`: Component library
    - `wouter`: Lightweight client-side routing
    - `react`: Frontend library
- **Backend**:
    - `express`: Web application framework
    - `passport`: Authentication middleware
    - `openid-client`: OpenID Connect client (for Replit Auth)
    - `connect-pg-simple`: PostgreSQL session store
    - `tsx`: TypeScript execution for development
    - `esbuild`: Fast JavaScript bundler for production
    - `multer`: Middleware for handling `multipart/form-data` (file uploads)
    - `xlsx`: Library for reading and writing Excel files
    - `js-pdf` & `jspdf-autotable`: PDF generation
    - `csv-parse`: Robust CSV parsing library
- **Development Tools**:
    - `@replit/vite-plugin-cartographer`: Replit-specific Vite plugin (temporarily removed due to top-level await compatibility issues)
    - `@replit/vite-plugin-runtime-error-modal`: Replit-specific Vite plugin

## Deployment Status & Known Issues

### Production Deployment (Render) ✅ 
- **Status**: WORKING PERFECTLY
- **Build Command**: `npm run build` (uses esbuild with external flags to exclude Vite from backend bundle)
- **Start Command**: `node dist/index.js`
- **Port Configuration**: Uses `process.env.PORT || 5000` for Render compatibility
- **Last Verified**: October 7, 2025

### Development Environment ⚠️
- **Status**: KNOWN COMPATIBILITY ISSUE
- **Problem**: tsx transpiler cannot import Vite's ESM API correctly
- **Error**: `SyntaxError: The requested module 'vite' does not provide an export named 'defineConfig'`
- **Root Cause**: tsx/esbuild converts modules to CommonJS, but Vite only exports ESM, creating an incompatibility
- **Impact**: `npm run dev` fails to start
- **Workaround Options**:
  1. Switch dev script to ESM-capable runner (`node --loader tsx` or similar)
  2. Run Vite separately (`vite dev`) and point Express API to it
  3. Use production build for local testing (`npm run build && node dist/index.js`)

### Build Configuration
- **Frontend Build**: Vite (configured in vite.config.ts)
- **Backend Build**: esbuild with the following external flags:
  ```bash
  --external:../vite.config.ts --external:./vite.config.ts 
  --external:../client/* --external:./client/* 
  --external:vite --external:@vitejs/plugin-react
  ```
- **Reason**: Prevents Vite dev dependencies from being bundled into production backend