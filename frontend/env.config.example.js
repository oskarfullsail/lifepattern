/**
 * Environment Configuration Example
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this file: cp env.config.example.js env.config.js
 * 2. Edit env.config.js for your environment needs
 * 3. Never commit env.config.js (it's in .gitignore)
 *
 * This file provides environment-specific configuration for the app.
 * The actual env.config.js is gitignored to allow each developer
 * to have their own local configuration.
 */

module.exports = {
  /**
   * FORCE_ENV: Force a specific environment
   *
   * Options:
   * - 'auto': Automatic detection based on hostname/platform
   * - 'development': Force development mode (localhost backend)
   * - 'production': Force production mode (Render backend)
   *
   * For local development with Docker: use 'development'
   * For testing with production backend: use 'production'
   * For Firebase deployment: use 'auto'
   */
  FORCE_ENV: 'auto',

  /**
   * BACKEND_URLS: Backend API URLs for each environment
   *
   * development: Local Docker backend
   * production: Deployed backend on Render
   * staging: Staging environment (if you have one)
   */
  BACKEND_URLS: {
    development: 'http://localhost:8080',
    production: 'https://lifepattern-backend.onrender.com',
    staging: 'https://lifepattern-backend-staging.onrender.com', // Optional
  },

  /**
   * API_TIMEOUTS: Request timeout values in milliseconds
   *
   * development: Shorter timeout for local testing
   * production: Longer timeout to account for Render cold starts
   * staging: Medium timeout
   */
  API_TIMEOUTS: {
    development: 15000,  // 15 seconds
    production: 60000,   // 60 seconds (handles Render cold starts)
    staging: 20000,      // 20 seconds
  }
};
