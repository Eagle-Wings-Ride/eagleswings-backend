
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
      errors: [
        {
          error: `Can't find ${req.originalUrl} on this server`,
        },
      ],
    })
}

module.exports = notFoundHandler