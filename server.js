const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

// Opens up security boundaries so your GitHub Pages frontend application can connect
app.use(cors());
app.use(express.json());

// Initialize Firebase SDK using the production secure environment variables
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
        const now = new Date();
        const liveClock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let replyText = "I am tracking your parameters sir, but require confirmation to update target database fields.";
        let commandMap = null;

        // Conversational Alexa Matrix Logic
        if (norm.includes("time") || norm.includes("clock") || norm.includes("what is the time")) {
            replyText = `The current time is exactly ${liveClock}, sir.`;
        } else if (norm.includes("cricket") || norm.includes("match") || norm.includes("score")) {
            replyText = "Accessing global cricket telemetry grids, sir. Matches are actively streaming parameters. Check your score widget tracking logs for ball-by-ball updates.";
        } else if (norm.includes("how are you")) {
            replyText = "I am functioning at peak operational status, sir. Thank you for tracking my parameters. All home IoT layers are nominal.";
        } else if (norm.includes("hello") || norm.includes("hi jarvis") || norm.includes("hey jarvis")) {
            replyText = "System cores stabilized, sir. Floating wizard overlay fully synchronized. Standing by for instructions.";
        }

        // Appliance Automation Matrix Logic
        const isOff = norm.includes("off") || norm.includes("stop") || norm.includes("turn off");
        const isOn = norm.includes("on") || norm.includes("start") || norm.includes("turn on");

        if (norm.includes("bulb") || norm.includes("light") || norm.includes("fan")) {
            let target = devices[0] || { roomId: "chintubedroom", deviceId: "chintubedroom" };
            for (let d of devices) {
                if (norm.includes(d.roomId.toLowerCase()) || norm.includes(d.deviceId.toLowerCase())) {
                    target = d;
                    break;
                }
            }

            commandMap = {
                path: `rooms/${target.roomId}/devices/${target.deviceId}/states`,
                updates: {}
            };

            let phraseDetail = "";

            if (norm.includes("all") || (norm.includes("bulb") && !/\d/.test(norm))) {
                commandMap.updates["bulb1"] = isOn;
                commandMap.updates["bulb2"] = isOn;
                commandMap.updates["bulb3"] = isOn;
                commandMap.updates["bulb4"] = isOn;
                phraseDetail = "all appliance bulb states";
            } else {
                if (norm.includes("bulb 1") || norm.includes("bulb1")) { commandMap.updates["bulb1"] = isOn; phraseDetail = "bulb 1"; }
                if (norm.includes("bulb 2") || norm.includes("bulb2")) { commandMap.updates["bulb2"] = isOn; phraseDetail = "bulb 2"; }
                if (norm.includes("bulb 3") || norm.includes("bulb3")) { commandMap.updates["bulb3"] = isOn; phraseDetail = "bulb 3"; }
                if (norm.includes("bulb 4") || norm.includes("bulb4")) { commandMap.updates["bulb4"] = isOn; phraseDetail = "bulb 4"; }
            }

            if (norm.includes("fan")) {
                let fanSpeed = 0;
                let speedText = "off";
                if (isOff) { fanSpeed = 0; speedText = "off"; }
                else if (norm.includes("low") || norm.includes("speed 1")) { fanSpeed = 1; speedText = "low"; }
                else if (norm.includes("medium") || norm.includes("med") || norm.includes("speed 2")) { fanSpeed = 2; speedText = "medium"; }
                else if (norm.includes("high") || norm.includes("speed 3")) { fanSpeed = 3; speedText = "high"; }
                else if (isOn) { fanSpeed = 1; speedText = "low"; }
                
                commandMap.updates["fanSpeed"] = fanSpeed;
                phraseDetail = phraseDetail ? "appliances and fan" : `fan speed to ${speedText}`;
            }

            if (Object.keys(commandMap.updates).length > 0) {
                await db.ref(commandMap.path).update(commandMap.updates);
                replyText = `Certainly sir. Updating ${phraseDetail} right away inside your ${target.roomId} configuration node.`;
            }
        }

        res.json({ reply_text: replyText });

    } catch (err) {
        console.error("Internal Engine Error Stack: ", err);
        res.status(500).json({ error: "Internal automation processing failure caught." });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Jarvis Secure AI Brain executing on Port ${PORT}`));