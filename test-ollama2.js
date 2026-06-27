async function test() {
  try {
    const ollamaUrl = 'http://127.0.0.1:11434';
    const res = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: 'Hello world'
      })
    });
    const data = await res.json();
    console.log("Response:", data);
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
