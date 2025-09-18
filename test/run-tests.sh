#!/bin/bash

# Run acceptance tests for critical business rules
echo "🚀 Running Acceptance Tests..."
echo "================================"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run tests from project root
cd "$SCRIPT_DIR/.." && NODE_ENV=development tsx test/acceptance-tests.ts

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✨ All acceptance tests passed!"
else
    echo ""
    echo "❌ Some tests failed. Please review the output above."
fi

exit $EXIT_CODE