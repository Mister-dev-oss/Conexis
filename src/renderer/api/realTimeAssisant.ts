const API_BASE = "http://localhost:8080";

async function safeFetch<T>(url: string, body: string): Promise<T> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body,
    });

    const text = await response.text();

    try {
      return JSON.parse(text) as T;
    } catch (err) {
      console.error("Errore parsing JSON:", text);
      throw new Error("Response non è JSON valido: " + text);
    }
  } catch (err) {
    console.error("Errore API:", err);
    throw err; // rilancia per gestirlo nel componente
  }
}

// 1. Estrarre domande dal testo
export async function extractQuestions(transcripts: string[]): Promise<{ questions: string[], count: number }> {
  const prompt = transcripts.join(" ");
  return safeFetch<{ questions: string[], count: number }>(`${API_BASE}/catchQuestions`, prompt);
}

// 2. Generare nuove domande
export async function generateQuestions(transcripts: string[]): Promise<{ questions: string[], count: number }> {
  const prompt = transcripts.join(" ");
  return safeFetch<{ questions: string[], count: number }>(`${API_BASE}/generateQuestions`, prompt);
}

// 4. Identificare gli argomenti principali
export async function detectTopics(transcripts: string[]): Promise<{ topics: string[], count: number }> {
  const prompt = transcripts.join(" ");
  return safeFetch<{ topics: string[], count: number }>(`${API_BASE}/catchTopics`, prompt);
}

export async function summarize(
  transcripts: string[],
  onChunk: (chunk: string) => void
): Promise<void> {
  // Unisci i transcript in un testo unico
  const finalText = `CONTEXT:\n${transcripts.join("\n")}`;

  const response = await fetch("http://localhost:8080/generateSummary", {
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

export async function QuestionResponse(
  transcripts: string[],
  onChunk: (chunk: string) => void
): Promise<void> {
  // Unisci i transcript in un testo unico
  const finalText = `CONTEXT:\n${transcripts.join("\n")}`;

  const response = await fetch("http://localhost:8080/generateQuestionResponse", {
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

export async function GivetopicInfo(
  transcripts: string[],
  onChunk: (chunk: string) => void
): Promise<void> {
  // Unisci i transcript in un testo unico
  const finalText = `CONTEXT:\n${transcripts.join("\n")}`; 

  const response = await fetch("http://localhost:8080/givetopicInfo", {
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

