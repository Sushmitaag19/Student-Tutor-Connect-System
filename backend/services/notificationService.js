const models = require('../models');
const emailService = require('./emailService');

class NotificationService {
  async createNotification(userId, type, title, message, relatedId = null, relatedType = null) {
    try {
      const notification = await models.Notification.create({
        user_id: userId,
        type,
        title,
        message,
        related_id: relatedId,
        related_type: relatedType
      });

      // Send email notification
      await this.sendEmailNotification(notification);

      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  async sendEmailNotification(notification) {
    try {
      const user = await models.User.findByPk(notification.user_id);
      if (!user) return;

      let emailResult = null;

      switch (notification.type) {
        case 'session_request':
          emailResult = await this.sendSessionRequestEmail(notification);
          break;
        case 'session_accepted':
          emailResult = await this.sendSessionAcceptedEmail(notification);
          break;
        case 'session_rejected':
          emailResult = await this.sendSessionRejectedEmail(notification);
          break;
        case 'new_answer':
          emailResult = await this.sendNewAnswerEmail(notification);
          break;
        case 'rating_received':
          emailResult = await this.sendRatingReceivedEmail(notification);
          break;
        case 'tutor_approved':
          emailResult = await this.sendTutorApprovalEmail(notification);
          break;
        case 'tutor_rejected':
          emailResult = await this.sendTutorRejectionEmail(notification);
          break;
        default:
          // Send generic email for other notification types
          emailResult = await emailService.sendEmail(
            user.email,
            notification.title,
            `<p>${notification.message}</p>`
          );
      }

      if (emailResult && emailResult.success) {
        await notification.update({ is_email_sent: true });
      }

      return emailResult;
    } catch (error) {
      console.error('Send email notification error:', error);
    }
  }

  async sendSessionRequestEmail(notification) {
    try {
      const session = await models.Session.findByPk(notification.related_id, {
        include: [
          { 
            model: models.Student, 
            as: 'student',
            include: [{ model: models.User, as: 'user' }]
          },
          { 
            model: models.Tutor, 
            as: 'tutor',
            include: [{ model: models.User, as: 'user' }]
          }
        ]
      });

      if (!session) return null;

      return await emailService.sendSessionRequestEmail(
        session.tutor.user,
        session.student.user,
        session
      );
    } catch (error) {
      console.error('Send session request email error:', error);
      return null;
    }
  }

  async sendSessionAcceptedEmail(notification) {
    try {
      const session = await models.Session.findByPk(notification.related_id, {
        include: [
          { 
            model: models.Student, 
            as: 'student',
            include: [{ model: models.User, as: 'user' }]
          },
          { 
            model: models.Tutor, 
            as: 'tutor',
            include: [{ model: models.User, as: 'user' }]
          }
        ]
      });

      if (!session) return null;

      return await emailService.sendSessionAcceptedEmail(
        session.student.user,
        session.tutor.user,
        session
      );
    } catch (error) {
      console.error('Send session accepted email error:', error);
      return null;
    }
  }

  async sendSessionRejectedEmail(notification) {
    try {
      const session = await models.Session.findByPk(notification.related_id, {
        include: [
          { 
            model: models.Student, 
            as: 'student',
            include: [{ model: models.User, as: 'user' }]
          },
          { 
            model: models.Tutor, 
            as: 'tutor',
            include: [{ model: models.User, as: 'user' }]
          }
        ]
      });

      if (!session) return null;

      return await emailService.sendSessionRejectedEmail(
        session.student.user,
        session.tutor.user,
        session,
        session.notes
      );
    } catch (error) {
      console.error('Send session rejected email error:', error);
      return null;
    }
  }

  async sendNewAnswerEmail(notification) {
    try {
      const answer = await models.Answer.findByPk(notification.related_id, {
        include: [
          { 
            model: models.Question, 
            as: 'question',
            include: [{ 
              model: models.Student, 
              as: 'student',
              include: [{ model: models.User, as: 'user' }]
            }]
          },
          { 
            model: models.Tutor, 
            as: 'tutor',
            include: [{ model: models.User, as: 'user' }]
          },
          { 
            model: models.Student, 
            as: 'student',
            include: [{ model: models.User, as: 'user' }]
          }
        ]
      });

      if (!answer || !answer.question) return null;

      const answerAuthor = answer.tutor ? answer.tutor.user : answer.student.user;
      return await emailService.sendNewAnswerEmail(
        answer.question.student.user,
        answerAuthor,
        answer.question,
        answer
      );
    } catch (error) {
      console.error('Send new answer email error:', error);
      return null;
    }
  }

  async sendRatingReceivedEmail(notification) {
    try {
      const rating = await models.Rating.findByPk(notification.related_id, {
        include: [
          { 
            model: models.Student, 
            as: 'student',
            include: [{ model: models.User, as: 'user' }]
          },
          { 
            model: models.Tutor, 
            as: 'tutor',
            include: [{ model: models.User, as: 'user' }]
          }
        ]
      });

      if (!rating) return null;

      return await emailService.sendRatingReceivedEmail(
        rating.tutor.user,
        rating.student.user,
        rating
      );
    } catch (error) {
      console.error('Send rating received email error:', error);
      return null;
    }
  }

  async sendTutorApprovalEmail(notification) {
    try {
      const user = await models.User.findByPk(notification.user_id);
      if (!user) return null;

      return await emailService.sendTutorApprovalEmail(user);
    } catch (error) {
      console.error('Send tutor approval email error:', error);
      return null;
    }
  }

  async sendTutorRejectionEmail(notification) {
    try {
      const user = await models.User.findByPk(notification.user_id);
      if (!user) return null;

      // Get rejection reason from verification record
      const verification = await models.TutorVerification.findOne({
        where: { tutor_id: notification.related_id }
      });

      const reason = verification ? verification.approval_notes : null;
      return await emailService.sendTutorRejectionEmail(user, reason);
    } catch (error) {
      console.error('Send tutor rejection email error:', error);
      return null;
    }
  }

  async sendBulkNotifications(userIds, type, title, message, relatedId = null, relatedType = null) {
    try {
      const notifications = [];
      
      for (const userId of userIds) {
        const notification = await this.createNotification(
          userId, 
          type, 
          title, 
          message, 
          relatedId, 
          relatedType
        );
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Send bulk notifications error:', error);
      throw error;
    }
  }

  async sendSystemAnnouncement(title, message, userRole = null) {
    try {
      const whereClause = {};
      if (userRole) {
        whereClause.role = userRole;
      }

      const users = await models.User.findAll({
        where: whereClause,
        attributes: ['user_id']
      });

      const userIds = users.map(user => user.user_id);
      
      return await this.sendBulkNotifications(
        userIds,
        'system_announcement',
        title,
        message
      );
    } catch (error) {
      console.error('Send system announcement error:', error);
      throw error;
    }
  }

  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await models.Notification.destroy({
        where: {
          created_at: {
            [models.Sequelize.Op.lt]: cutoffDate
          },
          is_read: true
        }
      });

      console.log(`Cleaned up ${deletedCount} old notifications`);
      return deletedCount;
    } catch (error) {
      console.error('Cleanup old notifications error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
