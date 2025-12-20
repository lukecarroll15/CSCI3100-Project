import { Router } from 'express';
import {
  handleGithubCallback,
  handleGithubStart,
  handleLogout,
  handleRequestOtp,
  handleVerifyOtp,
} from '../../controllers/auth.controller';

export const authRouter = Router();

// OTP
authRouter.post('/request-otp', handleRequestOtp);
authRouter.post('/verify-otp', handleVerifyOtp);
authRouter.post('/logout', handleLogout);

// GitHub OAuth (optional)
authRouter.get('/github', handleGithubStart);
authRouter.get('/github/callback', handleGithubCallback);
