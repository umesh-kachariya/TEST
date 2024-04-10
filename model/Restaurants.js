const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const restaurantSchema = new Schema({
    address: {
        building: String,
        coord: {
            type: [Number], // Define type as an array of numbers
            index: '2dsphere' // Specify index for geospatial queries
        },
        street: String,
        zipcode: String
    },
    borough: String,
    cuisine: String,
    grades: [{
        _id: false,
        date: Date,
        grade: String,
        score: Number
    }],
    name: String,
    restaurant_id: String
});

const Restaurants = mongoose.model('Restaurants', restaurantSchema);

module.exports = Restaurants;
