import { Request, Response } from "express";
import { User } from "../modals/user.modal";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri";
import cloudinary from "../utils/cloudinary";

interface UserType {
  _id: string;
  username: string;
  email: string;
  password: string;
  profilePicture?: string;
  bio?: string;
  followers?: string[];
  following?: string[];
  posts?: string[];
}

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(401).json({
        message: "Something is missing, Please check!",
        success: false,
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(401).json({
        message: "Email already exists",
        success: false,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Account Created Successfully",
      success: true,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(401).json({
        message: "Something is missing, Please check!",
        success: false,
      });
    }

    let user: UserType | null = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "User not found",
        success: false,
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Wrong password",
        success: false,
      });
    }

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

    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY || "", {
      expiresIn: "1d",
    });

    return res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 1 day in ms
      })
      .json({
        message: `Welcome Back ${user.username}`,
        success: true,
        user: userData,
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

export const logout = async (_, res: Response) => {
  try {
    return res.cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    let user = await User.findById(userId);
    return res.status(200).json({
      user,
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};

export const editProfile = async (req: any, res: Response) => {
  try {
    const userId = req.id; // Assuming you have userId stored in `req.id` from a middleware
    const { bio, gender } = req.body;
    const profilePicture = req.file;
    let cloudResponse;

    if (profilePicture) {
      const fileUri = getDataUri(profilePicture);

      if (fileUri) {
        cloudResponse = await cloudinary.uploader.upload(fileUri);
        console.log("Uploaded image response:", cloudResponse);
      } else {
        throw new Error("Invalid file URI");
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    if (bio) user.bio = bio;
    if (gender) user.gender = gender;
    if (profilePicture) user.profilePicture = cloudResponse.secure_url;

    await user.save();
    return res.status(200).json({
      message: "Profile Updated",
      success: true,
      user
    });

    res
      .status(200)
      .json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getSuggestedUsers = async(req:any, res:Response)=>{
  try {
    const suggestedUsers = await User.find({_id:{$ne:req.id}}).select("-password")
    if(!suggestedUsers){
      return res.status(400).json({
        message:"Currently do not have any user",
        success:false
      })
    }

    return res.status(200).json({
      success:true,
      users:suggestedUsers
    })
  } catch (error) {
    console.log(error)
  }
}

export const followOrUnfollow = async(req:any,res:Response)=>{
  try {
    const myself = req.id;
    const forFollowing = req.params.id;
    if(myself === forFollowing){
      return res.status(400).json({
        message:"You can't follow/unfollow yourself",
        success:false
      })
    }

    const user = await User.findById(myself);
    const targetUser = await User.findById(forFollowing);

    if(!user || !targetUser){
      return res.status(400).json({
        message:"User not found",
        success:false
      })
    }

    //now checking if user is following or for unfollow
    const isFollowing = user.following.includes(forFollowing);
      if(isFollowing){
          //unfollow logic 

 await Promise.all([
          User.updateOne({
            _id:myself
          },{
            $pull:{following:forFollowing}
          }),
          User.updateOne({
            _id:forFollowing
          },{
            $pull:{following:myself}
          })
        ])
        return res.status(200).json({
          message:"Unfollow successfully",
          success:true
        })
      }else{
        //follow logic
        await Promise.all([
          User.updateOne({
            _id:myself
          },{
            $push:{following:forFollowing}
          }),
          User.updateOne({
            _id:forFollowing
          },{
            $push:{following:myself}
          })
        ])
        return res.status(200).json({
          message:"Follow successfully",
          success:true
        })
      }
     
  } catch (error) {
    
  }
}
