const { parentPort } = require('worker_threads');
const Tesseract = require('tesseract.js');
const { Buffer } = require('buffer');

parentPort.on('message', async (base64Image) => {
  try {
    //console.log('📥 Воркер получил изображение на обработку');
    const buffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const {
      data: { text },
    } = await Tesseract.recognize(buffer, 'eng+rus');

    parentPort.postMessage({ text });
  } catch (err) {
    parentPort.postMessage({ error: err.message });
  }
});
