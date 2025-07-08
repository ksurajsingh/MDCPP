"use client";

import { useState, useEffect } from "react";
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

export default CropPriceChart;
