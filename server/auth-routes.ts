/**
 * Authentication routes for the API
 */
import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { generateVerificationToken, generateTokenExpiry, comparePasswords, hashPassword } from "@shared/auth-utils";
import { isAuthenticated } from "./auth-middleware";
import { generateVerificationEmail, generatePasswordResetEmail, sendEmail } from "@shared/email-utils";

// Create a router
const router = Router();

/**
 * Route to request email verification
 * POST /api/auth/verify-email/request
 */
router.post("/verify-email/request", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get the user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a verification token
    const token = generateVerificationToken();
    const expires = generateTokenExpiry(24); // 24 hours

    // Store the token in the user record
    await storage.updateUser(userId, {
      verificationToken: token,
      verificationTokenExpires: expires
    });

    // Generate the verification link
    const baseUrl = `${req.protocol}://${req.get("host")}/verify-email`;
    
    // Generate and send verification email
    const emailContent = generateVerificationEmail(
      user.username,
      token,
      baseUrl
    );

    // Send the email (mock implementation)
    const emailResult = await sendEmail(
      user.email,
      emailContent.subject,
      emailContent.html,
      emailContent.text
    );

    if (!emailResult.success) {
      return res.status(500).json({ error: "Failed to send verification email", message: emailResult.message });
    }

    return res.status(200).json({ success: true, message: "Verification email sent" });
  } catch (error) {
    console.error("Email verification request error:", error);
    return res.status(500).json({ error: "Server error", message: "Failed to process verification request" });
  }
});

/**
 * Route to verify email with token
 * GET /api/auth/verify-email/:token
 */
router.get("/verify-email/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    // Find user with this verification token
    const users = await storage.getAllUsers();
    const user = users.find((u: any) => u.verificationToken === token);
    
    if (!user) {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    // Check if token is expired
    const now = new Date();
    if (user.verificationTokenExpires && new Date(user.verificationTokenExpires) < now) {
      return res.status(400).json({ error: "Verification token expired" });
    }

    // Update user as verified
    await storage.updateUser(user.id, {
      verified: true,
      verificationToken: null,
      verificationTokenExpires: null
    });

    return res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({ error: "Server error", message: "Failed to verify email" });
  }
});

/**
 * Route to request password reset
 * POST /api/auth/reset-password/request
 */
router.post("/reset-password/request", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user with this email
    const users = await storage.getAllUsers();
    const user = users.find((u: any) => u.email === email);
    
    // For security reasons, always return success even if user not found
    if (!user) {
      return res.status(200).json({ success: true, message: "Password reset email sent" });
    }

    // Generate a reset token
    const token = generateVerificationToken();
    const expires = generateTokenExpiry(1); // 1 hour

    // Store the token in the user record
    await storage.updateUser(user.id, {
      resetToken: token,
      resetTokenExpires: expires
    });

    // Generate the reset link
    const baseUrl = `${req.protocol}://${req.get("host")}/reset-password`;
    
    // Generate and send reset email
    const emailContent = generatePasswordResetEmail(
      user.username,
      token,
      baseUrl
    );

    // Send the email (mock implementation)
    const emailResult = await sendEmail(
      user.email,
      emailContent.subject,
      emailContent.html,
      emailContent.text
    );

    if (!emailResult.success) {
      return res.status(500).json({ error: "Failed to send password reset email", message: emailResult.message });
    }

    return res.status(200).json({ success: true, message: "Password reset email sent" });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({ error: "Server error", message: "Failed to process password reset request" });
  }
});

/**
 * Route to reset password with token
 * POST /api/auth/reset-password
 */
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    // Find user with this reset token
    const users = await storage.getAllUsers();
    const user = users.find((u: any) => u.resetToken === token);
    
    if (!user) {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    // Check if token is expired
    const now = new Date();
    if (user.resetTokenExpires && new Date(user.resetTokenExpires) < now) {
      return res.status(400).json({ error: "Reset token expired" });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user password and clear reset token
    await storage.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null
    });

    return res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ error: "Server error", message: "Failed to reset password" });
  }
});

export default router;