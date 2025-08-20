import 'dotenv/config';
import App from './app';

const port = Number(process.env.PORT) || 4000;

const app = new App();
app.start(port);
