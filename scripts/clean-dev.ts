import { db } from '../server/db';
import { properties, transactions, accounts } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function cleanDevDatabase() {
  console.log('🧹 Cleaning development database...');

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
  console.log(`🗑️  Deleting data for user: ${userId}`);

  try {
    // Delete in correct order (respecting foreign keys)
    const deletedTransactions = await db
      .delete(transactions)
      .where(eq(transactions.userId, userId))
      .returning();
    
    const deletedProperties = await db
      .delete(properties)
      .where(eq(properties.userId, userId))
      .returning();
    
    const deletedAccounts = await db
      .delete(accounts)
      .where(eq(accounts.userId, userId))
      .returning();

    console.log('\n📊 CLEANUP SUMMARY:');
    console.log(`   • Transactions deleted: ${deletedTransactions.length}`);
    console.log(`   • Properties deleted: ${deletedProperties.length}`);
    console.log(`   • Accounts deleted: ${deletedAccounts.length}`);
    console.log('\n✅ Development database cleaned successfully!');

  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanDevDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
