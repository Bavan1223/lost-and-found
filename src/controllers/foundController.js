// =============================================
// src/controllers/foundController.js
// =============================================

const FoundItem = require('../models/FoundItem');

// @route   GET /api/found
// @access  Public
const getAllFoundItems = async (req, res) => {
  try {
    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.status) query.status = req.query.status;
    if (req.query.search) query.$text = { $search: req.query.search };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const items = await FoundItem.find(query)
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await FoundItem.countDocuments(query);

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

// @route   GET /api/found/:id
// @access  Public
const getFoundItemById = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id)
      .populate('reportedBy', 'name email location')
      .populate('matchedLostItem');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Found item not found' });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/found
// @access  Private
const createFoundItem = async (req, res) => {
  try {
    const {
      title, description, category, locationFound,
      currentLocation, dateFound, contactEmail, contactPhone, tags
    } = req.body;

    const image = req.file ? req.file.path : null;

    const item = await FoundItem.create({
      reportedBy: req.user._id,
      title,
      description,
      category,
      locationFound,
      currentLocation,
      dateFound: dateFound || Date.now(),
      contactEmail: contactEmail || req.user.email,
      contactPhone,
      image,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
    });

    await req.user.updateOne({ $inc: { reportCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Found item reported successfully',
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

// @route   PUT /api/found/:id
// @access  Private (owner only)
const updateFoundItem = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updates = { ...req.body };
    if (req.file) updates.image = req.file.path;

    const updated = await FoundItem.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/found/:id
// @access  Private (owner or admin)
const deleteFoundItem = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const isOwner = item.reportedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await item.deleteOne();
    res.status(200).json({ success: true, message: 'Found item removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllFoundItems,
  getFoundItemById,
  createFoundItem,
  updateFoundItem,
  deleteFoundItem,
};
