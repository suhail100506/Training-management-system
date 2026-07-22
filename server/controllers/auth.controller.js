const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logAudit } = require('../middleware/auditLogger');
const { AUDIT_ACTIONS } = require('../config/constants');
const { sendSuccess, sendError } = require('../utils/response');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email, staffNumber: user.staffNumber },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '8h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', [], 400);
    }

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return sendError(res, 'Invalid email or password', [], 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Your account is deactivated. Please contact support.', [], 403);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Check if the user is logging in with the default seeded password
    // or if the password hash matches the seeded hash.
    // For safety, we can return mustChangePassword if password is 'Admin@1234'
    const isDefaultPassword = password === 'Admin@1234';

    await logAudit({
      userId: user._id,
      userEmail: user.email,
      action: AUDIT_ACTIONS.LOGIN,
      module: 'Auth',
      recordId: user._id,
      ipAddress: req.ip
    });

    return sendSuccess(res, 'Login successful', {
      token: accessToken,
      user: {
        id: user._id,
        staffNumber: user.staffNumber,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: isDefaultPassword
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user._id,
        userEmail: req.user.email,
        action: AUDIT_ACTIONS.LOGOUT,
        module: 'Auth',
        recordId: req.user._id,
        ipAddress: req.ip
      });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    return sendSuccess(res, 'Logout successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   POST /api/v1/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current password and new password are required', [], 400);
    }

    // Validate new password complexity:
    // min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return sendError(res, 'New password does not meet complexity requirements. It must be at least 8 characters long, and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.', [], 400);
    }

    if (currentPassword === newPassword) {
      return sendError(res, 'New password cannot be the same as current password', [], 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 'User not found', [], 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Incorrect current password', [], 400);
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logAudit({
      userId: user._id,
      userEmail: user.email,
      action: AUDIT_ACTIONS.UPDATE,
      module: 'User',
      recordId: user._id,
      before: { passwordHash: 'SECRET' },
      after: { passwordHash: 'UPDATED' },
      ipAddress: req.ip
    });

    return sendSuccess(res, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return sendError(res, 'User not found', [], 404);
    }
    return sendSuccess(res, 'Profile fetched successfully', user);
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return sendError(res, 'Refresh token not found', [], 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return sendError(res, 'Invalid refresh token', [], 401);
    }

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive || user.isDeleted) {
      return sendError(res, 'Session invalid or user deactivated', [], 403);
    }

    const accessToken = generateAccessToken(user);
    return sendSuccess(res, 'Token refreshed successfully', { token: accessToken });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  changePassword,
  getMe,
  refresh
};
