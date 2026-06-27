async function test() {
  const ollamaUrl = 'http://127.0.0.1:11434';
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemma3:4b',
      messages: [{role: 'user', content: 'hello'}]
    })
  });
  const data = await res.text();
  console.log(data);
}
test();
