# Basiq Integration Setup

This application now includes Basiq integration for automatically importing bank transactions into your cashflow calendar.

## Prerequisites

1. **Basiq Account**: You need a Basiq API account. Sign up at [basiq.io](https://basiq.io)
2. **API Key**: Get your Basiq API key from the Basiq dashboard
3. **Environment Variables**: Add your Basiq API key to your environment variables

## Setup Instructions

### 1. Get Basiq API Key

1. Sign up for a Basiq account at [basiq.io](https://basiq.io)
2. Navigate to your dashboard and get your API key
3. Add it to your environment variables:

```bash
BASIQ_API_KEY=your_basiq_api_key_here
```

### 2. Update Database Schema

Run the updated SQL schema to add Basiq-specific fields:

```sql
-- Add Basiq fields to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS basiq_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS institution_id VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_basiq_id ON transactions(basiq_id);
```

### 3. How to Use

1. **Connect to Basiq**: Click the "Connect Basiq" button in your cashflow calendar
2. **Authenticate**: The app will authenticate with Basiq using your API key
3. **Select Bank**: Choose your bank from the list of supported institutions
4. **Connect Account**: Follow the OAuth flow to connect your bank account
5. **Import Transactions**: Click "Import Transactions" to fetch your recent transactions

### 4. Features

- **Automatic Import**: Import transactions from the last 90 days
- **Duplicate Prevention**: The system prevents importing the same transaction twice
- **Source Tracking**: All imported transactions are marked with source "basiq"
- **Real-time Updates**: Transactions appear immediately in your calendar

### 5. Supported Banks

Basiq supports most major Australian banks including:
- Commonwealth Bank
- Westpac
- ANZ
- NAB
- Bendigo Bank
- And many more...

### 6. Security

- All bank connections use OAuth 2.0
- Your banking credentials are never stored
- Transactions are encrypted in transit
- Basiq is PCI DSS compliant

### 7. Troubleshooting

**Common Issues:**

1. **"Failed to authenticate with Basiq"**
   - Check your BASIQ_API_KEY environment variable
   - Ensure your Basiq account is active

2. **"No institutions found"**
   - Check your internet connection
   - Verify your Basiq API key is correct

3. **"Connection failed"**
   - Ensure you're using a supported bank
   - Check that your bank account is active

4. **"No transactions imported"**
   - Verify your bank account has recent transactions
   - Check the date range (defaults to last 90 days)

### 8. API Endpoints

The integration includes these API endpoints:

- `POST /api/basiq/auth` - Get Basiq access token
- `POST /api/basiq/institutions` - Get supported banks
- `POST /api/basiq/connect` - Create bank connection
- `POST /api/basiq/transactions` - Import transactions

### 9. Data Flow

1. User clicks "Connect Basiq"
2. App authenticates with Basiq API
3. User selects their bank
4. OAuth flow connects bank account
5. User clicks "Import Transactions"
6. App fetches transactions from Basiq
7. Transactions are saved to Supabase
8. Calendar updates with new transactions

### 10. Cost Considerations

- Basiq charges per API call
- Transaction imports count as API calls
- Consider implementing caching for frequently accessed data
- Monitor your Basiq usage in their dashboard

## Support

For issues with:
- **Basiq API**: Contact Basiq support
- **This Integration**: Check the application logs
- **Database**: Verify your Supabase configuration
