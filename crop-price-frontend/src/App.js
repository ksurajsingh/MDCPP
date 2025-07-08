"use client";

import { useState, useRef, useEffect } from "react";
import "./index.css"; // Import the CSS file
import Chatbot from "./Chatbot.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";

// Your original CropPriceChart component - keeping all API functionality
const CropPriceChart = () => {
  const [priceData, setPriceData] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markets, setMarkets] = useState([]);
  const [chartType, setChartType] = useState("line");
  const [filters, setFilters] = useState({
    commodity: "",
    district: "",
    market: "",
    startDate: "",
    endDate: "",
    groupBy: "month",
  });

  // API base URL - matches your backend
  const API_BASE_URL = "http://localhost:5000/api";

  // Fetch initial data
  useEffect(() => {
    fetchCommodities();
    fetchDistricts();
  }, []);

  // Fetch markets when district changes
  useEffect(() => {
    if (filters.district) {
      fetchMarkets();
    } else {
      setMarkets([]);
      setFilters((prev) => ({ ...prev, market: "" }));
    }
  }, [filters.district]);

  // Fetch price data when filters change
  useEffect(() => {
    if (filters.commodity) {
      fetchPriceData();
    }
  }, [filters]);

  const fetchMarkets = async () => {
    try {
      const selectedDistrict = districts.find(
        (d) => d.name === filters.district,
      );
      if (selectedDistrict) {
        const response = await fetch(
          `${API_BASE_URL}/districts/${selectedDistrict.id}/markets`,
        );
        const data = await response.json();
        setMarkets(data);
      }
    } catch (error) {
      console.error("Error fetching markets:", error);
      setMarkets([]);
    }
  };

  const fetchCommodities = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/commodities`);
      const data = await response.json();
      setCommodities(data);
    } catch (error) {
      console.error("Error fetching commodities:", error);
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/districts`);
      const data = await response.json();
      setDistricts(data);
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  const fetchPriceData = async () => {
    if (!filters.commodity) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`${API_BASE_URL}/price-trends?${params}`);
      const result = await response.json();

      // Format data for charts - matching your backend response structure
      const formattedData = result.data.map((item) => ({
        ...item,
        date: new Date(item.price_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          ...(filters.groupBy === "day" && { day: "numeric" }),
        }),
        modal_price: Number.parseFloat(item.modal_price),
        min_price: Number.parseFloat(item.min_price),
        max_price: Number.parseFloat(item.max_price),
        // Calculate average price from modal, min, max if not provided
        avg_price: item.avg_price
          ? Number.parseFloat(item.avg_price)
          : (Number.parseFloat(item.modal_price) +
              Number.parseFloat(item.min_price) +
              Number.parseFloat(item.max_price)) /
            3,
        district_name: item.district_name,
        market_name: item.market_name,
        commodity_name: item.commodity_name,
      }));

      setPriceData(formattedData);
    } catch (error) {
      console.error("Error fetching price data:", error);
      setPriceData([]);
    } finally {
      setLoading(false);
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: "white",
            padding: "16px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <p
            style={{ fontWeight: "600", color: "#374151" }}
          >{`Date: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, fontSize: "14px" }}>
              {`${entry.name}: ₹${entry.value?.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Chart color scheme
  const colors = {
    modal_price: "#2563eb",
    min_price: "#dc2626",
    max_price: "#16a34a",
    avg_price: "#ea580c",
  };

  // Render different chart types
  const renderChart = () => {
    const commonProps = {
      data: priceData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (chartType) {
      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="modal_price"
              stroke={colors.modal_price}
              strokeWidth={3}
              dot={{ fill: colors.modal_price, r: 4 }}
              name="Modal Price"
            />
            <Line
              type="monotone"
              dataKey="min_price"
              stroke={colors.min_price}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: colors.min_price, r: 3 }}
              name="Min Price"
            />
            <Line
              type="monotone"
              dataKey="max_price"
              stroke={colors.max_price}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: colors.max_price, r: 3 }}
              name="Max Price"
            />
            <Line
              type="monotone"
              dataKey="avg_price"
              stroke={colors.avg_price}
              strokeWidth={2}
              dot={{ fill: colors.avg_price, r: 3 }}
              name="Average Price"
            />
          </LineChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="modal_price"
              fill={colors.modal_price}
              name="Modal Price"
            />
            <Bar dataKey="min_price" fill={colors.min_price} name="Min Price" />
            <Bar dataKey="max_price" fill={colors.max_price} name="Max Price" />
            <Bar
              dataKey="avg_price"
              fill={colors.avg_price}
              name="Average Price"
            />
          </BarChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="max_price"
              stackId="1"
              stroke={colors.max_price}
              fill={colors.max_price}
              fillOpacity={0.3}
              name="Max Price"
            />
            <Area
              type="monotone"
              dataKey="modal_price"
              stackId="2"
              stroke={colors.modal_price}
              fill={colors.modal_price}
              fillOpacity={0.6}
              name="Modal Price"
            />
            <Area
              type="monotone"
              dataKey="min_price"
              stackId="3"
              stroke={colors.min_price}
              fill={colors.min_price}
              fillOpacity={0.8}
              name="Min Price"
            />
          </AreaChart>
        );

      case "composed":
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="max_price"
              fill={colors.max_price}
              fillOpacity={0.2}
              stroke="none"
              name="Max Price Range"
            />
            <Area
              type="monotone"
              dataKey="min_price"
              fill="#ffffff"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="modal_price"
              stroke={colors.modal_price}
              strokeWidth={3}
              dot={{ fill: colors.modal_price, r: 4 }}
              name="Modal Price"
            />
            <Line
              type="monotone"
              dataKey="avg_price"
              stroke={colors.avg_price}
              strokeWidth={2}
              strokeDasharray="8 8"
              dot={{ fill: colors.avg_price, r: 3 }}
              name="Average Price"
            />
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg"
      style={{
        width: "100%",
        maxWidth: "72rem",
        margin: "0 auto",
        padding: "1.5rem",
        backgroundColor: "white",
        borderRadius: "0.5rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="mb-6" style={{ marginBottom: "1.5rem" }}>
        <h2
          className="text-2xl font-bold text-gray-800 mb-4"
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#1f2937",
            marginBottom: "1rem",
          }}
        >
          Crop Price Analysis
        </h2>

        {/* Filters */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-4"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <select
            value={filters.commodity}
            onChange={(e) =>
              setFilters({ ...filters, commodity: e.target.value })
            }
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              outline: "none",
            }}
          >
            <option value="">Select Commodity</option>
            {commodities.map((commodity) => (
              <option key={commodity.id} value={commodity.name}>
                {commodity.name} ({commodity.data_points} records)
              </option>
            ))}
          </select>

          <select
            value={filters.district}
            onChange={(e) =>
              setFilters({ ...filters, district: e.target.value, market: "" })
            }
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              outline: "none",
            }}
          >
            <option value="">All Districts</option>
            {districts.map((district) => (
              <option key={district.id} value={district.name}>
                {district.name}, {district.state} ({district.data_points}{" "}
                records)
              </option>
            ))}
          </select>

          <select
            value={filters.market}
            onChange={(e) => setFilters({ ...filters, market: e.target.value })}
            disabled={!filters.district}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              outline: "none",
              opacity: !filters.district ? 0.5 : 1,
            }}
          >
            <option value="">All Markets</option>
            {markets.map((market) => (
              <option key={market.id} value={market.name}>
                {market.name} ({market.data_points} records)
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              outline: "none",
            }}
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              outline: "none",
            }}
          />

          <select
            value={filters.groupBy}
            onChange={(e) =>
              setFilters({ ...filters, groupBy: e.target.value })
            }
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              outline: "none",
            }}
          >
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </select>

          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              outline: "none",
            }}
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
            <option value="composed">Composed Chart</option>
          </select>
        </div>

        {/* Chart Type Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          {["line", "bar", "area", "composed"].map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontWeight: "500",
                transition: "all 0.2s",
                backgroundColor: chartType === type ? "#3b82f6" : "#e5e7eb",
                color: chartType === type ? "white" : "#374151",
                border: "none",
                cursor: "pointer",
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} Chart
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          padding: "1rem",
          borderRadius: "0.5rem",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "24rem",
            }}
          >
            <div style={{ fontSize: "1.125rem", color: "#6b7280" }}>
              Loading chart data...
            </div>
          </div>
        ) : priceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "24rem",
            }}
          >
            <div style={{ fontSize: "1.125rem", color: "#6b7280" }}>
              {filters.commodity
                ? "No data available for selected filters"
                : "Select a commodity to view price trends"}
            </div>
          </div>
        )}
      </div>

      {/* Chart Statistics */}
      {priceData.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              color: "#1f2937",
              marginBottom: "1rem",
            }}
          >
            Price Statistics
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            {["modal_price", "min_price", "max_price", "avg_price"].map(
              (priceType) => {
                const values = priceData
                  .map((item) => item[priceType])
                  .filter(Boolean);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const min = Math.min(...values);
                const max = Math.max(...values);

                return (
                  <div
                    key={priceType}
                    style={{
                      backgroundColor: "white",
                      padding: "1rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#6b7280",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {priceType
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        Avg: ₹
                        {avg.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        Range: ₹{min.toLocaleString()} - ₹{max.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>

          {/* Additional Info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1rem",
            }}
          >
            <div
              style={{
                backgroundColor: "#dbeafe",
                padding: "1rem",
                borderRadius: "0.5rem",
              }}
            >
              <h4
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#1e40af",
                  marginBottom: "0.25rem",
                }}
              >
                Data Points
              </h4>
              <p
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "#1e3a8a",
                }}
              >
                {priceData.length}
              </p>
            </div>
            <div
              style={{
                backgroundColor: "#dcfce7",
                padding: "1rem",
                borderRadius: "0.5rem",
              }}
            >
              <h4
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#166534",
                  marginBottom: "0.25rem",
                }}
              >
                Selected Filters
              </h4>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#15803d",
                }}
              >
                {[
                  filters.commodity && `Commodity: ${filters.commodity}`,
                  filters.district && `District: ${filters.district}`,
                  filters.market && `Market: ${filters.market}`,
                  `Grouping: ${filters.groupBy}`,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            <div
              style={{
                backgroundColor: "#f3e8ff",
                padding: "1rem",
                borderRadius: "0.5rem",
              }}
            >
              <h4
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#7c3aed",
                  marginBottom: "0.25rem",
                }}
              >
                Date Range
              </h4>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#8b5cf6",
                }}
              >
                {priceData.length > 0
                  ? `${priceData[0]?.date} to ${priceData[priceData.length - 1]?.date}`
                  : "No data available"}
              </p>
            </div>
          </div>
        </div>
      )}
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

  const sections = [
    "home",
    "prediction",
    "upload",
    "visualisation",
    "data",
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
        return (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h2
              style={{
                fontSize: "1.875rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Price Prediction
            </h2>
            <p
              style={{
                fontSize: "1.125rem",
                color: "#6b7280",
              }}
            >
              Advanced ML models for crop price prediction coming soon.
            </p>
          </div>
        );
      case "upload":
        return (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h2
              style={{
                fontSize: "1.875rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Data Upload
            </h2>
            <p
              style={{
                fontSize: "1.125rem",
                color: "#6b7280",
              }}
            >
              Upload your crop data for analysis.
            </p>
          </div>
        );
      case "visualisation":
        return <CropPriceChart />;
      case "data":
        return (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h2
              style={{
                fontSize: "1.875rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Data Management
            </h2>
            <p
              style={{
                fontSize: "1.125rem",
                color: "#6b7280",
              }}
            >
              Manage and explore your agricultural data.
            </p>
          </div>
        );
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

      {/* Chatbot Component */}
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
                    : section
                        .split("-")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(" ")}
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
