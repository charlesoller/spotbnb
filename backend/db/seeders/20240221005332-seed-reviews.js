'use strict';

const { Review } = require('../models');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

module.exports = {
  async up (queryInterface, Sequelize) {
    await Review.bulkCreate([
      {
        userId: 2,
        spotId: 1,
        review: "Pretty sweet place.",
        stars: 4
      },
      {
        userId: 1,
        spotId: 2,
        review: "It was just really scary.",
        stars: 2
      },
      {
        userId: 2,
        spotId: 2,
        review: "It was good.",
        stars: 3
      },
    ], { validate: true });
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Reviews';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      review: { [Op.in]: ["Pretty sweet place.", "It was just really scary.", "It was good."] }
    }, {});
  }
};
