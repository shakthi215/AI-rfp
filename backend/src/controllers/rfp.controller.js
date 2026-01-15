// backend/src/controllers/rfp.controller.js
const db = require('../config/database');
const aiService = require('../services/ai.service');
const emailService = require('../services/email.service');

class RFPController {
  // Create RFP from natural language
  async createRFP(req, res) {
    try {
      const { naturalLanguageInput } = req.body;

      if (!naturalLanguageInput) {
        return res.status(400).json({ error: 'Natural language input is required' });
      }

      // Use AI to parse natural language into structured RFP
      console.log('🤖 Parsing natural language input...');
      const parsedRFP = await aiService.parseNaturalLanguageRFP(naturalLanguageInput);

      // Insert into database
      const result = await db.query(
        `INSERT INTO rfps (title, description, requirements, budget, delivery_deadline, payment_terms, warranty_terms, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          parsedRFP.title,
          parsedRFP.description,
          JSON.stringify(parsedRFP.requirements),
          parsedRFP.budget,
          parsedRFP.delivery_deadline,
          parsedRFP.payment_terms,
          parsedRFP.warranty_terms,
          'draft'
        ]
      );

      console.log('✅ RFP created successfully');
      res.status(201).json({
        message: 'RFP created successfully',
        rfp: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Error creating RFP:', error);
      res.status(500).json({ error: 'Failed to create RFP', details: error.message });
    }
  }

  // Get all RFPs
  async getAllRFPs(req, res) {
    try {
      const result = await db.query(
        'SELECT * FROM rfps ORDER BY created_at DESC'
      );

      res.json({ rfps: result.rows });
    } catch (error) {
      console.error('❌ Error fetching RFPs:', error);
      res.status(500).json({ error: 'Failed to fetch RFPs' });
    }
  }

  // Get single RFP
  async getRFPById(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query('SELECT * FROM rfps WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'RFP not found' });
      }

      res.json({ rfp: result.rows[0] });
    } catch (error) {
      console.error('❌ Error fetching RFP:', error);
      res.status(500).json({ error: 'Failed to fetch RFP' });
    }
  }

  // Send RFP to vendors
  async sendRFPToVendors(req, res) {
    try {
      const { id } = req.params;
      const { vendorIds } = req.body;

      if (!vendorIds || vendorIds.length === 0) {
        return res.status(400).json({ error: 'At least one vendor must be selected' });
      }

      // Get RFP details
      const rfpResult = await db.query('SELECT * FROM rfps WHERE id = $1', [id]);
      if (rfpResult.rows.length === 0) {
        return res.status(404).json({ error: 'RFP not found' });
      }
      const rfp = rfpResult.rows[0];

      // Get vendor details
      const vendorsResult = await db.query(
        'SELECT * FROM vendors WHERE id = ANY($1)',
        [vendorIds]
      );

      const sendResults = [];

      // Send email to each vendor
      for (const vendor of vendorsResult.rows) {
        try {
          const emailResult = await emailService.sendRFP(
            vendor.email,
            vendor.name,
            rfp
          );

          // Record that RFP was sent to this vendor
          await db.query(
            `INSERT INTO rfp_vendors (rfp_id, vendor_id)
             VALUES ($1, $2)
             ON CONFLICT (rfp_id, vendor_id) DO NOTHING`,
            [id, vendor.id]
          );

          sendResults.push({
            vendor: vendor.name,
            email: vendor.email,
            status: 'sent',
            messageId: emailResult.messageId
          });
        } catch (error) {
          sendResults.push({
            vendor: vendor.name,
            email: vendor.email,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Update RFP status
      await db.query(
        'UPDATE rfps SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['sent', id]
      );

      console.log('✅ RFP sent to vendors');
      res.json({
        message: 'RFP sending process completed',
        results: sendResults
      });
    } catch (error) {
      console.error('❌ Error sending RFP:', error);
      res.status(500).json({ error: 'Failed to send RFP', details: error.message });
    }
  }

  // Get vendors for an RFP
  async getRFPVendors(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        `SELECT v.*, rv.sent_at 
         FROM vendors v
         JOIN rfp_vendors rv ON v.id = rv.vendor_id
         WHERE rv.rfp_id = $1`,
        [id]
      );

      res.json({ vendors: result.rows });
    } catch (error) {
      console.error('❌ Error fetching RFP vendors:', error);
      res.status(500).json({ error: 'Failed to fetch vendors' });
    }
  }
}

module.exports = new RFPController();