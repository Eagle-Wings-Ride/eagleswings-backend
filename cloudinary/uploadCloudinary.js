const cloudinary = require('./cloudinaryconfig');

const uploadToCloudinary = async (file, folder) => {
    let retries = 2;
    let result;

    while (retries >= 0) {
        try {
            result = await cloudinary.uploader.upload(file.path, {
                folder: folder,
                resource_type: "auto"
            });
            return { url: result.secure_url, public_id: result.public_id };
        } catch (error) {
            console.error("Upload failed, retrying...", retries, error.message);
            retries--;
        }
    }

    throw new Error("Upload failed after multiple attempts");
};

module.exports = uploadToCloudinary;
