import express from 'express';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest, profileUpdateSchema } from '../middleware/validation.js';

const router = express.Router();

// Get user profile
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      location: user.location || '',
      bio: user.bio || '',
      skills: user.skills || [],
      experience: user.experience || [],
      education: user.education || [],
      certifications: user.certifications || []
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/', authenticate, validateRequest(profileUpdateSchema), async (req, res) => {
  try {
    const updates = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      location: user.location || '',
      bio: user.bio || '',
      skills: user.skills || [],
      experience: user.experience || [],
      education: user.education || [],
      certifications: user.certifications || []
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

// Upload avatar
router.post('/avatar', authenticate, async (req, res) => {
  try {
    // In a real implementation, you would handle file upload here
    // For now, we'll just accept a URL or base64 string
    const { avatar } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    );

    res.json({ 
      message: 'Avatar updated successfully',
      avatar: user.avatar 
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

export default router;