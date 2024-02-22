const express = require('express')
const { Op } = require('sequelize');

const { ReviewImage, Review } = require('../../db/models');
const router = express.Router();

/* ==============================================================================================================
                                                GET ROUTES
============================================================================================================== */

// Get all Review Images
router.get("/", async(req, res) => {
    const reviewImages = await ReviewImage.findAll();

    return res.json(reviewImages)
})

/* ==============================================================================================================
                                               DELETE ROUTES
============================================================================================================== */

// Delete a Review Image
router.delete("/:reviewImageId", async(req, res) => {
    const { reviewImageId } = req.params
    const userId = req.user?.id
    const reviewImage = await ReviewImage.findByPk(reviewImageId)
    if(!reviewImage){
        return res.status(404).json({ message: "Review Image couldn't be found" })
    }
    
    const review = await Review.findByPk(reviewImage.reviewId)
    if(!userId || userId !== review.userId){
        return res.status(404).json({ message: "You are not authorized to delete this review image." })
    }

    await reviewImage.destroy()
    res.json({ message: "Successfully deleted"})
})
module.exports = router;
