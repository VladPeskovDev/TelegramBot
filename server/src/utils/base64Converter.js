const fs = require('fs');

function convertImageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Ошибка при чтении файла изображения:', error.message);
    return null;
  }
}

module.exports = { convertImageToBase64 };
