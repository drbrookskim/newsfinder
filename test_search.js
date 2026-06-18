const https = require('https');

async function testSearch(companyName) {
  try {
    const encoded = encodeURIComponent(companyName);
    const url = `https://ac.stock.naver.com/ac?query=${encoded}&target=stock,index,marketindicator`;
    console.log('Fetching URL:', url);
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    console.log(res.status, await res.text());
  } catch (e) {
    console.error(e);
  }
}

testSearch('오픈엣지테크놀로지');
