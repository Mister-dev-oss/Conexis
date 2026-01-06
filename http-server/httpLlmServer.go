package main

import (
	"log"
	"net/http"
	"os"
)

// mappa per sessioni: sessionID -> canale stop
var sessions = map[string]chan bool{}

var APIKEY = os.Getenv("LLM-API")

func main() {
	http.HandleFunc("/catchQuestions", catchQuestions)
	http.HandleFunc("/catchTopics", catchTopics)
	http.HandleFunc("/generateQuestions", generateQuestions)
	http.HandleFunc("/generateSummary", generateSummary)
	http.HandleFunc("/generateQuestionResponse", questionResponse)
	http.HandleFunc("/givetopicInfo", giveTopicInfo)

	http.HandleFunc("/generate", generateHandler) // POST per SSE
	http.HandleFunc("/stop", stopHandler)         // GET per stop

	log.Println("Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
