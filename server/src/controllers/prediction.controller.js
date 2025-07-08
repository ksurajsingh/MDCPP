import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // Fixed: was **dirname

// Paths
const venvPython = path.resolve(__dirname, "../mlModels/venv/bin/python");
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

export const predictSingle = async (req, res) => {
  try {
    const { year, month, district, rainfall } = req.body;
    console.log(req);

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

    // Use provided rainfall data or defaults
    const rainfallData = rainfall || {
      minus1: 100.0,
      minus2: 85.0,
      minus3: 90.0,
      total3Months: 275.0,
    };

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

    // Handle timeout
    const timeoutId = setTimeout(() => {
      py.kill();
      return res.status(500).json({ error: "Python script timeout" });
    }, timeout);

    py.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        console.error(`Python script failed with code ${code}: ${error}`);
        return res.status(500).json({
          error: "Python script failed",
          details: error || `Process exited with code ${code}`,
        });
      }

      if (!result.trim()) {
        return res.status(500).json({ error: "No output from Python script" });
      }

      try {
        const parsed = JSON.parse(result);

        if (parsed.error) {
          return res.status(500).json({ error: parsed.error });
        }

        const prediction = parseFloat(parsed.prediction);
        const confidence = parseFloat(parsed.confidence) || 0; // More reasonable fallback

        if (isNaN(prediction)) {
          return res.status(500).json({ error: "Invalid prediction value" });
        }

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
          },
        });
      } catch (err) {
        console.error("JSON parsing error:", err, "Raw result:", result);
        return res.status(500).json({
          error: "Invalid JSON from Python script",
          raw: result,
          details: err.message,
        });
      }
    });

    py.on("error", (err) => {
      clearTimeout(timeoutId);
      console.error("Python process error:", err);
      return res.status(500).json({
        error: "Failed to start Python process",
        details: err.message,
      });
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message,
    });
  }
};
