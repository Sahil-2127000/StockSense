import ApiError from '../utils/ApiError.js';
import config from '../config/env.js';

const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Something went wrong';
  let errors = null;

  // 1. Custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    if (err.errors && err.errors.length > 0) {
      errors = err.errors;
    }
  }
  // 2. Zod validation error
  else if (err.name === 'ZodError' || Array.isArray(err.issues)) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join('.') : 'root',
      message: issue.message,
    }));
  }
  // 3. Prisma P2002: Unique constraint failed
  else if (err.code === 'P2002') {
    statusCode = 409;
    const target = Array.isArray(err.meta?.target)
      ? err.meta.target.join(', ')
      : err.meta?.target || 'Field';
    message = `${target} already exists`;
  }
  // 4. Prisma P2025: Record not found
  else if (err.code === 'P2025') {
    statusCode = 404;
    message = (typeof err.meta?.cause === 'string' && err.meta.cause) || 'Record not found';
  }
  // 5. Prisma P2003: Foreign key constraint failed
  else if (err.code === 'P2003') {
    statusCode = 409;
    message = 'Record is in use';
  }
  // 6. Express body-parser invalid JSON syntax error
  else if (
    (err instanceof SyntaxError && err.status === 400 && 'body' in err) ||
    err.type === 'entity.parse.failed'
  ) {
    statusCode = 400;
    message = 'Invalid JSON body';
  }
  // 7. General server errors
  else {
    statusCode = err.statusCode || 500;
    if (statusCode < 500 && err.message) {
      message = err.message;
    } else {
      message = 'Something went wrong';
    }
  }

  // Always log unexpected or 500 server errors
  if (statusCode >= 500) {
    console.error('💥 Server Error:', err);
  }

  const responsePayload = {
    success: false,
    message,
    ...(err instanceof ApiError && err.code && { code: err.code }),
    ...(errors && { errors }),
    ...(config.NODE_ENV === 'development' && statusCode === 500 && err.stack && { stack: err.stack }),
  };

  return res.status(statusCode).json(responsePayload);
};

export { errorHandler };
export default errorHandler;
