import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = {};
    this.initialize();
  }

  initialize() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.registerTemplates();
  }

  registerTemplates() {
    this.templates.taskAssigned = handlebars.compile(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">Task Assigned to You</h2>
        <p>Hi {{assigneeName}},</p>
        <p><strong>{{assignerName}}</strong> has assigned you a new task:</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #1F2937;">{{taskTitle}}</h3>
          <p style="margin: 0; color: #6B7280;">{{taskDescription}}</p>
          {{#if dueDate}}<p style="margin: 8px 0 0 0; color: #6B7280;">Due: {{dueDate}}</p>{{/if}}
        </div>
        <a href="{{taskUrl}}" style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Task</a>
      </div>
    `);

    this.templates.commentMention = handlebars.compile(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">You were mentioned in a comment</h2>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{authorName}}</strong> mentioned you in a comment on <strong>{{taskTitle}}</strong>:</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #7C3AED;">
          <p style="margin: 0; color: #1F2937;">{{commentContent}}</p>
        </div>
        <a href="{{taskUrl}}" style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Comment</a>
      </div>
    `);

    this.templates.roleChanged = handlebars.compile(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">Your Role Has Been Updated</h2>
        <p>Hi {{userName}},</p>
        <p>Your role has been changed by <strong>{{changedByName}}</strong>.</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Previous Role:</strong> {{previousRole}}</p>
          <p style="margin: 8px 0 0 0;"><strong>New Role:</strong> {{newRole}}</p>
          {{#if reason}}<p style="margin: 8px 0 0 0;"><strong>Reason:</strong> {{reason}}</p>{{/if}}
        </div>
        {{#if handoverRequired}}
        <p style="color: #DC2626;">A handover process has been initiated. Please complete your handover tasks.</p>
        {{/if}}
        <a href="{{dashboardUrl}}" style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
      </div>
    `);

    this.templates.promotion = handlebars.compile(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Congratulations on Your Promotion!</h2>
        <p>Hi {{userName}},</p>
        <p>We're excited to announce that you have been promoted!</p>
        <div style="background: #ECFDF5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10B981;">
          <p style="margin: 0;"><strong>Previous Role:</strong> {{previousRole}}</p>
          <p style="margin: 8px 0 0 0;"><strong>New Role:</strong> {{newRole}}</p>
          <p style="margin: 8px 0 0 0;"><strong>Effective Date:</strong> {{effectiveDate}}</p>
        </div>
        <p>Your new permissions and access have been updated accordingly.</p>
        <a href="{{dashboardUrl}}" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Your Dashboard</a>
      </div>
    `);

    this.templates.handoverRequired = handlebars.compile(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">Handover Required</h2>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{fromUserName}}</strong> has initiated a handover to you as part of their role change.</p>
        <div style="background: #FFFBEB; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #F59E0B;">
          <h4 style="margin: 0 0 8px 0;">Tasks to be handed over:</h4>
          {{#each tasks}}
          <p style="margin: 4px 0;">• {{this.description}}</p>
          {{/each}}
        </div>
        <a href="{{handoverUrl}}" style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review Handover</a>
      </div>
    `);

    this.templates.dueDateReminder = handlebars.compile(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Task Due Soon</h2>
        <p>Hi {{userName}},</p>
        <p>This is a reminder that the following task is due {{dueSoon}}:</p>
        <div style="background: #FEF2F2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #EF4444;">
          <h3 style="margin: 0 0 8px 0; color: #1F2937;">{{taskTitle}}</h3>
          <p style="margin: 0; color: #6B7280;">Due: {{dueDate}}</p>
        </div>
        <a href="{{taskUrl}}" style="display: inline-block; background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Task</a>
      </div>
    `);

    this.templates.workspaceInvite = handlebars.compile(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">You've Been Invited!</h2>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{inviterName}}</strong> has invited you to join the workspace <strong>{{workspaceName}}</strong>.</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;">Role: <strong>{{role}}</strong></p>
        </div>
        <a href="{{inviteUrl}}" style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a>
        <p style="color: #6B7280; font-size: 12px; margin-top: 16px;">This invitation expires on {{expiresAt}}</p>
      </div>
    `);

    this.templates.teamMessage = handlebars.compile(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">New Message in {{channelName}}</h2>
        <p>Hi {{recipientName}},</p>
        <p><strong>{{senderName}}</strong> sent a message:</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;">{{messageContent}}</p>
        </div>
        <a href="{{channelUrl}}" style="display: inline-block; background: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Conversation</a>
      </div>
    `);
  }

  async send(options) {
    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Project Management'}" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html || options.body
      };

      if (options.cc) mailOptions.cc = options.cc;
      if (options.bcc) mailOptions.bcc = options.bcc;
      if (options.attachments) mailOptions.attachments = options.attachments;

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${options.to}: ${options.subject}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error(`Email failed to ${options.to}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendTemplate(templateName, to, data) {
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const html = template(data);
    const subjectMap = {
      taskAssigned: `New Task Assigned: ${data.taskTitle}`,
      commentMention: `You were mentioned in ${data.taskTitle}`,
      roleChanged: 'Your Role Has Been Updated',
      promotion: 'Congratulations on Your Promotion!',
      handoverRequired: 'Handover Required - Action Needed',
      dueDateReminder: `Task Due Soon: ${data.taskTitle}`,
      workspaceInvite: `You've been invited to ${data.workspaceName}`,
      teamMessage: `New message in ${data.channelName}`
    };

    return this.send({
      to,
      subject: subjectMap[templateName] || 'Notification',
      html
    });
  }

  async sendBulk(emails) {
    const results = await Promise.allSettled(
      emails.map(email => this.send(email))
    );
    return results.map((result, index) => ({
      to: emails[index].to,
      success: result.status === 'fulfilled' && result.value.success,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }
}

const emailService = new EmailService();
export default emailService;
