import { db } from '../server/db';
import { properties, transactions, accounts } from '../shared/schema';

async function seedDevDatabase() {
  console.log('🌱 Starting database seed...');

  // Safety check: Only run in dev/replit environment
  const dbUrl = process.env.DATABASE_URL || '';
  const isProduction = process.env.NODE_ENV === 'production' && dbUrl.includes('render');
  
  if (isProduction) {
    console.error('❌ ERROR: This script cannot run in production environment!');
    console.error('Detected Render production database. Use this script only in Replit dev environment.');
    process.exit(1);
  }
  
  console.log('✅ Environment check passed - running in development mode');

  const userId = 'dev-user';
  console.log(`📝 Seeding for user: ${userId}`);

  try {
    // 1. Create accounts
    console.log('💳 Creating accounts...');
    const accountsData = [
      {
        userId,
        name: 'Conta Corrente Principal',
        type: 'checking',
        currentBalance: '15000.00',
        isActive: true
      },
      {
        userId,
        name: 'Poupança',
        type: 'savings',
        currentBalance: '50000.00',
        isActive: true
      }
    ];

    await db.insert(accounts).values(accountsData);
    console.log('✅ Created 2 accounts');

    // 2. Create properties
    console.log('🏠 Creating properties...');
    const propertiesData = [
      {
        userId,
        name: 'Apartamento MaxHaus',
        type: 'apartment',
        rentalType: 'short_term',
        status: 'active',
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Berrini'
      },
      {
        userId,
        name: 'Studio Faria Lima',
        type: 'studio',
        rentalType: 'short_term',
        status: 'active',
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Itaim Bibi'
      },
      {
        userId,
        name: 'Casa Ibirapuera',
        type: 'house',
        rentalType: 'long_term',
        status: 'active',
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Ibirapuera'
      },
      {
        userId,
        name: 'Cobertura Vila Olímpia',
        type: 'penthouse',
        rentalType: 'short_term',
        status: 'financing',
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Vila Olímpia'
      },
      {
        userId,
        name: 'Loft Pinheiros',
        type: 'apartment',
        rentalType: 'short_term',
        status: 'inactive',
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Pinheiros'
      }
    ];

    const insertedProperties = await db.insert(properties).values(propertiesData).returning();
    console.log(`✅ Created ${insertedProperties.length} properties`);

    // 3. Create transactions (revenues and expenses)
    console.log('💰 Creating transactions...');
    
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const transactionsData = [
      // Current month revenues
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'revenue',
        category: 'Aluguel',
        description: 'Airbnb - Reserva HM123ABC',
        amount: '3500.00',
        date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[1].id,
        type: 'revenue',
        category: 'Aluguel',
        description: 'Airbnb - Reserva HM456DEF',
        amount: '2800.00',
        date: new Date(now.getFullYear(), now.getMonth(), 8).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[2].id,
        type: 'revenue',
        category: 'Aluguel',
        description: 'Aluguel Mensal - Casa Ibirapuera',
        amount: '4500.00',
        date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'revenue',
        category: 'Aluguel',
        description: 'Airbnb - Reserva HM789GHI',
        amount: '3200.00',
        date: new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0],
        status: 'completed'
      },

      // Last month revenues
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'revenue',
        category: 'Aluguel',
        description: 'Airbnb - Outubro',
        amount: '3000.00',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[1].id,
        type: 'revenue',
        category: 'Aluguel',
        description: 'Airbnb - Outubro',
        amount: '2500.00',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 12).toISOString().split('T')[0],
        status: 'completed'
      },

      // Two months ago revenues
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'revenue',
        category: 'Aluguel',
        description: 'Airbnb - Setembro',
        amount: '2800.00',
        date: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 8).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[2].id,
        type: 'revenue',
        category: 'Aluguel',
        description: 'Aluguel - Setembro',
        amount: '4500.00',
        date: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 10).toISOString().split('T')[0],
        status: 'completed'
      },

      // Future revenues (pending)
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'revenue',
        category: 'Aluguel',
        description: 'Airbnb - Reserva Futura HM999XYZ',
        amount: '3800.00',
        date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15).toISOString().split('T')[0],
        status: 'pending'
      },

      // Current month expenses - Condomínio
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'expense',
        category: 'Condomínio',
        description: 'Taxa Condominial MaxHaus',
        amount: '850.00',
        date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[1].id,
        type: 'expense',
        category: 'Condomínio',
        description: 'Taxa Condominial Faria Lima',
        amount: '720.00',
        date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().split('T')[0],
        status: 'completed'
      },

      // Limpeza expenses
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'expense',
        category: 'Limpeza',
        description: 'Limpeza - Reserva HM123ABC',
        amount: '300.00',
        date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[1].id,
        type: 'expense',
        category: 'Limpeza',
        description: 'Limpeza - Reserva HM456DEF',
        amount: '250.00',
        date: new Date(now.getFullYear(), now.getMonth(), 8).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'expense',
        category: 'Limpeza',
        description: 'Limpeza - Reserva HM789GHI',
        amount: '300.00',
        date: new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0],
        status: 'completed'
      },

      // Utilities expenses
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'expense',
        category: 'Utilidades',
        description: 'Energia Elétrica MaxHaus',
        amount: '280.00',
        date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[2].id,
        type: 'expense',
        category: 'Utilidades',
        description: 'Água - Casa Ibirapuera',
        amount: '150.00',
        date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString().split('T')[0],
        status: 'completed'
      },

      // Management expenses
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'expense',
        category: 'Gestão',
        description: 'Gestão Maurício - Rateio',
        amount: '200.00',
        date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[1].id,
        type: 'expense',
        category: 'Gestão',
        description: 'Gestão Maurício - Rateio',
        amount: '200.00',
        date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        status: 'completed'
      },

      // Tax expenses
      {
        userId,
        type: 'expense',
        category: 'Impostos',
        description: 'PIS - Receitas Outubro',
        amount: '165.00',
        date: new Date(now.getFullYear(), now.getMonth(), 20).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        type: 'expense',
        category: 'Impostos',
        description: 'COFINS - Receitas Outubro',
        amount: '760.00',
        date: new Date(now.getFullYear(), now.getMonth(), 20).toISOString().split('T')[0],
        status: 'completed'
      },

      // Maintenance
      {
        userId,
        propertyId: insertedProperties[2].id,
        type: 'expense',
        category: 'Manutenção',
        description: 'Reparo ar condicionado',
        amount: '450.00',
        date: new Date(now.getFullYear(), now.getMonth(), 18).toISOString().split('T')[0],
        status: 'completed'
      },

      // Financing
      {
        userId,
        propertyId: insertedProperties[3].id,
        type: 'expense',
        category: 'Financiamento',
        description: 'Parcela Financiamento Cobertura',
        amount: '5200.00',
        date: new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0],
        status: 'completed'
      },

      // Last month expenses
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'expense',
        category: 'Condomínio',
        description: 'Taxa Condominial - Outubro',
        amount: '850.00',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5).toISOString().split('T')[0],
        status: 'completed'
      },
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'expense',
        category: 'Limpeza',
        description: 'Limpeza - Outubro',
        amount: '300.00',
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 8).toISOString().split('T')[0],
        status: 'completed'
      },

      // Two months ago expenses
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'expense',
        category: 'Condomínio',
        description: 'Taxa Condominial - Setembro',
        amount: '850.00',
        date: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 5).toISOString().split('T')[0],
        status: 'completed'
      },

      // Future expenses (pending)
      {
        userId,
        propertyId: insertedProperties[0].id,
        type: 'expense',
        category: 'Condomínio',
        description: 'Taxa Condominial - Próximo Mês',
        amount: '850.00',
        date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 5).toISOString().split('T')[0],
        status: 'pending'
      }
    ];

    await db.insert(transactions).values(transactionsData);
    console.log(`✅ Created ${transactionsData.length} transactions`);

    // Summary
    console.log('\n📊 SEED SUMMARY:');
    console.log(`   • Accounts: 2`);
    console.log(`   • Properties: ${insertedProperties.length}`);
    console.log(`   • Transactions: ${transactionsData.length}`);
    console.log(`   • Revenues: ${transactionsData.filter(t => t.type === 'revenue').length}`);
    console.log(`   • Expenses: ${transactionsData.filter(t => t.type === 'expense').length}`);
    console.log('\n✅ Development database seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed
seedDevDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
