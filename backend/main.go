package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type RoutineLog struct {
	WakeUpTime string `json:"wakeUpTime"`
	HadMeals   bool   `json:"hadMeals"`
	ScreenTime int    `json:"screenTime"`
	Timestamp  string `json:"timestamp"`
}

func handleLog(w http.ResponseWriter, r *http.Request) {
	// Allow CORS
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")

	// Handle preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var logData RoutineLog
	err := json.NewDecoder(r.Body).Decode(&logData)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	fmt.Printf("✅ Received routine log: %+v\n", logData)
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Routine log received"))
}

func main() {
	http.HandleFunc("/log", handleLog)
	fmt.Println("🚀 Backend running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
