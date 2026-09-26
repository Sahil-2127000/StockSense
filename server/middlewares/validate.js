import ApiError from '../utils/ApiError.js';

const validate = (schemas = {}) => {
  return (req, res, next) => {
    const targets = ['params', 'query', 'body'];
    const fieldErrors = [];

    req.validated = req.validated || {};

    for (const target of targets) {
      const schema = schemas[target];
      if (schema) {
        const result = schema.safeParse(req[target]);

        if (!result.success) {
          result.error.issues.forEach((issue) => {
            const field = issue.path.length > 0 ? issue.path.join('.') : target;
            fieldErrors.push({
              field,
              message: issue.message,
            });
          });
        } else {
          req.validated[target] = result.data;

          try {
            req[target] = result.data;
          } catch {
            // If Express 5 property has a getter only, req.validated contains parsed data
          }
        }
      }
    }

    if (fieldErrors.length > 0) {
      return next(new ApiError(400, 'Validation failed', fieldErrors));
    }

    return next();
  };
};

export { validate };
export default validate;
