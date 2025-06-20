import jwt from 'jsonwebtoken';
import { db } from './db.js';

export const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const loginRequired = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).send('Access denied. No token provided.');

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    if (!token) return res.status(401).send('Access denied. Token is missing or malformed.');

    try {
        const verified = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = { verified, ...req.user };
        next();
    } catch (err) {
        res.status(400).send('Invalid token');
    }
};

export const preventLoggedUser = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return next();

    try {
        const verified = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = {verified, ...req.user};
        return res.status(401).send('Access denied');
    } catch (err) {
        res.status(400).send('Invalid token');
    }
}

export const sellerRequired = async (req, res, next) => {
    const userId = req.user.verified.id;
    
    try {
      const user = await db.user.findUnique({
        where: { id: userId }
      });
  
      if (!user.isSeller) {
        return res.status(403).json({ message: "Seller privileges required" });
      }
  
      next();
    } catch (error) {
      res.status(500).json({ message: "Error checking seller status" });
    }
  };