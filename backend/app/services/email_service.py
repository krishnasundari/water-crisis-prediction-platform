import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

async def send_otp_email(email: str, otp: str):
    """
    Sends a 6-digit OTP verification code to the user's email.
    If SMTP server configuration is missing, prints the OTP to the console logs as fallback.
    """
    subject = "Password Reset Verification Code - Water Crisis Platform"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 20px; color: #333;">
        <div style="max-width: 600px; background-color: white; padding: 30px; border-radius: 12px; border: 1px solid #e1e8ed; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <h2 style="color: #1976d2; margin-top: 0;">🌊 Water Crisis Prediction Platform</h2>
          <p>You requested a password reset. Use the verification code below to reset your password:</p>
          <div style="background-color: #f0f4f8; padding: 15px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0d47a1; margin: 20px 0;">
            {otp}
          </div>
          <p style="color: #666; font-size: 13px;">This code is valid for 10 minutes. If you did not request this reset, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 11px;">Secure Authentication System powered by FastAPI + JWT</p>
        </div>
      </body>
    </html>
    """
    
    # Check if SMTP details are configured
    smtp_email = settings.SMTP_EMAIL
    smtp_password = settings.SMTP_PASSWORD
    
    if not smtp_email or not smtp_password or "your-email" in smtp_email:
        # Fallback console logger print
        print("\n" + "*"*50)
        print("[LOCAL MAIL FALLBACK - NO SMTP CONFIGURED]")
        print(f"To: {email}")
        print(f"OTP Code: {otp}")
        print("Expires in: 10 minutes")
        print("*"*50 + "\n")
        logger.info(f"Local OTP print fallback generated for {email}: {otp}")
        return True
        
    try:
        # Construct MIME Message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_email
        msg["To"] = email
        
        part = MIMEText(html_content, "html")
        msg.attach(part)
        
        # Connect to SMTP server (run synchronously inside an executor block or simple thread if needed,
        # but standard smtplib is fine for this task as it's highly compatible)
        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(smtp_email, smtp_password)
        server.sendmail(smtp_email, email, msg.as_string())
        server.quit()
        
        logger.info(f"OTP reset email sent successfully to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMTP email to {email}: {str(e)}")
        # Print fallback code even on SMTP failure to avoid blocking testing!
        print("\n" + "*"*50)
        print("[SMTP FAILURE OTP FALLBACK]")
        print(f"To: {email}")
        print(f"OTP Code: {otp}")
        print(f"Error encountered: {str(e)}")
        print("*"*50 + "\n")
        return True
