const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        message: "Unauthorized"
      })
    }

    const role = String(req.user.role).toUpperCase()
    const allowed = allowedRoles.map(r => String(r).toUpperCase())

    if (!allowed.includes(role)) {
      return res.status(403).json({
        message: "Forbidden"
      })
    }

    next()
  }
}

module.exports = roleMiddleware
