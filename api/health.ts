export default function handler(_req: any, res: any) {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', serverless: true }));
}
