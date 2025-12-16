/**
 * Auth Events - Global authentication event system
 * Used to notify the app when authentication state changes (e.g., session expired)
 */

type AuthEventType = 'sessionExpired' | 'loggedOut' | 'loginRequired';

type AuthEventListener = (event: AuthEventType, message?: string) => void;

class AuthEventEmitter {
  private listeners: AuthEventListener[] = [];
  private lastSessionExpiredTime: number = 0;
  private sessionExpiredDebounceMs: number = 3000; // 3 second debounce

  /**
   * Subscribe to auth events
   * @param listener - Callback function to handle auth events
   * @returns Unsubscribe function
   */
  subscribe(listener: AuthEventListener): () => void {
    this.listeners.push(listener);
    console.log('🔔 Auth event listener subscribed, total listeners:', this.listeners.length);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
      console.log('🔕 Auth event listener unsubscribed, remaining listeners:', this.listeners.length);
    };
  }

  /**
   * Emit an auth event to all listeners
   * @param event - Type of auth event
   * @param message - Optional message with details
   */
  emit(event: AuthEventType, message?: string): void {
    console.log(`📢 Auth event emitted: ${event}`, message || '');
    this.listeners.forEach(listener => {
      try {
        listener(event, message);
      } catch (error) {
        console.error('❌ Error in auth event listener:', error);
      }
    });
  }

  /**
   * Emit session expired event - used when token refresh fails
   * Debounced to prevent multiple alerts from simultaneous API failures
   */
  emitSessionExpired(reason?: string): void {
    const now = Date.now();
    
    // Debounce: skip if we just emitted a session expired event
    if (now - this.lastSessionExpiredTime < this.sessionExpiredDebounceMs) {
      console.log('⏳ Session expired event debounced (already emitted recently)');
      return;
    }
    
    this.lastSessionExpiredTime = now;
    this.emit('sessionExpired', reason || 'Your session has expired. Please log in again.');
  }

  /**
   * Emit logged out event - used when user explicitly logs out
   */
  emitLoggedOut(): void {
    this.emit('loggedOut', 'You have been logged out.');
  }

  /**
   * Emit login required event - used when accessing protected resource without auth
   */
  emitLoginRequired(): void {
    this.emit('loginRequired', 'Please log in to continue.');
  }
}

// Export singleton instance
const authEvents = new AuthEventEmitter();
export default authEvents;

