// app.js
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
//import priceRoutes from "./routes/prices.js";
import pool from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
