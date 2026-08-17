import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../apps/api/src/server.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await handleRequest(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Serverless Error';
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'SERVERLESS_CRASH', message, stack: error instanceof Error ? error.stack : undefined }));
  }
}
