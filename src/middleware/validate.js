// =============================================
// src/middleware/validate.js — Input Validation Middleware
// =============================================
//
// WHAT IS INPUT VALIDATION?
// Never trust user input. Before any data hits your database,
// you must verify:
//   - Required fields are present
//   - Data types are correct (number is a number, not "abc")
//   - Strings aren't too long (prevents DB bloat & DoS)
//   - Emails look like emails
//   - Values are within allowed ranges
//
// WHY NOT VALIDATE IN THE CONTROLLER?
// Controllers get long and messy fast. Middleware keeps
// validation as a separate, reusable concern.
//
// LIBRARY: express-validator
//   - Chain validators like: body('email').isEmail().normalizeEmail()
//   - Handles all the error collection automatically
//
// ANALOGY: Airport security scanner BEFORE the gate.
// The gate agent (controller) shouldn't have to check every bag.
// =============================================

const { body, validationResult } = require('express-validator');

// =============================================
// HELPER — Run validators and return errors
// =============================================
// This middleware runs AFTER the validators defined below.
// If any validator found an error, we stop here and return them.
// Otherwise, we call next() to proceed to the controller.
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      // Map to simple array of error messages
      errors: errors.array().map(e => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

// =============================================
// AUTH VALIDATORS
// =============================================
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(), // Converts to lowercase, removes dots in Gmail

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),

  body('studentId')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Student ID must be under 20 characters'),

  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email'),

  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

// =============================================
// LOST ITEM VALIDATORS
// =============================================
const validateLostItem = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn([
      'electronics', 'clothing', 'accessories', 'books',
      'keys', 'wallet', 'bag', 'sports', 'documents', 'other'
    ]).withMessage('Invalid category'),

  body('location')
    .trim()
    .notEmpty().withMessage('Location is required')
    .isLength({ max: 100 }).withMessage('Location must be under 100 characters'),

  body('contactEmail')
    .optional()
    .isEmail().withMessage('Contact email must be a valid email'),

  body('reward')
    .optional()
    .isFloat({ min: 0, max: 10000 }).withMessage('Reward must be between 0 and 10000'),

  handleValidationErrors,
];

// =============================================
// FOUND ITEM VALIDATORS
// =============================================
const validateFoundItem = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn([
      'electronics', 'clothing', 'accessories', 'books',
      'keys', 'wallet', 'bag', 'sports', 'documents', 'other'
    ]).withMessage('Invalid category'),

  body('locationFound')
    .trim()
    .notEmpty().withMessage('Location where found is required'),

  handleValidationErrors,
];

// =============================================
// AI REQUEST VALIDATORS
// =============================================
const validateMatchRequest = [
  body('lostItemId')
    .notEmpty().withMessage('lostItemId is required')
    .isMongoId().withMessage('lostItemId must be a valid MongoDB ID'),

  handleValidationErrors,
];

const validateDescribeRequest = [
  body('roughDescription')
    .trim()
    .notEmpty().withMessage('roughDescription is required')
    .isLength({ min: 5, max: 500 }).withMessage('Description must be 5-500 characters'),

  handleValidationErrors,
];

const validateAskRequest = [
  body('question')
    .trim()
    .notEmpty().withMessage('question is required')
    .isLength({ min: 3, max: 500 }).withMessage('Question must be 3-500 characters'),

  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateLostItem,
  validateFoundItem,
  validateMatchRequest,
  validateDescribeRequest,
  validateAskRequest,
};
