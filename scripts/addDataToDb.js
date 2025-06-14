// importExcelData.js - Script to import Excel data to PostgreSQL (ESM)
import XLSX from "xlsx";
import axios from "axios";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_BASE_URL = "http://localhost:5000/api";
const EXCEL_FILE_PATH = "../../datasets/monthly_aggregated_prices_bidar.xlsx"; // Update with your file path

// Function to parse date from various formats
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Handle different date formats
  if (typeof dateStr === "string") {
    // Format: "Sep-2018", "Nov-2018", etc.
    const monthYearMatch = dateStr.match(/^([A-Za-z]{3})-(\d{4})$/);
    if (monthYearMatch) {
      const [, month, year] = monthYearMatch;
      const monthMap = {
        Jan: "01",
        Feb: "02",
        Mar: "03",
        Apr: "04",
        May: "05",
        Jun: "06",
        Jul: "07",
        Aug: "08",
        Sep: "09",
        Oct: "10",
        Nov: "11",
        Dec: "12",
      };
      return `${year}-${monthMap[month]}-01`;
    }
  }

  // Handle Excel date numbers
  if (typeof dateStr === "number") {
    // Excel date to JavaScript date conversion
    const excelDate = new Date((dateStr - 25569) * 86400 * 1000);
    return excelDate.toISOString().split("T")[0];
  }

  // Try to parse as regular date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  return null;
}

// Function to clean and validate data
function cleanPriceData(rawData) {
  const cleanedData = [];

  rawData.forEach((row, index) => {
    try {
      // Handle different possible column names (case insensitive)
      const getColumnValue = (possibleNames) => {
        for (const name of possibleNames) {
          const key = Object.keys(row).find((k) =>
            k.toLowerCase().includes(name.toLowerCase()),
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

      const districtName = getColumnValue(["district", "district name"]);
      const marketName = getColumnValue(["market", "market name"]);
      const commodityName = getColumnValue(["commodity", "commodity name"]);
      const minPrice = getColumnValue(["min price", "minimum price"]);
      const maxPrice = getColumnValue(["max price", "maximum price"]);
      const modalPrice = getColumnValue(["modal price", "mode price"]);
      const priceDate = getColumnValue(["price date", "date"]);

      // Validate required fields
      if (
        !districtName ||
        !marketName ||
        !commodityName ||
        !modalPrice ||
        !priceDate
      ) {
        console.warn(`Row ${index + 1}: Missing required fields, skipping...`);
        return;
      }

      // Parse and validate prices
      const parsedMinPrice = parseFloat(minPrice) || parseFloat(modalPrice);
      const parsedMaxPrice = parseFloat(maxPrice) || parseFloat(modalPrice);
      const parsedModalPrice = parseFloat(modalPrice);

      if (isNaN(parsedModalPrice) || parsedModalPrice <= 0) {
        console.warn(`Row ${index + 1}: Invalid modal price, skipping...`);
        return;
      }

      // Parse date
      const parsedDate = parseDate(priceDate);
      if (!parsedDate) {
        console.warn(`Row ${index + 1}: Invalid date format, skipping...`);
        return;
      }

      cleanedData.push({
        district_name: districtName.toString().trim(),
        market_name: marketName.toString().trim(),
        commodity_name: commodityName.toString().trim(),
        min_price: parsedMinPrice,
        max_price: parsedMaxPrice,
        modal_price: parsedModalPrice,
        price_date: parsedDate,
      });
    } catch (error) {
      console.error(`Error processing row ${index + 1}:`, error.message);
    }
  });

  return cleanedData;
}

// Function to read Excel file
async function readExcelFile(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);

    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    console.log(`Found sheets: ${sheetNames.join(", ")}`);

    // Use first sheet or specify sheet name
    const worksheet = workbook.Sheets[sheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Raw data rows: ${rawData.length}`);

    // Clean and validate data
    const cleanedData = cleanPriceData(rawData);

    console.log(`Cleaned data rows: ${cleanedData.length}`);

    return cleanedData;
  } catch (error) {
    console.error("Error reading Excel file:", error);
    throw error;
  }
}

// Function to read multiple Excel files or sheets
async function readMultipleFiles(filePaths) {
  const allData = [];

  for (const filePath of filePaths) {
    try {
      console.log(`\nProcessing file: ${filePath}`);
      const data = await readExcelFile(filePath);
      allData.push(...data);
    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error.message);
    }
  }

  return allData;
}

// Function to read all sheets from a single Excel file
async function readAllSheets(filePath) {
  try {
    console.log(`Reading all sheets from: ${filePath}`);

    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    const allData = [];

    console.log(`Found sheets: ${sheetNames.join(", ")}`);

    for (const sheetName of sheetNames) {
      console.log(`\nProcessing sheet: ${sheetName}`);

      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      console.log(`Raw data rows in ${sheetName}: ${rawData.length}`);

      // Clean and validate data
      const cleanedData = cleanPriceData(rawData);
      console.log(`Cleaned data rows in ${sheetName}: ${cleanedData.length}`);

      allData.push(...cleanedData);
    }

    return allData;
  } catch (error) {
    console.error("Error reading Excel file:", error);
    throw error;
  }
}

// Function to upload data in batches
async function uploadDataInBatches(data, batchSize = 100) {
  const totalBatches = Math.ceil(data.length / batchSize);
  let successCount = 0;
  let errorCount = 0;

  console.log(
    `\nUploading ${data.length} records in ${totalBatches} batches...`,
  );

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, data.length);
    const batch = data.slice(start, end);

    try {
      const response = await axios.post(`${API_BASE_URL}/bulk-insert`, {
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
      const failedBatchFile = `failed_batch_${i + 1}.json`;
      fs.writeFileSync(failedBatchFile, JSON.stringify(batch, null, 2));
      console.log(`Failed batch saved to: ${failedBatchFile}`);
    }

    // Add delay to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\nUpload Summary:`);
  console.log(`✅ Successfully uploaded: ${successCount} records`);
  console.log(`❌ Failed to upload: ${errorCount} records`);

  return { successCount, errorCount };
}

// Main import function
async function importExcelData(filePath = EXCEL_FILE_PATH, options = {}) {
  try {
    const { allSheets = false, multipleFiles = false, fileList = [] } = options;

    let data = [];

    if (multipleFiles && fileList.length > 0) {
      // Process multiple files
      data = await readMultipleFiles(fileList);
    } else if (allSheets) {
      // Process all sheets from one file
      data = await readAllSheets(filePath);
    } else {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`Excel file not found: ${filePath}`);
        return;
      }

      // Process single file/sheet
      data = await readExcelFile(filePath);
    }

    if (data.length === 0) {
      console.log("No valid data found to import.");
      return;
    }

    // Save processed data to JSON for review
    fs.writeFileSync("processed_data.json", JSON.stringify(data, null, 2));
    console.log(`\nProcessed data saved to: processed_data.json`);
    console.log(`Total records to upload: ${data.length}`);

    // Show sample record
    console.log("\nSample record:");
    console.log(JSON.stringify(data[0], null, 2));

    // Upload data
    const result = await uploadDataInBatches(data);

    return result;
  } catch (error) {
    console.error("Import failed:", error);
  }
}

// Command line usage
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage:
  node importExcelData.js [options] [file-path]
  
Options:
  --all-sheets    Process all sheets from the Excel file
  --multiple      Process multiple files (provide file paths as arguments)
  --help, -h      Show this help message
  
Examples:
  node importExcelData.js data.xlsx
  node importExcelData.js --all-sheets data.xlsx
  node importExcelData.js --multiple file1.xlsx file2.xlsx file3.xlsx
        `);
    process.exit(0);
  }

  if (args.includes("--all-sheets")) {
    const filePath =
      args.find((arg) => !arg.startsWith("--")) || EXCEL_FILE_PATH;
    console.log(`Processing all sheets from: ${filePath}`);
    importExcelData(filePath, { allSheets: true });
  } else if (args.includes("--multiple")) {
    const fileList = args.filter((arg) => !arg.startsWith("--"));
    if (fileList.length === 0) {
      console.error("No files provided for multiple file processing");
      process.exit(1);
    }
    console.log(`Processing multiple files: ${fileList.join(", ")}`);
    importExcelData(null, { multipleFiles: true, fileList });
  } else {
    const filePath = args[0] || EXCEL_FILE_PATH;
    console.log(`Processing single file: ${filePath}`);
    importExcelData(filePath);
  }
}

// Export functions for use as module
export {
  readExcelFile,
  readAllSheets,
  readMultipleFiles,
  cleanPriceData,
  uploadDataInBatches,
  importExcelData,
};
