package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORS(t *testing.T) {
	// Create a test handler
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("test response"))
	})

	// Apply CORS middleware
	handler := CORS(testHandler)

	// Test regular request
	req := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	// Check CORS headers
	if w.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("Expected Access-Control-Allow-Origin: *, got %s", w.Header().Get("Access-Control-Allow-Origin"))
	}

	if w.Header().Get("Access-Control-Allow-Methods") != "GET, POST, PUT, DELETE, OPTIONS" {
		t.Fatalf("Expected Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, got %s", w.Header().Get("Access-Control-Allow-Methods"))
	}

	if w.Header().Get("Access-Control-Allow-Headers") != "Content-Type, Authorization" {
		t.Fatalf("Expected Access-Control-Allow-Headers: Content-Type, Authorization, got %s", w.Header().Get("Access-Control-Allow-Headers"))
	}

	if w.Header().Get("Access-Control-Max-Age") != "86400" {
		t.Fatalf("Expected Access-Control-Max-Age: 86400, got %s", w.Header().Get("Access-Control-Max-Age"))
	}

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}
}

func TestCORSPreflight(t *testing.T) {
	// Create a test handler
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("test response"))
	})

	// Apply CORS middleware
	handler := CORS(testHandler)

	// Test preflight request
	req := httptest.NewRequest("OPTIONS", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "Content-Type")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	// Check CORS headers
	if w.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("Expected Access-Control-Allow-Origin: *, got %s", w.Header().Get("Access-Control-Allow-Origin"))
	}

	if w.Header().Get("Access-Control-Allow-Methods") != "GET, POST, PUT, DELETE, OPTIONS" {
		t.Fatalf("Expected Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, got %s", w.Header().Get("Access-Control-Allow-Methods"))
	}

	if w.Header().Get("Access-Control-Allow-Headers") != "Content-Type, Authorization" {
		t.Fatalf("Expected Access-Control-Allow-Headers: Content-Type, Authorization, got %s", w.Header().Get("Access-Control-Allow-Headers"))
	}

	if w.Header().Get("Access-Control-Max-Age") != "86400" {
		t.Fatalf("Expected Access-Control-Max-Age: 86400, got %s", w.Header().Get("Access-Control-Max-Age"))
	}

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for preflight request, got %d", w.Code)
	}
}

func TestCORSWithDifferentMethods(t *testing.T) {
	// Create a test handler
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("test response"))
	})

	// Apply CORS middleware
	handler := CORS(testHandler)

	// Test different HTTP methods
	methods := []string{"GET", "POST", "PUT", "DELETE"}

	for _, method := range methods {
		req := httptest.NewRequest(method, "/test", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		// Check CORS headers are present
		if w.Header().Get("Access-Control-Allow-Origin") != "*" {
			t.Fatalf("Expected Access-Control-Allow-Origin: * for %s request, got %s", method, w.Header().Get("Access-Control-Allow-Origin"))
		}

		if w.Code != http.StatusOK {
			t.Fatalf("Expected status 200 for %s request, got %d", method, w.Code)
		}
	}
}
