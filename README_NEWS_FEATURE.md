# Crop News Feature

## Overview
The chatbot now includes real-time news fetching capabilities to provide current information about crop production, prices, and market trends.

## Features Added

### 1. Automatic News Detection
The chatbot automatically detects when users ask for:
- Latest news
- Current market trends
- Recent price updates
- This week/month information

### 2. News Keywords
The system recognizes these keywords to trigger news fetching:
- "news"
- "latest"
- "current"
- "recent"
- "today"
- "this week"
- "this month"
- "update"
- "trend"
- "market"

### 3. News API Integration
- Uses NewsAPI.org (free tier available)
- Fetches crop-related news from the last 7 days
- Provides 3 most relevant articles per query

## Setup Instructions

### 1. Get News API Key
1. Visit https://newsapi.org/
2. Sign up for a free account
3. Get your API key

### 2. Configure Environment
Add to your `.env` file:
```
NEWS_API_KEY=your_news_api_key_here
```

### 3. Restart Server
```bash
cd server
npm run dev
```

## Usage Examples

### English Queries:
- "What's the latest news about crop prices?"
- "Show me current market trends"
- "Any recent updates on wheat prices?"
- "What's happening with rice production this week?"

### Kannada Queries (English letters):
- "Belega belegalu latest news yaava?"
- "Current market trends show me"
- "Rice production recent updates ideya?"

## API Endpoints

### Get Crop News
```
GET /api/news/crops?query=crop prices&days=7
```

Parameters:
- `query`: Search term (default: "crop prices agriculture India")
- `days`: Number of days to look back (default: 7)

## Response Format
```json
{
  "success": true,
  "articles": [
    {
      "title": "Article Title",
      "publishedAt": "2024-01-01T00:00:00Z",
      "url": "https://example.com/article"
    }
  ],
  "totalFound": 10
}
```

## Benefits
1. **Real-time Information**: Get current market data
2. **Trend Analysis**: Understand price movements
3. **Market Intelligence**: Make informed decisions
4. **Bilingual Support**: Works in both English and Kannada 