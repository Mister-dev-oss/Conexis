package main

import (
	"context"
	"io"
	"net/http"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
)

func catchTopics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
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

	chatCompletion, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4_1Mini,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(
				"Sei un assistente che identifica i principali argomenti trattati in un testo. " +
					"Rileva i principali concetti chiave, tecnologie o temi scientifici citati, ignorando rumore o parole non rilevanti." +
					"Rilevane una giusta quantita, non troppi",
			),
			openai.UserMessage(
				"Analizza il seguente testo e restituisci un JSON con 'topics' (array) contenente gli argomenti principali e 'count' (numero totale topics). " +
					"TESTO:\n" + prompt,
			),
		},
	})
	if err != nil {
		http.Error(w, "Error from OpenAI: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if len(chatCompletion.Choices) == 0 {
		http.Error(w, "No response from OpenAI", http.StatusInternalServerError)
		return
	}

	result := chatCompletion.Choices[0].Message.Content

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(result))
}

func generateQuestions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
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

	// ChatCompletion con nuova sintassi
	chatCompletion, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4_1Mini,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(
				"Sei un assistente che genera domande basate sul testo fornito. " +
					"Correggi eventuali trascrizioni errate e ignora il rumore o le parti non rilevanti. " +
					"Le domande possono essere anche 0 se non ci sono informazioni necessarie per formularne" +
					"il numero di domande generali è a tua discrezione ma cerca di essere contenuto, usando i temi principali come argomenti per esse" +
					"genera un numero di domande appropiato, non troppe",
			),
			openai.UserMessage(
				"Leggi il seguente testo e genera un insieme di domande pertinenti su ciò di cui si parla. " +
					"Restituisci un JSON con 'questions' (array) e 'count' (numero totale di domande). TESTO:\n" + prompt,
			),
		},
	})
	if err != nil {
		http.Error(w, "Error from OpenAI: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if len(chatCompletion.Choices) == 0 {
		http.Error(w, "No response from OpenAI", http.StatusInternalServerError)
		return
	}

	result := chatCompletion.Choices[0].Message.Content

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(result))
}

func catchQuestions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
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

	// ChatCompletion con nuova sintassi
	chatCompletion, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModelGPT4_1Mini,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(
				"Sei un assistente che estrae tutte le domande da un testo. " +
					"Correggi eventuali trascrizioni errate e ignora il rumore o le parti non rilevanti. " +
					"Le domande potrebbero non finire con '?' e possono essere 0.",
			),
			openai.UserMessage(
				"Estrai tutte le domande dal seguente testo e restituisci un JSON con 'questions' (array) " +
					"e 'count' (numero totale di domande). TESTO:\n" + prompt,
			)},
	})
	if err != nil {
		http.Error(w, "Error from OpenAI: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if len(chatCompletion.Choices) == 0 {
		http.Error(w, "No response from OpenAI", http.StatusInternalServerError)
		return
	}

	result := chatCompletion.Choices[0].Message.Content

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(result))
}
