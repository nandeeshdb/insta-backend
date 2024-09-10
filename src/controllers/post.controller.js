import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../modals/post.modal.js";
import { User } from "../modals/user.modal.js";
import { Comment } from "../modals/comment.modal.js";

export const addNewPost = async (req, res) => {
  try {
    const { caption } = req.body;
    const image = req.file;
    const authorId = req.id;

    if (!image) {
      return res.status(400).json({
        message: "Image required!",
        success: false,
      });
    }

    //image upload
    const optimizedImageBuffer = await sharp(image.buffer)
      .resize({ width: 800, height: 800, fit: "inside" })
      .toFormat("jpeg", { quality: 80 })
      .toBuffer();

    //buffer to datauri
    const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString(
      "base64"
    )}`;
    const cloudResponse = await cloudinary.uploader(fileUri);
    const post = await Post.create({
      caption,
      image: cloudResponse,
      author: authorId,
    });
    const user = await User.findById(authorId);
    if (user) {
      user.posts.push(post._id);
      await user.save();
    }
    await post.populate({ path: "author", select: "-password" });
    res.status(201).json({
      message: "New Post Added!",
      success: true,
      post,
    });
  } catch (error) {
    console.log(error);
  }
};

export const getAllPost = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username, profilePicture" })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: {
          path: "author",
          select: "username, profilePicture",
        },
      });
    return res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {}
};

export const getUserPost = async (req, res) => {
  try {
    const authorId = req.id;
    const post = await Post.find({
      author: authorId,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "author",
        select: "username profilePicture",
      })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: {
          path: "author",
          select: "username, profilePicture",
        },
      });
    return res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.log(error);
  }
};

export const likePost = async (req, res) => {
  try {
    const postLikingUser = req.id;
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });

    //post liking logic
    await post.updateOne({ $addToSet: { likes: postLikingUser } });
    await post.save();

    //implement socket.io for realtime notification

    return res.status(200).json({
      message: "Post liked!",
      success: true,
    });
  } catch (error) {}
};

export const dislikePost = async (req, res) => {
  try {
    const postLikingUser = req.id;
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });

    //post disliking logic
    await post.updateOne({ $pull: { likes: postLikingUser } });
    await post.save();
    return res.status(200).json({
      message: "Post disliked!",
      success: true,
    });
  } catch (error) {}
};

export const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const commentUserId = req.id;

    const { text } = req.body;

    const post = await Post.findById(postId);
    if (!text)
      return res
        .status(400)
        .json({ message: "Comment text is required", success: false });

    const comment = await Comment.create({
      text,
      author: commentUserId,
      post: postId,
    }).populate({
      path: "author",
      select: "username, profilePicture",
    });
    post.comments.push(comment._id);
    await post.save();

    return res.status(201).json({
      message: "Comment Added!",
      comment,
      success: TransformStreamDefaultController,
    });
  } catch (error) {
    console.log(error);
  }
};

export const getCommentsOfPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const comments = await Comment.find({
      post: postId,
    }).populate("author", "username, profilePicture");

    if (!comments)
      return res
        .status(404)
        .json({ message: "No comments found", success: false });
    return res.status(200).json({ success: true, comments });
  } catch (error) {
    console.log(error);
  }
};

export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const authorId = req.id;

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post is not found", success: false });

    //check if logged-in user is the owner of the post
    if (post.author.toString() !== authorId)
      return res.json(403).json({ message: "Unauthorized", success: false });

    //delete post
    await Post.findByIdAndDelete(postId);

    //remove postId from user
    let user = await User.findById(authorId);
    user.posts = user.posts.filter((id) => id.toString() !== postId);
    await user.save();

    //delete associated comments
    await Comment.deleteMany({
      post: postId,
    });

    return res.status(200).json({
      message: "Post deleted!",
      success: true,
    });
  } catch (error) {}
};

export const bookmarkPost = async (req,res)=> {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({
            message: "Post not found!",
            success: false,
          });
        
        const user = await User.findById(authorId);
        if(user.bookmarks.includes(post._id)) {
            //already bookmarked -> remove from the bookmark
            await user.updateOne({$pull:{bookmarks:post._id}})
            await user.save()
            return res.status(200).json({
                message: "Post removed from bookmark",
                success: true,
                type:"unsaved"
              })
        }else{
             //not bookmarked -> add to the bookmark
             await user.updateOne({$addToSet:{bookmarks:post._id}})
             await user.save()
             return res.status(200).json({
                 message: "Post added to bookmark",
                 success: true,
                 type:"saved"
               })
        }
    } catch (error) {
        
    }
}