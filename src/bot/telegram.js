import { Telegraf, Markup } from 'telegraf';

class TelegramBot {
  constructor(token, db, gemini, storageService) {
    this.bot = new Telegraf(token);
    this.db = db;
    this.gemini = gemini;
    this.storage = storageService;
    this.userStates = new Map();
    
    this.setupHandlers();
  }

  setupHandlers() {
    this.bot.command('start', async (ctx) => {
      const keyboard = Markup.keyboard([
        ['🎵 Browse Songs', '📤 Upload Song'],
        ['🎼 My Playlists', '❤️ Favorites'],
        ['🔍 Search', '💬 Chat with AI'],
        ['📊 Stats', '⚙️ Settings']
      ]).resize();

      await ctx.reply(
        `🎶 Selamat datang di Music Player Bot!\n\n` +
        `Fitur yang tersedia:\n` +
        `🎵 Browse & Play musik\n` +
        `📤 Upload lagu sendiri\n` +
        `🎼 Buat & kelola playlist\n` +
        `🤖 AI: Lirik, info lagu, rekomendasi\n` +
        `❤️ Simpan lagu favorit\n` +
        `🔍 Cari lagu dengan mudah\n\n` +
        `Gunakan menu di bawah atau ketik /help untuk bantuan.`,
        keyboard
      );
    });

    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `📖 *Panduan Penggunaan:*\n\n` +
        `*Perintah Utama:*\n` +
        `/start - Mulai bot\n` +
        `/browse - Lihat semua lagu\n` +
        `/search <judul> - Cari lagu\n` +
        `/upload - Upload lagu baru\n` +
        `/playlists - Kelola playlist\n` +
        `/favorites - Lagu favorit\n` +
        `/lyrics <judul> - Cari lirik\n` +
        `/recommend - Rekomendasi lagu\n` +
        `/stats - Statistik Anda\n\n` +
        `*Fitur AI:*\n` +
        `/lyrics - Dapatkan lirik lagu\n` +
        `/info - Informasi detail lagu\n` +
        `/chat - Chat tentang musik\n` +
        `/analyze - Analisis playlist\n\n` +
        `Kirim file audio untuk upload lagu!`,
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.hears('🎵 Browse Songs', async (ctx) => {
      await this.handleBrowseSongs(ctx);
    });

    this.bot.command('browse', async (ctx) => {
      await this.handleBrowseSongs(ctx);
    });

    this.bot.hears('📤 Upload Song', async (ctx) => {
      await ctx.reply(
        '📤 Kirim file audio (MP3/M4A/WAV) untuk upload.\n\n' +
        'Pastikan file memiliki metadata yang benar (judul, artis, album).'
      );
      this.userStates.set(ctx.from.id, { action: 'waiting_upload' });
    });

    this.bot.command('upload', async (ctx) => {
      await ctx.reply(
        '📤 Kirim file audio (MP3/M4A/WAV) untuk upload.\n\n' +
        'Pastikan file memiliki metadata yang benar (judul, artis, album).'
      );
      this.userStates.set(ctx.from.id, { action: 'waiting_upload' });
    });

    this.bot.on('audio', async (ctx) => {
      await this.handleAudioUpload(ctx);
    });

    this.bot.on('document', async (ctx) => {
      const doc = ctx.message.document;
      if (doc.mime_type && doc.mime_type.startsWith('audio/')) {
        await this.handleAudioUpload(ctx, true);
      }
    });

    this.bot.hears('🎼 My Playlists', async (ctx) => {
      await this.handlePlaylists(ctx);
    });

    this.bot.command('playlists', async (ctx) => {
      await this.handlePlaylists(ctx);
    });

    this.bot.hears('❤️ Favorites', async (ctx) => {
      await this.handleFavorites(ctx);
    });

    this.bot.command('favorites', async (ctx) => {
      await this.handleFavorites(ctx);
    });

    this.bot.hears('🔍 Search', async (ctx) => {
      await ctx.reply('🔍 Ketik judul lagu atau artis yang ingin dicari:');
      this.userStates.set(ctx.from.id, { action: 'searching' });
    });

    this.bot.command('search', async (ctx) => {
      const query = ctx.message.text.replace('/search', '').trim();
      if (query) {
        await this.handleSearch(ctx, query);
      } else {
        await ctx.reply('🔍 Ketik judul lagu atau artis yang ingin dicari:');
        this.userStates.set(ctx.from.id, { action: 'searching' });
      }
    });

    this.bot.hears('💬 Chat with AI', async (ctx) => {
      await ctx.reply(
        '🤖 Tanya apa saja tentang musik!\n\n' +
        'Contoh:\n' +
        '- "Ceritakan tentang band The Beatles"\n' +
        '- "Apa genre musik yang cocok untuk relaksasi?"\n' +
        '- "Siapa penyanyi jazz terbaik?"'
      );
      this.userStates.set(ctx.from.id, { action: 'ai_chat' });
    });

    this.bot.command('lyrics', async (ctx) => {
      const query = ctx.message.text.replace('/lyrics', '').trim();
      if (query) {
        await ctx.reply('🎵 Mencari lirik...');
        const lyrics = await this.gemini.getLyrics(query);
        await ctx.reply(lyrics);
      } else {
        await ctx.reply('Gunakan: /lyrics <judul lagu>');
      }
    });

    this.bot.command('info', async (ctx) => {
      const query = ctx.message.text.replace('/info', '').trim();
      if (query) {
        await ctx.reply('📊 Mengambil informasi...');
        const info = await this.gemini.getSongInfo(query);
        await ctx.reply(info);
      } else {
        await ctx.reply('Gunakan: /info <judul lagu>');
      }
    });

    this.bot.command('recommend', async (ctx) => {
      const params = ctx.message.text.replace('/recommend', '').trim();
      await ctx.reply('🎵 Mencari rekomendasi...');
      const recommendations = await this.gemini.getSongRecommendation(params);
      await ctx.reply(recommendations);
    });

    this.bot.hears('📊 Stats', async (ctx) => {
      await this.handleStats(ctx);
    });

    this.bot.command('stats', async (ctx) => {
      await this.handleStats(ctx);
    });

    this.bot.on('callback_query', async (ctx) => {
      await this.handleCallbackQuery(ctx);
    });

    this.bot.on('text', async (ctx) => {
      const userState = this.userStates.get(ctx.from.id);
      
      if (userState) {
        switch (userState.action) {
          case 'searching':
            await this.handleSearch(ctx, ctx.message.text);
            this.userStates.delete(ctx.from.id);
            break;
          case 'ai_chat':
            const response = await this.gemini.chatAboutMusic(ctx.message.text);
            await ctx.reply(response);
            break;
          case 'creating_playlist':
            await this.handleCreatePlaylist(ctx, ctx.message.text);
            this.userStates.delete(ctx.from.id);
            break;
        }
      }
    });
  }

  async handleBrowseSongs(ctx, page = 1) {
    const limit = 10;
    const offset = (page - 1) * limit;
    
    const songs = await this.db.all(
      'SELECT * FROM songs ORDER BY upload_date DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const totalSongs = await this.db.get('SELECT COUNT(*) as count FROM songs');
    const totalPages = Math.ceil(totalSongs.count / limit);

    if (songs.length === 0) {
      await ctx.reply('📭 Belum ada lagu. Upload lagu pertama Anda!');
      return;
    }

    let message = `🎵 *Daftar Lagu* (Halaman ${page}/${totalPages}):\n\n`;
    const buttons = [];

    songs.forEach((song, index) => {
      message += `${offset + index + 1}. *${song.title}*\n`;
      message += `   🎤 ${song.artist || 'Unknown Artist'}\n`;
      message += `   💿 ${song.album || '-'}\n`;
      message += `   ▶️ ${song.play_count} plays\n\n`;

      buttons.push([
        Markup.button.callback(`▶️ ${song.title.substring(0, 25)}`, `play_${song.id}`)
      ]);
    });

    const navButtons = [];
    if (page > 1) {
      navButtons.push(Markup.button.callback('⬅️ Prev', `browse_${page - 1}`));
    }
    if (page < totalPages) {
      navButtons.push(Markup.button.callback('Next ➡️', `browse_${page + 1}`));
    }
    if (navButtons.length > 0) {
      buttons.push(navButtons);
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }

  async handleAudioUpload(ctx, isDocument = false) {
    try {
      const audio = isDocument ? ctx.message.document : ctx.message.audio;
      const fileId = audio.file_id;

      await ctx.reply('📤 Uploading lagu...');

      const title = audio.title || audio.file_name || 'Unknown Title';
      const artist = audio.performer || 'Unknown Artist';
      const duration = audio.duration || 0;

      const result = await this.db.run(
        `INSERT INTO songs (title, artist, duration, file_id, uploaded_by) 
         VALUES (?, ?, ?, ?, ?)`,
        [title, artist, duration, fileId, ctx.from.id]
      );

      await ctx.reply(
        `✅ Lagu berhasil diupload!\n\n` +
        `🎵 *${title}*\n` +
        `🎤 ${artist}\n` +
        `⏱ ${this.formatDuration(duration)}`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('Upload error:', error);
      await ctx.reply('❌ Gagal upload lagu. Silakan coba lagi.');
    }
  }

  async handlePlaylists(ctx) {
    const playlists = await this.db.all(
      'SELECT * FROM playlists WHERE user_id = ? ORDER BY created_date DESC',
      [ctx.from.id]
    );

    if (playlists.length === 0) {
      await ctx.reply(
        '📝 Anda belum memiliki playlist.\n\n' +
        'Buat playlist pertama Anda?',
        Markup.inlineKeyboard([
          [Markup.button.callback('➕ Buat Playlist', 'create_playlist')]
        ])
      );
      return;
    }

    let message = '🎼 *Playlist Anda:*\n\n';
    const buttons = [];

    for (const playlist of playlists) {
      const songCount = await this.db.get(
        'SELECT COUNT(*) as count FROM playlist_songs WHERE playlist_id = ?',
        [playlist.id]
      );

      message += `📁 *${playlist.name}*\n`;
      message += `   ${songCount.count} lagu\n`;
      if (playlist.description) {
        message += `   ${playlist.description}\n`;
      }
      message += '\n';

      buttons.push([
        Markup.button.callback(`▶️ ${playlist.name}`, `playlist_${playlist.id}`)
      ]);
    }

    buttons.push([
      Markup.button.callback('➕ Buat Playlist Baru', 'create_playlist')
    ]);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }

  async handleFavorites(ctx) {
    const favorites = await this.db.all(
      `SELECT s.* FROM songs s 
       JOIN favorites f ON s.id = f.song_id 
       WHERE f.user_id = ? 
       ORDER BY f.added_date DESC`,
      [ctx.from.id]
    );

    if (favorites.length === 0) {
      await ctx.reply('💔 Belum ada lagu favorit. Tambahkan favorit Anda!');
      return;
    }

    let message = `❤️ *Lagu Favorit (${favorites.length}):*\n\n`;
    const buttons = [];

    favorites.forEach((song, index) => {
      message += `${index + 1}. *${song.title}*\n`;
      message += `   🎤 ${song.artist}\n\n`;

      buttons.push([
        Markup.button.callback(`▶️ ${song.title.substring(0, 25)}`, `play_${song.id}`)
      ]);
    });

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }

  async handleSearch(ctx, query) {
    const songs = await this.db.all(
      `SELECT * FROM songs 
       WHERE title LIKE ? OR artist LIKE ? 
       ORDER BY play_count DESC LIMIT 20`,
      [`%${query}%`, `%${query}%`]
    );

    if (songs.length === 0) {
      await ctx.reply(`🔍 Tidak ditemukan lagu dengan kata kunci: "${query}"`);
      return;
    }

    let message = `🔍 *Hasil pencarian "${query}":*\n\n`;
    const buttons = [];

    songs.forEach((song, index) => {
      message += `${index + 1}. *${song.title}*\n`;
      message += `   🎤 ${song.artist}\n\n`;

      buttons.push([
        Markup.button.callback(`▶️ ${song.title.substring(0, 25)}`, `play_${song.id}`)
      ]);
    });

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }

  async handleStats(ctx) {
    const totalSongs = await this.db.get('SELECT COUNT(*) as count FROM songs WHERE uploaded_by = ?', [ctx.from.id]);
    const totalPlays = await this.db.get('SELECT COUNT(*) as count FROM play_history WHERE user_id = ?', [ctx.from.id]);
    const totalPlaylists = await this.db.get('SELECT COUNT(*) as count FROM playlists WHERE user_id = ?', [ctx.from.id]);
    const totalFavorites = await this.db.get('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?', [ctx.from.id]);

    const topSongs = await this.db.all(
      `SELECT s.title, s.artist, COUNT(*) as plays 
       FROM play_history ph 
       JOIN songs s ON ph.song_id = s.id 
       WHERE ph.user_id = ? 
       GROUP BY s.id 
       ORDER BY plays DESC LIMIT 5`,
      [ctx.from.id]
    );

    let message = '📊 *Statistik Anda:*\n\n';
    message += `📤 Lagu diupload: ${totalSongs.count}\n`;
    message += `▶️ Total putar: ${totalPlays.count}\n`;
    message += `🎼 Playlist: ${totalPlaylists.count}\n`;
    message += `❤️ Favorit: ${totalFavorites.count}\n\n`;

    if (topSongs.length > 0) {
      message += '*🔥 Lagu Paling Sering Diputar:*\n';
      topSongs.forEach((song, index) => {
        message += `${index + 1}. ${song.title} - ${song.artist} (${song.plays}x)\n`;
      });
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  async handleCallbackQuery(ctx) {
    const data = ctx.callbackQuery.data;
    
    if (data.startsWith('play_')) {
      const songId = parseInt(data.replace('play_', ''));
      await this.playSong(ctx, songId);
    } else if (data.startsWith('browse_')) {
      const page = parseInt(data.replace('browse_', ''));
      await this.handleBrowseSongs(ctx, page);
    } else if (data.startsWith('playlist_')) {
      const playlistId = parseInt(data.replace('playlist_', ''));
      await this.showPlaylist(ctx, playlistId);
    } else if (data === 'create_playlist') {
      await ctx.reply('📝 Ketik nama playlist baru:');
      this.userStates.set(ctx.from.id, { action: 'creating_playlist' });
    } else if (data.startsWith('fav_')) {
      const songId = parseInt(data.replace('fav_', ''));
      await this.toggleFavorite(ctx, songId);
    } else if (data.startsWith('lyrics_')) {
      const songId = parseInt(data.replace('lyrics_', ''));
      await this.showLyrics(ctx, songId);
    }

    await ctx.answerCbQuery();
  }

  async playSong(ctx, songId) {
    const song = await this.db.get('SELECT * FROM songs WHERE id = ?', [songId]);
    
    if (!song) {
      await ctx.reply('❌ Lagu tidak ditemukan.');
      return;
    }

    await this.db.run('UPDATE songs SET play_count = play_count + 1 WHERE id = ?', [songId]);
    
    await this.db.run(
      'INSERT INTO play_history (user_id, song_id) VALUES (?, ?)',
      [ctx.from.id, songId]
    );

    const isFavorite = await this.db.get(
      'SELECT id FROM favorites WHERE user_id = ? AND song_id = ?',
      [ctx.from.id, songId]
    );

    const buttons = [
      [
        Markup.button.callback(isFavorite ? '💔 Unfavorite' : '❤️ Favorite', `fav_${songId}`),
        Markup.button.callback('📝 Lirik', `lyrics_${songId}`)
      ]
    ];

    await ctx.replyWithAudio(song.file_id, {
      caption: `🎵 *${song.title}*\n🎤 ${song.artist}\n💿 ${song.album || '-'}\n▶️ ${song.play_count + 1} plays`,
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }

  async showPlaylist(ctx, playlistId) {
    const playlist = await this.db.get('SELECT * FROM playlists WHERE id = ?', [playlistId]);
    const songs = await this.db.all(
      `SELECT s.* FROM songs s 
       JOIN playlist_songs ps ON s.id = ps.song_id 
       WHERE ps.playlist_id = ? 
       ORDER BY ps.position`,
      [playlistId]
    );

    if (songs.length === 0) {
      await ctx.reply(`📝 Playlist "${playlist.name}" masih kosong.`);
      return;
    }

    let message = `🎼 *${playlist.name}*\n`;
    if (playlist.description) {
      message += `${playlist.description}\n`;
    }
    message += `\n${songs.length} lagu:\n\n`;

    const buttons = [];
    songs.forEach((song, index) => {
      message += `${index + 1}. ${song.title} - ${song.artist}\n`;
      buttons.push([
        Markup.button.callback(`▶️ ${song.title.substring(0, 25)}`, `play_${song.id}`)
      ]);
    });

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }

  async handleCreatePlaylist(ctx, name) {
    try {
      await this.db.run(
        'INSERT INTO playlists (user_id, name) VALUES (?, ?)',
        [ctx.from.id, name]
      );
      await ctx.reply(`✅ Playlist "${name}" berhasil dibuat!`);
    } catch (error) {
      await ctx.reply('❌ Gagal membuat playlist.');
    }
  }

  async toggleFavorite(ctx, songId) {
    const existing = await this.db.get(
      'SELECT id FROM favorites WHERE user_id = ? AND song_id = ?',
      [ctx.from.id, songId]
    );

    if (existing) {
      await this.db.run('DELETE FROM favorites WHERE id = ?', [existing.id]);
      await ctx.answerCbQuery('💔 Dihapus dari favorit');
    } else {
      await this.db.run(
        'INSERT INTO favorites (user_id, song_id) VALUES (?, ?)',
        [ctx.from.id, songId]
      );
      await ctx.answerCbQuery('❤️ Ditambahkan ke favorit');
    }
  }

  async showLyrics(ctx, songId) {
    const song = await this.db.get('SELECT * FROM songs WHERE id = ?', [songId]);
    await ctx.answerCbQuery('🎵 Mencari lirik...');
    
    const lyrics = await this.gemini.getLyrics(song.title, song.artist);
    await ctx.reply(lyrics);
  }

  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  launch() {
    this.bot.launch();
    console.log('Bot started successfully');
  }

  stop() {
    this.bot.stop();
  }
}

export default TelegramBot;
