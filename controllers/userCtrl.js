const { Model } = require('mongoose')
const User = require('../models/User')


const getUser = async (req, res) => {
    const {id:userId} = req.params
    const user = await User.findById(userId)

    if (!user) {
        return res.status(404).json(" User Not Found")
    }

    res.status(200).json({user})
}

const getAllUsers = async (req, res) => {
    const users = await User.find({})
    res.status(200).json({users})
}

const currentUser =  async (req, res) => {
    res.status(200).json({ user: req.user });
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