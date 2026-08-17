package com.mathrace.service;

import com.mathrace.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@mathrace.local}")
    private String mailFrom;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public void sendPasswordResetEmail(String email, String resetLink) {
        if (mailUsername.isBlank() || mailPassword.isBlank()) {
            throw new ApiException("EMAIL_NOT_CONFIGURED", "חסרות הגדרות Gmail SMTP");
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(email);
            message.setSubject("איפוס סיסמה - מרוץ חשבון");
            message.setText("""
                שלום,

                קיבלנו בקשה לאיפוס הסיסמה שלך במערכת מרוץ חשבון.

                לאיפוס הסיסמה לחצו על הקישור:
                %s

                הקישור תקף ל-30 דקות בלבד וניתן להשתמש בו פעם אחת.

                אם לא ביקשת איפוס סיסמה, אפשר להתעלם מהמייל.
                """.formatted(resetLink));
            mailSender.send(message);
        } catch (MailException ex) {
            throw new ApiException("EMAIL_SEND_FAILED", "שליחת המייל נכשלה");
        }
    }
}
