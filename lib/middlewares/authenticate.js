function authenticate(req, res, next) {
  if (!req.jwt) {
    return res.status(403).json({
      status: 'fail',
      meta: {
        message: 'No token was provided.',
      },
      data: null,
    });
  }

  next();
}

module.exports = authenticate;
