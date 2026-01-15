// backend/src/services/email.service.js
const nodemailer = require('nodemailer');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

class EmailService {
  constructor() {
    // SMTP transporter for sending emails
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // IMAP configuration for receiving emails
    this.imapConfig = {
      imap: {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASSWORD,
        host: process.env.IMAP_HOST,
        port: parseInt(process.env.IMAP_PORT) || 993,
        tls: true,
        tlsOptions: { 
          rejectUnauthorized: false,
          servername: process.env.IMAP_HOST
        },
        authTimeout: 10000,
        connTimeout: 10000
      },
    };
  }

  // Send RFP to vendor
  async sendRFP(vendorEmail, vendorName, rfpData) {
    try {
      const emailBody = this.formatRFPEmail(rfpData);
      
      const mailOptions = {
        from: process.env.APP_EMAIL,
        to: vendorEmail,
        subject: `RFP: ${rfpData.title} - Response Required`,
        html: emailBody,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ RFP sent to ${vendorEmail}:`, info.messageId);
      
      return {
        success: true,
        messageId: info.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ Error sending RFP email:', error);
      throw new Error(`Failed to send email to ${vendorEmail}: ${error.message}`);
    }
  }

  // Format RFP into HTML email
  formatRFPEmail(rfpData) {
    const items = rfpData.requirements.items || [];
    const itemsHtml = items.map(item => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.specifications}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 5px; }
          .content { background-color: #f9fafb; padding: 20px; margin-top: 20px; border-radius: 5px; }
          .section { margin-bottom: 20px; }
          .label { font-weight: bold; color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th { background-color: #e5e7eb; padding: 10px; text-align: left; border: 1px solid #ddd; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Request for Proposal (RFP)</h1>
            <p>${rfpData.title}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <p class="label">Description:</p>
              <p>${rfpData.description}</p>
            </div>

            <div class="section">
              <p class="label">Required Items:</p>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Specifications</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            ${rfpData.budget ? `
            <div class="section">
              <p class="label">Budget:</p>
              <p>$${parseFloat(rfpData.budget).toLocaleString()}</p>
            </div>
            ` : ''}

            ${rfpData.delivery_deadline ? `
            <div class="section">
              <p class="label">Delivery Deadline:</p>
              <p>${new Date(rfpData.delivery_deadline).toLocaleDateString()}</p>
            </div>
            ` : ''}

            ${rfpData.payment_terms ? `
            <div class="section">
              <p class="label">Payment Terms:</p>
              <p>${rfpData.payment_terms}</p>
            </div>
            ` : ''}

            ${rfpData.warranty_terms ? `
            <div class="section">
              <p class="label">Warranty Requirements:</p>
              <p>${rfpData.warranty_terms}</p>
            </div>
            ` : ''}
          </div>

          <div class="footer">
            <p><strong>How to Respond:</strong></p>
            <p>Please reply to this email with your proposal including:</p>
            <ul>
              <li>Detailed pricing for each item</li>
              <li>Total cost</li>
              <li>Delivery timeline</li>
              <li>Warranty terms</li>
              <li>Payment terms</li>
              <li>Any additional information or alternatives you recommend</li>
            </ul>
            <p>We look forward to your proposal.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Check for new vendor responses (OPTIMIZED - only checks last 10 emails)
  async checkForResponses(rfpId) {
    let connection;
    try {
      console.log('📧 Connecting to IMAP...');

      connection = await imaps.connect(this.imapConfig);
      console.log('✅ Connected');
      
      await connection.openBox('INBOX');
      console.log('✅ INBOX opened');

      // Only search for recent unread emails to avoid timeout
      console.log('🔍 Searching for recent emails...');
      
      // Search for emails from the last 2 days only
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const sinceDate = twoDaysAgo.getDate() + '-' + months[twoDaysAgo.getMonth()] + '-' + twoDaysAgo.getFullYear();
      
      const searchCriteriaArray = [['SINCE', sinceDate]];
      
      const messages = await connection.search(searchCriteriaArray, {
        bodies: [''],  // Fetch entire message
        struct: true
      });

      console.log(`📬 Found ${messages.length} recent messages`);

      // Only process last 10 emails to avoid timeout
      const recentMessages = messages.slice(-10);
      console.log(`📨 Processing last ${recentMessages.length} emails...`);

      const emails = [];
      
      for (const item of recentMessages) {
        try {
          // Get the full email body
          const all = item.parts.find(part => part.which === '');
          
          if (all && all.body) {
            const mail = await simpleParser(all.body);
            
            // Extract sender email properly
            let senderEmail = 'unknown';
            let senderName = 'Unknown';
            
            if (mail.from && mail.from.value && mail.from.value.length > 0) {
              senderEmail = mail.from.value[0].address || 'unknown';
              senderName = mail.from.value[0].name || senderEmail;
            }
            
            console.log(`📧 Parsed email from: ${senderName} <${senderEmail}>`);
            
            // Get email body text
            let bodyText = '';
            if (mail.text) {
              bodyText = mail.text;
            } else if (mail.html) {
              // Strip HTML tags if only HTML is available
              bodyText = mail.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            }
            
            emails.push({
              subject: mail.subject || 'No Subject',
              from: senderEmail.toLowerCase().trim(),
              fromName: senderName,
              body: bodyText,
              date: mail.date || new Date(),
              messageId: mail.messageId || `msg-${Date.now()}`,
            });
          }
        } catch (parseError) {
          console.error('⚠️ Error parsing email:', parseError.message);
          continue;
        }
      }

      connection.end();
      console.log(`✅ Successfully processed ${emails.length} emails`);
      return emails;

    } catch (error) {
      if (connection) {
        try {
          connection.end();
        } catch (endError) {
          // Ignore
        }
      }
      
      console.error('❌ IMAP Error:', error.message);
      
      // Return empty array instead of throwing
      return [];
    }
  }
}

module.exports = new EmailService();