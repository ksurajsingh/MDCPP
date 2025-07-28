import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import db from "../../db.js"; // Assuming your db connection is here
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const venvPython =
  process.env.VENV_PYTHON ||
  path.resolve(__dirname, "../machineModels/ml_env/bin/python");
const scriptDir = path.resolve(__dirname, "../machineModels/cotton/");
const scriptPath = path.join(scriptDir, "predict.py");

/**
 * Function to get rainfall data from database
 */
async function getRainfallFromDB(district, year, month) {
  try {
    const query = `
      SELECT 
        rainfall_lag_1,
        rainfall_lag_2,
        rainfall_lag_3,
        rainfall_3mo_sum
      FROM onion_rainfall 
      WHERE LOWER(district) = LOWER($1) 
        AND year = $2 
        AND month = $3
      LIMIT 1
    `;

    const result = await db.query(query, [district, year, month]);

    if (result.rows.length === 0) {
      // Try to find data for the same district and year but different month
      const fallbackQuery = `
        SELECT 
          rainfall_lag_1,
          rainfall_lag_2,
          rainfall_lag_3,
          rainfall_3mo_sum
        FROM onion_rainfall 
        WHERE LOWER(district) = LOWER($1) 
          AND year = $2
        ORDER BY ABS(month - $3)
        LIMIT 1
      `;

      const fallbackResult = await db.query(fallbackQuery, [
        district,
        year,
        month,
      ]);
      if (fallbackResult.rows.length === 0) {
        return null;
      }

      const row = fallbackResult.rows[0];
      return {
        minus1: parseFloat(row.rainfall_lag_1) || 0,
        minus2: parseFloat(row.rainfall_lag_2) || 0,
        minus3: parseFloat(row.rainfall_lag_3) || 0,
        total3Months: parseFloat(row.rainfall_3mo_sum) || 0,
        source: "fallback",
      };
    }

    const row = result.rows[0];
    return {
      minus1: parseFloat(row.rainfall_lag_1) || 0,
      minus2: parseFloat(row.rainfall_lag_2) || 0,
      minus3: parseFloat(row.rainfall_lag_3) || 0,
      total3Months: parseFloat(row.rainfall_3mo_sum) || 0,
      source: "exact",
    };
  } catch (error) {
    console.error("Database query error for rainfall:", error);
    return null;
  }
}

/**
 * Function to get production data from database
 */
async function getProductionFromDB(district, year) {
  try {
    const query = `
      SELECT 
        area_hectare,
        yield_tonne_per_hectare
      FROM onion_production 
      WHERE LOWER(district) = LOWER($1) 
        AND year = $2
      LIMIT 1
    `;

    const result = await db.query(query, [district, year]);

    if (result.rows.length === 0) {
      // Try to find the most recent data for the district
      const fallbackQuery = `
        SELECT 
          area_hectare,
          yield_tonne_per_hectare
        FROM onion_production 
        WHERE LOWER(district) = LOWER($1)
        ORDER BY ABS(year - $2)
        LIMIT 1
      `;

      const fallbackResult = await db.query(fallbackQuery, [district, year]);
      if (fallbackResult.rows.length === 0) {
        return null;
      }

      const row = fallbackResult.rows[0];
      return {
        area: parseFloat(row.area_hectare) || 0,
        yield: parseFloat(row.yield_tonne_per_hectare) || 0,
        source: "fallback",
      };
    }

    const row = result.rows[0];
    return {
      area: parseFloat(row.area_hectare) || 0,
      yield: parseFloat(row.yield_tonne_per_hectare) || 0,
      source: "exact",
    };
  } catch (error) {
    console.error("Database query error for production:", error);
    return null;
  }
}

/**
 * Predict onion price based on input parameters
 */
export const predictCottonPrice= async (req, res) => {
  let responded = false;

  function safeRespond(fn) {
    if (!responded) {
      responded = true;
      fn();
    }
  }

  try {
    const { district, year, month, variety, market, rainfall, production } =
      req.body;
    console.log("Onion prediction request:", req.body);

    // Input validation
    if (!district || !year || !month || !variety || !market) {
      return res.status(400).json({
        error: "district, year, month, variety, and market are required",
      });
    }

    // Validate year and month ranges
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      return res.status(400).json({ error: "Invalid year" });
    }

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "Invalid month (1-12)" });
    }

    console.log(
      `🔍 Fetching data for: ${district}, ${market}, ${variety}, ${yearNum}-${monthNum}`,
    );

    // Get rainfall data
    let rainfallData = null;
    let rainfallDataSource = "default";

    if (rainfall) {
      // Use provided rainfall data if available
      rainfallData = rainfall;
      rainfallDataSource = "provided";
    } else {
      // Query database for rainfall data
      const dbRainfall = await getRainfallFromDB(district, yearNum, monthNum);
      if (dbRainfall) {
        rainfallData = dbRainfall;
        rainfallDataSource = `database_${dbRainfall.source}`;
      }
    }

    // Use defaults if no rainfall data found
    if (!rainfallData) {
      rainfallData = {
        minus1: 16.1,
        minus2: 151.47,
        minus3: 126.24,
        total3Months: 193.82,
      };
      rainfallDataSource = "default";
    }

    // Get production data
    let productionData = null;
    let productionDataSource = "default";

    if (production) {
      // Use provided production data if available
      productionData = production;
      productionDataSource = "provided";
    } else {
      // Query database for production data
      const dbProduction = await getProductionFromDB(district, yearNum);
      if (dbProduction) {
        productionData = dbProduction;
        productionDataSource = `database_${dbProduction.source}`;
      }
    }

    // Use defaults if no production data found
    if (!productionData) {
      productionData = {
        area: 8485.19,
        yield: 10286.86,
      };
      productionDataSource = "default";
    }

    // Prepare features for Python script
    // [district, market, variety, year, month, rainfall_minus1, rainfall_minus2, rainfall_minus3, total_rainfall_3months, area_hectare, yield_tonne_per_hectare]
    const features = [
      district.trim(),
      market.trim(),
      variety.trim(),
      yearNum,
      monthNum,
      parseFloat(rainfallData.minus1) || 0,
      parseFloat(rainfallData.minus2) || 0,
      parseFloat(rainfallData.minus3) || 0,
      parseFloat(rainfallData.total3Months) || 0,
      parseFloat(productionData.area) || 0,
      parseFloat(productionData.yield) || 0,
    ];

    console.log("📊 Features prepared:", features);

    // Validate numerical features
    const numericalFeatures = features.slice(3); // Skip string features
    if (numericalFeatures.some((f) => isNaN(f))) {
      return res
        .status(400)
        .json({ error: "Invalid numerical data in features" });
    }

    const args = ["predict.py", "single", ...features.map(String)];

    // Set timeout for Python process
    const timeout = 30000; // 30 seconds
    const py = spawn(venvPython, args, {
      cwd: scriptDir,
      timeout: timeout,
    });

    let result = "";
    let error = "";

    py.stdout.on("data", (data) => {
      result += data.toString();
      console.log("Python stdout:", data.toString());
    });

    py.stderr.on("data", (data) => {
      error += data.toString();
      console.error("Python stderr:", data.toString());
    });

    // Handle timeout
    const timeoutId = setTimeout(() => {
      py.kill();
      safeRespond(() => {
        res.status(500).json({ error: "Python script timeout" });
      });
    }, timeout);

    py.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        console.error(`Python script failed with code ${code}: ${error}`);
        safeRespond(() => {
          res.status(500).json({
            error: "Python script failed",
            details: error || `Process exited with code ${code}`,
          });
        });
        return;
      }

      if (!result.trim()) {
        safeRespond(() => {
          res.status(500).json({ error: "No output from Python script" });
        });
        return;
      }

      try {
        const parsed = JSON.parse(result);

        if (parsed.error) {
          safeRespond(() => {
            res.status(500).json({ error: parsed.error });
          });
          return;
        }

        const prediction = parseFloat(parsed.prediction);
        const confidence = parseFloat(parsed.confidence) || 0;

        if (isNaN(prediction)) {
          safeRespond(() => {
            res.status(500).json({ error: "Invalid prediction value" });
          });
          return;
        }

        safeRespond(() => {
          res.json({
            success: true,
            prediction: {
              value: prediction,
              confidence: confidence,
              formatted: `Rs. ${prediction.toFixed(2)} per Quintal`,
              district: district,
              market: market,
              variety: variety,
              year: yearNum,
              month: monthNum,
            },
            raw: parsed,
            metadata: {
              features: features,
              rainfall_data_source: rainfallDataSource,
              production_data_source: productionDataSource,
              rainfall_data: rainfallData,
              production_data: productionData,
            },
          });
        });
      } catch (err) {
        console.error("JSON parsing error:", err, "Raw result:", result);
        safeRespond(() => {
          res.status(500).json({
            error: "Invalid JSON from Python script",
            raw: result,
            details: err.message,
          });
        });
      }
    });

    py.on("error", (err) => {
      clearTimeout(timeoutId);
      console.error("Python process error:", err);
      safeRespond(() => {
        res.status(500).json({
          error: "Failed to start Python process",
          details: err.message,
        });
      });
    });
  } catch (err) {
    console.error("Server error:", err);
    safeRespond(() => {
      res.status(500).json({
        error: "Server error",
        details: err.message,
      });
    });
  }
};

/**
 * Get available districts, markets, and varieties
 */
export const getAvailableOptions = async (req, res) => {
  try {
    // Get districts
    const districtQuery =
      "SELECT DISTINCT district FROM onion_prices ORDER BY district";
    const districtResult = await db.query(districtQuery);
    const districts = districtResult.rows.map((row) => row.district);

    // Get markets
    const marketQuery =
      "SELECT DISTINCT market_name FROM onion_prices ORDER BY market_name";
    const marketResult = await db.query(marketQuery);
    const markets = marketResult.rows.map((row) => row.market_name);

    // Get varieties
    const varietyQuery =
      "SELECT DISTINCT variety FROM onion_prices ORDER BY variety";
    const varietyResult = await db.query(varietyQuery);
    const varieties = varietyResult.rows.map((row) => row.variety);

    res.json({
      success: true,
      data: {
        districts,
        markets,
        varieties,
      },
    });
  } catch (error) {
    console.error("Error fetching options:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available options",
    });
  }
};

/**
 * Get markets for a specific district
 */
export const getMarketsForDistrict = async (req, res) => {
  try {
    const { district } = req.params;

    if (!district) {
      return res.status(400).json({
        success: false,
        message: "District parameter is required",
      });
    }

    const query = `
      SELECT DISTINCT market_name 
      FROM onion_prices 
      WHERE LOWER(district) = LOWER($1) 
      ORDER BY market_name
    `;

    const result = await db.query(query, [district]);
    const markets = result.rows.map((row) => row.market_name);

    res.json({
      success: true,
      data: {
        district,
        markets,
      },
    });
  } catch (error) {
    console.error("Error fetching markets for district:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch markets for district",
    });
  }
};
