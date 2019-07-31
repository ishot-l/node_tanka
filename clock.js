const http = require('http');

const URL = 'https://minna-de-tanka.herokuapp.com/';
const INTERVAL_MSEC = 10 * 60 * 1000;

setInterval(() => {
  http
    .get(URL, res => {
      console.log(res, URL);
    })
    .on('error', err => {
      console.log(err, URL);
    });
}, INTERVAL_MSEC);