import fetch from 'node-fetch';
async function test() {
  const res = await fetch('http://localhost:3000/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: 'bypass_auth' })
  });
  console.log(res.status, await res.text());
}
test();
