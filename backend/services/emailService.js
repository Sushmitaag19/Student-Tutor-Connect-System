const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEmail(to, subject, html, text) {
    try {
      const mailOptions = {
        from: `"Student-Tutor Platform" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Student-Tutor Platform!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Welcome to Student-Tutor Platform!</h2>
        <p>Hello ${user.full_name},</p>
        <p>Welcome to our platform! We're excited to have you join our community.</p>
        <p>Your account has been created successfully with the role: <strong>${user.role}</strong></p>
        <p>You can now start exploring our features:</p>
        <ul>
          <li>Browse tutors and subjects</li>
          <li>Book sessions</li>
          <li>Ask questions in our Q&A forum</li>
          <li>Rate and review sessions</li>
        </ul>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>The Student-Tutor Team</p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  async sendSessionRequestEmail(tutor, student, session) {
    const subject = 'New Session Request - Student-Tutor Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">New Session Request</h2>
        <p>Hello ${tutor.full_name},</p>
        <p>You have received a new session request from ${student.full_name}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Session Details:</h3>
          <p><strong>Title:</strong> ${session.title}</p>
          <p><strong>Date & Time:</strong> ${new Date(session.scheduled_date).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${session.duration_minutes} minutes</p>
          <p><strong>Mode:</strong> ${session.mode}</p>
          ${session.description ? `<p><strong>Description:</strong> ${session.description}</p>` : ''}
        </div>
        <p>Please log in to your dashboard to accept or decline this request.</p>
        <p>Best regards,<br>The Student-Tutor Team</p>
      </div>
    `;

    return await this.sendEmail(tutor.email, subject, html);
  }

  async sendSessionAcceptedEmail(student, tutor, session) {
    const subject = 'Session Request Accepted - Student-Tutor Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Session Request Accepted!</h2>
        <p>Hello ${student.full_name},</p>
        <p>Great news! Your session request has been accepted by ${tutor.full_name}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Session Details:</h3>
          <p><strong>Title:</strong> ${session.title}</p>
          <p><strong>Date & Time:</strong> ${new Date(session.scheduled_date).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${session.duration_minutes} minutes</p>
          <p><strong>Mode:</strong> ${session.mode}</p>
          ${session.meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${session.meeting_link}">${session.meeting_link}</a></p>` : ''}
        </div>
        <p>Please make sure to attend the session on time. If you have any questions, contact your tutor.</p>
        <p>Best regards,<br>The Student-Tutor Team</p>
      </div>
    `;

    return await this.sendEmail(student.email, subject, html);
  }

  async sendSessionRejectedEmail(student, tutor, session, reason) {
    const subject = 'Session Request Update - Student-Tutor Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336;">Session Request Update</h2>
        <p>Hello ${student.full_name},</p>
        <p>Unfortunately, your session request has been declined by ${tutor.full_name}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Session Details:</h3>
          <p><strong>Title:</strong> ${session.title}</p>
          <p><strong>Date & Time:</strong> ${new Date(session.scheduled_date).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${session.duration_minutes} minutes</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p>Don't worry! You can browse other tutors and book a new session.</p>
        <p>Best regards,<br>The Student-Tutor Team</p>
      </div>
    `;

    return await this.sendEmail(student.email, subject, html);
  }

  async sendTutorApprovalEmail(tutor) {
    const subject = 'Tutor Verification Approved - Student-Tutor Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Congratulations! Your Tutor Verification is Approved</h2>
        <p>Hello ${tutor.full_name},</p>
        <p>Great news! Your tutor verification has been approved by our admin team.</p>
        <p>You can now:</p>
        <ul>
          <li>Accept session requests from students</li>
          <li>Answer questions in our Q&A forum</li>
          <li>Build your reputation through ratings</li>
          <li>Earn money by teaching students</li>
        </ul>
        <p>Welcome to our tutor community! We're excited to have you help students learn.</p>
        <p>Best regards,<br>The Student-Tutor Team</p>
      </div>
    `;

    return await this.sendEmail(tutor.email, subject, html);
  }

  async sendTutorRejectionEmail(tutor, reason) {
    const subject = 'Tutor Verification Update - Student-Tutor Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336;">Tutor Verification Update</h2>
        <p>Hello ${tutor.full_name},</p>
        <p>Unfortunately, your tutor verification has been rejected.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>You can:</p>
        <ul>
          <li>Review your qualifications and documents</li>
          <li>Retake the verification test if needed</li>
          <li>Contact our support team for assistance</li>
        </ul>
        <p>We encourage you to reapply once you've addressed the feedback.</p>
        <p>Best regards,<br>The Student-Tutor Team</p>
      </div>
    `;

    return await this.sendEmail(tutor.email, subject, html);
  }

  async sendNewAnswerEmail(questionOwner, answerAuthor, question, answer) {
    const subject = 'New Answer to Your Question - Student-Tutor Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">New Answer Received</h2>
        <p>Hello ${questionOwner.full_name},</p>
        <p>Your question has received a new answer from ${answerAuthor.full_name}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Question:</h3>
          <p><strong>${question.title}</strong></p>
          <h3>Answer:</h3>
          <p>${answer.content.substring(0, 200)}${answer.content.length > 200 ? '...' : ''}</p>
        </div>
        <p>Log in to view the full answer and mark it as helpful if it answers your question.</p>
        <p>Best regards,<br>The Student-Tutor Team</p>
      </div>
    `;

    return await this.sendEmail(questionOwner.email, subject, html);
  }

  async sendRatingReceivedEmail(tutor, student, rating) {
    const subject = 'New Rating Received - Student-Tutor Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF9800;">New Rating Received</h2>
        <p>Hello ${tutor.full_name},</p>
        <p>You received a ${rating.rating}-star rating from ${student.full_name}.</p>
        ${rating.feedback ? `
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Feedback:</h3>
            <p>"${rating.feedback}"</p>
          </div>
        ` : ''}
        <p>Keep up the great work! Your ratings help build trust with students.</p>
        <p>Best regards,<br>The Student-Tutor Team</p>
      </div>
    `;

    return await this.sendEmail(tutor.email, subject, html);
  }

  async sendPasswordResetEmail(user, resetToken) {
    const subject = 'Password Reset Request - Student-Tutor Platform';
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Password Reset Request</h2>
        <p>Hello ${user.full_name},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>The Student-Tutor Team</p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }
}

module.exports = new EmailService();
