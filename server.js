const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors()); 
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    const { command } = req.body; // Key is handled securely by Render now

    if (!command) {
        return res.status(400).json({ error: "Missing required query payload strings." });
    }

    // Double-check if the dashboard variable exists
    if (!process.env.NVIDIA_API_KEY) {
        return res.status(500).json({ error: "NVIDIA_API_KEY is missing from Render Environment settings." });
    }

    try {
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.NVIDIA_API_KEY.trim()}`
            },
            body: JSON.stringify({
                model: "nvidia/nemotron-3-ultra-550b-a55b",
                messages: [
                    { role: "system", content: "You are Jarvis, a highly intelligent smart home assistant. Always address the user respectfully as 'sir'. Keep answers helpful, concise, and natural so they speak out loud easily." },
                    { role: "user", content: command }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            res.json({ reply: data.choices[0].message.content.trim() });
        } else if (data.error) {
            res.status(500).json({ error: data.error.message || "NVIDIA API rejected request." });
        } else {
            res.status(500).json({ error: "NVIDIA interface sent an empty configuration stack." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Jarvis routing hub active on port ${PORT}`));
