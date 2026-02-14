import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebServer {
  constructor(db, gemini, port = 3000) {
    this.app = express();
    this.db = db;
    this.gemini = gemini;
    this.port = port;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../../public')));
  }

  setupRoutes() {
    this.app.get('/api/songs', async (req, res) => {
      try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM songs';
        let params = [];

        if (search) {
          query += ' WHERE title LIKE ? OR artist LIKE ?';
          params = [`%${search}%`, `%${search}%`];
        }

        query += ' ORDER BY upload_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const songs = await this.db.all(query, params);
        const totalCount = await this.db.get('SELECT COUNT(*) as count FROM songs');

        res.json({
          success: true,
          data: songs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount.count,
            totalPages: Math.ceil(totalCount.count / limit)
          }
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/api/songs/:id', async (req, res) => {
      try {
        const song = await this.db.get('SELECT * FROM songs WHERE id = ?', [req.params.id]);
        if (!song) {
          return res.status(404).json({ success: false, error: 'Song not found' });
        }
        res.json({ success: true, data: song });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/api/playlists/:userId', async (req, res) => {
      try {
        const playlists = await this.db.all(
          'SELECT * FROM playlists WHERE user_id = ? ORDER BY created_date DESC',
          [req.params.userId]
        );

        for (let playlist of playlists) {
          const songs = await this.db.all(
            `SELECT s.* FROM songs s 
             JOIN playlist_songs ps ON s.id = ps.song_id 
             WHERE ps.playlist_id = ? 
             ORDER BY ps.position`,
            [playlist.id]
          );
          playlist.songs = songs;
        }

        res.json({ success: true, data: playlists });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/api/favorites/:userId', async (req, res) => {
      try {
        const favorites = await this.db.all(
          `SELECT s.* FROM songs s 
           JOIN favorites f ON s.id = f.song_id 
           WHERE f.user_id = ? 
           ORDER BY f.added_date DESC`,
          [req.params.userId]
        );
        res.json({ success: true, data: favorites });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/play/:songId', async (req, res) => {
      try {
        const { userId } = req.body;
        const songId = req.params.songId;

        await this.db.run('UPDATE songs SET play_count = play_count + 1 WHERE id = ?', [songId]);
        await this.db.run(
          'INSERT INTO play_history (user_id, song_id) VALUES (?, ?)',
          [userId, songId]
        );

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/favorites/toggle', async (req, res) => {
      try {
        const { userId, songId } = req.body;

        const existing = await this.db.get(
          'SELECT id FROM favorites WHERE user_id = ? AND song_id = ?',
          [userId, songId]
        );

        if (existing) {
          await this.db.run('DELETE FROM favorites WHERE id = ?', [existing.id]);
          res.json({ success: true, action: 'removed' });
        } else {
          await this.db.run(
            'INSERT INTO favorites (user_id, song_id) VALUES (?, ?)',
            [userId, songId]
          );
          res.json({ success: true, action: 'added' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/playlists', async (req, res) => {
      try {
        const { userId, name, description } = req.body;

        const result = await this.db.run(
          'INSERT INTO playlists (user_id, name, description) VALUES (?, ?, ?)',
          [userId, name, description || null]
        );

        res.json({ 
          success: true, 
          data: { id: result.lastID, name, description }
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/playlists/:playlistId/songs', async (req, res) => {
      try {
        const { songId } = req.body;
        const playlistId = req.params.playlistId;

        const maxPosition = await this.db.get(
          'SELECT MAX(position) as max FROM playlist_songs WHERE playlist_id = ?',
          [playlistId]
        );

        const position = (maxPosition.max || 0) + 1;

        await this.db.run(
          'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)',
          [playlistId, songId, position]
        );

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/ai/lyrics', async (req, res) => {
      try {
        const { title, artist } = req.body;
        const lyrics = await this.gemini.getLyrics(title, artist);
        res.json({ success: true, data: lyrics });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/ai/recommend', async (req, res) => {
      try {
        const { genre, mood } = req.body;
        const recommendations = await this.gemini.getSongRecommendation(genre, mood);
        res.json({ success: true, data: recommendations });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/ai/info', async (req, res) => {
      try {
        const { title, artist } = req.body;
        const info = await this.gemini.getSongInfo(title, artist);
        res.json({ success: true, data: info });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/api/ai/chat', async (req, res) => {
      try {
        const { message, context } = req.body;
        const response = await this.gemini.chatAboutMusic(message, context);
        res.json({ success: true, data: response });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/api/stats/:userId', async (req, res) => {
      try {
        const userId = req.params.userId;

        const totalSongs = await this.db.get(
          'SELECT COUNT(*) as count FROM songs WHERE uploaded_by = ?',
          [userId]
        );

        const totalPlays = await this.db.get(
          'SELECT COUNT(*) as count FROM play_history WHERE user_id = ?',
          [userId]
        );

        const totalPlaylists = await this.db.get(
          'SELECT COUNT(*) as count FROM playlists WHERE user_id = ?',
          [userId]
        );

        const totalFavorites = await this.db.get(
          'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
          [userId]
        );

        const topSongs = await this.db.all(
          `SELECT s.title, s.artist, COUNT(*) as plays 
           FROM play_history ph 
           JOIN songs s ON ph.song_id = s.id 
           WHERE ph.user_id = ? 
           GROUP BY s.id 
           ORDER BY plays DESC LIMIT 10`,
          [userId]
        );

        res.json({
          success: true,
          data: {
            totalSongs: totalSongs.count,
            totalPlays: totalPlays.count,
            totalPlaylists: totalPlaylists.count,
            totalFavorites: totalFavorites.count,
            topSongs
          }
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Web server running on port ${this.port}`);
    });
  }
}

export default WebServer;
