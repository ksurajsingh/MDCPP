// importOnionData.js - Script to import Onion CSV data to PostgreSQL (ESM)
import Papa from "papaparse";
import axios from "axios";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_BASE_URL = "http://localhost:5000/api";

// CSV file paths - update these with your actual file paths
const CSV_FILES = {
  production: "./onion_yield_dataset_2018_2027.csv", // District, Year, Area_Hectare, Yield_TonnePerHectare
  rainfall: "./onion_rainfall.csv", // District, Year, Month, Rainfall_mm, Rainfall_lag_1, Rainfall_lag_2, Rainfall_lag_3, Rainfall_3mo_sum
  prices: "./onion_model_dataset.csv", // District, Market Name, Variety, Modal Price (Rs./Quintal), Year, Month, Rainfall_Minus1, Rainfall_Minus2, Rainfall_Minus3, Total_Rainfall_3Months, Area_Hectare, Yield_TonnePerHectare
  varieties: "./onion_variety_distribution.csv", // District, Local, Onion, Other, Puna, Pusa-Red, Telagi, White
};

// Function to parse CSV file
async function parseCSV(filePath) {
  try {
    console.log(`Reading CSV file: ${filePath}`);

    const csvContent = fs.readFileSync(filePath, "utf8");

    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn(`Parsing warnings for ${filePath}:`, results.errors);
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error);
    throw error;
  }
}

// Function to clean and validate production data
function cleanProductionData(rawData) {
  const cleanedData = [];

  rawData.forEach((row, index) => {
    try {
      // Handle different possible column names (case insensitive)
      const getColumnValue = (possibleNames) => {
        for (const name of possibleNames) {
          const key = Object.keys(row).find((k) =>
            k
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .includes(name.toLowerCase().replace(/[^a-z0-9]/g, "")),
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

      const district = getColumnValue(["district"]);
      const year = getColumnValue(["year"]);
      const area = getColumnValue(["area", "areahectare", "area_hectare"]);
      const yieldValue = getColumnValue([
        "yield",
        "yieldtonneperhectare",
        "yield_tonneperhectare",
      ]);

      // Validate required fields
      if (!district || !year || area === null || yieldValue === null) {
        console.warn(
          `Production row ${index + 1}: Missing required fields, skipping...`,
        );
        return;
      }

      // Parse and validate numeric values
      const parsedYear = parseInt(year);
      const parsedArea = parseFloat(area);
      const parsedYield = parseFloat(yieldValue);

      if (isNaN(parsedYear) || isNaN(parsedArea) || isNaN(parsedYield)) {
        console.warn(
          `Production row ${index + 1}: Invalid numeric values, skipping...`,
        );
        return;
      }

      cleanedData.push({
        district: district.toString().trim(),
        year: parsedYear,
        area_hectare: parsedArea,
        yield_tonne_per_hectare: parsedYield,
      });
    } catch (error) {
      console.error(
        `Error processing production row ${index + 1}:`,
        error.message,
      );
    }
  });

  return cleanedData;
}

// Function to clean and validate rainfall data
function cleanRainfallData(rawData) {
  const cleanedData = [];

  rawData.forEach((row, index) => {
    try {
      const getColumnValue = (possibleNames) => {
        for (const name of possibleNames) {
          const key = Object.keys(row).find((k) =>
            k
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .includes(name.toLowerCase().replace(/[^a-z0-9]/g, "")),
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

      const district = getColumnValue(["district"]);
      const year = getColumnValue(["year"]);
      const month = getColumnValue(["month"]);
      const rainfall = getColumnValue([
        "rainfall",
        "rainfallmm",
        "rainfall_mm",
      ]);
      const rainfallLag1 = getColumnValue(["rainfalllag1", "rainfall_lag_1"]);
      const rainfallLag2 = getColumnValue(["rainfalllag2", "rainfall_lag_2"]);
      const rainfallLag3 = getColumnValue(["rainfalllag3", "rainfall_lag_3"]);
      const rainfall3moSum = getColumnValue([
        "rainfall3mosum",
        "rainfall_3mo_sum",
      ]);

      // Validate required fields
      if (!district || !year || !month || rainfall === null) {
        console.warn(
          `Rainfall row ${index + 1}: Missing required fields, skipping...`,
        );
        return;
      }

      // Parse and validate numeric values
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(month);
      const parsedRainfall = parseFloat(rainfall);

      if (isNaN(parsedYear) || isNaN(parsedMonth) || isNaN(parsedRainfall)) {
        console.warn(
          `Rainfall row ${index + 1}: Invalid numeric values, skipping...`,
        );
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
        `Error processing rainfall row ${index + 1}:`,
        error.message,
      );
    }
  });

  return cleanedData;
}

// Function to clean and validate price data
function cleanPriceData(rawData) {
  const cleanedData = [];

  rawData.forEach((row, index) => {
    try {
      const getColumnValue = (possibleNames) => {
        for (const name of possibleNames) {
          const key = Object.keys(row).find((k) =>
            k
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .includes(name.toLowerCase().replace(/[^a-z0-9]/g, "")),
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

      const district = getColumnValue(["district"]);
      const marketName = getColumnValue([
        "market",
        "marketname",
        "market_name",
      ]);
      const variety = getColumnValue(["variety"]);
      const modalPrice = getColumnValue(["modalprice", "modal_price", "price"]);
      const year = getColumnValue(["year"]);
      const month = getColumnValue(["month"]);
      const rainfallMinus1 = getColumnValue([
        "rainfallminus1",
        "rainfall_minus1",
      ]);
      const rainfallMinus2 = getColumnValue([
        "rainfallminus2",
        "rainfall_minus2",
      ]);
      const rainfallMinus3 = getColumnValue([
        "rainfallminus3",
        "rainfall_minus3",
      ]);
      const totalRainfall3Months = getColumnValue([
        "totalrainfall3months",
        "total_rainfall_3months",
      ]);
      const area = getColumnValue(["area", "areahectare", "area_hectare"]);
      const yieldValue = getColumnValue([
        "yield",
        "yieldtonneperhectare",
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
        console.warn(
          `Price row ${index + 1}: Missing required fields, skipping...`,
        );
        return;
      }

      // Parse and validate numeric values
      const parsedYear = parseInt(year);
      const parsedMonth = parseInt(month);
      const parsedModalPrice = parseFloat(modalPrice);

      if (isNaN(parsedYear) || isNaN(parsedMonth) || isNaN(parsedModalPrice)) {
        console.warn(
          `Price row ${index + 1}: Invalid numeric values, skipping...`,
        );
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
      console.error(`Error processing price row ${index + 1}:`, error.message);
    }
  });

  return cleanedData;
}

// Function to clean and validate variety data
function cleanVarietyData(rawData) {
  const cleanedData = [];

  rawData.forEach((row, index) => {
    try {
      const getColumnValue = (possibleNames) => {
        for (const name of possibleNames) {
          const key = Object.keys(row).find((k) =>
            k
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .includes(name.toLowerCase().replace(/[^a-z0-9]/g, "")),
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

      const district = getColumnValue(["district"]);
      const local = getColumnValue(["local"]);
      const onion = getColumnValue(["onion"]);
      const other = getColumnValue(["other"]);
      const puna = getColumnValue(["puna"]);
      const pusaRed = getColumnValue(["pusared", "pusa_red", "pusa-red"]);
      const telagi = getColumnValue(["telagi"]);
      const white = getColumnValue(["white"]);

      // Validate required fields
      if (!district) {
        console.warn(`Variety row ${index + 1}: Missing district, skipping...`);
        return;
      }

      cleanedData.push({
        district: district.toString().trim(),
        local: local ? parseFloat(local) : null,
        onion: onion ? parseFloat(onion) : null,
        other: other ? parseFloat(other) : null,
        puna: puna ? parseFloat(puna) : null,
        pusa_red: pusaRed ? parseFloat(pusaRed) : null,
        telagi: telagi ? parseFloat(telagi) : null,
        white: white ? parseFloat(white) : null,
      });
    } catch (error) {
      console.error(
        `Error processing variety row ${index + 1}:`,
        error.message,
      );
    }
  });

  return cleanedData;
}

// Function to upload data in batches
async function uploadDataInBatches(data, endpoint, batchSize = 100) {
  const totalBatches = Math.ceil(data.length / batchSize);
  let successCount = 0;
  let errorCount = 0;

  console.log(
    `\nUploading ${data.length} records to ${endpoint} in ${totalBatches} batches...`,
  );

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, data.length);
    const batch = data.slice(start, end);

    try {
      const response = await axios.post(`${API_BASE_URL}/${endpoint}`, {
        data: batch,
      });

      console.log(
        `Batch ${i + 1}/${totalBatches} uploaded successfully: ${batch.length} records`,
      );
      successCount += batch.length;
    } catch (error) {
      console.error(
        `Batch ${i + 1}/${totalBatches} failed:`,
        error.response?.data || error.message,
      );
      errorCount += batch.length;

      // Save failed batch to file for manual review
      const failedBatchFile = `failed_${endpoint}_batch_${i + 1}.json`;
      fs.writeFileSync(failedBatchFile, JSON.stringify(batch, null, 2));
      console.log(`Failed batch saved to: ${failedBatchFile}`);
    }

    // Add delay to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n${endpoint} Upload Summary:`);
  console.log(`✅ Successfully uploaded: ${successCount} records`);
  console.log(`❌ Failed to upload: ${errorCount} records`);

  return { successCount, errorCount };
}

// Function to import production data
async function importProductionData(filePath = CSV_FILES.production) {
  try {
    console.log("\n=== IMPORTING ONION PRODUCTION DATA ===");

    if (!fs.existsSync(filePath)) {
      console.error(`Production CSV file not found: ${filePath}`);
      return null;
    }

    const rawData = await parseCSV(filePath);
    const cleanedData = cleanProductionData(rawData);

    if (cleanedData.length === 0) {
      console.log("No valid production data found.");
      return null;
    }

    // Save processed data for review
    fs.writeFileSync(
      "processed_production_data.json",
      JSON.stringify(cleanedData, null, 2),
    );
    console.log(
      `Processed production data saved to: processed_production_data.json`,
    );
    console.log(`Total production records: ${cleanedData.length}`);

    // Show sample record
    console.log("\nSample production record:");
    console.log(JSON.stringify(cleanedData[0], null, 2));

    // Upload data
    const result = await uploadDataInBatches(cleanedData, "onion-production");
    return result;
  } catch (error) {
    console.error("Production data import failed:", error);
    return null;
  }
}

// Function to import rainfall data
async function importRainfallData(filePath = CSV_FILES.rainfall) {
  try {
    console.log("\n=== IMPORTING ONION RAINFALL DATA ===");

    if (!fs.existsSync(filePath)) {
      console.error(`Rainfall CSV file not found: ${filePath}`);
      return null;
    }

    const rawData = await parseCSV(filePath);
    const cleanedData = cleanRainfallData(rawData);

    if (cleanedData.length === 0) {
      console.log("No valid rainfall data found.");
      return null;
    }

    // Save processed data for review
    fs.writeFileSync(
      "processed_rainfall_data.json",
      JSON.stringify(cleanedData, null, 2),
    );
    console.log(
      `Processed rainfall data saved to: processed_rainfall_data.json`,
    );
    console.log(`Total rainfall records: ${cleanedData.length}`);

    // Show sample record
    console.log("\nSample rainfall record:");
    console.log(JSON.stringify(cleanedData[0], null, 2));

    // Upload data
    const result = await uploadDataInBatches(cleanedData, "onion-rainfall");
    return result;
  } catch (error) {
    console.error("Rainfall data import failed:", error);
    return null;
  }
}

// Function to import price data
async function importPriceData(filePath = CSV_FILES.prices) {
  try {
    console.log("\n=== IMPORTING ONION PRICE DATA ===");

    if (!fs.existsSync(filePath)) {
      console.error(`Price CSV file not found: ${filePath}`);
      return null;
    }

    const rawData = await parseCSV(filePath);
    const cleanedData = cleanPriceData(rawData);

    if (cleanedData.length === 0) {
      console.log("No valid price data found.");
      return null;
    }

    // Save processed data for review
    fs.writeFileSync(
      "processed_price_data.json",
      JSON.stringify(cleanedData, null, 2),
    );
    console.log(`Processed price data saved to: processed_price_data.json`);
    console.log(`Total price records: ${cleanedData.length}`);

    // Show sample record
    console.log("\nSample price record:");
    console.log(JSON.stringify(cleanedData[0], null, 2));

    // Upload data
    const result = await uploadDataInBatches(cleanedData, "onion-prices");
    return result;
  } catch (error) {
    console.error("Price data import failed:", error);
    return null;
  }
}

// Function to import variety data
async function importVarietyData(filePath = CSV_FILES.varieties) {
  try {
    console.log("\n=== IMPORTING ONION VARIETY DATA ===");

    if (!fs.existsSync(filePath)) {
      console.error(`Variety CSV file not found: ${filePath}`);
      return null;
    }

    const rawData = await parseCSV(filePath);
    const cleanedData = cleanVarietyData(rawData);

    if (cleanedData.length === 0) {
      console.log("No valid variety data found.");
      return null;
    }

    // Save processed data for review
    fs.writeFileSync(
      "processed_variety_data.json",
      JSON.stringify(cleanedData, null, 2),
    );
    console.log(`Processed variety data saved to: processed_variety_data.json`);
    console.log(`Total variety records: ${cleanedData.length}`);

    // Show sample record
    console.log("\nSample variety record:");
    console.log(JSON.stringify(cleanedData[0], null, 2));

    // Upload data
    const result = await uploadDataInBatches(cleanedData, "onion-varieties");
    return result;
  } catch (error) {
    console.error("Variety data import failed:", error);
    return null;
  }
}

// Main import function
async function importAllOnionData(options = {}) {
  try {
    console.log("🧅 Starting Onion Data Import Process...\n");

    const {
      importProduction = true,
      importRainfall = true,
      importPrices = true,
      importVarieties = true,
      customPaths = {},
    } = options;

    const results = {
      production: null,
      rainfall: null,
      prices: null,
      varieties: null,
    };

    // Import production data
    if (importProduction) {
      results.production = await importProductionData(customPaths.production);
    }

    // Import rainfall data
    if (importRainfall) {
      results.rainfall = await importRainfallData(customPaths.rainfall);
    }

    // Import price data
    if (importPrices) {
      results.prices = await importPriceData(customPaths.prices);
    }

    // Import variety data
    if (importVarieties) {
      results.varieties = await importVarietyData(customPaths.varieties);
    }

    // Summary
    console.log("\n🎉 ONION DATA IMPORT COMPLETE!");
    console.log("=".repeat(50));

    let totalSuccess = 0;
    let totalErrors = 0;

    Object.entries(results).forEach(([type, result]) => {
      if (result) {
        console.log(
          `${type.toUpperCase()}: ✅ ${result.successCount} | ❌ ${result.errorCount}`,
        );
        totalSuccess += result.successCount;
        totalErrors += result.errorCount;
      }
    });

    console.log("=".repeat(50));
    console.log(`TOTAL: ✅ ${totalSuccess} records | ❌ ${totalErrors} errors`);

    return results;
  } catch (error) {
    console.error("Overall import failed:", error);
    return null;
  }
}

// Command line usage
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🧅 Onion Data Import Script

Usage:
  node importOnionData.js [options]
  
Options:
  --production-only    Import only production data
  --rainfall-only      Import only rainfall data  
  --prices-only        Import only price data
  --varieties-only     Import only variety data
  --help, -h           Show this help message
  
Examples:
  node importOnionData.js                    # Import all data
  node importOnionData.js --production-only  # Import only production data
  node importOnionData.js --prices-only      # Import only price data
        `);
    process.exit(0);
  }

  const options = {
    importProduction:
      args.includes("--production-only") ||
      !args.some((arg) => arg.includes("--") && arg.includes("-only")),
    importRainfall:
      args.includes("--rainfall-only") ||
      !args.some((arg) => arg.includes("--") && arg.includes("-only")),
    importPrices:
      args.includes("--prices-only") ||
      !args.some((arg) => arg.includes("--") && arg.includes("-only")),
    importVarieties:
      args.includes("--varieties-only") ||
      !args.some((arg) => arg.includes("--") && arg.includes("-only")),
  };

  importAllOnionData(options);
}

// Export functions for use as module
export {
  parseCSV,
  cleanProductionData,
  cleanRainfallData,
  cleanPriceData,
  cleanVarietyData,
  uploadDataInBatches,
  importProductionData,
  importRainfallData,
  importPriceData,
  importVarietyData,
  importAllOnionData,
};
