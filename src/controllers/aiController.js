// =============================================
// src/controllers/aiController.js — Gemini AI Integration
// =============================================
//
// WHAT IS GENERATIVE AI IN OUR APP?
// We use Google Gemini to:
//  1. MATCH  — compare a lost item vs all found items, score similarity
//  2. SUGGEST — return top 3 matches for a lost item
//  3. DESCRIBE — enhance a vague description into a detailed one
//  4. ASK     — free-form Q&A about campus lost & found
//
// HOW GEMINI WORKS (simplified):
//  You send a "prompt" (text instruction + data)
//  Gemini returns a generated text response
//  We parse that response and send structured JSON back to the client
//
// ANALOGY: You're texting a very smart assistant.
//   "Here's a lost item and 5 found items. Tell me which match."
//   The assistant thinks and replies with a ranked list.
// =============================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');

// =============================================
// INITIALIZE GEMINI CLIENT
// =============================================
// The client is created once (singleton pattern).
// Creating it is cheap, but we don't want a new instance per request.
//
// WHAT IS AN API KEY?
// Like a password + username in one string.
// Google uses it to: identify your account, track usage, enforce rate limits.
// NEVER commit this to GitHub — it's in .env and .gitignore keeps it safe.

let genAI;
let model;

const initGemini = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in .env');
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // gemini-1.5-flash: fast + free tier, 1M tokens/day
    // Use gemini-1.5-pro for better reasoning (lower free limits)
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return model;
};

// =============================================
// HELPER — Parse JSON from AI response
// =============================================
// Gemini sometimes wraps JSON in markdown code blocks:
// ```json\n{ ... }\n```
// This helper strips that and parses safely.
const parseAIJson = (text) => {
  // Remove markdown code blocks if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
};

// =============================================
// HELPER — Handle AI errors gracefully with troubleshooting tips
// =============================================
const handleAIError = (res, error, contextMessage) => {
  console.error(`❌ AI Error (${contextMessage}):`, error.message);
  
  let friendlyMessage = 'AI feature is temporarily unavailable.';
  let fixSuggestion = undefined;

  if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
    friendlyMessage = 'Invalid Gemini API Key. Please verify the GEMINI_API_KEY in your .env file.';
    fixSuggestion = 'Go to https://aistudio.google.com/ to get a free API key, and update your .env file.';
  } else if (error.message.includes('quota') || error.message.includes('429')) {
    friendlyMessage = 'AI rate limit / quota exceeded. Please try again in a few moments.';
  } else if (error.message.includes('ModelService.ListModels')) {
    friendlyMessage = 'Gemini model is not available or API key has no permissions.';
  }

  res.status(500).json({
    success: false,
    message: friendlyMessage,
    fix: fixSuggestion,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

// =============================================
// @route   POST /api/ai/match
// @desc    Find the best found-item matches for a lost item
// @body    { lostItemId: "mongo_id" }
// @access  Private
// =============================================
const matchItems = async (req, res) => {
  try {
    const aiModel = initGemini();
    const { lostItemId } = req.body;

    if (!lostItemId) {
      return res.status(400).json({
        success: false,
        message: 'lostItemId is required in the request body',
      });
    }

    // 1. Fetch the lost item from DB
    const lostItem = await LostItem.findById(lostItemId);
    if (!lostItem) {
      return res.status(404).json({ success: false, message: 'Lost item not found' });
    }

    // 2. Fetch recent found items (last 100, same category if possible)
    // We limit to 100 to stay within Gemini's context window efficiently
    const query = { status: 'pending' };
    if (lostItem.category) query.category = lostItem.category;

    const foundItems = await FoundItem.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .select('_id title description category location dateFound');

    if (foundItems.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No found items to match against yet',
        matches: [],
      });
    }

    // 3. Build the AI prompt
    // PROMPT ENGINEERING: Being specific gets better results.
    // We give Gemini:
    //   - The lost item details
    //   - All found items as structured data
    //   - Exact output format we need
    const prompt = `
You are an AI assistant for a campus lost and found system.
Your task: find which "found" items best match the "lost" item.

LOST ITEM:
- Title: ${lostItem.title}
- Description: ${lostItem.description}
- Category: ${lostItem.category}
- Location Lost: ${lostItem.location}
- Date Lost: ${lostItem.dateLost?.toDateString() || 'Unknown'}
- Tags: ${lostItem.tags?.join(', ') || 'none'}

FOUND ITEMS (up to 100, JSON array):
${JSON.stringify(foundItems.map(f => ({
  id: f._id.toString(),
  title: f.title,
  description: f.description,
  category: f.category,
  location: f.location,
  dateFound: f.dateFound?.toDateString(),
})), null, 2)}

INSTRUCTIONS:
1. Analyze each found item against the lost item
2. Consider: title similarity, description overlap, category match, location proximity, timing
3. Return the TOP 3 matches (or fewer if confidence is very low)
4. Score each match from 0-100 (confidence percentage)
5. Only include matches with score >= 20

RETURN THIS EXACT JSON FORMAT (no extra text, no markdown):
{
  "matches": [
    {
      "foundItemId": "mongo_id_string",
      "score": 85,
      "reason": "One sentence explaining why this is a match"
    }
  ],
  "summary": "One sentence overall assessment"
}
`;

    // 4. Call Gemini API
    const result = await aiModel.generateContent(prompt);
    const responseText = result.response.text();

    // 5. Parse the JSON response
    let parsed;
    try {
      parsed = parseAIJson(responseText);
    } catch (parseError) {
      // If Gemini didn't return valid JSON, return raw response
      return res.status(200).json({
        success: true,
        rawResponse: responseText,
        matches: [],
        warning: 'AI returned unexpected format — raw response included',
      });
    }

    // 6. Enrich matches with full found item data
    const enrichedMatches = await Promise.all(
      (parsed.matches || []).map(async (match) => {
        const foundItem = await FoundItem.findById(match.foundItemId)
          .populate('reportedBy', 'name email');
        return {
          ...match,
          foundItem: foundItem || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      lostItem: {
        id: lostItem._id,
        title: lostItem.title,
      },
      matches: enrichedMatches,
      summary: parsed.summary,
      totalFoundItemsScanned: foundItems.length,
    });

  } catch (error) {
    handleAIError(res, error, 'matchItems');
  }
};

// =============================================
// @route   GET /api/ai/suggestions/:id
// @desc    Quick top-3 match suggestions for a lost item
// @access  Private
// =============================================
const getSuggestions = async (req, res) => {
  // Reuse matchItems logic with the ID from params
  req.body.lostItemId = req.params.id;
  return matchItems(req, res);
};

// =============================================
// @route   POST /api/ai/describe
// @desc    Enhance a vague item description to be more searchable
// @body    { title: "...", roughDescription: "...", category: "..." }
// @access  Private
// =============================================
const enhanceDescription = async (req, res) => {
  try {
    const aiModel = initGemini();
    const { title, roughDescription, category } = req.body;

    if (!roughDescription) {
      return res.status(400).json({
        success: false,
        message: 'roughDescription is required',
      });
    }

    const prompt = `
You are helping a college student describe a lost or found item for a campus lost & found system.
Make the description clear, detailed, and easy to search for.

ITEM INFO:
- Title: ${title || 'Unknown'}
- Category: ${category || 'Unknown'}
- Student's rough description: "${roughDescription}"

INSTRUCTIONS:
- Expand the description with likely details (color, size, brand if inferrable)
- Keep it factual, not invented — use phrases like "appears to be" if guessing
- Add relevant keywords a person searching would use
- Max 3 sentences
- Be specific about identifying features

RETURN THIS EXACT JSON FORMAT:
{
  "enhanced": "The full enhanced description goes here",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "tips": "One tip for the student to help identify their item faster"
}
`;

    const result = await aiModel.generateContent(prompt);
    const responseText = result.response.text();

    let parsed;
    try {
      parsed = parseAIJson(responseText);
    } catch {
      return res.status(200).json({
        success: true,
        enhanced: responseText,
        keywords: [],
        warning: 'Returned as plain text',
      });
    }

    res.status(200).json({
      success: true,
      original: roughDescription,
      enhanced: parsed.enhanced,
      keywords: parsed.keywords || [],
      tips: parsed.tips,
    });

  } catch (error) {
    handleAIError(res, error, 'enhanceDescription');
  }
};

// =============================================
// @route   POST /api/ai/ask
// @desc    Ask the AI anything about campus lost & found
// @body    { question: "..." }
// @access  Private
// =============================================
const askAI = async (req, res) => {
  try {
    const aiModel = initGemini();
    const { question } = req.body;

    if (!question || question.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'question is required (min 3 characters)',
      });
    }

    // Safety: keep it on-topic
    const prompt = `
You are a helpful assistant for a campus lost and found system.
Answer questions related to: finding lost items, reporting found items, 
campus locations, best practices for recovering lost property.

If the question is off-topic, politely redirect.

Student's question: "${question}"

Keep your answer brief (2-3 sentences max) and practical.
`;

    const result = await aiModel.generateContent(prompt);
    const answer = result.response.text();

    res.status(200).json({
      success: true,
      question,
      answer: answer.trim(),
    });

  } catch (error) {
    handleAIError(res, error, 'askAI');
  }
};

module.exports = { matchItems, getSuggestions, enhanceDescription, askAI };
