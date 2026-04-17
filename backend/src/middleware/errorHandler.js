export default function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  res.status(status).json({ success: false, error: { code, message: err.message || '服务器内部错误' } });
}
