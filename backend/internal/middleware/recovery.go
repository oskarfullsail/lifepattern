package middleware

import (
	"log"
	"net/http"
	"runtime/debug"
)

// Recovery middleware recovers from panics and returns 500 error
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("💥 Panic recovered: %v", err)
				log.Printf("📚 Stack trace: %s", debug.Stack())
				
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
		}()
		
		next.ServeHTTP(w, r)
	})
}
