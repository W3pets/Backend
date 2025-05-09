import jwt from "jsonwebtoken";

export const generateToken = (user, type) => {
  const secret = type === "access" 
    ? process.env.JWT_ACCESS_SECRET 
    : type === "refresh" 
      ? process.env.JWT_REFRESH_SECRET 
      : type === "verification"
        ? process.env.JWT_VERIFICATION_SECRET
        : process.env.JWT_RESET_SECRET;

  const expiresIn = type === "access" 
    ? "15m" 
    : type === "refresh" 
      ? "7d" 
      : type === "verification"
        ? "24h"
        : "1h";

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
}; 