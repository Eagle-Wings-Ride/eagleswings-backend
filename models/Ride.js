const mongoose = require("mongoose");
const {Schema} = mongoose;

const RideSchema = new Schema({

 booking:{
   type: Schema.Types.ObjectId,
   ref:"Bookings",
   required:true
 },

 assignment:{
   type: Schema.Types.ObjectId,
   ref:"Assignment",
   required:true
 },

 driver:{
   type: Schema.Types.ObjectId,
   ref:"Driver",
   required:true
 },

 serviceDate:{
   type:Date,
   required:true,
 },

 status:{
   type:String,
   enum:[
     "pending",
     "enroute_pickup",
     "picked_up",
     "completed",
     "cancelled"
   ],
   default:"pending"
 },

 lastLocation:{
   lat:Number,
   lng:Number,
   timestamp:Date
 }

},{timestamps:true});


module.exports = mongoose.model("Ride", RideSchema);