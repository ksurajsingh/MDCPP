#!/bin/bash

# PostgreSQL import script for soybean rainfall data
# Usage: ./import_soybean_data.sh

# Configuration
DB_NAME="crop_prediction"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
CSV_FILE="./soy_rainfall.csv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting PostgreSQL import for soybean rainfall data...${NC}"

# Check if CSV file exists
if [ ! -f "$CSV_FILE" ]; then
  echo -e "${RED}Error: CSV file not found at $CSV_FILE${NC}"
  exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT >/dev/null 2>&1; then
  echo -e "${RED}Error: PostgreSQL is not running or not accessible${NC}"
  exit 1
fi

# Create database if it doesn't exist
echo -e "${YELLOW}Creating database if it doesn't exist...${NC}"
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null

# Run the SQL script
echo -e "${YELLOW}Creating table and importing data...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
-- Create the rainfall table
CREATE TABLE IF NOT EXISTS soy_rainfall (
    id SERIAL PRIMARY KEY,
    district VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    rainfall_mm DECIMAL(10, 2),
    rainfall_lag_1 DECIMAL(10, 2),
    rainfall_lag_2 DECIMAL(10, 2),
    rainfall_lag_3 DECIMAL(10, 2),
    rainfall_3mo_sum DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_soy_rainfall_district ON soy_rainfall(district);
CREATE INDEX IF NOT EXISTS idx_soy_rainfall_year ON soy_rainfall(year);
CREATE INDEX IF NOT EXISTS idx_soy_rainfall_district_year ON soy_rainfall(district, year);

-- Clear existing data (optional - remove if you want to append)
TRUNCATE TABLE soy_rainfall RESTART IDENTITY;

-- Import data
\copy soy_rainfall(district, year, month, rainfall_mm, rainfall_lag_1, rainfall_lag_2, rainfall_lag_3, rainfall_3mo_sum) FROM '$CSV_FILE' WITH (FORMAT csv, HEADER true, DELIMITER ',', NULL '');

-- Show results
SELECT COUNT(*) as total_records FROM soy_rainfall;
SELECT 'Import completed successfully!' as status;
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Data import completed successfully!${NC}"

  # Show summary
  echo -e "${YELLOW}Data Summary:${NC}"
  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT district, COUNT(*) as record_count, 
               MIN(year) as start_year, MAX(year) as end_year
        FROM soy_rainfall 
        GROUP BY district 
        ORDER BY district;
    "
else
  echo -e "${RED}Error occurred during import${NC}"
  exit 1
fi
