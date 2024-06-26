const express = require('express')
const { Op } = require('sequelize');
const sequelize = require('sequelize');

const { Review, User, Spot, ReviewImage, SpotImage } = require('../../db/models');
const { formatDate } = require('../../utils/helper');
const router = express.Router();


/* ==============================================================================================================
                                                GET ROUTES
============================================================================================================== */

//Get all Reviews
router.get("/", async(req, res) => {
    const reviews = await Review.findAll();

    return res.json(reviews)
})

//Get reviews of current user
router.get("/current", async(req, res) => {
    const userId = req.user?.id
    if(!userId){
        return res.status(401).json({message: "Authentication required"})
    }

    let reviews = await Review.findAll({
        where: { userId },
        include: [
            {
                model: User,
                attributes: [ 'id', 'firstName', 'lastName' ]
            },
            {
                model: Spot,
                attributes: [
                    'id', 'ownerId', 'address', 'city', 'state', 'country', 'lat', 'lng', 'name', 'price',
                ],
                include: {
                    model: SpotImage,
                    where: {
                        preview: true
                    },
                },
            },
            {
                model: ReviewImage,
                attributes: [ 'id', 'url' ]
            }
        ],
    })

    // This is absolutely disgusting but it does work to pull the previewImage url out from the nested object
    for(let i = 0; i < reviews.length; i++){
        const url = reviews[i].Spot.dataValues.SpotImages[0].dataValues.url
        delete reviews[i].Spot.dataValues.SpotImages
        reviews[i].Spot.dataValues.previewImage = url
    }
    // ------------------------------------------

    //Possible issue here?
    reviews = formatDate(reviews)
    return res.json({Reviews: reviews})
})

/* ==============================================================================================================
                                                POST ROUTES
============================================================================================================== */

// Add image to a review
router.post("/:reviewId/images", async(req, res) => {
    const userId = req.user?.id
    const { reviewId } = req.params
    const { url } = req.body

    const review = await Review.findByPk(reviewId, {raw: true})
    if(!userId){
        return res.status(401).json({ message: "Authentication required" })
    }
    if(!review){
        return res.status(404).json({ message: "Review couldn't be found"})
    }
    if(review.userId !== userId){
        return res.status(403).json({message: "Forbidden"})
    }

    const currReviewImages = await ReviewImage.findAll({
        where: { reviewId },
        raw: true
    })
    if(currReviewImages.length >= 10){
        return res.status(403).json({ message: "Maximum number of images for this resource was reached"})
    }

    const reviewImage = await ReviewImage.create({
        reviewId,
        url
    })

    return res.json({
        id: reviewImage.id,
        url: reviewImage.url
    })
})

/* ==============================================================================================================
                                                PUT ROUTES
============================================================================================================== */

// Edit a Review
router.put("/:id", async(req, res) => {
    const userId = req.user?.id
    const { id } = req.params
    const { review: body, stars } = req.body

    if(!userId){
        return res.status(401).json({ message: "Authentication required" })
    }
    let review = await Review.findByPk(id)
    if(!review){
        return res.status(404).json({ message: "Review couldn't be found"})
    }
    if(review.userId !== userId){
        return res.status(403).json({ message: "Forbidden" })
    }

    try {
        review.set({
            review: body, stars
        })
        await review.save()

        //Updating the spot's rating, not very efficient, should have probably gone with the other db model if I have to do this anyways
        const reviews = await Review.findAll({
            where: { spotId: id },
            raw: true
        })
        let total = 0
        reviews.forEach((r) => total += r.stars)
        const avg = Number((total / reviews.length).toFixed(2))

        const spot = await Spot.findByPk(id)
        spot.set({
            avgRating: avg
        })
        await spot.save()

        review = formatDate(review)
        return res.json(review);

    } catch(e) {
        const err = { message: "Bad Request" }
        const errors = {}
        e.errors.forEach(error => {
            const errItem = error.path
            switch (errItem) {
                case 'stars': errors.stars = "Stars must be an integer from 1 to 5"; break;
                case 'review': errors.city = "Review text is required"; break;
                default: errors.default = "No error found. Please try again."; break;
            }
        })

        err.errors = errors
        return res.status(400).json(err)
    }
})

/* ==============================================================================================================
                                                DELETE ROUTES
============================================================================================================== */

// Delete a Review
router.delete("/:id", async (req, res) => {
    const { id } = req.params
    const userId = req.user?.id
    const review = await Review.findByPk(id)

    if(!userId){
        return res.status(401).json({ message: "Authentication required" })
    }
    if(!review){
        return res.status(404).json({ message: "Review couldn't be found" })
    }
    if(review.userId !== userId){
        return res.status(403).json({ message: "Forbidden" })
    }

    const spot = await Spot.findByPk(review.spotId)
    const newRating = ((spot.avgRating * spot.numReviews) - review.stars) / (spot.numReviews - 1)

    // Updating spot to reflect new review
    spot.set({
        numReviews: spot.numReviews - 1,
        avgRating: Number(newRating.toFixed(2))
    })
    await spot.save()


    await review.destroy()
    res.json({ message: "Successfully deleted"})
})

module.exports = router;
