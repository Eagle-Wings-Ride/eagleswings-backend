const cloudinary = require('./cloudinaryconfig');

const uploadToCloudinary = async (file, folder) => {
    let retries = 2;

    while (retries >= 0) {
        try {
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder, resource_type: "auto" },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                stream.end(file.buffer); // Send the file buffer to Cloudinary
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