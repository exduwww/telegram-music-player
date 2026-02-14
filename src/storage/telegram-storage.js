class StorageService {
  constructor(bot, storageChatId) {
    this.bot = bot;
    this.storageChatId = storageChatId;
  }

  async uploadFile(filePath, caption = '') {
    try {
      const message = await this.bot.telegram.sendAudio(
        this.storageChatId,
        { source: filePath },
        { caption }
      );

      return message.audio.file_id;
    } catch (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
  }

  async getFileLink(fileId) {
    try {
      const fileLink = await this.bot.telegram.getFileLink(fileId);
      return fileLink.href;
    } catch (error) {
      console.error('Get file link error:', error);
      throw error;
    }
  }

  async deleteFile(messageId) {
    try {
      await this.bot.telegram.deleteMessage(this.storageChatId, messageId);
      return true;
    } catch (error) {
      console.error('Delete file error:', error);
      return false;
    }
  }

  async getFileInfo(fileId) {
    try {
      const file = await this.bot.telegram.getFile(fileId);
      return file;
    } catch (error) {
      console.error('Get file info error:', error);
      throw error;
    }
  }
}

export default StorageService;
