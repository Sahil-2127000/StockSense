const sendSuccess = (res, data = null, statusCode = 200, meta = undefined) => {
  const responsePayload = {
    success: true,
    data,
  };

  if (meta !== undefined) {
    responsePayload.meta = meta;
  }

  return res.status(statusCode).json(responsePayload);
};

export { sendSuccess };
export default sendSuccess;
