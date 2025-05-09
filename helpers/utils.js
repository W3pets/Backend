import jwt from "jsonwebtoken";

export const generateOTP = (length = 6) => {
  const digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

export const generateToken = (user, type) => {
  const secret = type === "access" 
    ? process.env.JWT_ACCESS_SECRET 
    : type === "refresh" 
      ? process.env.JWT_REFRESH_SECRET 
      : process.env.JWT_RESET_SECRET;

  const expiresIn = type === "access" 
    ? "15m" 
    : type === "refresh" 
      ? "7d" 
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