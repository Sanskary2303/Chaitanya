// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

try {
  if (process.env.OTEL_ENABLED == 'true') {
    require('@godspeedsystems/tracing').initialize();
  }
} catch (error) {
  console.error(
    'OTEL_ENABLED is set, unable to initialize opentelemetry tracing.',
  );
  console.error(error);
  process.exit(1);
}

import Godspeed from '@godspeedsystems/core';
import { initializeAuth } from './helper/auth';

// create a godspeed
const gsApp = new Godspeed();

// Initialize authentication system
initializeAuth(gsApp.config);

// initilize the Godspeed App
// this is responsible to load all kind of entities
gsApp.initialize();
