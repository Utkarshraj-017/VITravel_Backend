const userModel = require('../models/user.model');

const getMyProfileController = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming the user ID is stored in req.user after authentication
        const user = await userModel.findById(userId).select('-password');

        if(!user){
            return res.status(404).json({message: "User not found"});
        }

        res.status(200).json({user});
    } 
    catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({message: "Internal server error"});
    }
};

// only lets the user update their name, not username or phone number
const updateMyProfileController = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: "Valid name is required"
            });
        }

        const user = await userModel
            .findByIdAndUpdate(
                userId,
                { name: name.trim() },
                { new: true, runValidators: true }
            )
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            user
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const getUserByIdController = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        // Find user and return only public information
        const user = await userModel
            .findById(id)
            .select("name username");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            user
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    getMyProfileController,
    updateMyProfileController,
    getUserByIdController
}