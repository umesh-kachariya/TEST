require("dotenv").config();

const express = require("express");
const ejs = require("ejs");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const db = require('./controller/db');

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: true}));

const PORT = process.env.PORT || 4000;
const DBURI = process.env.MONGO_URI;

// conntect with the database
mongoose.connect(DBURI)
    .then((result) => {
        app.listen(PORT, () => {
            console.log("Server started on port: " + PORT); // if connected then only listen to PORT
        })
    })
    .catch((err) => console.log(err));

app.get('/api/restaurants/:id', async (req, res) => {
    const {id} = req.params;

     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.render('getRestaurants', { title: 'Restaurants', data: null, message: 'Invalid Restaurant ID!' });
        return;
    }

    try {
      const restaurant = await db.getRestaurantById(id)      
      res.render('getRestaurants', { title: 'Restaurants', data: restaurant, message:    '' })
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
});

app.post('/api/addRestaurants', async (req, res) => {
    const newData = {
        building: req.body.building,
        address: {
            coord: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
            street: req.body.street,
            zipcode: req.body.zipcode
        },
        borough: req.body.borough,
        cuisine: req.body.cuisine,
        name: req.body.name,
        restaurant_id: req.body.restaurant_id,
        grades: req.body.grades.map(grade => ({
            date: new Date(grade.date),
            grade: grade.grade,
            score: parseInt(grade.score)
        }))
    };

    try {
        const restaurant = await db.addRestaurant(newData)      
        res.render('addRestaurant', {title: "Add Restaurant", message: "Restaurant added successfully!"})
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add restaurant" });
      }

})


app.get('/', (req, res) => {
    Restaurants.find().limit(10)
        .then((result) => res.render('index', {title: "ALL", restaurants: result}))
        .catch((err) => console.log(err));
})

app.use('', (req, res) => {
    res.status(400).send("404");
})


