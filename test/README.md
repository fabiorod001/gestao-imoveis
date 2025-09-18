# Acceptance Tests for Critical Business Rules

This test suite validates critical business rules to prevent bugs from returning. The tests run against the actual database and services (no mocking) to ensure real business logic validation.

## Running the Tests

### Option 1: Using the Shell Script
```bash
./test/run-tests.sh
```

### Option 2: Direct Execution
```bash
NODE_ENV=development tsx test/acceptance-tests.ts
```

## Test Coverage

### 1. Maurício Expenses
- ✅ Creates exactly N child transactions for N selected properties
- ✅ Each child has amount = total / N
- ✅ All children are returned when fetching with includeChildren=true
- ✅ Validates with both 3 and 5 property splits

### 2. Tax Calculations
- ✅ PIS calculation is 1.65% of gross revenue
- ✅ COFINS calculation is 7.6% of gross revenue  
- ✅ CSLL effective rate is 2.88% (9% over 32%)
- ✅ IRPJ effective rate is 4.8% (15% over 32%)
- ✅ Tax distribution across properties sums to 100%

### 3. Cleaning/OCR Parsing
- ✅ CleaningEntry has all required fields: date, unit, propertyName, value, matched, propertyId
- ✅ ParsedPdfData includes unmatchedCount
- ✅ Property name matching works correctly for all known properties

### 4. General Transaction Integrity
- ✅ Parent transaction amount equals sum of all children
- ✅ No orphaned child transactions exist
- ✅ All transactions belong to the correct user
- ✅ Child transactions have correct parent references

## Test Implementation Details

The test suite:
- Uses the actual database (no mocking)
- Creates isolated test data with unique user IDs
- Cleans up all test data after completion
- Provides detailed error messages for failures
- Returns proper exit codes for CI/CD integration

## Test Output

Successful run shows:
```
🚀 RUNNING ACCEPTANCE TESTS
============================================================
📋 Testing: Maurício expense creates N child transactions
   ✅ PASSED
[... more tests ...]

📊 TEST RESULTS
============================================================
✅ Maurício expense creates N child transactions
✅ PIS calculation is 1.65% of gross revenue
[... all test results ...]

TOTAL: 13/13 passed, 0 failed
============================================================
✨ Test suite completed
```

Failed tests will show:
```
❌ Test Name
   └─ FAILED: Detailed error message with expected vs actual values
```

## Adding New Tests

To add new tests:
1. Add a new test method in the `TestRunner` class
2. Use the `this.test()` method to define individual test cases
3. Use assertion methods: `assert()`, `assertEqual()`, `assertClose()`
4. Call your test method from the `run()` method
5. Test data is automatically cleaned up

## Requirements

- PostgreSQL database must be running
- Database connection via DATABASE_URL environment variable
- Node.js with tsx installed
- All project dependencies installed