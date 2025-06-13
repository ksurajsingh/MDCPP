require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('public'))
apikey = process.env.gemini_api

app.post('/chat', async (req, res) => {
  const { screenText } = req.body;

  console.log("In /chat got the screenText")
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apikey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `You are a helpful AI assistant. The user sees this screen:\n\n"${screenText}"\n\nHow can you help them?`
            }
          ]
        }
      ]
    }
    )
  });

  const data = await response.json();
  console.log("AI raw response", data)
  if (!data.choices || !data.choices[0]) {
    return res.status(500).json({ error: "OpenAI response is invalid", details: data });
  }

  res.json("🤖" + data.choices[0].message.content);
});
app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'))
