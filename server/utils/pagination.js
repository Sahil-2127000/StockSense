const getPagination = (query = {}) => {
  const parsedPage = parseInt(query?.page, 10);
  const page = !Number.isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const parsedLimit = parseInt(query?.limit, 10);
  const requestedLimit = !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
  const limit = Math.min(100, Math.max(1, requestedLimit));

  const skip = (page - 1) * limit;
  const take = limit;

  return {
    skip,
    take,
    page,
    limit,
  };
};

const buildMeta = (total, page, limit) => {
  const safeTotal = typeof total === 'number' && total >= 0 ? total : 0;
  const safeLimit = typeof limit === 'number' && limit > 0 ? limit : 20;
  const safePage = typeof page === 'number' && page > 0 ? page : 1;
  const totalPages = Math.ceil(safeTotal / safeLimit);

  return {
    total: safeTotal,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
};

export { getPagination, buildMeta };
export default {
  getPagination,
  buildMeta,
};
