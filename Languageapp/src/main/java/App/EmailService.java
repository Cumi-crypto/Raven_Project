package App;

import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import java.util.Properties;
import java.io.InputStream;
import java.io.FileInputStream;
import java.io.File;

public class EmailService {
    
    // Default SMTP settings
    private static final String SMTP_HOST = "smtp.gmail.com";
    private static final String SMTP_PORT = "587";
    
    private static String senderEmail = null;
    private static String senderPassword = null;

    static {
        // Load credentials from config.properties
        try {
            Properties config = new Properties();
            File configFile = new File("config.properties");
            if (configFile.exists()) {
                try (InputStream is = new FileInputStream(configFile)) {
                    config.load(is);
                    senderEmail = config.getProperty("smtp.email", "youremail@gmail.com");
                    senderPassword = config.getProperty("smtp.password", "your-app-password");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void sendOtpEmail(String recipientEmail, String otp) {
        if (senderEmail == null || senderEmail.contains("youremail@gmail.com")) {
            System.err.println("[EmailService] Error: Sender email not configured in config.properties!");
            System.out.println("[EmailService - SIMULATED] Sending OTP " + otp + " to " + recipientEmail);
            return;
        }

        Properties prop = new Properties();
        prop.put("mail.smtp.host", SMTP_HOST);
        prop.put("mail.smtp.port", SMTP_PORT);
        prop.put("mail.smtp.auth", "true");
        prop.put("mail.smtp.starttls.enable", "true"); //TLS
        
        Session session = Session.getInstance(prop,
            new javax.mail.Authenticator() {
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(senderEmail, senderPassword);
                }
            });

        try {
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(senderEmail));
            message.setRecipients(
                Message.RecipientType.TO,
                InternetAddress.parse(recipientEmail)
            );
            message.setSubject("Lexify - Password Reset OTP");
            
            String htmlContent = "<h2>Password Reset</h2>" +
                                 "<p>Your OTP code to reset your password is: <b style='font-size: 24px; color: #FF6B35;'>" + otp + "</b></p>" +
                                 "<p>This code will expire in 10 minutes.</p>" +
                                 "<p>If you didn't request this, you can ignore this email.</p>";
            
            message.setContent(htmlContent, "text/html; charset=utf-8");

            System.out.println("Attempting to send OTP email to " + recipientEmail + "...");
            Transport.send(message);
            System.out.println("Email sent successfully!");

        } catch (MessagingException e) {
            System.err.println("Failed to send OTP email to " + recipientEmail);
            e.printStackTrace();
        }
    }

    public static void sendVerificationEmail(String recipientEmail, String otp) {
        if (senderEmail == null || senderEmail.contains("youremail@gmail.com")) {
            System.err.println("[EmailService] Error: Sender email not configured in config.properties!");
            System.out.println("[EmailService - SIMULATED] Sending Verification OTP " + otp + " to " + recipientEmail);
            return;
        }

        Properties prop = new Properties();
        prop.put("mail.smtp.host", SMTP_HOST);
        prop.put("mail.smtp.port", SMTP_PORT);
        prop.put("mail.smtp.auth", "true");
        prop.put("mail.smtp.starttls.enable", "true"); //TLS
        
        Session session = Session.getInstance(prop,
            new javax.mail.Authenticator() {
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(senderEmail, senderPassword);
                }
            });

        try {
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(senderEmail));
            message.setRecipients(
                Message.RecipientType.TO,
                InternetAddress.parse(recipientEmail)
            );
            message.setSubject("Lexify - Email Verification");
            
            String htmlContent = "<h2>Verify Your Email</h2>" +
                                 "<p>Your OTP code to verify your email is: <b style='font-size: 24px; color: #32CD32;'>" + otp + "</b></p>" +
                                 "<p>Please enter this code on your profile page.</p>" +
                                 "<p>This code will expire in 10 minutes.</p>";
            
            message.setContent(htmlContent, "text/html; charset=utf-8");

            System.out.println("Attempting to send Verification email to " + recipientEmail + "...");
            Transport.send(message);
            System.out.println("Email sent successfully!");

        } catch (MessagingException e) {
            System.err.println("Failed to send Verification email to " + recipientEmail);
            e.printStackTrace();
        }
    }
}
