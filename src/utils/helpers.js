export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .trim();
}

export function isValidAudioFile(mimeType) {
  const validTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/aac',
    'audio/ogg',
    'audio/flac'
  ];
  return validTypes.includes(mimeType);
}

export function extractMetadataFromFilename(filename) {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const parts = nameWithoutExt.split(' - ');
  
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim()
    };
  }
  
  return {
    artist: 'Unknown Artist',
    title: nameWithoutExt.trim()
  };
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function truncate(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export default {
  formatDuration,
  formatFileSize,
  sanitizeInput,
  isValidAudioFile,
  extractMetadataFromFilename,
  generateId,
  sleep,
  truncate,
  escapeHtml
};
