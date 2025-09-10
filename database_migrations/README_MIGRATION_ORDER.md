# Rate Limiting Database Migration - Step by Step

Apply these SQL files **in order** in your Supabase SQL Editor:

## Migration Order (CRITICAL - Follow Exactly)

1. **01_enhance_email_accounts.sql** - Add columns to existing email_accounts table
2. **02_create_rate_limits_table.sql** - Create account_rate_limits table
3. **02b_initialize_defaults.sql** - Set default values for rate_limits table
4. **03_create_usage_history_table.sql** - Create account_usage_history table  
5. **03b_initialize_usage_defaults.sql** - Set default values for usage_history table
6. **04_create_rotation_log_table.sql** - Create account_rotation_log table
6. **05_create_indexes.sql** - Add performance indexes
7. **06_create_functions_part1.sql** - Create trigger functions
8. **07_create_functions_part2.sql** - Create initialization function
9. **08_create_functions_part3.sql** - Create reset functions
10. **09_create_functions_part4.sql** - Create availability function
11. **10_create_functions_part5.sql** - Create email recording function
12. **11_initialize_and_complete.sql** - Initialize data and create views

## How to Apply

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste **each file content** one by one
3. Run each SQL block and **wait for success** before proceeding
4. If any step fails, **STOP** and report the error

## After Migration Complete

Run verification:
```bash
node test-rate-limiting-system.js
```

## Troubleshooting

- **Syntax Error**: Make sure you're copying the exact content from each file
- **Table Missing**: Ensure you applied previous steps first
- **Function Error**: Check if required tables exist from previous steps

The migration is split into small blocks to isolate any PostgreSQL syntax issues and make troubleshooting easier.