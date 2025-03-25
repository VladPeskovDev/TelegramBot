/*import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // плавный разгон до 20 пользователей
    { duration: '30s', target: 50 },  // затем держим 50
    { duration: '30s', target: 100 }, // затем держим 100
    { duration: '30s', target: 0 },   // спад до 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% запросов должны быть < 1 сек
    http_req_failed: ['rate<0.01'],    // не более 1% ошибок
  },
};

export default function () {
  const url = 'URL/bot{TOKEN}'; // не забудь подставить токен

  const payload = JSON.stringify({
    update_id: 123456,
    message: {
      chat: { id: 12345 },
      text: 'Привет!',
    },
  });

  const headers = { 'Content-Type': 'application/json' };

  const res = http.post(url, payload, { headers });

  check(res, {
    'статус 200': (r) => r.status === 200,
  });

  sleep(1); // можно уменьшить, если хочешь сильнее нагрузить
}
*/

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<3000'], // т.к. OpenAI может тормозить
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const url = 'URL'; // пример, уточни свой

  const payload = JSON.stringify({
    chatId: '96800740',
    userMessage: 'Стоилца бразилии',
  });

  const headers = { 'Content-Type': 'application/json' };

  const res = http.post(url, payload, { headers });

  check(res, {
    'статус 200': (r) => r.status === 200,
    'есть ответ': (r) => r.body && r.body.length > 0,
  });

  sleep(1); // можно снизить до 0.1 для большей нагрузки
}


//k6 run test.js






/* function reverse(str){
  return str.split("").reverce().join("");
} */