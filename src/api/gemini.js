import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async getLyrics(songTitle, artist = '') {
    try {
      const prompt = `Berikan lirik lengkap lagu "${songTitle}"${artist ? ` oleh ${artist}` : ''}. 
      Format response:
      🎵 [Judul Lagu] - [Artis]
      
      [Lirik lengkap dengan verse, chorus, bridge yang jelas]
      
      Jika lagu tidak ditemukan, katakan bahwa lirik tidak tersedia.`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error getting lyrics:', error);
      return 'Maaf, terjadi kesalahan saat mengambil lirik lagu.';
    }
  }

  async getSongRecommendation(genre = '', mood = '') {
    try {
      const prompt = `Rekomendasikan 5 lagu ${genre ? `genre ${genre}` : ''}${mood ? ` dengan mood ${mood}` : ''}.
      Format response sebagai list:
      1. [Judul Lagu] - [Artis] (Alasan singkat)
      2. ...
      
      Berikan rekomendasi yang beragam dan populer.`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return 'Maaf, terjadi kesalahan saat memberikan rekomendasi.';
    }
  }

  async getSongInfo(songTitle, artist = '') {
    try {
      const prompt = `Berikan informasi detail tentang lagu "${songTitle}"${artist ? ` oleh ${artist}` : ''}.
      Informasi yang dibutuhkan:
      - Artis/Band
      - Album
      - Tahun rilis
      - Genre
      - Durasi (perkiraan)
      - Fakta menarik tentang lagu
      - Makna/tema lagu
      
      Format response dengan emoji dan struktur yang rapi.`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error getting song info:', error);
      return 'Maaf, terjadi kesalahan saat mengambil informasi lagu.';
    }
  }

  async chatAboutMusic(message, context = '') {
    try {
      const prompt = `Kamu adalah asisten musik yang ramah dan berpengetahuan luas.
      ${context ? `Konteks: ${context}\n` : ''}
      User: ${message}
      
      Berikan respons yang informatif, ramah, dan membantu tentang musik.`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error in music chat:', error);
      return 'Maaf, terjadi kesalahan saat memproses pertanyaan Anda.';
    }
  }

  async analyzePlaylist(songs) {
    try {
      const songList = songs.map(s => `${s.title} - ${s.artist}`).join('\n');
      const prompt = `Analisis playlist berikut dan berikan insight:
      ${songList}
      
      Berikan analisis tentang:
      - Genre dominan
      - Mood keseluruhan
      - Era/dekade musik
      - Karakteristik playlist
      - Saran lagu tambahan yang cocok (3-5 lagu)`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing playlist:', error);
      return 'Maaf, terjadi kesalahan saat menganalisis playlist.';
    }
  }

  async translateLyrics(lyrics, targetLanguage = 'id') {
    try {
      const languageMap = {
        'id': 'Bahasa Indonesia',
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'ja': 'Japanese',
        'ko': 'Korean'
      };

      const targetLang = languageMap[targetLanguage] || 'Bahasa Indonesia';
      
      const prompt = `Terjemahkan lirik lagu berikut ke ${targetLang}. Pertahankan struktur dan makna lirik:
      
      ${lyrics}
      
      Berikan terjemahan yang natural dan mempertahankan nuansa emosional.`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error translating lyrics:', error);
      return 'Maaf, terjadi kesalahan saat menerjemahkan lirik.';
    }
  }
}

export default GeminiService;
