import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { User } from "../modals/user.modal.js";


export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "All fields are required.",
        success: false,
      });
    }

    const existingUser1 = await User.findOne({ email });
    if (existingUser1) {
      return res.status(400).json({
        message: "Email already in use.",
        success: false,
      });
    }
    const existingUser2 = await User.findOne({ username });
    if (existingUser2) {
      return res.status(400).json({
        message: "Please choose different username",
        success: false,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Account created successfully.",
      success: true,
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Error in register:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required.",
        success: false,
      });
    }

    const user= await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Incorrect Password!",
        success: false,
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY || "", {
      expiresIn: "1d",
    });

    const userData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      posts: user.posts,
    };

    return res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 1 day in ms
      })
      .json({
        message: `Welcome back, ${user.username}`,
        success: true,
        user: userData,
      });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

export const logout = async (_, res) => {
  try {
    return res
      .cookie("token", "", { maxAge: 0 })
      .json({ message: "Logged out successfully.", success: true });
  } catch (error) {
    console.error("Error in logout:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    return res.status(200).json({
      user,
      success: true,
    });
  } catch (error) {
    console.error("Error in getProfile:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};

export const editProfile = async (req, res) => {
  try {
    const userId = req.id; 
    const { bio, gender } = req.body;
    const profilePicture = req.file;

    let cloudResponse;

    if (profilePicture) {
      const fileUri = getDataUri(profilePicture);

      if (fileUri) {
        cloudResponse = await cloudinary.uploader.upload(fileUri);
        if (!cloudResponse) {
          return res.status(500).json({
            message: "Failed to upload image to Cloudinary.",
            success: false,
          });
        }
      } else {
        return res.status(400).json({
          message: "Invalid file URI.",
          success: false,
        });
      }
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    if (bio) user.bio = bio;
    if (gender) user.gender = gender;
    if (profilePicture && cloudResponse?.secure_url) {
      user.profilePicture = cloudResponse.secure_url;
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully.",
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error in editProfile:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};


export const getSuggestedUsers = async (req, res) => {
  try {
    // Find all users except the current user, include "bookmark" and exclude "password"
    const suggestedUsers = await User.find({ _id: { $ne: req.id } })
      .select("-password");

    console.log(suggestedUsers);
    
    if (!suggestedUsers.length) {
      return res.status(404).json({
        message: "No users found.",
        success: false,
      });
    }

    return res.status(200).json({
      success: true,
      users: suggestedUsers,
    });
  } catch (error) {
    console.error("Error in getSuggestedUsers:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};


export const followOrUnfollow = async (req, res) => {
  try {
    const userId = req.id;
    const targetUserId = req.params.id;

    if (userId === targetUserId) {
      return res.status(400).json({
        message: "You cannot follow/unfollow yourself.",
        success: false,
      });
    }

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);

    if (!user || !targetUser) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    const isFollowing = user.following.includes(targetUserId);

    if (isFollowing) {
      await Promise.all([
        User.updateOne(
          { _id: userId },
          { $pull: { following: targetUserId } }
        ),
        User.updateOne(
          { _id: targetUserId },
          { $pull: { followers: userId } }
        ),
      ]);

      return res.status(200).json({
        message: "Unfollowed successfully.",
        success: true,
      });
    } else {
      await Promise.all([
        User.updateOne(
          { _id: userId },
          { $push: { following: targetUserId } }
        ),
        User.updateOne(
          { _id: targetUserId },
          { $push: { followers: userId } }
        ),
      ]);

      return res.status(200).json({
        message: "Followed successfully.",
        success: true,
      });
    }
  } catch (error) {
    console.error("Error in followOrUnfollow:", error);
    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};
