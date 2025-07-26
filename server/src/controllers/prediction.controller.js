import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import db from "../../db.js"; // Assuming your db connection is here
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const venvPython = process.env.VENV_PYTHON || path.resolve(__dirname, "../mlModels/venv/bin/python");
const scriptDir = path.resolve(__dirname, "../mlModels");
const scriptPath = path.join(scriptDir, "predict.py");

// District Data
const districtData = {
  Belgaum: { area: 96524.09, yield: 1.04 },
  Bidar: { area: 215400.22, yield: 1.38 },
  Dharwad: { area: 38644.53, yield: 0.89 },
  Gadag: { area: 626.42, yield: 1.22 },
  Haveri: { area: 13630.2, yield: 0.69 },
};

// Function to get rainfall data from database
async function getRainfallFromDB(district, year, month) {
  try {
    const query = `
      SELECT 
        rainfall_lag_1,
        rainfall_lag_2,
        rainfall_lag_3,
        rainfall_3mo_sum
      FROM soy_rainfall 
      WHERE LOWER(district) = LOWER($1) 
        AND year = $2 
        AND month = $3
      LIMIT 1
    `;

    const result = await db.query(query, [district, year, month]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      minus1: parseFloat(row.rainfall_lag_1),
      minus2: parseFloat(row.rainfall_lag_2),
      minus3: parseFloat(row.rainfall_lag_3),
      total3Months: parseFloat(row.rainfall_3mo_sum),
    };
  } catch (error) {
    console.error("Database query error:", error);
    return null;
  }
}

export const predictSingle = async (req, res) => {
  try {
    const { year, month, district, rainfall } = req.body;
    console.log(req.body);

    // Input validation
    if (!year || !month || !district) {
      return res
        .status(400)
        .json({ error: "year, month, and district are required" });
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

    const districtInfo = districtData[district];
    if (!districtInfo) {
      return res.status(400).json({
        error: `District ${district} not supported`,
        supportedDistricts: Object.keys(districtData),
      });
    }

    // Try to get rainfall data from database first
    let rainfallData = null;
    let dataSource = "default";

    if (rainfall) {
      // Use provided rainfall data if available
      rainfallData = rainfall;
      dataSource = "provided";
    } else {
      // Query database for rainfall data
      const dbRainfall = await getRainfallFromDB(district, yearNum, monthNum);
      if (dbRainfall) {
        rainfallData = dbRainfall;
        dataSource = "database";
      }
    }

    // Use defaults if no data found
    if (!rainfallData) {
      rainfallData = {
        minus1: 100.0,
        minus2: 85.0,
        minus3: 90.0,
        total3Months: 275.0,
      };
      dataSource = "default";
    }

    const features = [
      yearNum,
      monthNum,
      parseFloat(rainfallData.minus1) || 191.39,
      parseFloat(rainfallData.minus2) || 127.24,
      parseFloat(rainfallData.minus3) || 121.86,
      parseFloat(rainfallData.total3Months) || 440.49,
      districtInfo.area,
      districtInfo.yield,
    ];

    // Validate all features are numbers
    if (features.some((f) => isNaN(f))) {
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
    });

    py.stderr.on("data", (data) => {
      error += data.toString();
    });

    py.stdout.on("data", (data) => {
      console.log("Python stdout:", data.toString());
    });

    py.stderr.on("data", (data) => {
      console.error("Python stderr:", data.toString());
    });


    let responded = false;

    function safeRespond(fn) {
      if (!responded) {
        responded = true;
        fn();
      }
    }

    // Handle timeout
    const timeoutId = setTimeout(() => {
      py.kill();
      safeRespond(()=>{
        res.status(500).json({ error: "Python script timeout" });
      });
    }, timeout);

    py.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        console.error(`Python script failed with code ${code}: ${error}`);
        safeRespond(()=>{
            res.status(500).json({
            error: "Python script failed",
            details: error || `Process exited with code ${code}`,
          });
        });
      }

      if (!result.trim()) {
        safeRespond(()=>{
          res.status(500).json({ error: "No output from Python script" });
        });
      }

      try {
        const parsed = JSON.parse(result);

        if (parsed.error) {
          safeRespond(()=>{
            res.status(500).json({ error: parsed.error });
          });
        }

        const prediction = parseFloat(parsed.prediction);
        const confidence = parseFloat(parsed.confidence) || 0;

        if (isNaN(prediction)) {
          safeRespond(()=>{
            res.status(500).json({ error: "Invalid prediction value" });
          });
        }

        safeRespond(()=>{

          res.json({
            success: true,
            prediction: {
              value: prediction,
              confidence: confidence,
              formatted: `${prediction.toFixed(1)} ± 367`,
              district: district,
              year: yearNum,
              month: monthNum,
            },
            raw: parsed,
            metadata: {
              features: features,
              district_info: districtInfo,
              rainfall_data_source: dataSource, // Shows where the data came from
              rainfall_data: rainfallData,
            },
          });

        });
      } catch (err) {
        console.error("JSON parsing error:", err, "Raw result:", result);
        safeRespond(()=>{
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
      safeRespond(()=>{
        res.status(500).json({
        error: "Failed to start Python process",
        details: err.message,
        });
      });
    });
  } catch (err) {
    console.error("Server error:", err);
    safeRespond(()=>{
      res.status(500).json({
      error: "Server error",
      details: err.message,
      });
    });
  }
};
