const path = require('path');
const { Worker } = require('worker_threads');

function runOcrInWorker(base64Image) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, '../workers/ocr-worker.js'));

    worker.postMessage(base64Image);

    worker.on('message', (msg) => {
      if (msg.error) return reject(new Error(msg.error));
      resolve(msg.text);
    });

    worker.on('error', reject);

    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`OCR воркер завершился с кодом ${code}`));
    });
  });
}

module.exports = { runOcrInWorker };
