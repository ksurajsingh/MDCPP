import React, { useState, useEffect } from "react";
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
        modal_price: parseFloat(item.modal_price),
        min_price: parseFloat(item.min_price),
        max_price: parseFloat(item.max_price),
        // Calculate average price from modal, min, max if not provided
        avg_price: item.avg_price
          ? parseFloat(item.avg_price)
          : (parseFloat(item.modal_price) +
              parseFloat(item.min_price) +
              parseFloat(item.max_price)) /
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
        <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Date: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
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
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Crop Price Analysis
        </h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-4">
          <select
            value={filters.commodity}
            onChange={(e) =>
              setFilters({ ...filters, commodity: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!filters.district}
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
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filters.groupBy}
            onChange={(e) =>
              setFilters({ ...filters, groupBy: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </select>

          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
            <option value="composed">Composed Chart</option>
          </select>
        </div>

        {/* Chart Type Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["line", "bar", "area", "composed"].map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                chartType === type
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} Chart
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="bg-gray-50 p-4 rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-lg text-gray-600">Loading chart data...</div>
          </div>
        ) : priceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-lg text-gray-600">
              {filters.commodity
                ? "No data available for selected filters"
                : "Select a commodity to view price trends"}
            </div>
          </div>
        )}
      </div>

      {/* Chart Statistics */}
      {priceData.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Price Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                    className="bg-white p-4 rounded-lg border border-gray-200"
                  >
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      {priceType
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h4>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">
                        Avg: ₹
                        {avg.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        Range: ₹{min.toLocaleString()} - ₹{max.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                Data Points
              </h4>
              <p className="text-lg font-semibold text-blue-900">
                {priceData.length}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-1">
                Selected Filters
              </h4>
              <p className="text-sm text-green-700">
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
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-purple-800 mb-1">
                Date Range
              </h4>
              <p className="text-sm text-purple-700">
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
