import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { generateVerificationToken, generateTokenExpiry } from "@shared/auth-utils";
import { generateVerificationEmail, sendEmail } from "@shared/email-utils";

// Create a router
const router = Router();

/**
 * Middleware to check if a user is authenticated
 */
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

/**
 * Route to request email verification
 * POST /api/auth/verify-email/request
 */
router.post("/verify-email/request", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Generate verification token and expiry
    const verificationToken = generateVerificationToken();
    const tokenExpiry = generateTokenExpiry(24); // 24 hours

    // Update user with verification details
    await storage.updateUser(user.id, {
      verificationToken,
      verificationTokenExpiry: tokenExpiry,
    });

    // Get the base URL from request or environment
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const verificationUrl = `${baseUrl}/verify-email`;

    // Generate and send verification email
    const email = user.email;
    if (!email) {
      return res.status(400).json({ error: "User has no email address" });
    }

    const emailContent = generateVerificationEmail(
      user.username,
      verificationToken,
      verificationUrl
    );

    // Send email - this is a mock implementation
    // In a production system, use a real email service
    const emailResult = await sendEmail(
      email,
      emailContent.subject,
      emailContent.html,
      emailContent.text
    );

    if (!emailResult.success) {
      return res.status(500).json({ error: emailResult.message || "Failed to send verification email" });
    }

    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Error requesting email verification:", error);
    res.status(500).json({ error: "Internal server error" });
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
    const user = users.find(u => u.verificationToken === token);

    if (!user) {
      return res.status(404).json({ error: "Invalid verification token" });
    }

    // Check if token has expired
    const now = new Date();
    const expiry = user.verificationTokenExpiry ? new Date(user.verificationTokenExpiry) : null;
    
    if (!expiry || now > expiry) {
      return res.status(400).json({ error: "Verification token has expired" });
    }

    // Update user to mark email as verified
    await storage.updateUser(user.id, {
      isEmailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    });

    // Respond with success
    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ error: "Internal server error" });
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
    const user = users.find(u => u.email === email);

    // For security reasons, don't reveal if user exists
    if (!user) {
      return res.status(200).json({ message: "If your email is registered, you'll receive reset instructions" });
    }

    // Generate reset token and expiry
    const resetToken = generateVerificationToken();
    const tokenExpiry = generateTokenExpiry(1); // 1 hour

    // Update user with reset token
    await storage.updateUser(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordTokenExpiry: tokenExpiry
    });

    // Get the base URL from request or environment
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${baseUrl}/reset-password`;

    // Generate and send password reset email
    const emailContent = {
      subject: "Reset your password",
      html: `
        <div>
          <h2>Password Reset Request</h2>
          <p>Hi ${user.username},</p>
          <p>We received a request to reset your password. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}?token=${resetToken}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hi ${user.username},
        
        We received a request to reset your password. Click the link below to set a new password:
        
        ${resetUrl}?token=${resetToken}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, you can safely ignore this email.
      `
    };

    // Send email - this is a mock implementation
    // In a production system, use a real email service
    sendEmail(email, emailContent.subject, emailContent.html, emailContent.text);

    res.status(200).json({ message: "If your email is registered, you'll receive reset instructions" });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Route to reset password with token
 * POST /api/auth/reset-password
 */
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    // Find user with this reset token
    const users = await storage.getAllUsers();
    const user = users.find(u => u.resetPasswordToken === token);

    if (!user) {
      return res.status(404).json({ error: "Invalid reset token" });
    }

    // Check if token has expired
    const now = new Date();
    const expiry = user.resetPasswordTokenExpiry ? new Date(user.resetPasswordTokenExpiry) : null;
    
    if (!expiry || now > expiry) {
      return res.status(400).json({ error: "Reset token has expired" });
    }

    // Update user with new password and remove reset token
    const hashedPassword = await import("@shared/auth-utils").then(
      ({ hashPassword }) => hashPassword(newPassword)
    );

    await storage.updateUser(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordTokenExpiry: null,
    });

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;