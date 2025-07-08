// directImportOnionData.js - Direct PostgreSQL import script
import Papa from "papaparse";
import pg from "pg";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration - UPDATE THESE WITH YOUR ACTUAL DATABASE DETAILS
const DB_CONFIG = {
  user: "postgres", // e.g., 'postgres'
  host: "localhost", // e.g., 'localhost'
  database: "crop_prediction", // e.g., 'onion_db'
  password: "admin", // your database password
  port: 5432, // default PostgreSQL port
};

// CSV file paths
const CSV_FILES = {
  production: "./onion_yield_dataset_2018_2027.csv", // District, Year, Area_Hectare, Yield_TonnePerHectare
  rainfall: "./onion_rainfall.csv", // District, Year, Month, Rainfall_mm, Rainfall_lag_1, Rainfall_lag_2, Rainfall_lag_3, Rainfall_3mo_sum
  prices: "./onion_model_dataset.csv", // District, Market Name, Variety, Modal Price (Rs./Quintal), Year, Month, Rainfall_Minus1, Rainfall_Minus2, Rainfall_Minus3, Total_Rainfall_3Months, Area_Hectare, Yield_TonnePerHectare
  varieties: "./onion_variety_distribution.csv", // District, Local, Onion, Other, Puna, Pusa-Red, Telagi, White
};

// Create database connection pool
const pool = new Pool(DB_CONFIG);

// Test database connection
async function testDatabaseConnection() {
  try {
    console.log("🔍 Testing database connection...");
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    console.log("✅ Database connected successfully at:", result.rows[0].now);
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.log(
      "\n💡 Make sure to update the DB_CONFIG with your actual database credentials:",
    );
    console.log("   - user: your PostgreSQL username");
    console.log("   - host: your database host (usually localhost)");
    console.log("   - database: your database name");
    console.log("   - password: your database password");
    console.log("   - port: your database port (usually 5432)");
    return false;
  }
}

// Create tables if they don't exist
async function createTables() {
  const client = await pool.connect();

  try {
    console.log("🏗️  Creating tables if they don't exist...");

    // Create onion_production table
    await client.query(`
      CREATE TABLE IF NOT EXISTS onion_production (
        id SERIAL PRIMARY KEY,
        district VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        area_hectare DECIMAL(10,2),
        yield_tonne_per_hectare DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(district, year)
      )
    `);

    // Create onion_rainfall table
    await client.query(`
      CREATE TABLE IF NOT EXISTS onion_rainfall (
        id SERIAL PRIMARY KEY,
        district VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        rainfall_mm DECIMAL(10,2),
        rainfall_lag_1 DECIMAL(10,2),
        rainfall_lag_2 DECIMAL(10,2),
        rainfall_lag_3 DECIMAL(10,2),
        rainfall_3mo_sum DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(district, year, month)
      )
    `);

    // Create onion_prices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS onion_prices (
        id SERIAL PRIMARY KEY,
        district VARCHAR(100) NOT NULL,
        market_name VARCHAR(100) NOT NULL,
        variety VARCHAR(50) NOT NULL,
        modal_price_rs_per_quintal DECIMAL(10,2) NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        rainfall_minus1 DECIMAL(10,2),
        rainfall_minus2 DECIMAL(10,2),
        rainfall_minus3 DECIMAL(10,2),
        total_rainfall_3months DECIMAL(10,2),
        area_hectare DECIMAL(10,2),
        yield_tonne_per_hectare DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create onion_varieties table
    await client.query(`
      CREATE TABLE IF NOT EXISTS onion_varieties (
        id SERIAL PRIMARY KEY,
        district VARCHAR(100) NOT NULL,
        local DECIMAL(10,2),
        onion DECIMAL(10,2),
        other DECIMAL(10,2),
        puna DECIMAL(10,2),
        pusa_red DECIMAL(10,2),
        telagi DECIMAL(10,2),
        white DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(district)
      )
    `);

    console.log("✅ Tables created successfully");
  } catch (error) {
    console.error("❌ Error creating tables:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Enhanced CSV parsing
async function parseCSV(filePath) {
  try {
    console.log(`📖 Reading CSV file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const csvContent = fs.readFileSync(filePath, "utf8");

    if (!csvContent.trim()) {
      throw new Error(`File is empty: ${filePath}`);
    }

    console.log(`   File size: ${csvContent.length} characters`);

    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimiter: ",",
        complete: (results) => {
          console.log(`   Parsed ${results.data.length} rows`);
          console.log(
            `   Columns: ${Object.keys(results.data[0] || {}).join(", ")}`,
          );

          if (results.errors.length > 0) {
            console.log(`   Parsing errors: ${results.errors.length}`);
            results.errors.slice(0, 3).forEach((error) => {
              console.log(`     ${error.message}`);
            });
          }

          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error(`❌ Error reading CSV file ${filePath}:`, error.message);
    throw error;
  }
}

// Clean price data with flexible column mapping
function cleanPriceData(rawData) {
  const cleanedData = [];

  rawData.forEach((row, index) => {
    try {
      // Flexible column value extraction
      const getColumnValue = (possibleNames) => {
        for (const name of possibleNames) {
          // Try exact match first
          if (
            row[name] !== undefined &&
            row[name] !== null &&
            row[name] !== ""
          ) {
            return row[name];
          }

          // Try case-insensitive match
          const key = Object.keys(row).find(
            (k) => k.toLowerCase().trim() === name.toLowerCase().trim(),
          );
          if (
            key &&
            row[key] !== undefined &&
            row[key] !== null &&
            row[key] !== ""
          ) {
            return row[key];
          }
        }
        return null;
      };

      const district = getColumnValue(["District", "district"]);
      const marketName = getColumnValue([
        "Market Name",
        "market_name",
        "marketname",
      ]);
      const variety = getColumnValue(["Variety", "variety"]);
      const modalPrice = getColumnValue([
        "Modal Price (Rs./Quintal)",
        "modal_price",
        "price",
      ]);
      const year = getColumnValue(["Year", "year"]);
      const month = getColumnValue(["Month", "month"]);
      const rainfallMinus1 = getColumnValue([
        "Rainfall_Minus1",
        "rainfall_minus1",
      ]);
      const rainfallMinus2 = getColumnValue([
        "Rainfall_Minus2",
        "rainfall_minus2",
      ]);
      const rainfallMinus3 = getColumnValue([
        "Rainfall_Minus3",
        "rainfall_minus3",
      ]);
      const totalRainfall3Months = getColumnValue([
        "Total_Rainfall_3Months",
        "total_rainfall_3months",
      ]);
      const area = getColumnValue(["Area_Hectare", "area_hectare"]);
      const yieldValue = getColumnValue([
        "Yield_TonnePerHectare",
        "yield_tonneperhectare",
      ]);

      // Validate required fields
      if (
        !district ||
        !marketName ||
        !variety ||
        modalPrice === null ||
        !year ||
        !month
      ) {
        if (index < 5) {
          console.warn(`   Row ${index + 1}: Missing required fields`);
        }
        return;
      }

      // Parse numeric values
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(month);
      const parsedModalPrice = parseFloat(modalPrice);

      if (isNaN(parsedYear) || isNaN(parsedMonth) || isNaN(parsedModalPrice)) {
        if (index < 5) {
          console.warn(`   Row ${index + 1}: Invalid numeric values`);
        }
        return;
      }

      cleanedData.push({
        district: district.toString().trim(),
        market_name: marketName.toString().trim(),
        variety: variety.toString().trim(),
        modal_price_rs_per_quintal: parsedModalPrice,
        year: parsedYear,
        month: parsedMonth,
        rainfall_minus1: rainfallMinus1 ? parseFloat(rainfallMinus1) : null,
        rainfall_minus2: rainfallMinus2 ? parseFloat(rainfallMinus2) : null,
        rainfall_minus3: rainfallMinus3 ? parseFloat(rainfallMinus3) : null,
        total_rainfall_3months: totalRainfall3Months
          ? parseFloat(totalRainfall3Months)
          : null,
        area_hectare: area ? parseFloat(area) : null,
        yield_tonne_per_hectare: yieldValue ? parseFloat(yieldValue) : null,
      });
    } catch (error) {
      console.error(`   Error processing row ${index + 1}:`, error.message);
    }
  });

  console.log(
    `✅ Cleaned ${cleanedData.length} valid records from ${rawData.length} raw records`,
  );
  return cleanedData;
}

// Direct database insertion with batch processing
async function insertDataInBatches(data, tableName, batchSize = 1000) {
  if (data.length === 0) {
    console.log("❌ No data to insert");
    return { successCount: 0, errorCount: 0 };
  }

  console.log(`📤 Inserting ${data.length} records into ${tableName}...`);

  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;

  try {
    // Start transaction
    await client.query("BEGIN");

    // Clear existing data (optional - remove if you want to append)
    console.log(`🗑️  Clearing existing data from ${tableName}...`);
    await client.query(`DELETE FROM ${tableName}`);

    // Prepare insert statement based on table
    let insertQuery = "";
    let values = [];

    if (tableName === "onion_prices") {
      insertQuery = `
        INSERT INTO onion_prices (
          district, market_name, variety, modal_price_rs_per_quintal, year, month,
          rainfall_minus1, rainfall_minus2, rainfall_minus3, total_rainfall_3months,
          area_hectare, yield_tonne_per_hectare
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
    }

    // Insert data in batches
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, data.length);
      const batch = data.slice(start, end);

      console.log(
        `   Processing batch ${i + 1}/${totalBatches} (${batch.length} records)...`,
      );

      for (const record of batch) {
        try {
          if (tableName === "onion_prices") {
            values = [
              record.district,
              record.market_name,
              record.variety,
              record.modal_price_rs_per_quintal,
              record.year,
              record.month,
              record.rainfall_minus1,
              record.rainfall_minus2,
              record.rainfall_minus3,
              record.total_rainfall_3months,
              record.area_hectare,
              record.yield_tonne_per_hectare,
            ];
          }

          await client.query(insertQuery, values);
          successCount++;
        } catch (error) {
          console.error(`     Error inserting record:`, error.message);
          errorCount++;
        }
      }
    }

    // Commit transaction
    await client.query("COMMIT");
    console.log("✅ Transaction committed successfully");
  } catch (error) {
    // Rollback on error
    await client.query("ROLLBACK");
    console.error("❌ Transaction rolled back:", error.message);
    throw error;
  } finally {
    client.release();
  }

  console.log(`📊 Insert Summary for ${tableName}:`);
  console.log(`   ✅ Successfully inserted: ${successCount} records`);
  console.log(`   ❌ Failed to insert: ${errorCount} records`);

  return { successCount, errorCount };
}

// Clean rainfall data
function cleanRainfallData(rawData) {
  const cleanedData = [];

  rawData.forEach((row, index) => {
    try {
      const getColumnValue = (possibleNames) => {
        for (const name of possibleNames) {
          if (
            row[name] !== undefined &&
            row[name] !== null &&
            row[name] !== ""
          ) {
            return row[name];
          }
          const key = Object.keys(row).find(
            (k) => k.toLowerCase().trim() === name.toLowerCase().trim(),
          );
          if (
            key &&
            row[key] !== undefined &&
            row[key] !== null &&
            row[key] !== ""
          ) {
            return row[key];
          }
        }
        return null;
      };

      const district = getColumnValue(["District", "district"]);
      const year = getColumnValue(["Year", "year"]);
      const month = getColumnValue(["Month", "month"]);
      const rainfall = getColumnValue([
        "Rainfall_mm",
        "rainfall_mm",
        "rainfall",
      ]);
      const rainfallLag1 = getColumnValue(["Rainfall_lag_1", "rainfall_lag_1"]);
      const rainfallLag2 = getColumnValue(["Rainfall_lag_2", "rainfall_lag_2"]);
      const rainfallLag3 = getColumnValue(["Rainfall_lag_3", "rainfall_lag_3"]);
      const rainfall3moSum = getColumnValue([
        "Rainfall_3mo_sum",
        "rainfall_3mo_sum",
      ]);

      if (!district || !year || !month || rainfall === null) {
        return;
      }

      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(month);
      const parsedRainfall = parseFloat(rainfall);

      if (isNaN(parsedYear) || isNaN(parsedMonth) || isNaN(parsedRainfall)) {
        return;
      }

      cleanedData.push({
        district: district.toString().trim(),
        year: parsedYear,
        month: parsedMonth,
        rainfall_mm: parsedRainfall,
        rainfall_lag_1: rainfallLag1 ? parseFloat(rainfallLag1) : null,
        rainfall_lag_2: rainfallLag2 ? parseFloat(rainfallLag2) : null,
        rainfall_lag_3: rainfallLag3 ? parseFloat(rainfallLag3) : null,
        rainfall_3mo_sum: rainfall3moSum ? parseFloat(rainfall3moSum) : null,
      });
    } catch (error) {
      console.error(
        `   Error processing rainfall row ${index + 1}:`,
        error.message,
      );
    }
  });

  console.log(
    `✅ Cleaned ${cleanedData.length} valid rainfall records from ${rawData.length} raw records`,
  );
  return cleanedData;
}

// Insert rainfall data
async function insertRainfallData(data) {
  if (data.length === 0) {
    console.log("❌ No rainfall data to insert");
    return { successCount: 0, errorCount: 0 };
  }

  console.log(`📤 Inserting ${data.length} rainfall records...`);

  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;

  try {
    await client.query("BEGIN");

    // Clear existing rainfall data
    await client.query("DELETE FROM onion_rainfall");

    const insertQuery = `
      INSERT INTO onion_rainfall (
        district, year, month, rainfall_mm, rainfall_lag_1, rainfall_lag_2, rainfall_lag_3, rainfall_3mo_sum
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (district, year, month) DO UPDATE SET
        rainfall_mm = EXCLUDED.rainfall_mm,
        rainfall_lag_1 = EXCLUDED.rainfall_lag_1,
        rainfall_lag_2 = EXCLUDED.rainfall_lag_2,
        rainfall_lag_3 = EXCLUDED.rainfall_lag_3,
        rainfall_3mo_sum = EXCLUDED.rainfall_3mo_sum
    `;

    for (const record of data) {
      try {
        await client.query(insertQuery, [
          record.district,
          record.year,
          record.month,
          record.rainfall_mm,
          record.rainfall_lag_1,
          record.rainfall_lag_2,
          record.rainfall_lag_3,
          record.rainfall_3mo_sum,
        ]);
        successCount++;
      } catch (error) {
        console.error(`     Error inserting rainfall record:`, error.message);
        errorCount++;
      }
    }

    await client.query("COMMIT");
    console.log("✅ Rainfall data transaction committed successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Rainfall data transaction rolled back:", error.message);
    throw error;
  } finally {
    client.release();
  }

  console.log(`📊 Rainfall Insert Summary:`);
  console.log(`   ✅ Successfully inserted: ${successCount} records`);
  console.log(`   ❌ Failed to insert: ${errorCount} records`);

  return { successCount, errorCount };
}

// Main import function
async function importDirectlyToDatabase() {
  try {
    console.log("🧅 Starting Direct Database Import...\n");

    // Test database connection
    const dbOk = await testDatabaseConnection();
    if (!dbOk) {
      console.log("❌ Cannot proceed without database connection");
      return;
    }

    // Create tables
    await createTables();

    // Import price data
    console.log("\n=== IMPORTING PRICE DATA ===");
    const priceFile = CSV_FILES.prices;
    if (fs.existsSync(priceFile)) {
      const rawPriceData = await parseCSV(priceFile);
      // const cleanPriceData = cleanPriceData(rawPriceData);
      // await insertDataInBatches(cleanPriceData, "onion_prices");
      const cleanedPriceData = cleanPriceData(rawPriceData);
      await insertDataInBatches(cleanedPriceData, "onion_prices");
    } else {
      console.log(`❌ Price file not found: ${priceFile}`);
    }

    // Import rainfall data
    console.log("\n=== IMPORTING RAINFALL DATA ===");
    const rainfallFile = CSV_FILES.rainfall;
    if (fs.existsSync(rainfallFile)) {
      const rawRainfallData = await parseCSV(rainfallFile);
      // const cleanRainfallData = cleanRainfallData(rawRainfallData);
      // await insertRainfallData(cleanRainfallData);
      const cleanedRainfallData = cleanRainfallData(rawRainfallData);
      await insertRainfallData(cleanedRainfallData);
    } else {
      console.log(`❌ Rainfall file not found: ${rainfallFile}`);
    }

    console.log("\n🎉 Direct database import completed!");
  } catch (error) {
    console.error("❌ Direct import failed:", error.message);
  } finally {
    // Close database connection
    await pool.end();
    console.log("🔌 Database connection closed");
  }
}

// Run the import
importDirectlyToDatabase();
