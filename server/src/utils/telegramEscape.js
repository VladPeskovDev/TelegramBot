function escapeMarkdownV2(text) {
    return text
      .replace(/\\/g, '\\\\') // сначала экранируем слэши
      .replace(/[_*[\]()~`>#+\-=|{}.!]/g, (match) => `\\${match}`);
  }
  
  module.exports = { escapeMarkdownV2 };
  