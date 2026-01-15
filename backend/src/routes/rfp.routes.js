const express = require('express');
const router = express.Router();
const rfpController = require('../controllers/rfp.controller');

router.post('/', rfpController.createRFP);
router.get('/', rfpController.getAllRFPs);
router.get('/:id', rfpController.getRFPById);
router.post('/:id/send', rfpController.sendRFPToVendors);
router.get('/:id/vendors', rfpController.getRFPVendors);

module.exports = router;
