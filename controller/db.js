const mongoose = require('mongoose');
const Restaurant = require('../model/Restaurants');

async function addRestaurant(data) {
    try {
        const restaurant = new Restaurant(data);
        return await restaurant.save();
      } catch (error) {
        throw error;
      }
}

async function getRestaurantById(id) {
    try {
        return await Restaurant.findById(id);
    } catch (error) {
        throw error;
    }
}

module.exports = {
    addRestaurant,
    getRestaurantById
}