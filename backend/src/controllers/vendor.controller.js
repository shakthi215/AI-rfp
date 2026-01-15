// backend/src/controllers/vendor.controller.js
const db = require('../config/database');

class VendorController {
  // Create vendor
  async createVendor(req, res) {
    try {
      const { name, email, contact_person, phone, address } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const result = await db.query(
        `INSERT INTO vendors (name, email, contact_person, phone, address)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, email, contact_person, phone, address]
      );

      res.status(201).json({
        message: 'Vendor created successfully',
        vendor: result.rows[0]
      });
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Vendor with this email already exists' });
      }
      console.error('❌ Error creating vendor:', error);
      res.status(500).json({ error: 'Failed to create vendor' });
    }
  }

  // Get all vendors
  async getAllVendors(req, res) {
    try {
      const result = await db.query(
        'SELECT * FROM vendors ORDER BY name ASC'
      );

      res.json({ vendors: result.rows });
    } catch (error) {
      console.error('❌ Error fetching vendors:', error);
      res.status(500).json({ error: 'Failed to fetch vendors' });
    }
  }

  // Get single vendor
  async getVendorById(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query('SELECT * FROM vendors WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }

      res.json({ vendor: result.rows[0] });
    } catch (error) {
      console.error('❌ Error fetching vendor:', error);
      res.status(500).json({ error: 'Failed to fetch vendor' });
    }
  }

  // Update vendor
  async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const { name, email, contact_person, phone, address } = req.body;

      const result = await db.query(
        `UPDATE vendors 
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             contact_person = COALESCE($3, contact_person),
             phone = COALESCE($4, phone),
             address = COALESCE($5, address)
         WHERE id = $6
         RETURNING *`,
        [name, email, contact_person, phone, address, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }

      res.json({
        message: 'Vendor updated successfully',
        vendor: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Error updating vendor:', error);
      res.status(500).json({ error: 'Failed to update vendor' });
    }
  }

  // Delete vendor
  async deleteVendor(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query('DELETE FROM vendors WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }

      res.json({ message: 'Vendor deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting vendor:', error);
      res.status(500).json({ error: 'Failed to delete vendor' });
    }
  }
}

module.exports = new VendorController();