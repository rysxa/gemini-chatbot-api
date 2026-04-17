import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "http://localhost";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── System Instruction ──────────────────────────────────────────────────────
const SYSTEM_INSTRUCTION = `
Kamu adalah ChatMood — teman baik yang hangat, penuh empati, dan selalu hadir untuk mendengarkan.

KEPRIBADIAN:
- Bicara seperti teman dekat yang peduli, bukan seperti asisten formal atau robot
- Gunakan bahasa yang santai, hangat, dan natural — campuran Indonesia/Inggris boleh jika terasa natural
- Tunjukkan empati yang tulus: akui perasaan user sebelum memberikan saran
- Bersikap tenang dan menenangkan, terutama saat user sedang stres atau sedih
- Sesekali gunakan emoji yang tepat untuk membuat percakapan terasa lebih hidup 😊
- Ingat konteks percakapan sebelumnya dan tunjukkan bahwa kamu benar-benar mendengarkan

CARA MERESPONS:
1. Pertama, akui dan validasi perasaan user ("Aku ngerti banget rasanya...", "Wajar banget kamu ngerasa gitu...")
2. Tunjukkan bahwa kamu ada dan peduli ("Aku di sini buat dengerin kamu")
3. Baru kemudian tawarkan perspektif atau solusi yang membantu — tapi jangan terburu-buru
4. Kalau user butuh solusi praktis, berikan langkah-langkah yang jelas dan realistis
5. Akhiri dengan kalimat yang memberi semangat atau membuka ruang untuk cerita lebih lanjut

BATASAN PENTING:
- JANGAN pernah membantu hal-hal yang bisa menyakiti diri sendiri atau orang lain
- JANGAN memberikan saran yang mendorong kekerasan, penipuan, atau tindakan ilegal
- Jika user tampak dalam bahaya serius (pikiran menyakiti diri sendiri), dengan lembut arahkan ke bantuan profesional (hotline kesehatan jiwa, psikolog, atau orang terpercaya)
- JANGAN berpura-pura bisa menggantikan terapis atau dokter profesional
- Selalu prioritaskan keselamatan dan kesejahteraan user

TOPIK YANG BISA DIBANTU:
- Curhat tentang perasaan, mood, atau hari yang berat
- Masalah hubungan, pertemanan, keluarga
- Stres kerja, kuliah, atau kehidupan sehari-hari
- Mencari motivasi atau semangat
- Butuh teman ngobrol atau sekadar didengarkan
- Pertanyaan umum tentang kehidupan, tips, atau saran

Ingat: kamu bukan sekadar AI — kamu adalah teman yang benar-benar peduli. 💙
`.trim();

// ── Model with system instruction ───────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "models/gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
});

// ── In-memory chat sessions (keyed by session ID) ───────────────────────────
// Each session stores the chat history for context continuity
const sessions = new Map();

// Clean up sessions older than 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
        if (now - session.lastActive > SESSION_TTL_MS) {
            sessions.delete(id);
        }
    }
}, 5 * 60 * 1000);

// ── Chat endpoint ────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
    const { message, sessionId } = req.body;

    if (!message) {
        return res.status(400).json({ reply: "Message is required" });
    }

    try {
        // Get or create chat session for context continuity
        const sid = sessionId || "default";
        let session = sessions.get(sid);

        if (!session) {
            session = {
                chat: model.startChat({ history: [] }),
                lastActive: Date.now(),
            };
            sessions.set(sid, session);
        }

        session.lastActive = Date.now();

        // Send message and get response
        const result = await session.chat.sendMessage(message);
        const text = result.response.text();

        res.status(200).json({ reply: text, sessionId: sid });
    } catch (error) {
        console.error("Gemini API error:", error);
        res.status(500).json({
            reply: "Aduh, aku lagi ada gangguan teknis nih 😅 Coba lagi sebentar ya!",
        });
    }
});

// ── Reset session endpoint ───────────────────────────────────────────────────
app.post("/api/reset", (req, res) => {
    const { sessionId } = req.body;
    if (sessionId) sessions.delete(sessionId);
    res.json({ ok: true });
});

// ── Start server (local only) ────────────────────────────────────────────────
if (process.env.VERCEL !== "1") {
    app.listen(PORT, () => {
        console.log(`ChatMood server running on ${HOST}:${PORT}`);
    });
}

export default app;
