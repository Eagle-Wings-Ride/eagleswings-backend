const { Model } = require("mongoose");
const Book = require("../models/Book")
const Child = require("../models/Child");
const Admin = require("../models/Admin");
const cloudinary = require('../cloudinary/cloudinaryconfig');
const uploadToCloudinary = require("../cloudinary/uploadCloudinary");
const {BookingStatus} = require("../utils/bookingEnum");

// Add/Register a Child
const addChild = async (req, res) => {
  const {
    fullname,
    age,
    grade,
    relationship,
    school,
    home_address,
    school_address,
    daycare_address,
  } = req.body;

  if (!req.user || !req.user.userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!fullname || !age) {
    return res
      .status(400)
      .json({ message: "Required fields missing: fullname or age" });
  }

  if (age < 0 || !Number.isInteger(Number(age))) {
    return res.status(400).json({ message: "Invalid age provided" });
  }

  const userId = req.user.userId;

  try {
    let imageUrl = null;

    if (req.file) {
      if (!req.file.buffer || req.file.buffer.length === 0) {
        throw new Error("Empty file buffer before upload");
      }
      const uploadedFile = await uploadToCloudinary(req.file, "children");
      imageUrl = uploadedFile.url;
    }

    const child = new Child({
      fullname: fullname.trim(),
      image: imageUrl,
      age,
      grade,
      relationship,
      school,
      home_address,
      school_address,
      daycare_address: daycare_address?.trim() || undefined,
      user: userId,
    });

    await child.save();
    res.status(201).json(child);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get a specific child
const getChild = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);

    if (!child) return res.status(404).json({ message: "Child not found" });

    const isAdmin = await Admin.findById(req.user.adminId);
    if (!isAdmin && !child.user.equals(req.user.userId)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Yoou cannot access this child" });
    }

    res.status(200).json(child);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all children for a specific user by user ID (for admins or specific requests)
const getChildren = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const isAdmin = req.user.role === "admin";

    const children = isAdmin
      ? await Child.find()
      : await Child.find({ user: req.user.userId });

    res.status(200).json(children);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Update a child's information
const updateChild = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user?.userId)
      return res.status(401).json({ message: "User not authenticated" });

    const child = await Child.findById(id);
    if (!child) return res.status(404).json({ message: "Child not found" });

    const isOwner = child.user.toString() === req.user.userId;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Forbidden" });

    const updates = { ...req.body };
    delete updates.user;

    if (req.file) {
      // Delete old image if present
      if (child.image_public_id) {
        try {
          console.log("To be Deleted", child.image_public_id);
          await cloudinary.uploader.destroy(child.image_public_id);
          console.log("Deleted", child.image_public_id);
        } catch (err) {
          console.warn("Failed to delete old image:", err.message);
        }
      }

      // Upload new image
      const uploadedFile = await uploadToCloudinary(req.file, "children");
      updates.image = uploadedFile.url;
      updates.image_public_id = uploadedFile.public_id;
      console.log("New", updates.image_public_id);

    }

    const updatedChild = await Child.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    // Remove public_id from response
    const { image_public_id, ...childResponse } = updatedChild.toObject();

    res.status(200).json({
      message: "Child updated successfully",
      updatedChild: childResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

// Delete a child's information
const deleteChild = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user?.userId)
      return res.status(401).json({ message: "User not authenticated" });

    const child = await Child.findById(id);
    if (!child) return res.status(404).json({ message: "Child not found" });

    const isOwner = child.user.toString() === req.user.userId;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Forbidden" });

    // Check for active bookings
    const activeBooking = await Book.findOne({
      child: id,
      status:{
        $in: [
          BookingStatus.BOOKED,
          BookingStatus.PAID,
          BookingStatus.ASSIGNED,
          BookingStatus.ONGOING,
        ],
      },
    });
    if (activeBooking) {
      return res.status(400).json({
        message: "Cannot delete child with active bookings",
      });
    }

    // Delete Cloudinary image if exists
    if (child.image_public_id) {
      try {
        await cloudinary.uploader.destroy(child.image_public_id);
      } catch (err) {
        console.warn("Cloudinary image deletion failed:", err.message);
      }
    }

    // Delete the child record
    await Child.findByIdAndDelete(id);

    res.status(200).json({ message: "Child deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addChild,
  getChild,
  getChildren,
  updateChild,
  deleteChild,
};
