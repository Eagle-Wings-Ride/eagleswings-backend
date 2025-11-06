const User = require('../models/User')


const getUser = async (req, res) => {
    const {id:userId} = req.params
    const user = await User.findById(userId)

    if (!user) {
        return res.status(404).json(" User Not Found")
    }

    res.status(200).json({
          user:{
            id: user._id,
            fullname: user.fullname,
            email: user.email,
            phone_number: user.phone_number,
            address: user.address,
            isVerified: user.isVerified,
            createdAt: user.createdAt
          }
        })
}

const getAllUsers = async (req, res) => {
    const users = await User.find({}, '-password -fcmTokens')
    res.status(200).json({users})
}

const currentUser =  async (req, res) => {

  try{
    const email = req.user.email
    const curruser = await User.findOne({email})

    if(!curruser){
      return res.status(404).json({message: "User not found"})
    }

    res.status(200).json({
      message: "User details retreived successfully",
      user:{
        id: curruser.id,
        fullname: curruser.fullname,
        email: curruser.email,
        address: curruser.address,
        phone_number: curruser.phone_number,
        is_verified: curruser.is_verified
      }
    })
  } catch (error){
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching user details' });
  }
}

const updateUser =  async (req, res) => {
  try {
      const {id} = req.params;
      const updates = req.body;

      if (id !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: Cannot update another user\'s information' });
    }

      const user = await User.findByIdAndUpdate(id, updates, {
          new: true,
          runValidators: true
      });

      if (!user) {
        return res.status(404).json({message : 'User Not Found'})
      }

      res.json({message:"User Updated Sucesfully",user});
  } catch (error) {
    res.status(400).json({message : error.message})
  }
}

const deleteUser = async (req, res) => {
  try {
      const { id } = req.params

      const user = await User.findByIdAndDelete(id)

      if (!user) {
          return res.status(404).json({message : 'User Not Found'})
        }

      res.status(200).json({message : 'User deleted'})
  } catch (error) {
      res.status(400).json({message : error.message})
  }
}

module.exports = {
    getAllUsers,
    getUser,
    currentUser,
    updateUser,
    deleteUser,
};