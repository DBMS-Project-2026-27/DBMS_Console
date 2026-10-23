import 'dotenv/config';
import { pool } from './db.js';
import { createApp } from './app.js';

const port = process.env.PORT || 3001;
createApp(pool).listen(port, () => console.log(`SQL Console API listening on http://localhost:${port}`));
