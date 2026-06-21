const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK using secure cloud environment variables
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.database();

app.post('/api/jarvis', async (req, res) => {
    try {
        const { text, devices } = req.body;
        if (!text) return res.status(400).json({ error: "Missing parameter query string." });

        const norm = text.toLowerCase().trim();

        // 1. DYNAMIC HARDWARE CHECKER MATRIX
        const isOff = norm.includes("off") || norm.includes("stop") || norm.includes("turn off");
        const isOn = norm.includes("on") || norm.includes("start") || norm.includes("turn on");
        
        if ((norm.includes("bulb") || norm.includes("light") || norm.includes("fan")) && (isOn || isOff)) {
            let target = devices[0] || { roomId: "chintubedroom", deviceId: "chintubedroom" };
            for (let d of devices) {
                if (norm.includes(d.roomId.toLowerCase()) || norm.includes(d.deviceId.toLowerCase())) {
                    target = d;
                    break;
                }
            }

            let updates = {};
            let phraseDetail = "";

            if (norm.includes("all") || (norm.includes("bulb") && !/\d/.test(norm))) {
                updates["bulb1"] = isOn; updates["bulb2"] = isOn; updates["bulb3"] = isOn; updates["bulb4"] = isOn;
                phraseDetail = "all appliances";
            } else {
                if (norm.includes("bulb 1") || norm.includes("bulb1")) { updates["bulb1"] = isOn; phraseDetail = "bulb 1"; }
                if (norm.includes("bulb 2") || norm.includes("bulb2")) { updates["bulb2"] = isOn; phraseDetail = "bulb 2"; }
                if (norm.includes("bulb 3") || norm.includes("bulb3")) { updates["bulb3"] = isOn; phraseDetail = "bulb 3"; }
                if (norm.includes("bulb 4") || norm.includes("bulb4")) { updates["bulb4"] = isOn; phraseDetail = "bulb 4"; }
            }

            if (norm.includes("fan")) {
                let fanSpeed = 0;
                let speedText = "off";
                if (isOff) fanSpeed = 0;
                else if (norm.includes("low") || norm.includes("speed 1")) { fanSpeed = 1; speedText = "low"; }
                else if (norm.includes("medium") || norm.includes("med") || norm.includes("speed 2")) { fanSpeed = 2; speedText = "medium"; }
                else if (norm.includes("high") || norm.includes("speed 3")) { fanSpeed = 3; speedText = "high"; }
                else if (isOn) { fanSpeed = 1; speedText = "low"; }
                
                updates["fanSpeed"] = fanSpeed;
                phraseDetail = phraseDetail ? "appliances and fan" : `fan speed to ${speedText}`;
            }

            if (Object.keys(updates).length > 0) {
                await db.ref(`rooms/${target.roomId}/devices/${target.deviceId}/states`).update(updates);
                return res.json({ reply_text: `Certainly sir. Adjusting your ${phraseDetail} configuration parameters now inside ${target.roomId}.` });
            }
        }

        // 2. DIRECT NATIVE GOOGLE GEMINI CORE LINK
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (GEMINI_KEY) {
            try {
                const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `You are Jarvis, a highly intelligent smart home assistant. Always address the user respectfully as "sir". Keep answers helpful, concise, and natural so they speak out loud easily. User request: "${text}"` }] }]
                    })
                });
                
                const data = await aiResponse.json();
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return res.json({ reply_text: data.candidates[0].content.parts[0].text.trim() });
                }
            } catch (aiErr) {
                console.error("Gemini Native Error: ", aiErr);
            }
        }

        // 3. FINAL BACKUP RESPONSE
        res.json({ reply_text: "Systems are running stably, sir. Ready for commands." });

    } catch (err) {
        console.error("Internal Error: ", err);
        res.status(500).json({ error: "Internal processing error." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Jarvis Engine Active on Port ${PORT}`));
