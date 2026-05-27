// =============================================
// src/controllers/lostController.js
// =============================================

const LostItem = require('../models/LostItem');

// @route   GET /api/lost
// @access  Public
const getAllLostItems = async (req, res) => {
  try {
    // Build a query object from URL query parameters
    // e.g., GET /api/lost?category=electronics&status=active
    const query = {};
    
    if (req.query.category) query.category = req.query.category;
    if (req.query.status) query.status = req.query.status;

    // Text search — searches 'title' and 'description' indexes
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Execute query with:
    // .populate() → replace reportedBy ObjectId with actual User data
    // .sort()     → newest first
    // .skip()     → pagination offset
    // .limit()    → max results per page
    const items = await LostItem.find(query)
      .populate('reportedBy', 'name email') // Only fetch name and email from User
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LostItem.countDocuments(query);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: items,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/lost/:id
// @access  Public
const getLostItemById = async (req, res) => {
  try {
    const item = await LostItem.findById(req.params.id)
      .populate('reportedBy', 'name email location')
      .populate('matchedFoundItem');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Lost item not found' });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/lost
// @access  Private
const createLostItem = async (req, res) => {
  try {
    const {
      title, description, category, location,
      dateLost, contactEmail, contactPhone, reward, tags
    } = req.body;

    // Multer puts file info in req.file
    // If an image was uploaded, store its path
    const image = req.file ? req.file.path : null;

    const item = await LostItem.create({
      reportedBy: req.user._id, // From JWT middleware
      title,
      description,
      category,
      location,
      dateLost: dateLost || Date.now(),
      contactEmail: contactEmail || req.user.email,
      contactPhone,
      reward,
      image,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
    });

    // Increment user's report count
    await req.user.updateOne({ $inc: { reportCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Lost item reported successfully',
      data: item,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/lost/:id
// @access  Private (owner only)
const updateLostItem = async (req, res) => {
  try {
    const item = await LostItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Authorization check — only the owner can update
    // item.reportedBy is an ObjectId; req.user._id is also ObjectId
    // .toString() converts both to strings for comparison
    if (item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item',
      });
    }

    const updates = { ...req.body };
    if (req.file) updates.image = req.file.path;

    const updated = await LostItem.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true } // Return updated doc, run schema validators
    );

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/lost/:id
// @access  Private (owner or admin)
const deleteLostItem = async (req, res) => {
  try {
    const item = await LostItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Allow deletion if: owner OR admin
    const isOwner = item.reportedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item',
      });
    }

    await item.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Lost item removed successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllLostItems,
  getLostItemById,
  createLostItem,
  updateLostItem,
  deleteLostItem,
};
