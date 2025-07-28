// Cotton Data PostgreSQL Storage Scripts
// Make sure to install: npm install pg csv-parser fs

import { Pool } from "pg";
import csv from "csv-parser";
import fs from "fs";

// Database configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "crop_prediction",
  password: "admin",
  port: 5432,
});

// 1. CREATE TABLES
const createTables = async () => {
  const client = await pool.connect();

  try {
    // Cotton Rainfall Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cotton_rainfall (
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
      );
    `);

    // Cotton Yield Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cotton_yield (
        id SERIAL PRIMARY KEY,
        district VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        area_hectare DECIMAL(10,2),
        yield_tonne_per_hectare DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(district, year)
      );
    `);

    // Cotton Variety Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cotton_variety (
        id SERIAL PRIMARY KEY,
        district VARCHAR(100) NOT NULL,
        aka_1_unginned INTEGER DEFAULT 0,
        f_1054 INTEGER DEFAULT 0,
        gch INTEGER DEFAULT 0,
        h4_a_27mm_fine INTEGER DEFAULT 0,
        hampi_ginned INTEGER DEFAULT 0,
        jayadhar INTEGER DEFAULT 0,
        ld_327 INTEGER DEFAULT 0,
        lh_1556 INTEGER DEFAULT 0,
        mcu_5 INTEGER DEFAULT 0,
        n_44 INTEGER DEFAULT 0,
        other INTEGER DEFAULT 0,
        r_51_ginned INTEGER DEFAULT 0,
        suyodhar_ginned INTEGER DEFAULT 0,
        varalakshmi_ginned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(district)
      );
    `);

    console.log("Tables created successfully!");
  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
    client.release();
  }
};

// 2. IMPORT COTTON RAINFALL DATA
const importRainfallData = async (csvFilePath = "./cotton_rainfall.csv") => {
  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;

  try {
    const results = [];

    // Read and parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
          results.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log(`Processing ${results.length} rainfall records...`);

    // Insert data in batches
    for (const row of results) {
      try {
        await client.query(
          `
          INSERT INTO cotton_rainfall (
            district, year, month, rainfall_mm, rainfall_lag_1, 
            rainfall_lag_2, rainfall_lag_3, rainfall_3mo_sum
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (district, year, month) DO UPDATE SET
            rainfall_mm = EXCLUDED.rainfall_mm,
            rainfall_lag_1 = EXCLUDED.rainfall_lag_1,
            rainfall_lag_2 = EXCLUDED.rainfall_lag_2,
            rainfall_lag_3 = EXCLUDED.rainfall_lag_3,
            rainfall_3mo_sum = EXCLUDED.rainfall_3mo_sum
        `,
          [
            row.District,
            parseInt(row.Year),
            parseInt(row.Month),
            row.Rainfall_mm ? parseFloat(row.Rainfall_mm) : null,
            row.Rainfall_lag_1 ? parseFloat(row.Rainfall_lag_1) : null,
            row.Rainfall_lag_2 ? parseFloat(row.Rainfall_lag_2) : null,
            row.Rainfall_lag_3 ? parseFloat(row.Rainfall_lag_3) : null,
            row.Rainfall_3mo_sum ? parseFloat(row.Rainfall_3mo_sum) : null,
          ],
        );
        successCount++;
      } catch (err) {
        console.error(`Error inserting rainfall row:`, err.message);
        errorCount++;
      }
    }

    console.log(
      `Rainfall data import completed: ${successCount} success, ${errorCount} errors`,
    );
  } catch (err) {
    console.error("Error importing rainfall data:", err);
  } finally {
    client.release();
  }
};

// 3. IMPORT COTTON YIELD DATA
const importYieldData = async (
  csvFilePath = "./cotton_yield_dataset_2018_2027.csv",
) => {
  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;

  try {
    const results = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
          results.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log(`Processing ${results.length} yield records...`);

    for (const row of results) {
      try {
        await client.query(
          `
          INSERT INTO cotton_yield (
            district, year, area_hectare, yield_tonne_per_hectare
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (district, year) DO UPDATE SET
            area_hectare = EXCLUDED.area_hectare,
            yield_tonne_per_hectare = EXCLUDED.yield_tonne_per_hectare
        `,
          [
            row.District,
            parseInt(row.Year),
            row.Area_Hectare ? parseFloat(row.Area_Hectare) : null,
            row.Yield_TonnePerHectare
              ? parseFloat(row.Yield_TonnePerHectare)
              : null,
          ],
        );
        successCount++;
      } catch (err) {
        console.error(`Error inserting yield row:`, err.message);
        errorCount++;
      }
    }

    console.log(
      `Yield data import completed: ${successCount} success, ${errorCount} errors`,
    );
  } catch (err) {
    console.error("Error importing yield data:", err);
  } finally {
    client.release();
  }
};

// 4. IMPORT COTTON VARIETY DATA
const importVarietyData = async (
  csvFilePath = "./cotton_variety_distribution.csv",
) => {
  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;

  try {
    const results = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
          results.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log(`Processing ${results.length} variety records...`);

    for (const row of results) {
      try {
        await client.query(
          `
          INSERT INTO cotton_variety (
            district, aka_1_unginned, f_1054, gch, h4_a_27mm_fine,
            hampi_ginned, jayadhar, ld_327, lh_1556, mcu_5, n_44,
            other, r_51_ginned, suyodhar_ginned, varalakshmi_ginned
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (district) DO UPDATE SET
            aka_1_unginned = EXCLUDED.aka_1_unginned,
            f_1054 = EXCLUDED.f_1054,
            gch = EXCLUDED.gch,
            h4_a_27mm_fine = EXCLUDED.h4_a_27mm_fine,
            hampi_ginned = EXCLUDED.hampi_ginned,
            jayadhar = EXCLUDED.jayadhar,
            ld_327 = EXCLUDED.ld_327,
            lh_1556 = EXCLUDED.lh_1556,
            mcu_5 = EXCLUDED.mcu_5,
            n_44 = EXCLUDED.n_44,
            other = EXCLUDED.other,
            r_51_ginned = EXCLUDED.r_51_ginned,
            suyodhar_ginned = EXCLUDED.suyodhar_ginned,
            varalakshmi_ginned = EXCLUDED.varalakshmi_ginned
        `,
          [
            row.District,
            parseInt(row["Aka-1 (Unginned)"] || 0),
            parseInt(row["F-1054"] || 0),
            parseInt(row["GCH"] || 0),
            parseInt(row["H-4(A) 27mm FIne"] || 0),
            parseInt(row["Hampi (Ginned)"] || 0),
            parseInt(row["Jayadhar"] || 0),
            parseInt(row["LD-327"] || 0),
            parseInt(row["LH-1556"] || 0),
            parseInt(row["MCU 5"] || 0),
            parseInt(row["N-44"] || 0),
            parseInt(row["Other"] || 0),
            parseInt(row["R-51 (Ginned)"] || 0),
            parseInt(row["Suyodhar (Ginned)"] || 0),
            parseInt(row["Varalakshmi (Ginned)"] || 0),
          ],
        );
        successCount++;
      } catch (err) {
        console.error(`Error inserting variety row:`, err.message);
        errorCount++;
      }
    }

    console.log(
      `Variety data import completed: ${successCount} success, ${errorCount} errors`,
    );
  } catch (err) {
    console.error("Error importing variety data:", err);
  } finally {
    client.release();
  }
};

// 5. DATA RETRIEVAL FUNCTIONS FOR YOUR WEB APP
const getCottonData = {
  // Get rainfall data for prediction
  async getRainfallByDistrict(district, year, month) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT * FROM cotton_rainfall 
        WHERE district = $1 AND year = $2 AND month = $3
      `,
        [district, year, month],
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  // Get yield data
  async getYieldByDistrict(district, year) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT * FROM cotton_yield 
        WHERE district = $1 AND year = $2
      `,
        [district, year],
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  // Get variety distribution
  async getVarietyByDistrict(district) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT * FROM cotton_variety 
        WHERE district = $1
      `,
        [district],
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  // Get comprehensive data for ML model
  async getMLData(district, year) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT 
          r.district,
          r.year,
          r.month,
          r.rainfall_mm,
          r.rainfall_lag_1,
          r.rainfall_lag_2,
          r.rainfall_lag_3,
          r.rainfall_3mo_sum,
          y.area_hectare,
          y.yield_tonne_per_hectare,
          v.gch,
          v.jayadhar,
          v.ld_327,
          v.other
        FROM cotton_rainfall r
        LEFT JOIN cotton_yield y ON r.district = y.district AND r.year = y.year
        LEFT JOIN cotton_variety v ON r.district = v.district
        WHERE r.district = $1 AND r.year = $2
        ORDER BY r.month
      `,
        [district, year],
      );
      return result.rows;
    } finally {
      client.release();
    }
  },
};

// 6. MAIN EXECUTION FUNCTION
const main = async () => {
  try {
    console.log("Starting cotton data import process...");

    // Create tables
    await createTables();

    // Import all data
    await importRainfallData();
    await importYieldData();
    await importVarietyData();

    console.log("All data imported successfully!");

    // Test data retrieval
    const testData = await getCottonData.getMLData("Belagavi", 2018);
    console.log("Sample ML data:", testData.slice(0, 2));
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    await pool.end();
  }
};

// Export functions for use in your web app

export {
  createTables,
  importRainfallData,
  importYieldData,
  importVarietyData,
  getCottonData,
  pool,
};

// ESM way to detect if script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
