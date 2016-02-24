let role = null;

function middleware(req, res, next) {
  if (req.jwt.role === role) {
    next();
  } else {
    return res.status(403).json({
      status: 'fail',
      meta: {
        message: 'You are not authorised.',
      },
      data: null,
    });
  }
}

function authorise(authLevel = 'admin') {
  role = authLevel;
  return middleware;
}

module.exports = authorise;
