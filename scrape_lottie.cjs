const https = require('https');

https.get('https://lottiefiles.com/api/v1/search/public?q=explosion', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(parsed.results.slice(0, 5).map(r => r.lottie_url || r.file));
    } catch(e) {
      console.log("Error parsing");
    }
  });
});
