"use client";

import { useState, useRef, useEffect } from "react";
import "./index.css"; // Import the CSS file
import Chatbot from "./Chatbot.js"; // Import existing Chatbot
import CropPriceChart from "./CropPriceChart.js"; // Import existing CropPriceChart
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  ComposedChart,
} from "recharts";

// Onion Analysis Component - New addition to align with backend
const OnionAnalysis = () => {
  const [onionData, setOnionData] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    district: "",
    market: "",
    variety: "",
    startYear: "",
    endYear: "",
    groupBy: "month",
  });

  const API_BASE_URL = "http://localhost:5000/api";

  useEffect(() => {
    fetchOnionDistricts();
  }, []);

  useEffect(() => {
    if (filters.district) {
      fetchOnionMarkets();
      fetchOnionVarieties();
    }
  }, [filters.district]);

  useEffect(() => {
    if (filters.district) {
      fetchOnionPriceData();
    }
  }, [filters]);

  const fetchOnionDistricts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/onion/districts`);
      const data = await response.json();
      setDistricts(data);
    } catch (error) {
      console.error("Error fetching onion districts:", error);
    }
  };

  const fetchOnionMarkets = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/onion/districts/${filters.district}/markets`,
      );
      const data = await response.json();
      setMarkets(data);
    } catch (error) {
      console.error("Error fetching onion markets:", error);
    }
  };

  const fetchOnionVarieties = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/onion/districts/${filters.district}/varieties`,
      );
      const data = await response.json();
      setVarieties(data);
    } catch (error) {
      console.error("Error fetching onion varieties:", error);
    }
  };

  const fetchOnionPriceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(
        `${API_BASE_URL}/onion/price-trends?${params}`,
      );
      const result = await response.json();

      // Format data for visualization
      const formattedData =
        result.data?.map((item) => ({
          ...item,
          period:
            item.period ||
            `${item.year}-${String(item.month).padStart(2, "0")}`,
          avg_price: Number.parseFloat(item.avg_price || item.modal_price || 0),
          avg_rainfall: Number.parseFloat(
            item.avg_rainfall || item.total_rainfall_3months || 0,
          ),
          avg_area: Number.parseFloat(item.avg_area || item.area_hectare || 0),
          avg_yield: Number.parseFloat(
            item.avg_yield || item.yield_tonne_per_hectare || 0,
          ),
        })) || [];

      setOnionData(formattedData);
    } catch (error) {
      console.error("Error fetching onion price data:", error);
      setOnionData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginBottom: "1rem",
          color: "#1f2937",
        }}
      >
        🧅 Onion Price Analysis
      </h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        Analyze onion price trends with rainfall correlation and production data
      </p>

      {/* Filters */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "#f9fafb",
          borderRadius: "0.5rem",
        }}
      >
        <select
          value={filters.district}
          onChange={(e) =>
            setFilters({
              ...filters,
              district: e.target.value,
              market: "",
              variety: "",
            })
          }
          style={{
            padding: "0.5rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            outline: "none",
            fontSize: "0.875rem",
          }}
        >
          <option value="">Select District</option>
          {districts.map((district, index) => (
            <option key={index} value={district.district}>
              {district.district} ({district.data_points} records)
            </option>
          ))}
        </select>

        <select
          value={filters.market}
          onChange={(e) => setFilters({ ...filters, market: e.target.value })}
          disabled={!filters.district}
          style={{
            padding: "0.5rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            outline: "none",
            fontSize: "0.875rem",
            opacity: !filters.district ? 0.5 : 1,
          }}
        >
          <option value="">All Markets</option>
          {markets.map((market, index) => (
            <option key={index} value={market.market_name}>
              {market.market_name} ({market.data_points} records)
            </option>
          ))}
        </select>

        <select
          value={filters.variety}
          onChange={(e) => setFilters({ ...filters, variety: e.target.value })}
          disabled={!filters.district}
          style={{
            padding: "0.5rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            outline: "none",
            fontSize: "0.875rem",
            opacity: !filters.district ? 0.5 : 1,
          }}
        >
          <option value="">All Varieties</option>
          {varieties.map((variety, index) => (
            <option key={index} value={variety.variety}>
              {variety.variety} ({variety.data_points} records)
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Start Year (e.g., 2020)"
          value={filters.startYear}
          onChange={(e) =>
            setFilters({ ...filters, startYear: e.target.value })
          }
          style={{
            padding: "0.5rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            outline: "none",
            fontSize: "0.875rem",
          }}
        />

        <input
          type="number"
          placeholder="End Year (e.g., 2024)"
          value={filters.endYear}
          onChange={(e) => setFilters({ ...filters, endYear: e.target.value })}
          style={{
            padding: "0.5rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            outline: "none",
            fontSize: "0.875rem",
          }}
        />

        <select
          value={filters.groupBy}
          onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
          style={{
            padding: "0.5rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            outline: "none",
            fontSize: "0.875rem",
          }}
        >
          <option value="month">Monthly</option>
          <option value="quarter">Quarterly</option>
          <option value="year">Yearly</option>
          <option value="season">Seasonal</option>
        </select>
      </div>

      {/* Chart */}
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "1.5rem",
          borderRadius: "0.5rem",
          minHeight: "500px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "400px",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ fontSize: "2rem" }}>⏳</div>
            <div style={{ color: "#6b7280" }}>Loading onion price data...</div>
          </div>
        ) : onionData.length > 0 ? (
          <>
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "#1f2937",
              }}
            >
              Price Trends & Rainfall Correlation
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={onionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  yAxisId="price"
                  orientation="left"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <YAxis
                  yAxisId="rainfall"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}mm`}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name.includes("Price"))
                      return [`₹${value?.toLocaleString()}`, name];
                    if (name.includes("Rainfall")) return [`${value}mm`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="rainfall"
                  dataKey="avg_rainfall"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  name="Average Rainfall (mm)"
                />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="avg_price"
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ fill: "#dc2626", r: 4 }}
                  name="Average Price (₹/Quintal)"
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Summary Statistics */}
            <div
              style={{
                marginTop: "1.5rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "#fef3c7",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  textAlign: "center",
                }}
              >
                <h4
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#92400e",
                    marginBottom: "0.5rem",
                  }}
                >
                  Avg Price
                </h4>
                <p
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#78350f",
                  }}
                >
                  ₹
                  {onionData.length > 0
                    ? Math.round(
                        onionData.reduce(
                          (sum, item) => sum + item.avg_price,
                          0,
                        ) / onionData.length,
                      ).toLocaleString()
                    : 0}
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#dbeafe",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  textAlign: "center",
                }}
              >
                <h4
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#1e40af",
                    marginBottom: "0.5rem",
                  }}
                >
                  Avg Rainfall
                </h4>
                <p
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#1e3a8a",
                  }}
                >
                  {onionData.length > 0
                    ? Math.round(
                        onionData.reduce(
                          (sum, item) => sum + item.avg_rainfall,
                          0,
                        ) / onionData.length,
                      )
                    : 0}
                  mm
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#dcfce7",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  textAlign: "center",
                }}
              >
                <h4
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#166534",
                    marginBottom: "0.5rem",
                  }}
                >
                  Data Points
                </h4>
                <p
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#15803d",
                  }}
                >
                  {onionData.length}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "400px",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ fontSize: "2rem" }}>🧅</div>
            <div style={{ color: "#6b7280", textAlign: "center" }}>
              {filters.district
                ? "No data available for selected filters"
                : "Select a district to view onion price trends"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Prediction Component - Placeholder for ML predictions
const PredictionPage = () => {
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    commodity: "Soyabean",
    district: "Bidar",
    year: 2028,
    month: 5,
    days: 30,
  });

  const API_BASE_URL = "http://localhost:5000/api";

  const handlePredict = async (crop) => {
    if (!filters.commodity || !filters.district) {
      alert("Please select both commodity and district");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/predict/${crop.toLowerCase()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filters),
      });

      const data = await response.json();
      setPredictionData(data);
    } catch (error) {
      console.error("Error making prediction:", error);
      alert("Failed to generate prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", marginTop:"2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "1rem",
            color: "#1f2937",
          }}
        >
          🔮 Price Prediction
        </h2>
        <p
          style={{
            fontSize: "1.125rem",
            color: "#6b7280",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          Advanced ML models for crop price prediction. Get accurate forecasts
          based on historical data and weather patterns.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#f9fafb",
          padding: "2rem",
          borderRadius: "0.5rem",
          maxWidth: "600px",
          margin: "0 auto 2rem auto",
          border: "1px solid #e5e7eb",
        }}
      >
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "1.5rem",
            color: "#1f2937",
          }}
        >
          Configure Prediction
        </h3>

        <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
          <label>Commodity</label>
          <select
            type="text"
            placeholder="Enter commodity (e.g., Onion, Rice, Wheat)"
            value={filters.commodity}
            onChange={(e) =>
              setFilters({ ...filters, commodity: e.target.value })
            }
            style={{
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              outline: "none",
            }}
          >
           <option value="Soyabean">SOYABEAN</option>
           <option value="Onion">ONION</option>
           <option value="Cotton">COTTON</option>
          </select>

          {filters.commodity === 'Onion' && (
            <>
              <div>
                <label>Market: </label>
                <select
                 type="text"
                 placeholder="Enter market (eg.)"
                 value={filters.market}
                 onChange={(e)=>
                  setFilters({ ...filters,market:e.target.value})
                 }
                 style={{
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                 }}
                >
                  <option value="Belgaum">Belgaum</option> 
                  <option value="Dharwar">Dharwar</option> 
                  <option value="Hubli (Amaragol)">Hubli (Amaragol)</option> 
                  <option value="Gadag">Gadag</option> 
                  <option value="Haveri">Haveri</option> 
                  <option value="Ranebennur">Ranebennur</option> 
                </select>
              </div>
              <div>
                <label>Variety: </label>
                <select
                type="test"
                placeholder="Enter market(eg. )"
                value={filters.variety}
                onchange={(e)=>
                  setFilters({ ...filters,variety:e.target.value})
                }
                style={{
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                }}
                >
                  <option value="Variety">Variety</option>
                  <option value="Pusa-Red">Pusa-Red</option>
                  <option value="White">White</option>
                  <option value="Puna">Puna</option>
                  <option value="Telagi">Telagi</option>
                  <option value="Onion">Onion</option>
                  <option value="Other">Other</option>
                  <option value="Local">Local</option>
                </select>
              </div>
            </>
          )} 

          <label>District</label>
          <select
            type="text"
            placeholder="Enter district name"
            value={filters.district}
            onChange={(e) =>
              setFilters({ ...filters, district: e.target.value })
            }
            style={{
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              outline: "none",
            }}
          >
            <option value="Belgaum">BELGAUM</option>
            <option value="Bidar">BIDAR</option>
            <option value="Dharwad">DHARWAD</option>
            <option value="Gadag">GADAG</option>
            <option value="Haveri">HAVERI</option>
          </select>

          <label>Year</label>
          <select
            type="number"
            placeholder="Enter year (e.g., 2023)"
            value={filters.year}
            onChange={(e) =>
              setFilters({ ...filters, year: e.target.value })
            }
            style={{
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              outline: "none",
            }}
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
            <option value="2024">2024</option>  {/* Testing purposes only */}
          </select>

          <label>Month</label>
          <select
            type="number"
            placeholder="Enter month (1–12)"
            min='1'
            max='12'
            value={filters.month}
            onChange={(e) =>
              setFilters({ ...filters, month: e.target.value })
            }
            style={{
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              outline: "none",
            }}
          >
            <option value='1'>1</option>
            <option value='2'>2</option>
            <option value='3'>3</option>
            <option value='4'>4</option>
            <option value='5'>5</option>
            <option value='6'>6</option>
            <option value='7'>7</option>
            <option value='8'>8</option>
            <option value='9'>9</option>
            <option value='10'>10</option>
            <option value='11'>11</option>
            <option value='12'>12</option>
          </select>

          <label>Range</label>
          <select
            value={filters.days}
            onChange={(e) =>
              setFilters({ ...filters, days: Number.parseInt(e.target.value) })
            }
            style={{
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              outline: "none",
            }}
          >
            <option value={7}>7 Days</option>
            <option value={15}>15 Days</option>
            <option value={30}>30 Days</option>
            <option value={60}>60 Days</option>
          </select>
        </div>

        <button
          onClick={()=>handlePredict(filters.commodity)}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#9ca3af" : "#3b82f6",
            color: "white",
            padding: "0.75rem 2rem",
            borderRadius: "0.5rem",
            border: "none",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {loading ? "Generating Prediction..." : "Generate Prediction"}
        </button>
      </div>

      {predictionData && (
        <div
          style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "0.5rem",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "1rem",
              color: "#1f2937",
            }}
          >
            Prediction Results
          </h3>
          <pre
            style={{
              backgroundColor: "#f3f4f6",
              padding: "1rem",
              borderRadius: "0.375rem",
              textAlign: "left",
              overflow: "auto",
            }}
          >
            {JSON.stringify(predictionData, null, 2)}
          </pre>
        </div>
      )}

      <div
        style={{
          marginTop: "2rem",
          padding: "1.5rem",
          backgroundColor: "#eff6ff",
          borderRadius: "0.5rem",
          border: "1px solid #bfdbfe",
        }}
      >
        <h4
          style={{
            fontSize: "1rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: "#1e40af",
          }}
        >
          🤖 How it works
        </h4>
        <p
          style={{ fontSize: "0.875rem", color: "#1e3a8a", lineHeight: "1.6" }}
        >
          Our ML models analyze historical price data, weather patterns,
          seasonal trends, and market dynamics to provide accurate price
          predictions. The system considers monsoon patterns, rainfall data, and
          production statistics to generate reliable forecasts.
        </p>
      </div>
    </div>
  );
};

// Home Page Component
const HomePage = () => {
  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "2rem" }}>
      {/* Hero Section */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <div style={{ fontSize: "3.75rem", marginBottom: "1rem" }}>🌾</div>
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: "bold",
            color: "#111827",
            marginBottom: "1rem",
          }}
        >
          Monsoon Driven Crop Price Prediction
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            color: "#6b7280",
            marginBottom: "2rem",
            maxWidth: "48rem",
            margin: "0 auto 2rem auto",
          }}
        >
          Harness the power of advanced analytics and machine learning to
          predict crop prices based on monsoon patterns, helping farmers and
          traders make informed decisions.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          <button className="btn-primary">Get Started</button>
          <button className="btn-secondary">Learn More</button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid-3" style={{ marginBottom: "3rem" }}>
        <div
          style={{
            textAlign: "center",
            padding: "1.5rem",
            backgroundColor: "#dbeafe",
            borderRadius: "0.5rem",
          }}
        >
          <div style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>📊</div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "0.75rem",
            }}
          >
            Advanced Analytics
          </h3>
          <p style={{ color: "#6b7280" }}>
            Comprehensive data visualization and analysis tools to understand
            market trends and price patterns.
          </p>
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "1.5rem",
            backgroundColor: "#dcfce7",
            borderRadius: "0.5rem",
          }}
        >
          <div style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>🤖</div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "0.75rem",
            }}
          >
            ML Predictions
          </h3>
          <p style={{ color: "#6b7280" }}>
            Machine learning models trained on historical data to predict future
            crop prices with high accuracy.
          </p>
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "1.5rem",
            backgroundColor: "#f3e8ff",
            borderRadius: "0.5rem",
          }}
        >
          <div style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>🌧️</div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "0.75rem",
            }}
          >
            Monsoon Integration
          </h3>
          <p style={{ color: "#6b7280" }}>
            Weather pattern analysis integrated with crop data to provide
            monsoon-driven price predictions.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div
        style={{
          background: "linear-gradient(to right, #059669, #2563eb)",
          color: "white",
          borderRadius: "0.5rem",
          padding: "2rem",
          marginBottom: "3rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1.5rem",
            textAlign: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "1.875rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              500+
            </div>
            <div style={{ color: "#a7f3d0" }}>Commodities Tracked</div>
          </div>
          <div>
            <div
              style={{
                fontSize: "1.875rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              1000+
            </div>
            <div style={{ color: "#a7f3d0" }}>Markets Covered</div>
          </div>
          <div>
            <div
              style={{
                fontSize: "1.875rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              95%
            </div>
            <div style={{ color: "#a7f3d0" }}>Prediction Accuracy</div>
          </div>
          <div>
            <div
              style={{
                fontSize: "1.875rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              24/7
            </div>
            <div style={{ color: "#a7f3d0" }}>Real-time Updates</div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "1.875rem",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          How It Works
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                backgroundColor: "#dbeafe",
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>📥</span>
            </div>
            <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Data Collection
            </h4>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Gather historical price data and weather patterns
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                backgroundColor: "#dcfce7",
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>⚙️</span>
            </div>
            <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Processing
            </h4>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Analyze data using advanced ML algorithms
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                backgroundColor: "#f3e8ff",
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>🔮</span>
            </div>
            <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Prediction
            </h4>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Generate accurate price forecasts
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                backgroundColor: "#fed7aa",
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem auto",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>📱</span>
            </div>
            <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Insights
            </h4>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Deliver actionable insights to users
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// About Page Component
const AboutPage = () => {
  return (
    <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: "bold",
            color: "#111827",
            marginBottom: "1.5rem",
          }}
        >
          About Our Platform
        </h1>
        <p style={{ fontSize: "1.25rem", color: "#6b7280" }}>
          Revolutionizing agricultural decision-making through data-driven
          insights
        </p>
      </div>

      {/* Mission Section */}
      <div style={{ marginBottom: "3rem" }}>
        <div
          style={{
            backgroundColor: "#dcfce7",
            padding: "2rem",
            borderRadius: "0.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#166534",
              marginBottom: "1rem",
            }}
          >
            Our Mission
          </h2>
          <p
            style={{
              color: "#374151",
              fontSize: "1.125rem",
              lineHeight: "1.75",
            }}
          >
            To empower farmers, traders, and agricultural stakeholders with
            accurate, data-driven crop price predictions that consider monsoon
            patterns and weather variations. We believe that informed
            decision-making is the key to sustainable agriculture and food
            security.
          </p>
        </div>
      </div>

      {/* Vision Section */}
      <div style={{ marginBottom: "3rem" }}>
        <div
          style={{
            backgroundColor: "#dbeafe",
            padding: "2rem",
            borderRadius: "0.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#1e40af",
              marginBottom: "1rem",
            }}
          >
            Our Vision
          </h2>
          <p
            style={{
              color: "#374151",
              fontSize: "1.125rem",
              lineHeight: "1.75",
            }}
          >
            To become the leading platform for agricultural price prediction in
            India, helping create a more transparent and efficient agricultural
            market ecosystem that benefits all stakeholders from farmers to
            consumers.
          </p>
        </div>
      </div>

      {/* What We Do */}
      <div style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "1.875rem",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          What We Do
        </h2>
        <div className="grid-2">
          <div className="card">
            <div style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>📈</div>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "0.75rem",
              }}
            >
              Price Prediction
            </h3>
            <p style={{ color: "#6b7280" }}>
              Advanced machine learning models analyze historical data, weather
              patterns, and market trends to predict future crop prices with
              high accuracy.
            </p>
          </div>
          <div className="card">
            <div style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>🌦️</div>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "0.75rem",
              }}
            >
              Weather Integration
            </h3>
            <p style={{ color: "#6b7280" }}>
              Real-time monsoon and weather data integration to provide
              context-aware predictions that account for seasonal variations and
              climate impact.
            </p>
          </div>
          <div className="card">
            <div style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>📊</div>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "0.75rem",
              }}
            >
              Market Analysis
            </h3>
            <p style={{ color: "#6b7280" }}>
              Comprehensive market analysis tools with interactive
              visualizations to help users understand price trends and market
              dynamics.
            </p>
          </div>
          <div className="card">
            <div style={{ fontSize: "1.875rem", marginBottom: "1rem" }}>🤖</div>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "0.75rem",
              }}
            >
              AI-Powered Insights
            </h3>
            <p style={{ color: "#6b7280" }}>
              Multi-lingual AI chatbot and intelligent recommendations to
              provide personalized insights and support for agricultural
              decision-making.
            </p>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "1.875rem",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          Our Technology
        </h2>
        <div
          style={{
            backgroundColor: "#f9fafb",
            padding: "2rem",
            borderRadius: "0.5rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1.5rem",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                Machine Learning
              </h4>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Advanced ML algorithms for accurate predictions
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                Big Data Analytics
              </h4>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Processing vast amounts of agricultural data
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                Real-time Processing
              </h4>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Live data feeds and instant updates
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Impact */}
      <div
        style={{
          textAlign: "center",
          background: "linear-gradient(to right, #059669, #2563eb)",
          color: "white",
          padding: "2rem",
          borderRadius: "0.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          Our Impact
        </h2>
        <p
          style={{
            fontSize: "1.125rem",
            marginBottom: "1.5rem",
          }}
        >
          Helping thousands of farmers and traders make better decisions every
          day
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
              10,000+
            </div>
            <div style={{ color: "#a7f3d0" }}>Active Users</div>
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>₹50Cr+</div>
            <div style={{ color: "#a7f3d0" }}>Value Protected</div>
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>500+</div>
            <div style={{ color: "#a7f3d0" }}>Districts Covered</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Team Page Component
const TeamPage = () => {
  const teamMembers = [
    {
      name: "Yaana Muthamma",
      role: "Lead Data Scientist",
      expertise: "Machine Learning & Agricultural Analytics",
      description:
        "Specializes in developing predictive models for crop price forecasting using advanced ML techniques.",
      avatar: "YM",
    },
    {
      name: "Mrinal",
      role: "Backend Developer",
      expertise: "API Development & Database Management",
      description:
        "Responsible for building robust backend systems and managing large-scale agricultural datasets.",
      avatar: "MR",
    },
    {
      name: "Archit",
      role: "Frontend Developer",
      expertise: "UI/UX & Data Visualization",
      description:
        "Creates intuitive user interfaces and interactive data visualizations for agricultural insights.",
      avatar: "AR",
    },
    {
      name: "Sathwik",
      role: "DevOps Engineer",
      expertise: "Cloud Infrastructure & Deployment",
      description:
        "Manages cloud infrastructure and ensures scalable deployment of agricultural prediction systems.",
      avatar: "SA",
    },
    {
      name: "Suraj",
      role: "AI/ML Engineer",
      expertise: "Deep Learning & Weather Analytics",
      description:
        "Develops AI models for weather pattern analysis and monsoon-driven crop price predictions.",
      avatar: "SU",
    },
    {
      name: "Shreya",
      role: "Product Manager",
      expertise: "Agricultural Domain & Strategy",
      description:
        "Leads product strategy and ensures solutions meet the real-world needs of agricultural stakeholders.",
      avatar: "SH",
    },
  ];

  return (
    <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: "bold",
            color: "#111827",
            marginBottom: "1rem",
          }}
        >
          Meet Our Team
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            color: "#6b7280",
            maxWidth: "48rem",
            margin: "0 auto",
          }}
        >
          A passionate group of technologists, data scientists, and agricultural
          experts working together to revolutionize crop price prediction and
          agricultural analytics.
        </p>
      </div>

      {/* Team Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
          marginBottom: "3rem",
        }}
      >
        {teamMembers.map((member, index) => (
          <div
            key={index}
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "0.5rem",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e5e7eb",
              transition: "box-shadow 0.3s",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "5rem",
                  height: "5rem",
                  background: "linear-gradient(to right, #10b981, #3b82f6)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem auto",
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "1.125rem",
                  }}
                >
                  {member.avatar}
                </span>
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  color: "#111827",
                  marginBottom: "0.25rem",
                }}
              >
                {member.name}
              </h3>
              <p
                style={{
                  color: "#059669",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                {member.role}
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#2563eb",
                  marginBottom: "0.75rem",
                }}
              >
                {member.expertise}
              </p>
            </div>
            <p
              style={{
                color: "#6b7280",
                fontSize: "0.875rem",
                lineHeight: "1.5",
              }}
            >
              {member.description}
            </p>
          </div>
        ))}
      </div>

      {/* Team Values */}
      <div
        style={{
          background: "linear-gradient(to right, #dcfce7, #dbeafe)",
          padding: "2rem",
          borderRadius: "0.5rem",
          marginBottom: "3rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.875rem",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          Our Values
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.875rem", marginBottom: "0.75rem" }}>
              🎯
            </div>
            <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Innovation
            </h4>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Constantly pushing boundaries in agricultural technology
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.875rem", marginBottom: "0.75rem" }}>
              🤝
            </div>
            <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Collaboration
            </h4>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Working together to solve complex agricultural challenges
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.875rem", marginBottom: "0.75rem" }}>
              📊
            </div>
            <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Data-Driven
            </h4>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Making decisions based on solid data and analytics
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.875rem", marginBottom: "0.75rem" }}>
              🌱
            </div>
            <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
              Impact
            </h4>
            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Creating meaningful change in agricultural communities
            </p>
          </div>
        </div>
      </div>

      {/* Join Us Section */}
      <div
        style={{
          textAlign: "center",
          backgroundColor: "#111827",
          color: "white",
          padding: "2rem",
          borderRadius: "0.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          Join Our Mission
        </h2>
        <p
          style={{
            fontSize: "1.125rem",
            marginBottom: "1.5rem",
          }}
        >
          Interested in contributing to the future of agricultural technology?
        </p>
        <button className="btn-primary">Get In Touch</button>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const selectorRef = useRef(null);
  const navRefs = useRef({});

  // Updated sections array - removed "upload", "data", and "news"
  const sections = [
    "home",
    "prediction",
    "visualisation",
    "onion-analysis",
    "about",
    "our-team",
  ];

  useEffect(() => {
    const activeItem = navRefs.current[activeSection];
    if (activeItem && selectorRef.current) {
      const { offsetLeft, offsetWidth } = activeItem;
      selectorRef.current.style.left = `${offsetLeft}px`;
      selectorRef.current.style.width = `${offsetWidth}px`;
    }
  }, [activeSection]);

  const renderSectionContent = (section) => {
    switch (section) {
      case "home":
        return <HomePage />;
      case "prediction":
        return <PredictionPage />;
      case "visualisation":
        return <CropPriceChart />;
      case "onion-analysis":
        return <OnionAnalysis />;
      case "about":
        return <AboutPage />;
      case "our-team":
        return <TeamPage />;
      default:
        return (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </h2>
            <p style={{ color: "#6b7280" }}>
              This section is under development.
            </p>
          </div>
        );
    }
  };

  return (
    <div
      className="fallback-styles"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #f0fdf4, #eff6ff)",
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: "white",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            maxWidth: "80rem",
            margin: "0 auto",
            padding: "0 1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#059669",
                }}
              >
                🌾
              </div>
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  color: "#111827",
                }}
              >
                Monsoon Driven Crop Price Prediction
              </h1>
            </div>
            <button
              onClick={() => setIsChatbotOpen(true)}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span>💬</span>
              <span>Multi-lingual AI Chatbot</span>
            </button>
          </div>
        </div>
      </header>

      {/* Chatbot Component - Using existing Chatbot.js */}
      <Chatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        currentSection={activeSection}
      />

      {/* Navigation */}
      <nav
        style={{
          backgroundColor: "white",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: "80rem",
            margin: "0 auto",
            padding: "0 1rem",
          }}
        >
          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                gap: "2rem",
                overflowX: "auto",
              }}
            >
              {sections.map((section) => (
                <button
                  key={section}
                  ref={(el) => (navRefs.current[section] = el)}
                  onClick={() => setActiveSection(section)}
                  style={{
                    padding: "1rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                    transition: "color 0.2s",
                    color: activeSection === section ? "#2563eb" : "#6b7280",
                    borderBottom:
                      activeSection === section ? "2px solid #2563eb" : "none",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {section === "visualisation"
                    ? "Visualisation"
                    : section === "onion-analysis"
                      ? "Onion Analysis"
                      : section === "our-team"
                        ? "Our Team"
                        : section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
              ))}
            </div>
            <div
              ref={selectorRef}
              style={{
                position: "absolute",
                bottom: 0,
                height: "2px",
                backgroundColor: "#2563eb",
                transition: "all 0.3s ease-in-out",
              }}
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main
        style={{
          maxWidth: "80rem",
          margin: "0 auto",
          padding: "2rem 1rem",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            minHeight: "24rem",
          }}
        >
          {renderSectionContent(activeSection)}
        </div>
      </main>
    </div>
  );
}

export default App;
