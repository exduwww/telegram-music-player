import dotenv from 'dotenv';
import Database from './database/db.js';
import GeminiService from './api/gemini.js';
import TelegramBot from './bot/telegram.js';
import StorageService from './storage/telegram-storage.js';
import WebServer from './api/server.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const dataDir = path.dirname(process.env.DB_PATH || './data/musicplayer.db');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function main() {
  try {
    console.log('🚀 Starting Telegram Music Player...');

    const db = new Database(process.env.DB_PATH || './data/musicplayer.db');
    console.log('✅ Database initialized');

    const gemini = new GeminiService(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized');

    const bot = new TelegramBot(
      process.env.BOT_TOKEN,
      db,
      gemini,
      null
    );

    const storage = new StorageService(
      bot.bot,
      process.env.STORAGE_CHAT_ID
    );
    bot.storage = storage;
    console.log('✅ Storage service initialized');

    const webServer = new WebServer(
      db,
      gemini,
      process.env.PORT || 3000
    );
    webServer.start();
    console.log('✅ Web server started');

    bot.launch();
    console.log('✅ Telegram bot launched');

    console.log('\n🎵 Telegram Music Player is ready!');
    console.log(`📱 Bot: @${bot.bot.botInfo.username}`);
    console.log(`🌐 Web App: ${process.env.WEBAPP_URL || `http://localhost:${process.env.PORT || 3000}`}`);

    process.once('SIGINT', () => {
      console.log('\n👋 Shutting down...');
      bot.stop('SIGINT');
      db.close();
      process.exit(0);
    });

    process.once('SIGTERM', () => {
      console.log('\n👋 Shutting down...');
      bot.stop('SIGTERM');
      db.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error starting application:', error);
    process.exit(1);
  }
}

main();
