import { db } from "../helpers/db.js";
import { generateOtp } from '../helpers/auth.js';


const generateEmailVerificationToken = async ({ email }) => {
    try {
        // Generate and hash the OTP
        const otp = generateOtp();
        const expirationTime = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes from creation
    
        const existingToken = await db.emailVerificationToken.findFirst({ where: { email } });
        if(!existingToken) return null;
        
        const savedToken = await db.emailVerificationToken.upsert({
            where: { id: existingToken?.id },
            update: { 
                otp,
                expiresAt: expirationTime 
            },
            create: {
                email, otp,
                createdAt: new Date(),
                expiresAt: expirationTime 
            }
        });
        
        return savedToken;
    } catch (error) {
        return null;
    }
}

const getEmailVerificationToken = async ({ email }) => {
    // Fetch the latest OTP record for the email
    try {
        return await db.verificationToken.findFirst({
            where: {
                email: email,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    } catch (error) {
        return null;
    }
}

const deleteEmailVerificationToken = async ({ email }) => {
    try {
        return await db.emailVerificationToken.deleteMany({ where: { email } });
    } catch (error) {
        return null;
    }
}


export {
    generateEmailVerificationToken,
    getEmailVerificationToken,
    deleteEmailVerificationToken
}