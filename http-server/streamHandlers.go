package main

import (
	"context"
	"fmt"
	"io"
	"net/http"

	"github.com/google/uuid"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
)

func generateHandler(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client := openai.NewClient(option.WithAPIKey(APIKEY))
	ctx := context.Background()
	sessionID := uuid.New().String()

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading body", http.StatusBadRequest)
		return
	}
	prompt := string(bodyBytes)
	fmt.Println(prompt)
	keyRules := `
You are Conexis, a desktop AI assistant.
Write clearly, naturally, and concisely. 
Use language contained in the user PROMPT and DOCUMENT-RAG QUERY.
Do NOT make up information.
Use markdown if you think is needed for the user prompt.

The output NEEDS to be renderable in KaTeX/ReactMarkdown
`
	finalTextWithRules := fmt.Sprintf("RULES: %s\n PROMPT:\n%s",
		keyRules,
		prompt,
	)

	cancelCh := make(chan bool)
	sessions[sessionID] = cancelCh
	defer delete(sessions, sessionID)
	defer close(cancelCh)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	//fmt.Fprintf(w, "data: SessionID: %s\n\n", sessionID)
	flusher.Flush()

	stream := client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(finalTextWithRules),
		},
		Seed:  openai.Int(0),
		Model: openai.ChatModelGPT4_1Nano,
	})
	defer stream.Close()

	fmt.Println("Streaming in corso...")

	for stream.Next() {
		select {
		case <-cancelCh:
			fmt.Fprintf(w, "event: done\ndata: stopped\n\n")
			flusher.Flush()
			return
		default:
			chunk := stream.Current()
			if len(chunk.Choices) > 0 {
				fmt.Fprintf(w, "data: %s\n\n", chunk.Choices[0].Delta.Content)
				flusher.Flush()
			}
		}
	}

	fmt.Println("\nStreaming terminato.")
}

func stopHandler(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("sessionID")
	if sessionID == "" {
		http.Error(w, "Missing sessionID", http.StatusBadRequest)
		return
	}

	if ch, ok := sessions[sessionID]; ok {
		close(ch)
		fmt.Fprintf(w, "Stopped session %s\n", sessionID)
	} else {
		fmt.Fprintf(w, "Session %s not found\n", sessionID)
	}
}

func generateSummary(w http.ResponseWriter, r *http.Request) {
	// CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading body", http.StatusBadRequest)
		return
	}
	prompt := string(bodyBytes)
	if len(prompt) > 2500 {
		http.Error(w, "Error, body too big for this handler", http.StatusBadRequest)
		return
	}

	client := openai.NewClient(option.WithAPIKey(APIKEY))
	ctx := context.Background()
	sessionID := uuid.New().String()

	cancelCh := make(chan bool)
	sessions[sessionID] = cancelCh
	defer delete(sessions, sessionID)
	defer close(cancelCh)

	// Streaming headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "event: session\ndata: %s\n\n", sessionID)
	flusher.Flush()

	stream := client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4_1Nano,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(
				"Sei un assistente che produce un mini riassunto di un testo. " +
					"Il riassunto deve essere conciso e chiaro, senza opinioni personali. " +
					"Simula SEMPRE di avere gia conoscenza del contesto, come se lo avessi di base",
			),
			openai.UserMessage(prompt),
		},
		Seed: openai.Int(0),
	})
	defer stream.Close()

	fmt.Println("Streaming summary in corso...")

	for stream.Next() {
		select {
		case <-cancelCh:
			fmt.Fprintf(w, "event: done\ndata: stopped\n\n")
			flusher.Flush()
			return
		default:
			chunk := stream.Current()
			if len(chunk.Choices) > 0 {
				fmt.Fprintf(w, "data: %s\n\n", chunk.Choices[0].Delta.Content)
				flusher.Flush()
			}
		}
	}

	fmt.Println("Streaming summary terminato.")

	fmt.Fprintf(w, "event: done\ndata: complete\n\n")
	flusher.Flush()
}

func questionResponse(w http.ResponseWriter, r *http.Request) {
	// CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading body", http.StatusBadRequest)
		return
	}
	prompt := string(bodyBytes)
	if len(prompt) > 5000 {
		http.Error(w, "Error, body too big for this handler", http.StatusBadRequest)
		return
	}

	client := openai.NewClient(option.WithAPIKey(APIKEY))
	ctx := context.Background()
	sessionID := uuid.New().String()

	cancelCh := make(chan bool)
	sessions[sessionID] = cancelCh
	defer delete(sessions, sessionID)
	defer close(cancelCh)

	// Streaming headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "event: session\ndata: %s\n\n", sessionID)
	flusher.Flush()

	fmt.Println(prompt)

	stream := client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4_1Nano,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(
				"Sei un assistente che deve rispondere a una domanda. " +
					"Usa PRIMA il contesto fornito dall'utente. " +
					"Simula SEMPRE di avere gia conoscenza del contesto, come se lo avessi di base" +
					"Se il contesto non contiene informazioni utili, integra con le tue conoscenze. " +
					"Le risposte devono essere chiare, dirette e senza opinioni personali.",
			),
			openai.UserMessage(prompt),
		},
		Seed: openai.Int(0),
	})
	defer stream.Close()

	fmt.Println("Streaming risposta in corso...")

	for stream.Next() {
		select {
		case <-cancelCh:
			fmt.Fprintf(w, "event: done\ndata: stopped\n\n")
			flusher.Flush()
			return
		default:
			chunk := stream.Current()
			if len(chunk.Choices) > 0 {
				fmt.Fprintf(w, "data: %s\n\n", chunk.Choices[0].Delta.Content)
				flusher.Flush()
			}
		}
	}

	fmt.Println("Streaming risposta terminato.")

	fmt.Fprintf(w, "event: done\ndata: complete\n\n")
	flusher.Flush()
}

func giveTopicInfo(w http.ResponseWriter, r *http.Request) {
	// CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading body", http.StatusBadRequest)
		return
	}
	prompt := string(bodyBytes)
	if len(prompt) > 5000 {
		http.Error(w, "Error, body too big for this handler", http.StatusBadRequest)
		return
	}

	client := openai.NewClient(option.WithAPIKey(APIKEY))
	ctx := context.Background()
	sessionID := uuid.New().String()

	cancelCh := make(chan bool)
	sessions[sessionID] = cancelCh
	defer delete(sessions, sessionID)
	defer close(cancelCh)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "event: session\ndata: %s\n\n", sessionID)
	flusher.Flush()

	stream := client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4_1Nano,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(
				"Sei un assistente che deve fornire informazioni su un topic specifico. " +
					"Usa QUANDO UTILE il contesto fornito dall'utente come base. " +
					"Simula SEMPRE di avere gia conoscenza del contesto, come se lo avessi di base" +
					"Se nel contesto non ci sono abbastanza informazioni, integra con le tue conoscenze. " +
					"Le risposte devono essere chiare, strutturate e prive di opinioni personali.",
			),
			openai.UserMessage(prompt),
		},
		Seed: openai.Int(0),
	})
	defer stream.Close()

	fmt.Println("Streaming topic info in corso...")

	for stream.Next() {
		select {
		case <-cancelCh:
			fmt.Fprintf(w, "event: done\ndata: stopped\n\n")
			flusher.Flush()
			return
		default:
			chunk := stream.Current()
			if len(chunk.Choices) > 0 {
				fmt.Fprintf(w, "data: %s\n\n", chunk.Choices[0].Delta.Content)
				flusher.Flush()
			}
		}
	}

	fmt.Println("Streaming topic info terminato.")

	fmt.Fprintf(w, "event: done\ndata: complete\n\n")
	flusher.Flush()
}
