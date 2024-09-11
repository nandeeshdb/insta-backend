import { Conversation } from "../modals/conversation.modal.js";
import { Message } from "../modals/message.modal.js";

//for chatting
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const { message } = req.body;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    //establish the conversation if not started
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      message,
    });

    if (newMessage) conversation.message.push(newMessage._id);

    await Promise.all([conversation.save(), newMessage.save()]);

    //implement socket_io for real time data transfer;


    return res.status(201).json({success:true,newMessage})
  } catch (error) {
    console.log(error);
  }
};

export const getMessage = async(req,res)=>{
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const conversation = await Conversation.find({
            participants:{$all:[senderId,receiverId]}
        })
        if(!conversation) return res.status(200).json({success:true,messages:[]})
        return res.status(200).json({success:true,messages:conversation?.message})
    } catch (error) {
        
    }
}
