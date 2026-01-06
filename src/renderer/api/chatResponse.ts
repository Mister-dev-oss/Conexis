
export type ChatMessage = {
  from: 'user' | 'ConexisAI';
  text: string;
};

export async function llmstreamResponseGivingCtx(
  ctx: ChatMessage[],
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const ctxText = ctx.map(m => `${m.from.toUpperCase()}: ${m.text}`).join("\n");
  const finalText = `CHAT CTX:\n${ctxText}\n\nUSER PROMPT:\n${prompt}`;

  const response = await fetch("http://localhost:8080/generate", {
    method: "POST",
    body: finalText,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Errore HTTP: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          onChunk(line.replace("data: ", ""));
        } else if (line.startsWith("event: done")) {
          return; 
        }
      }
    }
  } catch (err) {
    throw new Error("Errore nello stream: " + (err as Error).message);
  } finally {
    reader.releaseLock();
  }
}

export async function llmstreamResponseGivingCtxandRag(
  ctx: ChatMessage[],
  RagQuery: string,
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const ctxText = ctx.map(m => `${m.from.toUpperCase()}: ${m.text}`).join("\n");
  const finalText = `CHAT CTX:\n${ctxText}\nDOCUMENT-RAG QUERY:\n${RagQuery}\nUSER PROMPT:\n${prompt}`;

  const response = await fetch("http://localhost:8080/generate", {
    method: "POST",
    body: finalText,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Errore HTTP: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          onChunk(line.replace("data: ", ""));
        } else if (line.startsWith("event: done")) {
          return; 
        }
      }
    }
  } catch (err) {
    throw new Error("Errore nello stream: " + (err as Error).message);
  } finally {
    reader.releaseLock();
  }
}
