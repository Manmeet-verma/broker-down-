export const notFound = (req, res) =>
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });

export const errorHandler = (err, req, res, _next) => {
  console.error('[API ERROR]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Max size allowed: 5MB' });
  }
  if (err.message && err.message.startsWith('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
};