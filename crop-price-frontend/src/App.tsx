"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, TrendingUp, MapPin, Calendar, Droplets } from "lucide-react"

// District data matching your backend
const districtData = {
  Belgaum: { area: 96524.09, yield: 1.04 },
  Bidar: { area: 215400.22, yield: 1.38 },
  Dharwad: { area: 38644.53, yield: 0.89 },
  Gadag: { area: 626.42, yield: 1.22 },
  Haveri: { area: 13630.2, yield: 0.69 },
}

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

const years = [2026, 2027]

interface PredictionResponse {
  success: boolean
  prediction: {
    value: number
    confidence: number
    formatted: string
    district: string
    year: number
    month: number
  }
  raw: {
    prediction: number
    confidence: number | null
  }
  metadata: {
    features: number[]
    district_info: {
      area: number
      yield: number
    }
    rainfall_data_source: string
    rainfall_data: {
      minus1: number
      minus2: number
      minus3: number
      total3Months: number
    }
  }
}

const PredictionPage = () => {
  const [predictionData, setPredictionData] = useState<PredictionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    district: "",
    year: "",
    month: "",
  })

  const API_BASE_URL = "http://localhost:5000/api"

  const handlePredict = async () => {
    if (!filters.district || !filters.year || !filters.month) {
      setError("Please select district, year, and month")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const requestBody = {
        year: Number.parseInt(filters.year),
        month: Number.parseInt(filters.month),
        district: filters.district,
      }

      const response = await fetch(`${API_BASE_URL}/predict/soyabean`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: PredictionResponse = await response.json()

      if (data.success) {
        setPredictionData(data)
      } else {
        setError("Prediction failed. Please try again.")
      }
    } catch (error) {
      console.error("Error making prediction:", error)
      setError("Failed to generate prediction. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFilters({ district: "", year: "", month: "" })
    setPredictionData(null)
    setError(null)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🌱</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Soybean Price Prediction</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Get accurate soybean price predictions using advanced ML models that consider monsoon patterns, historical
          data, and district-specific agricultural factors.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Configure Prediction Parameters
          </CardTitle>
          <CardDescription>Select the district, year, and month for soybean price prediction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                District
              </label>
              <Select value={filters.district} onValueChange={(value) => setFilters({ ...filters, district: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(districtData).map(([district, info]) => (
                    <SelectItem key={district} value={district}>
                      {district} (Area: {info.area.toLocaleString()} ha, Yield: {info.yield})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Year
              </label>
              <Select value={filters.year} onValueChange={(value) => setFilters({ ...filters, year: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Month
              </label>
              <Select value={filters.month} onValueChange={(value) => setFilters({ ...filters, month: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handlePredict}
              disabled={loading || !filters.district || !filters.year || !filters.month}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Prediction...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Generate Prediction
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {predictionData && (
        <div className="space-y-6">
          {/* Main Prediction Result */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Prediction Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    ₹{predictionData.prediction.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-gray-600">Predicted Price</div>
                  <div className="text-xs text-gray-500 mt-1">{predictionData.prediction.formatted}</div>
                </div>

                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-lg font-semibold text-blue-600 mb-1">{predictionData.prediction.district}</div>
                  <div className="text-sm text-gray-600">District</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Area: {predictionData.metadata.district_info.area.toLocaleString()} ha
                  </div>
                </div>

                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-lg font-semibold text-purple-600 mb-1">
                    {months.find((m) => m.value === predictionData.prediction.month)?.label}{" "}
                    {predictionData.prediction.year}
                  </div>
                  <div className="text-sm text-gray-600">Prediction Period</div>
                </div>

                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-lg font-semibold text-orange-600 mb-1">
                    {predictionData.metadata.district_info.yield}
                  </div>
                  <div className="text-sm text-gray-600">Yield (t/ha)</div>
                  <div className="text-xs text-gray-500 mt-1">District Average</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rainfall Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                Rainfall Data Used
              </CardTitle>
              <CardDescription>Source: {predictionData.metadata.rainfall_data_source}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">
                    {predictionData.metadata.rainfall_data.minus1}mm
                  </div>
                  <div className="text-sm text-gray-600">Previous Month</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">
                    {predictionData.metadata.rainfall_data.minus2}mm
                  </div>
                  <div className="text-sm text-gray-600">2 Months Ago</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">
                    {predictionData.metadata.rainfall_data.minus3}mm
                  </div>
                  <div className="text-sm text-gray-600">3 Months Ago</div>
                </div>
                <div className="text-center p-3 bg-blue-100 rounded-lg">
                  <div className="text-lg font-semibold text-blue-700">
                    {predictionData.metadata.rainfall_data.total3Months}mm
                  </div>
                  <div className="text-sm text-gray-600">3-Month Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle>Model Features & Technical Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Input Features Used:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-gray-50 rounded">Year: {predictionData.metadata.features[0]}</div>
                    <div className="p-2 bg-gray-50 rounded">Month: {predictionData.metadata.features[1]}</div>
                    <div className="p-2 bg-gray-50 rounded">Rainfall-1: {predictionData.metadata.features[2]}mm</div>
                    <div className="p-2 bg-gray-50 rounded">Rainfall-2: {predictionData.metadata.features[3]}mm</div>
                    <div className="p-2 bg-gray-50 rounded">Rainfall-3: {predictionData.metadata.features[4]}mm</div>
                    <div className="p-2 bg-gray-50 rounded">
                      Total Rainfall: {predictionData.metadata.features[5]}mm
                    </div>
                    <div className="p-2 bg-gray-50 rounded">Area: {predictionData.metadata.features[6]} ha</div>
                    <div className="p-2 bg-gray-50 rounded">Yield: {predictionData.metadata.features[7]} t/ha</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Raw Model Output:</h4>
                  <pre className="text-sm overflow-auto">{JSON.stringify(predictionData.raw, null, 2)}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Information Card */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">How the Prediction Works</h4>
              <p className="text-blue-700 text-sm leading-relaxed">
                Our ML model analyzes historical soybean price data combined with monsoon patterns, rainfall data, and
                district-specific agricultural factors like area under cultivation and average yield. The model
                considers 3-month rainfall patterns to account for seasonal variations and their impact on crop prices.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PredictionPage
