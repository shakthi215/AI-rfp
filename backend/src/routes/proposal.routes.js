// backend/src/routes/proposal.routes.js
const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposal.controller');

router.post('/check/:rfpId', proposalController.checkAndParseResponses);
router.get('/rfp/:rfpId', proposalController.getProposalsByRFP);
router.get('/:id', proposalController.getProposalById);
router.post('/compare/:rfpId', proposalController.compareProposals);
router.post('/manual', proposalController.createManualProposal);

module.exports = router;