import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();
dotenv.config();

const AUTO_CHANNEL_NAME = "chat-wowo-chan"; 
// kalau mau pakai channel ID:
// const AUTO_CHANNEL_ID = "123456789012345678";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  console.log("MESSAGE MASUK:", message.content);

  const isMentioned = message.mentions.has(client.user);
  const isAutoChannel = message.channel.name === AUTO_CHANNEL_NAME;
  // kalau pakai ID:
  // const isAutoChannel = message.channel.id === AUTO_CHANNEL_ID;

  if (!isMentioned && !isAutoChannel) return;

  try {
    let cleanMessage = message.content;

    // hapus mention bot kalau ada
    if (isMentioned) {
      cleanMessage = cleanMessage
        .replace(/<@!?(\d+)>/, "")
        .trim();
    }

    if (!cleanMessage) {
      return message.reply("Halo 👋 ada yang bisa dibantu?");
    }

    const response = await fetch(
      "https://ai-assist-doea.onrender.com/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: cleanMessage,
          userId: message.author.id,
          sessionId: `discord-${message.author.id}`,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("SERVER ERROR:", errText);
      return message.reply("AI server error");
    }

    const data = await response.json();

    return message.reply(data.response || "No response from AI");

  } catch (err) {
    console.error("FETCH ERROR:", err);
    return message.reply("Error connecting to AI");
  }
});

client.once("ready", () => {
  console.log(`✅ Bot ready sebagai ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
app.get("/", (c) => {
  return c.text("Bot is running 🚀");
});

const PORT = process.env.PORT || 3000;

serve({
  fetch: app.fetch,
  port: PORT
}, () => {
  console.log(`Server running on port ${PORT}`);
});

// Self-ping untuk menjaga server tetap hidup di layanan gratis (Render/Railway/dll)
// Mengirim request setiap 14 menit agar tidak sleep (idle limit biasa 15 menit)
setInterval(() => {
  const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  fetch(url)
    .then(() => console.log(`[Self-Ping] Berhasil nge-ping ${url} agar server aktif terus 🚀.`))
    .catch((err) => console.error(`[Self-Ping] Gagal nge-ping ${url}:`, err.message));
}, 14 * 60 * 1000); // 14 menit