# RentManager - Property Management System

## Overview

RentManager is a comprehensive financial management system designed for rental properties. Its primary purpose is to empower property owners with robust tools for managing multiple rental units, tracking diverse financial transactions (revenues and expenses), generating insightful analytical reports, and handling multi-currency conversions. The project aims to provide a modern, efficient, and user-friendly platform for streamlined property financial management, addressing the complex needs of property owners in a dynamic market.

## User Preferences

Preferred communication style: Simple, everyday language.
Work approach: Thorough, systematic implementation with attention to detail.
Priority: Data accuracy and comprehensive expense management system.
UI Design preference: Minimalist design with thin bars instead of large buttons, drag-and-drop reordering functionality.

## System Architecture

The application adopts a monorepo structure, ensuring a clear separation between client and server concerns.

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite.
- **Styling**: Tailwind CSS, enhanced by the shadcn/ui component library.
- **State Management**: TanStack Query (React Query) is used for server state management, facilitating optimistic updates and data synchronization.
- **Routing**: Wouter provides lightweight client-side routing.
- **Form Handling**: React Hook Form is utilized for form state management, coupled with Zod for robust validation.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL, managed via Drizzle ORM for type-safe interactions.
- **Authentication**: Replit Auth with OpenID Connect for secure user access.
- **Session Management**: Express sessions, with persistence handled by PostgreSQL.

### Database Architecture
- **ORM**: Drizzle ORM, emphasizing a code-first schema definition.
- **Database**: PostgreSQL, specifically configured for Neon serverless environments.
- **Migrations**: Drizzle Kit automates schema migrations.
- **Connection**: Connection pooling is implemented with `@neondatabase/serverless` for optimized performance.

### Key Features and Design Decisions
- **Authentication**: Replit OAuth integration with session-based authentication and protected routes. Supports dual authentication for local development.
- **Property Management**: Comprehensive CRUD operations for properties, including categorization and status tracking.
- **Financial Transaction System**: Supports multi-currency revenue and expense tracking, with categorized transaction types and robust validation.
- **Analytics & Reporting**: Provides financial summaries, monthly aggregations, and property distribution analysis. Includes interactive pivot tables with advanced filtering, real-time calculations, and Excel/PDF export capabilities.
- **UI/UX**: Focuses on a minimalist, responsive design using shadcn/ui. Includes dark/light theme support and WAI-ARIA guidelines for accessibility. Features thin bars and drag-and-drop for category and property reordering.
- **Import Systems**: Supports historical Excel data import, Airbnb CSV imports (historical payouts and future reservations) with intelligent data cleaning, property mapping, and sequential processing to ensure data integrity.
- **Expense Management**: Implements a sophisticated hierarchical expense analysis system, including category-specific detail pages for Taxes, Condominium, Management, Utilities, Maintenance, Cleaning, and Financing. Features proportional distribution for shared costs (e.g., Management, Cleaning).
- **Tax Management**: Comprehensive tax payment system with proportional allocation based on gross revenue, supporting PIS, COFINS, CSLL, IRPJ, and IPTU.
- **Cash Flow Optimization**: Enhanced cash flow graph and table with multiple time periods, daily balance tables, and highlighted current day.
- **Portability**: Designed to be platform-independent, supporting any PostgreSQL instance and providing a simple authentication mechanism for local development.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL connection for serverless environments.
- **drizzle-orm**: Type-safe database ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/**: Headless UI components for accessibility.
- **react-hook-form**: Form state management.
- **zod**: Runtime type validation.
- **openid-client**: OpenID Connect client implementation.
- **passport**: Authentication middleware.
- **connect-pg-simple**: PostgreSQL session store.
- **vite**: Build tool and dev server.
- **tsx**: TypeScript execution for development.
- **esbuild**: Fast JavaScript bundler for production.
- **multer**: For file uploads (specifically for Excel/CSV imports).
- **xlsx**: Library for processing Excel (.xlsx) files.
- **jsPDF** and **autoTable**: For generating professional PDF exports.
- **ExcelJS**: For generating professional Excel exports.
- **csv-parse**: For robust CSV parsing, particularly for Airbnb data.
```