// backend/src/services/ai.service.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class AIService {
  // Parse natural language into structured RFP
  async parseNaturalLanguageRFP(userInput) {
    try {
      const prompt = `You are an expert procurement assistant. Parse the following natural language description into a structured RFP format.

User Input: "${userInput}"

Extract and return a JSON object with this structure:
{
  "title": "Brief title for the RFP",
  "description": "Detailed description of what needs to be procured",
  "requirements": {
    "items": [
      {
        "name": "item name",
        "quantity": number,
        "specifications": "detailed specs"
      }
    ],
    "additional_requirements": ["list", "of", "requirements"]
  },
  "budget": number (extract only the number, no currency symbols),
  "delivery_deadline": "YYYY-MM-DD format if mentioned, else estimate based on context",
  "payment_terms": "payment terms if mentioned",
  "warranty_terms": "warranty requirements if mentioned"
}

Be specific and extract all numerical values, dates, and requirements mentioned. If something isn't mentioned, use reasonable defaults for procurement.`;

      const completion = await this.retryWithBackoff(() => 
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a procurement expert that converts natural language into structured RFP data. Always respond with valid JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      );

      const parsedData = JSON.parse(completion.choices[0].message.content);
      return parsedData;
    } catch (error) {
      console.error('AI parsing error:', error);
      throw new Error('Failed to parse RFP requirements');
    }
  }

  // Retry helper for rate limits
  async retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error.status === 429 && i < maxRetries - 1) {
          const waitTime = Math.pow(2, i) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`⏳ Rate limit hit, waiting ${waitTime/1000}s before retry ${i+1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          throw error;
        }
      }
    }
  }

  // Parse vendor email response
  async parseVendorResponse(emailBody, emailSubject, rfpDetails) {
    try {
      const prompt = `You are analyzing a vendor's response to an RFP. Extract structured data from their email.

RFP Details:
Title: ${rfpDetails.title}
Requirements: ${JSON.stringify(rfpDetails.requirements)}

Vendor Email:
Subject: ${emailSubject}
Body: ${emailBody}

Extract and return a JSON object:
{
  "items": [
    {
      "name": "item name",
      "quantity": number,
      "unit_price": number,
      "total_price": number,
      "specifications": "what they're offering"
    }
  ],
  "total_price": number,
  "delivery_time": "delivery timeline",
  "warranty": "warranty terms",
  "payment_terms": "payment terms",
  "additional_notes": "any other important information",
  "completeness_score": number (0-100, how well they addressed all requirements)
}

Extract all pricing, timeline, and term information. Be thorough.`;

      const completion = await this.retryWithBackoff(() =>
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert at extracting structured procurement data from vendor emails. Always respond with valid JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      );

      const parsedData = JSON.parse(completion.choices[0].message.content);
      return parsedData;
    } catch (error) {
      console.error('Vendor response parsing error:', error);
      throw new Error('Failed to parse vendor response');
    }
  }

  // Analyze and score proposals
  async analyzeProposal(proposalData, rfpRequirements) {
    try {
      const prompt = `Analyze this vendor proposal against RFP requirements and provide a detailed evaluation.

RFP Requirements:
${JSON.stringify(rfpRequirements, null, 2)}

Vendor Proposal:
${JSON.stringify(proposalData, null, 2)}

Provide a JSON response with:
{
  "score": number (0-100),
  "analysis": "Detailed analysis covering: price competitiveness, requirement coverage, delivery timeline, warranty terms, and overall value",
  "strengths": ["list", "of", "strengths"],
  "weaknesses": ["list", "of", "weaknesses"],
  "recommendation": "Brief recommendation"
}`;

      const completion = await this.retryWithBackoff(() =>
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a procurement expert evaluating vendor proposals. Provide objective, data-driven analysis. Always respond with valid JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      );

      const analysis = JSON.parse(completion.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('Proposal analysis error:', error);
      throw new Error('Failed to analyze proposal');
    }
  }

  // Compare multiple proposals and recommend winner
  async compareProposals(proposals, rfpDetails) {
    try {
      const prompt = `Compare these vendor proposals for an RFP and recommend the best option.

RFP: ${rfpDetails.title}
Budget: ${rfpDetails.budget}
Requirements: ${JSON.stringify(rfpDetails.requirements)}

Proposals:
${JSON.stringify(proposals, null, 2)}

Provide a JSON response with:
{
  "recommended_vendor_id": number,
  "comparison_summary": "Overall comparison of all proposals",
  "ranking": [
    {
      "vendor_id": number,
      "vendor_name": "name",
      "rank": number,
      "score": number,
      "reason": "why this ranking"
    }
  ],
  "key_insights": ["important", "insights"],
  "recommendation_rationale": "Detailed explanation of why the recommended vendor is the best choice"
}`;

      const completion = await this.retryWithBackoff(() =>
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a senior procurement advisor. Compare proposals objectively considering price, quality, delivery, and risk. Always respond with valid JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      );

      const comparison = JSON.parse(completion.choices[0].message.content);
      return comparison;
    } catch (error) {
      console.error('Proposal comparison error:', error);
      throw new Error('Failed to compare proposals');
    }
  }
}

module.exports = new AIService();