// backend/src/controllers/proposal.controller.js
const db = require('../config/database');
const aiService = require('../services/ai.service');
const emailService = require('../services/email.service');

class ProposalController {
  // Check for new vendor responses and parse them
  async checkAndParseResponses(req, res) {
    try {
      const { rfpId } = req.params;

      // Get RFP details
      const rfpResult = await db.query('SELECT * FROM rfps WHERE id = $1', [rfpId]);
      if (rfpResult.rows.length === 0) {
        return res.status(404).json({ error: 'RFP not found' });
      }
      const rfp = rfpResult.rows[0];

      // Get vendors for this RFP
      const vendorsResult = await db.query(
        `SELECT v.* FROM vendors v
         JOIN rfp_vendors rv ON v.id = rv.vendor_id
         WHERE rv.rfp_id = $1`,
        [rfpId]
      );

      // Check for new emails with timeout
      console.log('📧 Checking for vendor responses...');
      let emails = [];
      
      try {
        // Add 30 second timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email check timeout after 30 seconds')), 30000)
        );
        
        emails = await Promise.race([
          emailService.checkForResponses(rfpId),
          timeoutPromise
        ]);
      } catch (emailError) {
        console.error('Email check failed:', emailError);
        return res.status(200).json({
          message: 'Email check timed out or failed. Please use manual proposal entry instead.',
          proposals: [],
          error: emailError.message,
          suggestion: 'Try the "Add Manually" button to add proposals directly'
        });
      }

      if (emails.length === 0) {
        return res.status(200).json({
          message: 'No new vendor responses found. You can add proposals manually using the "Manual Proposal" feature.',
          proposals: []
        });
      }

      const processedProposals = [];
      const errors = [];
      const skipped = [];

      for (const email of emails) {
        try {
          // Find matching vendor by email
          const vendor = vendorsResult.rows.find(v => 
            v.email.toLowerCase() === email.from.toLowerCase()
          );

          if (vendor) {
            // Check if proposal from this vendor already exists
            const existingProposal = await db.query(
              'SELECT id FROM proposals WHERE rfp_id = $1 AND vendor_id = $2',
              [rfpId, vendor.id]
            );

            if (existingProposal.rows.length > 0) {
              console.log(`⏭️ Skipping - proposal from ${vendor.name} already exists`);
              skipped.push(vendor.name);
              continue;
            }

            console.log(`🤖 Parsing response from ${vendor.name}...`);
            
            // Use AI to parse the email
            const parsedData = await aiService.parseVendorResponse(
              email.body,
              email.subject,
              rfp
            );

            // Analyze the proposal
            const analysis = await aiService.analyzeProposal(parsedData, rfp.requirements);

            // Store in database
            const proposalResult = await db.query(
              `INSERT INTO proposals 
               (rfp_id, vendor_id, email_subject, email_body, parsed_data, total_price, 
                delivery_time, warranty, payment_terms, ai_score, ai_analysis)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               RETURNING *`,
              [
                rfpId,
                vendor.id,
                email.subject,
                email.body,
                JSON.stringify(parsedData),
                parsedData.total_price,
                parsedData.delivery_time,
                parsedData.warranty,
                parsedData.payment_terms,
                analysis.score,
                analysis.analysis
              ]
            );

            processedProposals.push({
              vendor: vendor.name,
              proposal: proposalResult.rows[0],
              analysis: analysis
            });
          } else {
            console.log(`⚠️ Email from ${email.from} doesn't match any vendor for this RFP`);
          }
        } catch (processError) {
          console.error(`Error processing email from ${email.from}:`, processError);
          errors.push({
            from: email.from,
            error: processError.message
          });
        }
      }

      let message = '';
      if (processedProposals.length > 0) {
        message = `Processed ${processedProposals.length} new proposal(s)`;
      } else if (skipped.length > 0) {
        message = `All proposals from vendors (${skipped.join(', ')}) already exist`;
      } else {
        message = 'No matching vendor responses found';
      }

      console.log(`✅ ${message}`);
      res.json({
        message,
        proposals: processedProposals,
        ...(skipped.length > 0 && { skipped }),
        ...(errors.length > 0 && { errors })
      });
    } catch (error) {
      console.error('❌ Error checking responses:', error);
      res.status(500).json({ 
        error: 'Failed to check responses', 
        details: error.message,
        suggestion: 'Try using the manual proposal entry feature instead'
      });
    }
  }

  // Get all proposals for an RFP
  async getProposalsByRFP(req, res) {
    try {
      const { rfpId } = req.params;

      const result = await db.query(
        `SELECT p.*, v.name as vendor_name, v.email as vendor_email
         FROM proposals p
         JOIN vendors v ON p.vendor_id = v.id
         WHERE p.rfp_id = $1
         ORDER BY p.ai_score DESC`,
        [rfpId]
      );

      res.json({ proposals: result.rows });
    } catch (error) {
      console.error('❌ Error fetching proposals:', error);
      res.status(500).json({ error: 'Failed to fetch proposals' });
    }
  }

  // Get single proposal
  async getProposalById(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        `SELECT p.*, v.name as vendor_name, v.email as vendor_email, v.contact_person
         FROM proposals p
         JOIN vendors v ON p.vendor_id = v.id
         WHERE p.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      res.json({ proposal: result.rows[0] });
    } catch (error) {
      console.error('❌ Error fetching proposal:', error);
      res.status(500).json({ error: 'Failed to fetch proposal' });
    }
  }

  // Compare all proposals for an RFP
  async compareProposals(req, res) {
    try {
      const { rfpId } = req.params;

      // Get RFP details
      const rfpResult = await db.query('SELECT * FROM rfps WHERE id = $1', [rfpId]);
      if (rfpResult.rows.length === 0) {
        return res.status(404).json({ error: 'RFP not found' });
      }
      const rfp = rfpResult.rows[0];

      // Get all proposals with vendor details
      const proposalsResult = await db.query(
        `SELECT p.*, v.name as vendor_name, v.email as vendor_email
         FROM proposals p
         JOIN vendors v ON p.vendor_id = v.id
         WHERE p.rfp_id = $1`,
        [rfpId]
      );

      if (proposalsResult.rows.length === 0) {
        return res.status(404).json({ error: 'No proposals found for this RFP' });
      }

      const proposals = proposalsResult.rows;

      console.log('🤖 Generating comparison analysis...');
      const comparison = await aiService.compareProposals(proposals, rfp);

      res.json({
        rfp: rfp,
        proposals: proposals,
        comparison: comparison
      });
    } catch (error) {
      console.error('❌ Error comparing proposals:', error);
      res.status(500).json({ error: 'Failed to compare proposals', details: error.message });
    }
  }

  // Manually add a proposal (for testing)
  async createManualProposal(req, res) {
    try {
      const { rfpId, vendorId, emailBody, emailSubject } = req.body;

      // Validate input
      if (!rfpId || !vendorId || !emailBody) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['rfpId', 'vendorId', 'emailBody']
        });
      }

      // Get RFP details
      const rfpResult = await db.query('SELECT * FROM rfps WHERE id = $1', [rfpId]);
      if (rfpResult.rows.length === 0) {
        return res.status(404).json({ error: 'RFP not found' });
      }
      const rfp = rfpResult.rows[0];

      // Verify vendor exists
      const vendorResult = await db.query('SELECT * FROM vendors WHERE id = $1', [vendorId]);
      if (vendorResult.rows.length === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }

      console.log(`🤖 Parsing manual proposal for vendor ID ${vendorId}...`);

      // Parse the proposal
      const parsedData = await aiService.parseVendorResponse(
        emailBody,
        emailSubject || 'Manual Proposal',
        rfp
      );

      // Analyze the proposal
      const analysis = await aiService.analyzeProposal(parsedData, rfp.requirements);

      // Store in database
      const result = await db.query(
        `INSERT INTO proposals 
         (rfp_id, vendor_id, email_subject, email_body, parsed_data, total_price, 
          delivery_time, warranty, payment_terms, ai_score, ai_analysis)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          rfpId,
          vendorId,
          emailSubject || 'Manual Proposal',
          emailBody,
          JSON.stringify(parsedData),
          parsedData.total_price,
          parsedData.delivery_time,
          parsedData.warranty,
          parsedData.payment_terms,
          analysis.score,
          analysis.analysis
        ]
      );

      console.log(`✅ Manual proposal created successfully`);

      res.status(201).json({
        message: 'Proposal created successfully',
        proposal: result.rows[0],
        analysis: analysis
      });
    } catch (error) {
      console.error('❌ Error creating proposal:', error);
      res.status(500).json({ error: 'Failed to create proposal', details: error.message });
    }
  }
}

module.exports = new ProposalController();