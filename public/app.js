const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const user = tg.initDataUnsafe?.user || { id: 123456, first_name: 'User' };
const userId = user.id;

const API_URL = window.location.origin + '/api';

let currentPage = 1;
let currentSong = null;
let playlist = [];
let currentIndex = -1;
let isPlaying = false;

const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const playerBar = document.getElementById('playerBar');
const playerTitle = document.getElementById('playerTitle');
const playerArtist = document.getElementById('playerArtist');

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    loadSongs();
});

function initApp() {
    document.getElementById('userInfo').textContent = `👤 ${user.first_name}`;
    
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
    document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#40a7e3');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
}

function setupEventListeners() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadSongs(1, e.target.value);
        }, 500);
    });

    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    favoriteBtn.addEventListener('click', toggleFavorite);

    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', playNext);
    audioPlayer.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audioPlayer.duration);
    });

    progressBar.addEventListener('input', (e) => {
        const time = (e.target.value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = time;
    });

    document.getElementById('createPlaylistBtn').addEventListener('click', createPlaylist);

    document.getElementById('getLyricsBtn').addEventListener('click', getLyrics);
    document.getElementById('getRecommendBtn').addEventListener('click', getRecommendations);
    document.getElementById('getSongInfoBtn').addEventListener('click', getSongInfo);
    document.getElementById('chatAIBtn').addEventListener('click', chatWithAI);

    const modal = document.getElementById('modal');
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    switch(tabName) {
        case 'browse':
            loadSongs();
            break;
        case 'playlists':
            loadPlaylists();
            break;
        case 'favorites':
            loadFavorites();
            break;
    }
}

async function apiRequest(endpoint, options = {}) {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        tg.showAlert('Terjadi kesalahan. Silakan coba lagi.');
        return null;
    } finally {
        showLoading(false);
    }
}

async function loadSongs(page = 1, search = '') {
    const data = await apiRequest(`/songs?page=${page}&limit=20&search=${search}`);
    if (data && data.success) {
        displaySongs(data.data, 'songsList');
        displayPagination(data.pagination);
    }
}

async function loadPlaylists() {
    const data = await apiRequest(`/playlists/${userId}`);
    if (data && data.success) {
        displayPlaylists(data.data);
    }
}

async function loadFavorites() {
    const data = await apiRequest(`/favorites/${userId}`);
    if (data && data.success) {
        displaySongs(data.data, 'favoritesList');
    }
}

function displaySongs(songs, containerId) {
    const container = document.getElementById(containerId);
    
    if (songs.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--hint-color);">Tidak ada lagu</p>';
        return;
    }

    container.innerHTML = songs.map(song => `
        <div class="song-item" onclick="playSongById(${song.id})">
            <div class="song-thumbnail">🎵</div>
            <div class="song-info">
                <div class="song-title">${escapeHtml(song.title)}</div>
                <div class="song-artist">${escapeHtml(song.artist || 'Unknown Artist')}</div>
                <div class="song-meta">
                    ${song.album ? '💿 ' + escapeHtml(song.album) + ' • ' : ''}
                    ▶️ ${song.play_count} plays
                </div>
            </div>
            <div class="song-actions">
                <button class="icon-btn" onclick="event.stopPropagation(); toggleSongFavorite(${song.id})">
                    ${song.is_favorite ? '❤️' : '🤍'}
                </button>
            </div>
        </div>
    `).join('');
}

function displayPlaylists(playlists) {
    const container = document.getElementById('playlistsList');
    
    if (playlists.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--hint-color);">Belum ada playlist</p>';
        return;
    }

    container.innerHTML = playlists.map(playlist => `
        <div class="playlist-item" onclick="openPlaylist(${playlist.id})">
            <div class="playlist-name">📁 ${escapeHtml(playlist.name)}</div>
            <div class="playlist-count">${playlist.songs ? playlist.songs.length : 0} lagu</div>
            ${playlist.description ? `<div style="margin-top: 5px; color: var(--hint-color); font-size: 14px;">${escapeHtml(playlist.description)}</div>` : ''}
        </div>
    `).join('');
}

function displayPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, totalPages } = pagination;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let buttons = '';
    
    if (page > 1) {
        buttons += `<button class="page-btn" onclick="loadSongs(${page - 1})">← Prev</button>`;
    }

    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        buttons += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadSongs(${i})">${i}</button>`;
    }

    if (page < totalPages) {
        buttons += `<button class="page-btn" onclick="loadSongs(${page + 1})">Next →</button>`;
    }

    container.innerHTML = buttons;
}

async function playSongById(songId) {
    const data = await apiRequest(`/songs/${songId}`);
    if (data && data.success) {
        await playSong(data.data);
        
        await apiRequest(`/play/${songId}`, {
            method: 'POST',
            body: JSON.stringify({ userId })
        });
    }
}

async function playSong(song) {
    currentSong = song;
    
    const fileLink = `https://api.telegram.org/file/bot${tg.initData}/file_id/${song.file_id}`;
    
    audioPlayer.src = fileLink;
    audioPlayer.play();
    isPlaying = true;

    playerTitle.textContent = song.title;
    playerArtist.textContent = song.artist || 'Unknown Artist';
    playBtn.textContent = '⏸️';
    playerBar.style.display = 'block';

    updateFavoriteButton(song.id);

    tg.HapticFeedback.impactOccurred('light');
}

function togglePlay() {
    if (isPlaying) {
        audioPlayer.pause();
        playBtn.textContent = '▶️';
        isPlaying = false;
    } else {
        audioPlayer.play();
        playBtn.textContent = '⏸️';
        isPlaying = true;
    }
}

function playPrevious() {
    if (currentIndex > 0) {
        currentIndex--;
        playSong(playlist[currentIndex]);
    }
}

function playNext() {
    if (currentIndex < playlist.length - 1) {
        currentIndex++;
        playSong(playlist[currentIndex]);
    }
}

async function toggleFavorite() {
    if (!currentSong) return;
    
    await toggleSongFavorite(currentSong.id);
    updateFavoriteButton(currentSong.id);
}

async function toggleSongFavorite(songId) {
    const data = await apiRequest('/favorites/toggle', {
        method: 'POST',
        body: JSON.stringify({ userId, songId })
    });
    
    if (data && data.success) {
        tg.HapticFeedback.notificationOccurred(data.action === 'added' ? 'success' : 'warning');
    }
}

async function updateFavoriteButton(songId) {
    const data = await apiRequest(`/favorites/${userId}`);
    if (data && data.success) {
        const isFavorite = data.data.some(fav => fav.id === songId);
        favoriteBtn.textContent = isFavorite ? '❤️' : '🤍';
    }
}

function updateProgress() {
    if (audioPlayer.duration) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progress;
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    }
}

async function getLyrics() {
    const title = prompt('Masukkan judul lagu:');
    if (!title) return;

    const data = await apiRequest('/ai/lyrics', {
        method: 'POST',
        body: JSON.stringify({ title, artist: '' })
    });

    if (data && data.success) {
        document.getElementById('aiResponse').textContent = data.data;
    }
}

async function getRecommendations() {
    const data = await apiRequest('/ai/recommend', {
        method: 'POST',
        body: JSON.stringify({ genre: '', mood: '' })
    });

    if (data && data.success) {
        document.getElementById('aiResponse').textContent = data.data;
    }
}

async function getSongInfo() {
    if (!currentSong) {
        tg.showAlert('Putar lagu terlebih dahulu');
        return;
    }

    const data = await apiRequest('/ai/info', {
        method: 'POST',
        body: JSON.stringify({ title: currentSong.title, artist: currentSong.artist })
    });

    if (data && data.success) {
        document.getElementById('aiResponse').textContent = data.data;
    }
}

async function chatWithAI() {
    showModal(`
        <h3>💬 Chat tentang Musik</h3>
        <textarea id="chatInput" style="width: 100%; height: 100px; padding: 10px; margin: 10px 0; border-radius: 8px; border: 1px solid var(--hint-color);"></textarea>
        <button class="btn-primary" onclick="sendChatMessage()">Kirim</button>
    `);
}

async function sendChatMessage() {
    const message = document.getElementById('chatInput').value;
    if (!message) return;

    hideModal();

    const data = await apiRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, context: '' })
    });

    if (data && data.success) {
        switchTab('ai');
        document.getElementById('aiResponse').textContent = data.data;
    }
}

async function createPlaylist() {
    showModal(`
        <h3>➕ Buat Playlist Baru</h3>
        <input type="text" id="playlistName" placeholder="Nama playlist" style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 1px solid var(--hint-color);" />
        <textarea id="playlistDesc" placeholder="Deskripsi (optional)" style="width: 100%; height: 60px; padding: 10px; margin: 10px 0; border-radius: 8px; border: 1px solid var(--hint-color);"></textarea>
        <button class="btn-primary" onclick="savePlaylist()">Buat</button>
    `);
}

async function savePlaylist() {
    const name = document.getElementById('playlistName').value;
    const description = document.getElementById('playlistDesc').value;

    if (!name) {
        tg.showAlert('Nama playlist harus diisi');
        return;
    }

    const data = await apiRequest('/playlists', {
        method: 'POST',
        body: JSON.stringify({ userId, name, description })
    });

    if (data && data.success) {
        hideModal();
        loadPlaylists();
        tg.showAlert('Playlist berhasil dibuat!');
    }
}

async function openPlaylist(playlistId) {
    const data = await apiRequest(`/playlists/${userId}`);
    if (data && data.success) {
        const playlist = data.data.find(p => p.id === playlistId);
        if (playlist && playlist.songs) {
            showModal(`
                <h3>🎼 ${escapeHtml(playlist.name)}</h3>
                <div style="max-height: 400px; overflow-y: auto;">
                    ${playlist.songs.map(song => `
                        <div class="song-item" onclick="playSongById(${song.id}); hideModal();">
                            <div class="song-thumbnail">🎵</div>
                            <div class="song-info">
                                <div class="song-title">${escapeHtml(song.title)}</div>
                                <div class="song-artist">${escapeHtml(song.artist || 'Unknown')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `);
        }
    }
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function showModal(content) {
    const modal = document.getElementById('modal');
    document.getElementById('modalBody').innerHTML = content;
    modal.style.display = 'block';
}

function hideModal() {
    document.getElementById('modal').style.display = 'none';
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.playSongById = playSongById;
window.toggleSongFavorite = toggleSongFavorite;
window.openPlaylist = openPlaylist;
window.sendChatMessage = sendChatMessage;
window.savePlaylist = savePlaylist;
window.loadSongs = loadSongs;
