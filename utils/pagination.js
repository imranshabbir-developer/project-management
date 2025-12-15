/**
 * Cursor-based pagination helper
 * @param {Object} options - Pagination options
 * @param {string} options.cursor - Cursor for pagination (usually _id or createdAt)
 * @param {number} options.limit - Number of items per page
 * @param {string} options.sortField - Field to sort by (default: '_id')
 * @param {string} options.sortOrder - Sort order: 'asc' or 'desc' (default: 'desc')
 * @returns {Object} - Query object for MongoDB
 */
export const getCursorPaginationQuery = ({ cursor, limit = 10, sortField = '_id', sortOrder = 'desc' }) => {
  const query = {};
  const sort = {};

  // Set limit (max 100 items per page)
  const pageLimit = Math.min(parseInt(limit) || 10, 100);

  // Set sort order
  sort[sortField] = sortOrder === 'asc' ? 1 : -1;

  // If cursor is provided, add it to query
  if (cursor) {
    if (sortOrder === 'desc') {
      query[sortField] = { $lt: cursor };
    } else {
      query[sortField] = { $gt: cursor };
    }
  }

  return {
    query,
    sort,
    limit: pageLimit,
  };
};

/**
 * Format pagination response
 * @param {Array} data - Array of results
 * @param {number} limit - Limit used
 * @param {string} sortField - Field used for sorting
 * @returns {Object} - Formatted pagination response
 */
export const formatCursorPaginationResponse = (data, limit, sortField = '_id') => {
  const hasMore = data.length > limit;
  const results = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore && results.length > 0 ? results[results.length - 1][sortField].toString() : null;

  return {
    data: results,
    pagination: {
      hasMore,
      nextCursor,
      limit: parseInt(limit),
    },
  };
};

