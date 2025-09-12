import 'dotenv/config';
import App from './app';

// Create the Express application instance without starting a listener.
// Vercel detects the exported Express app and wraps it as a serverless function.
const application = new App().getApp();

export { application as app };
export default application;


