import User from "./auth.model.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/generateTokens.js";

export const registerUser = async (data) => {
  const hashed = await hashPassword(data.password);

  return User.create({
    email: data.email,
    password: hashed,
  });
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  return { accessToken, refreshToken };
};