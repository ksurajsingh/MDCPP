// app.js
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
//import priceRoutes from "./routes/prices.js";
import pool from "./db.js";

dotenv.config();

// API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_API;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";
const NEWS_API_KEY = process.env.NEWS_API_KEY || "your-news-api-key"; // You can get free key from newsapi.org
const NEWS_API_URL = "https://newsapi.org/v2/everything";

const app = express();
app.use(cors());
app.use(express.json());

// Function to fetch crop-related news
async function fetchCropNews(
  query = "crop prices agriculture India",
  days = 7,
) {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const response = await fetch(
      `${NEWS_API_URL}?q=${encodeURIComponent(query)}&from=${fromDate.toISOString().split("T")[0]}&sortBy=publishedAt&language=en&apiKey=${NEWS_API_KEY}`,
      {
        timeout: 10000,
      },
    );

    if (!response.ok) {
      console.error(`News API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error("Error fetching news:", error);
    return null;
  }
}

import predictRouter from "./src/routes/predict.route.js";
app.use("/api/predict", predictRouter);

// Resolve __dirname since you're using ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from client/public
// app.use(express.static(path.join(__dirname, "../client/public")));

// Optional: fallback to index.html for SPA
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/public/index.html"));
// });

//app.use("/api/prices", priceRoutes);

const formatPriceData = (rows) => {
  return rows.map((row) => ({
    ...row,
    price_date: row.price_date.toISOString().split("T")[0], // Format as YYYY-MM-DD
  }));
};

// 1. Get all commodities (for dropdown/filter)
app.get("/api/commodities", async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT DISTINCT c.id, c.name, c.category, COUNT(cp.id) as data_points
            FROM commodities c
            LEFT JOIN crop_prices cp ON c.id = cp.commodity_id
            GROUP BY c.id, c.name, c.category
            ORDER BY c.name
        `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. Get all districts (for dropdown/filter)
app.get("/api/districts", async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT DISTINCT d.id, d.name, d.state, COUNT(cp.id) as data_points
            FROM districts d
            LEFT JOIN crop_prices cp ON d.id = cp.district_id
            GROUP BY d.id, d.name, d.state
            ORDER BY d.name
        `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Get markets by district
app.get("/api/districts/:districtId/markets", async (req, res) => {
  try {
    const { districtId } = req.params;
    const result = await pool.query(
      `
            SELECT m.id, m.name, COUNT(cp.id) as data_points
            FROM markets m
            LEFT JOIN crop_prices cp ON m.id = cp.market_id
            WHERE m.district_id = $1
            GROUP BY m.id, m.name
            ORDER BY m.name
        `,
      [districtId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. Get price trends for charts (main endpoint)
app.get("/api/price-trends", async (req, res) => {
  try {
    const {
      commodity,
      district,
      market,
      startDate,
      endDate,
      groupBy = "month", // month, quarter, year
    } = req.query;

    let query = `
            SELECT 
                cp.price_date,
                cp.modal_price,
                cp.min_price,
                cp.max_price,
                d.name as district_name,
                m.name as market_name,
                c.name as commodity_name
            FROM crop_prices cp
            JOIN districts d ON cp.district_id = d.id
            JOIN markets m ON cp.market_id = m.id
            JOIN commodities c ON cp.commodity_id = c.id
            WHERE 1=1
        `;

    const params = [];
    let paramCount = 0;

    if (commodity) {
      paramCount++;
      query += ` AND c.name = $${paramCount}`;
      params.push(commodity);
    }

    if (district) {
      paramCount++;
      query += ` AND d.name = $${paramCount}`;
      params.push(district);
    }

    if (market) {
      paramCount++;
      query += ` AND m.name = $${paramCount}`;
      params.push(market);
    }

    if (startDate) {
      paramCount++;
      query += ` AND cp.price_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND cp.price_date <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY cp.price_date ASC`;

    const result = await pool.query(query, params);

    // Group data based on groupBy parameter
    let processedData = formatPriceData(result.rows);

    if (groupBy !== "day") {
      processedData = groupPriceData(processedData, groupBy);
    }

    res.json({
      data: processedData,
      totalRecords: result.rows.length,
      filters: { commodity, district, market, startDate, endDate, groupBy },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to group price data
function groupPriceData(data, groupBy) {
  const grouped = {};

  data.forEach((item) => {
    const date = new Date(item.price_date);
    let key;

    switch (groupBy) {
      case "month":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
      case "quarter":
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      case "year":
        key = date.getFullYear().toString();
        break;
      default:
        key = item.price_date;
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        prices: [],
        min_price: item.min_price,
        max_price: item.max_price,
        modal_prices: [],
      };
    }

    grouped[key].prices.push(item.modal_price);
    grouped[key].modal_prices.push(item.modal_price);
    grouped[key].min_price = Math.min(grouped[key].min_price, item.min_price);
    grouped[key].max_price = Math.max(grouped[key].max_price, item.max_price);
  });

  // Calculate averages
  return Object.values(grouped).map((group) => ({
    price_date: group.period,
    modal_price:
      group.modal_prices.reduce((a, b) => a + b, 0) / group.modal_prices.length,
    min_price: group.min_price,
    max_price: group.max_price,
    data_points: group.prices.length,
  }));
}

// 5. Get latest prices (for dashboard)
app.get("/api/latest-prices", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `
            WITH latest_prices AS (
                SELECT 
                    cp.*,
                    d.name as district_name,
                    m.name as market_name,
                    c.name as commodity_name,
                    ROW_NUMBER() OVER (PARTITION BY cp.commodity_id, cp.district_id ORDER BY cp.price_date DESC) as rn
                FROM crop_prices cp
                JOIN districts d ON cp.district_id = d.id
                JOIN markets m ON cp.market_id = m.id
                JOIN commodities c ON cp.commodity_id = c.id
            )
            SELECT * FROM latest_prices 
            WHERE rn = 1 
            ORDER BY price_date DESC 
            LIMIT $1
        `,
      [limit],
    );

    res.json(formatPriceData(result.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 6. Get price comparison between commodities
app.get("/api/price-comparison", async (req, res) => {
  try {
    const { commodities, district, startDate, endDate } = req.query;

    if (!commodities) {
      return res
        .status(400)
        .json({ error: "Commodities parameter is required" });
    }

    const commodityList = commodities.split(",");

    let query = `
            SELECT 
                c.name as commodity_name,
                cp.price_date,
                AVG(cp.modal_price) as avg_modal_price,
                MIN(cp.min_price) as min_price,
                MAX(cp.max_price) as max_price
            FROM crop_prices cp
            JOIN commodities c ON cp.commodity_id = c.id
            JOIN districts d ON cp.district_id = d.id
            WHERE c.name = ANY($1)
        `;

    const params = [commodityList];
    let paramCount = 1;

    if (district) {
      paramCount++;
      query += ` AND d.name = $${paramCount}`;
      params.push(district);
    }

    if (startDate) {
      paramCount++;
      query += ` AND cp.price_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND cp.price_date <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` 
            GROUP BY c.name, cp.price_date 
            ORDER BY cp.price_date ASC, c.name
        `;

    const result = await pool.query(query, params);
    res.json(formatPriceData(result.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//////////////////////onion

// Enhanced API endpoints for onion-specific data visualization

// 1. Get all districts for onion data
app.get("/api/onion/districts", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT district, COUNT(*) as data_points
      FROM onion_prices
      GROUP BY district
      ORDER BY district
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. Get markets by district for onion
app.get("/api/onion/districts/:district/markets", async (req, res) => {
  try {
    const { district } = req.params;
    const result = await pool.query(
      `
      SELECT DISTINCT market_name, COUNT(*) as data_points
      FROM onion_prices
      WHERE district = $1
      GROUP BY market_name
      ORDER BY market_name
      `,
      [district],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Get onion varieties by district
app.get("/api/onion/districts/:district/varieties", async (req, res) => {
  try {
    const { district } = req.params;
    const result = await pool.query(
      `
      SELECT DISTINCT variety, COUNT(*) as data_points
      FROM onion_prices
      WHERE district = $1
      GROUP BY variety
      ORDER BY variety
      `,
      [district],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. Get onion price trends with rainfall correlation
app.get("/api/onion/price-trends", async (req, res) => {
  try {
    const {
      district,
      market,
      variety,
      startYear,
      endYear,
      startMonth,
      endMonth,
      groupBy = "month",
    } = req.query;

    let query = `
      SELECT 
        op.district,
        op.market_name,
        op.variety,
        op.modal_price_rs_per_quintal,
        op.year,
        op.month,
        op.rainfall_minus1,
        op.rainfall_minus2,
        op.rainfall_minus3,
        op.total_rainfall_3months,
        op.area_hectare,
        op.yield_tonne_per_hectare
      FROM onion_prices op
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND op.district = $${paramCount}`;
      params.push(district);
    }

    if (market) {
      paramCount++;
      query += ` AND op.market_name = $${paramCount}`;
      params.push(market);
    }

    if (variety) {
      paramCount++;
      query += ` AND op.variety = $${paramCount}`;
      params.push(variety);
    }

    if (startYear) {
      paramCount++;
      query += ` AND op.year >= $${paramCount}`;
      params.push(parseInt(startYear));
    }

    if (endYear) {
      paramCount++;
      query += ` AND op.year <= $${paramCount}`;
      params.push(parseInt(endYear));
    }

    if (startMonth) {
      paramCount++;
      query += ` AND op.month >= $${paramCount}`;
      params.push(parseInt(startMonth));
    }

    if (endMonth) {
      paramCount++;
      query += ` AND op.month <= $${paramCount}`;
      params.push(parseInt(endMonth));
    }

    query += ` ORDER BY op.year ASC, op.month ASC`;

    const result = await pool.query(query, params);

    // Group data based on groupBy parameter
    let processedData = formatOnionPriceData(result.rows);

    if (groupBy !== "month") {
      processedData = groupOnionPriceData(processedData, groupBy);
    }

    res.json({
      data: processedData,
      totalRecords: result.rows.length,
      filters: {
        district,
        market,
        variety,
        startYear,
        endYear,
        startMonth,
        endMonth,
        groupBy,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. Get rainfall data for correlation analysis
app.get("/api/onion/rainfall-data", async (req, res) => {
  try {
    const { district, startYear, endYear } = req.query;

    let query = `
      SELECT 
        district,
        year,
        month,
        rainfall_mm,
        rainfall_lag_1,
        rainfall_lag_2,
        rainfall_lag_3,
        rainfall_3mo_sum
      FROM onion_rainfall
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND district = $${paramCount}`;
      params.push(district);
    }

    if (startYear) {
      paramCount++;
      query += ` AND year >= $${paramCount}`;
      params.push(parseInt(startYear));
    }

    if (endYear) {
      paramCount++;
      query += ` AND year <= $${paramCount}`;
      params.push(parseInt(endYear));
    }

    query += ` ORDER BY year ASC, month ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 6. Get production data
app.get("/api/onion/production-data", async (req, res) => {
  try {
    const { district, startYear, endYear } = req.query;

    let query = `
      SELECT 
        district,
        year,
        area_hectare,
        yield_tonne_per_hectare
      FROM onion_production
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND district = $${paramCount}`;
      params.push(district);
    }

    if (startYear) {
      paramCount++;
      query += ` AND year >= $${paramCount}`;
      params.push(parseInt(startYear));
    }

    if (endYear) {
      paramCount++;
      query += ` AND year <= $${paramCount}`;
      params.push(parseInt(endYear));
    }

    query += ` ORDER BY year ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 7. Get variety distribution by district
app.get("/api/onion/variety-distribution", async (req, res) => {
  try {
    const { district } = req.query;

    let query = `
      SELECT 
        district,
        local,
        onion,
        other,
        puna,
        pusa_red,
        telagi,
        white
      FROM onion_varieties
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND district = $${paramCount}`;
      params.push(district);
    }

    query += ` ORDER BY district`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 8. Get price-rainfall correlation data
app.get("/api/onion/price-rainfall-correlation", async (req, res) => {
  try {
    const { district, variety, year } = req.query;

    let query = `
      SELECT 
        op.district,
        op.market_name,
        op.variety,
        op.modal_price_rs_per_quintal,
        op.year,
        op.month,
        op.rainfall_minus1,
        op.rainfall_minus2,
        op.rainfall_minus3,
        op.total_rainfall_3months,
        COALESCE(or.rainfall_mm, 0) as current_rainfall
      FROM onion_prices op
      LEFT JOIN onion_rainfall or ON (
        op.district = or.district AND 
        op.year = or.year AND 
        op.month = or.month
      )
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND op.district = $${paramCount}`;
      params.push(district);
    }

    if (variety) {
      paramCount++;
      query += ` AND op.variety = $${paramCount}`;
      params.push(variety);
    }

    if (year) {
      paramCount++;
      query += ` AND op.year = $${paramCount}`;
      params.push(parseInt(year));
    }

    query += ` ORDER BY op.year ASC, op.month ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 9. Get summary statistics
app.get("/api/onion/summary-stats", async (req, res) => {
  try {
    const { district, year } = req.query;

    let query = `
      SELECT 
        district,
        year,
        variety,
        AVG(modal_price_rs_per_quintal) as avg_price,
        MIN(modal_price_rs_per_quintal) as min_price,
        MAX(modal_price_rs_per_quintal) as max_price,
        STDDEV(modal_price_rs_per_quintal) as price_volatility,
        COUNT(*) as data_points,
        AVG(total_rainfall_3months) as avg_rainfall_3mo,
        AVG(area_hectare) as avg_area,
        AVG(yield_tonne_per_hectare) as avg_yield
      FROM onion_prices
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (district) {
      paramCount++;
      query += ` AND district = $${paramCount}`;
      params.push(district);
    }

    if (year) {
      paramCount++;
      query += ` AND year = $${paramCount}`;
      params.push(parseInt(year));
    }

    query += ` GROUP BY district, year, variety ORDER BY district, year, variety`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper function to format onion price data
function formatOnionPriceData(rows) {
  return rows.map((row) => ({
    district: row.district,
    market_name: row.market_name,
    variety: row.variety,
    modal_price: parseFloat(row.modal_price_rs_per_quintal),
    year: row.year,
    month: row.month,
    date: `${row.year}-${String(row.month).padStart(2, "0")}-01`,
    rainfall_minus1: row.rainfall_minus1,
    rainfall_minus2: row.rainfall_minus2,
    rainfall_minus3: row.rainfall_minus3,
    total_rainfall_3months: row.total_rainfall_3months,
    area_hectare: row.area_hectare,
    yield_tonne_per_hectare: row.yield_tonne_per_hectare,
  }));
}

// Helper function to group onion price data
function groupOnionPriceData(data, groupBy) {
  const grouped = {};

  data.forEach((item) => {
    let key;

    switch (groupBy) {
      case "quarter":
        const quarter = Math.floor((item.month - 1) / 3) + 1;
        key = `${item.year}-Q${quarter}`;
        break;
      case "year":
        key = item.year.toString();
        break;
      case "season":
        // Define onion seasons (adjust based on your region)
        const season =
          item.month >= 11 || item.month <= 2
            ? "Rabi"
            : item.month >= 3 && item.month <= 6
              ? "Summer"
              : "Kharif";
        key = `${item.year}-${season}`;
        break;
      default:
        key = `${item.year}-${String(item.month).padStart(2, "0")}`;
    }

    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        prices: [],
        rainfall_data: [],
        area_data: [],
        yield_data: [],
      };
    }

    grouped[key].prices.push(item.modal_price);
    if (item.total_rainfall_3months) {
      grouped[key].rainfall_data.push(item.total_rainfall_3months);
    }
    if (item.area_hectare) {
      grouped[key].area_data.push(item.area_hectare);
    }
    if (item.yield_tonne_per_hectare) {
      grouped[key].yield_data.push(item.yield_tonne_per_hectare);
    }
  });

  // Calculate averages
  return Object.values(grouped).map((group) => ({
    period: group.period,
    avg_price:
      group.prices.length > 0
        ? group.prices.reduce((a, b) => a + b, 0) / group.prices.length
        : 0,
    min_price: group.prices.length > 0 ? Math.min(...group.prices) : 0,
    max_price: group.prices.length > 0 ? Math.max(...group.prices) : 0,
    avg_rainfall:
      group.rainfall_data.length > 0
        ? group.rainfall_data.reduce((a, b) => a + b, 0) /
          group.rainfall_data.length
        : 0,
    avg_area:
      group.area_data.length > 0
        ? group.area_data.reduce((a, b) => a + b, 0) / group.area_data.length
        : 0,
    avg_yield:
      group.yield_data.length > 0
        ? group.yield_data.reduce((a, b) => a + b, 0) / group.yield_data.length
        : 0,
    data_points: group.prices.length,
  }));
}

// 7. Bulk insert endpoint (for importing Excel data)
app.post("/api/bulk-insert", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { data } = req.body; // Array of price records

    for (const record of data) {
      // Insert or get district
      let districtResult = await client.query(
        "INSERT INTO districts (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [record.district_name],
      );
      const districtId = districtResult.rows[0].id;

      // Insert or get market
      let marketResult = await client.query(
        "INSERT INTO markets (name, district_id) VALUES ($1, $2) ON CONFLICT (name, district_id) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [record.market_name, districtId],
      );
      const marketId = marketResult.rows[0].id;

      // Insert or get commodity
      let commodityResult = await client.query(
        "INSERT INTO commodities (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [record.commodity_name],
      );
      const commodityId = commodityResult.rows[0].id;

      // Insert price record
      await client.query(
        `
                INSERT INTO crop_prices (district_id, market_id, commodity_id, min_price, max_price, modal_price, price_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT DO NOTHING
            `,
        [
          districtId,
          marketId,
          commodityId,
          record.min_price,
          record.max_price,
          record.modal_price,
          record.price_date,
        ],
      );
    }

    await client.query("COMMIT");
    res.json({
      message: "Data inserted successfully",
      recordsProcessed: data.length,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to insert data" });
  } finally {
    client.release();
  }
});

// Chatbot endpoint using Gemini API
app.post("/api/chat", async (req, res) => {
  try {
    const { message, context, chatHistory, userLanguage } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key not configured",
        reply:
          "I'm sorry, the AI service is not configured at the moment. Please try again later.",
      });
    }

    // Build conversation history
    let conversationHistory = "";
    if (chatHistory && chatHistory.length > 0) {
      conversationHistory =
        chatHistory
          .map(
            (msg) =>
              `${msg.type === "user" ? "User" : "My Crops"}: ${msg.content}`,
          )
          .join("\n") + "\n\n";
    }

    // Determine response language based on user input
    const responseLanguage = userLanguage === "kn-IN" ? "Kannada" : "English";

    // Check if user is asking for news or current information
    const newsKeywords = [
      "news",
      "latest",
      "current",
      "recent",
      "today",
      "this week",
      "this month",
      "update",
      "trend",
      "market",
    ];
    const isAskingForNews = newsKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );

    let newsContext = "";
    if (isAskingForNews) {
      console.log("Fetching crop news...");
      const news = await fetchCropNews("crop prices agriculture India", 7);
      if (news && news.length > 0) {
        const recentNews = news
          .slice(0, 3)
          .map(
            (article) =>
              `- ${article.title} (${article.publishedAt.split("T")[0]})`,
          )
          .join("\n");
        newsContext = `\n\nRecent crop-related news:\n${recentNews}`;
      }
    }

    const prompt = `You are "My Crops", a helpful AI assistant for a Crop Price Prediction system. 

Context about the system:
- This is a monsoon-driven crop price prediction platform
- Users can view historical price data, make predictions, and analyze trends
- The system helps farmers and traders make informed decisions about crop prices
- Available features include price visualization, prediction tools, and market analysis

Current user context: ${context || "User is interacting with the crop price prediction system"}

Previous conversation:
${conversationHistory}

User message: ${message}${newsContext}

IMPORTANT: 
- Keep responses concise and human-like
- Only give detailed explanations when specifically asked for deep analysis
- Be friendly, helpful, and to the point
- Respond directly to the user's question without generic greetings
- If the user asks the same question, provide a different perspective or ask for clarification
- The user is speaking in ${responseLanguage}
- ALWAYS respond in the same language as the user's message
- If userLanguage is 'kn-IN', respond in Kannada
- If userLanguage is 'en-US', respond in English
- Support both Kannada and English languages naturally
- If news context is provided, incorporate relevant recent information into your response
- For news-related queries, mention specific crops, regions, or price trends mentioned in the news`;

    console.log("Sending request to Gemini API...");
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
      timeout: 30000, // 30 second timeout
    });

    console.log("Gemini API response status:", response.status);
    const data = await response.json();
    console.log("Gemini API response data:", JSON.stringify(data, null, 2));

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content
    ) {
      console.error("Gemini API error:", data);
      return res.status(500).json({
        error: "Failed to get response from AI",
        reply:
          "I'm sorry, I'm having trouble processing your request right now. Please try again.",
      });
    }

    const reply = data.candidates[0].content.parts[0].text;
    console.log("Generated reply:", reply);

    res.json({
      success: true,
      reply: reply,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({
      error: "Internal server error",
      reply: "I'm sorry, something went wrong. Please try again later.",
    });
  }
});

// News endpoint for crop-related news
app.get("/api/news/crops", async (req, res) => {
  try {
    const { query = "crop prices agriculture India", days = 7 } = req.query;
    const news = await fetchCropNews(query, parseInt(days));

    if (!news) {
      return res.status(500).json({
        error: "Failed to fetch news",
        message: "Unable to retrieve crop news at the moment.",
      });
    }

    res.json({
      success: true,
      articles: news.slice(0, 10), // Return top 10 articles
      totalFound: news.length,
    });
  } catch (error) {
    console.error("News endpoint error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch crop news.",
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
