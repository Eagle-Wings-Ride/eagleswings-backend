const {Model} = require('mongoose')
const Rates = require('../models/Rate')

// Add a Rate
const addRate = async(req, res) =>{
    const rate_detail = req.body

    try{
        // Check if there isn't already a rate document

        const isRateExist = await Rates.findOne()
        if (isRateExist){
            return res.status(400).json({message: "Rate already exists. Use update instead."})
        }

        const newRate = new Rates(rate_detail)
        await newRate.save()
        res.status(201).json(newRate);
    } catch (err) {
      res.status(500).json({ message: 'Error creating rate', error: err.message });
    }
  };


// Get current Rate
const getRate = async (req, res) => {
    try {
      const rate = await Rates.findOne();
      if (!rate) {
        return res.status(404).json({ message: 'No rate found' });
      }
      res.status(200).json(rate);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching rate', error: err.message });
    }
  };


//  Update Rate
const updateRate = async (req, res) => {
    try {
      const rate = await Rates.findOne();
      if (!rate) {
        return res.status(404).json({ message: 'Rate not found. Please create one first.' });
      }
  
      // Update the rate document with the new data
      const updatedRate = await Rates.findOneAndUpdate({}, req.body, { new: true });
      res.status(200).json(updatedRate);
    } catch (err) {
      res.status(500).json({ message: 'Error updating rate', error: err.message });
    }
  };


//   Delete Rate
const deleteRate = async (req, res) => {
    try {
      const rate = await Rates.findOne();
      if (!rate) {
        return res.status(404).json({ message: 'Rate not found' });
      }
  
      // Delete the rate
      await Rates.deleteOne({ _id: rate._id });
      res.status(200).json({ message: 'Rate deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Error deleting rate', error: err.message });
    }
  };


module.exports = {
    addRate,
    getRate,
    updateRate,
    deleteRate
}