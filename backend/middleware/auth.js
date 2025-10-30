const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cookieToken = req.cookies && (req.cookies.st_jwt || req.cookies.jwt);
    const token = bearer || cookieToken;
    if (!token) return res.status(401).json({ error: 'Missing Authorization token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key_change_me');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}


