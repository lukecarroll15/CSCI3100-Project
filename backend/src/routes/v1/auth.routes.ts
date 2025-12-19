import { Router } from 'express';
import { handleLogout, handleRequestOtp, handleVerifyOtp } from '../../controllers/auth.controller';

export const authRouter = Router();

authRouter.post('/request-otp', handleRequestOtp);
authRouter.post('/verify-otp', handleVerifyOtp);
authRouter.post('/logout', handleLogout);
