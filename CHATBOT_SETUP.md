# Chatbot Setup Guide

## Overview
The chatbot has been successfully implemented with the Gemini API integration. Here's what was added:

### Features
- Modern React chatbot component with real-time messaging
- Integration with Google's Gemini API
- Context-aware responses based on current page/section
- Responsive design with mobile support
- Typing indicators and smooth animations

## Setup Instructions

### 1. Server Setup
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```

### 2. Environment Variables
Create a `.env` file in the server directory with:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password

# Server Configuration
PORT=5000

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

### 4. Start the Server
```bash
npm run dev
```

### 5. Frontend Setup
Navigate to the React frontend directory:
```bash
cd crop-price-frontend
npm start
```

## How to Use

1. **Open the Chatbot**: Click the "💬 Multi-lingual AI Chatbot" button in the header
2. **Ask Questions**: The chatbot can help with:
   - Price analysis and trends
   - Data visualization guidance
   - Prediction model explanations
   - General agricultural advice
   - Navigation help

3. **Context Awareness**: The chatbot knows which section you're currently viewing and can provide relevant assistance

## Files Added/Modified

### New Files:
- `crop-price-frontend/src/Chatbot.js` - Main chatbot component
- `crop-price-frontend/src/Chatbot.css` - Chatbot styling

### Modified Files:
- `server/app.js` - Added chatbot endpoint with Gemini API integration
- `server/package.json` - Added node-fetch dependency
- `crop-price-frontend/src/App.js` - Integrated chatbot component

## API Endpoint
- **POST** `/api/chat`
- **Body**: `{ message: string, context: string }`
- **Response**: `{ success: boolean, reply: string, timestamp: string }`

## Troubleshooting

1. **API Key Issues**: Make sure your Gemini API key is valid and has proper permissions
2. **CORS Issues**: The server is configured with CORS enabled
3. **Connection Issues**: Ensure both server (port 5000) and frontend (port 3000) are running

## Features
- ✅ Real-time messaging
- ✅ Context-aware responses
- ✅ Modern UI/UX
- ✅ Mobile responsive
- ✅ Typing indicators
- ✅ Error handling
- ✅ Smooth animations 