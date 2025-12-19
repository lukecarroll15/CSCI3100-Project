import { Router } from 'express';
import { postRequestOtp, postVerifyOtp, postLogout } from '../../controllers/auth.controller';

export const authRouter = Router();

authRouter.post('/request-otp', postRequestOtp);
authRouter.post('/verify-otp', postVerifyOtp);
authRouter.post('/logout', postLogout);
