require("dotenv").config();

const express = require("express");
const ejs = require("ejs");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { query, validationResult } = require("express-validator");

const Restaurants = require("./model/Restaurants");
const Users = require("./model/User");

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const PORT = process.env.PORT || 4000;
const DBURI = process.env.MONGO_URI;

const validateQueryParams = [
    query("page").isInt({ min: 1 }).toInt(),
    query("perPage").isInt({ min: 1 }).toInt(),
    query("borough").optional().isString(),
];

// conntect with the database
mongoose
    .connect(DBURI)
    .then((result) => {
        app.listen(PORT, () => {
            console.log("Server started on http://localhost:" + PORT); // if connected then only listen to PORT
        });
    })
    .catch((err) => console.log(err));

//////////////////////////////////////////////////////////////// USER

app.get('/register', (req, res) => {
    res.render('register', {title: 'Register', errors: []});
})

app.post('/register', (req, res) => {
    const {firstName, lastName, email, password} = req.body;

    const errors = []

    if(firstName == '' || lastName == '' || email == '' || password == ''){
        errors.push('Empty Fields');
    }

    if (errors.length > 0) {
        res.render('register', { title: 'Register', errors });
    }
})

app.get('/login', (req, res) => {
    res.render('login', {title: 'Login', errors: []});
})

app.post('/login', (req, res) => {
    const {email, password} = req.body;

    const errors = []

    if(email == '' || password == ''){
        errors.push('Empty Fields');
    }

    if (errors.length > 0) {
        res.render('login', { title: 'Login', errors });
    }
})

////////////////////////////////////////////////////////////////

app.get("/api/restaurants", (req, res) => {
    res.render("test", {
        title: "Test",
        restaurants: null,
        prevPage: null,
        nextPage: null,
    });
});

app.get("/api/restaurants/find", validateQueryParams, async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { page, perPage, borough } = req.query;

        // Determine skip value based on pagination
        const skip = (page - 1) * perPage;

        // Construct the query object
        const query = {};
        if (borough) {
            query.borough = borough;
        }

        // Fetch restaurants from the database based on pagination and optional filtering
        const restaurants = await Restaurants.find(query)
            .sort({ restaurant_id: 1 })
            .skip(skip)
            .limit(perPage);

        res.render("test", {
            title: "t",
            restaurants,
            page,
            perPage,
            borough,
            prevPage: parseInt(page) > 1 ? parseInt(page) - 1 : null,
            nextPage: restaurants.length === perPage ? parseInt(page) + 1 : null,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get("/getRestaurants", (req, res) => {
    res.render("getRestaurants", {
        title: "Restaurants",
        data: null,
        message: "",
    });
});

app.post("/getRestaurants", (req, res) => {
    const { id } = req.body;

    // Check if the ID is empty or not a valid ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        res.render("getRestaurants", {
            title: "Restaurants",
            data: null,
            message: "Invalid Restaurant ID!",
        });
        return;
    }

    Restaurants.findById(id)
        .then((result) => {
            if (result) {
                res.render("getRestaurants", {
                    title: "Restaurants",
                    data: result,
                    message: "",
                });
            } else {
                res.render("getRestaurants", {
                    title: "Restaurants",
                    data: null,
                    message: "Not Id Exist",
                });
            }
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send("Internal Server Error");
        });
});

app.get("/addRestaurants", (req, res) => {
    res.render("addRestaurant", { title: "Add Restaurant", message: "" });
});

app.post("/addRestaurants", (req, res) => {
    const newData = {
        building: req.body.building,
        address: {
            coord: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
            street: req.body.street,
            zipcode: req.body.zipcode,
        },
        borough: req.body.borough,
        cuisine: req.body.cuisine,
        name: req.body.name,
        restaurant_id: req.body.restaurant_id,
        grades: req.body.grades.map((grade) => ({
            date: new Date(grade.date),
            grade: grade.grade,
            score: parseInt(grade.score),
        })),
    };

    Restaurants.create(newData)
        .then((result) =>
            res.render("addRestaurant", {
                title: "Add Restaurant",
                message: "Restaurant added successfully!",
            })
        )
        .catch((err) => console.log(err));
});

app.get("/updateResturant/:id", (req, res) => {
    const { id } = req.params;

    // console.log(id);

    Restaurants.findById(id)
        .then((result) =>
            res.render("updateRestaurant", { title: "Update", updateValue: result })
        )
        .catch((err) => console.log(err));
});

app.post("/updateResturant", (req, res) => {
    const id = req.body.id;
    const newData = {
        building: req.body.building,
        address: {
            coord: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
            street: req.body.street,
            zipcode: req.body.zipcode,
        },
        borough: req.body.borough,
        cuisine: req.body.cuisine,
        name: req.body.name,
        restaurant_id: req.body.restaurant_id,
        grades: req.body.grades.map((grade) => ({
            date: new Date(grade.date),
            grade: grade.grade,
            score: parseInt(grade.score),
        })),
    };

    Restaurants.findByIdAndUpdate(id, newData)
        .then((result) => res.redirect("/"))
        .catch((err) => console.log(err));
});

app.get("/deleteResturant/:id", (req, res) => {
    const { id } = req.params;

    Restaurants.findByIdAndDelete(id)
        .then((result) => res.redirect("/"))
        .catch((err) => console.log(err));
});

app.get("/about", (req, res) => {
    res.render('about', {title: "About Us"})
})

app.get("/", (req, res) => {
    Restaurants.find()
        .limit(10)
        .then((result) =>
            res.render("index", { title: "ALL", restaurants: result })
        )
        .catch((err) => console.log(err));
});

app.use("", (req, res) => {
    res.status(400).send("404");
});
