require("dotenv").config();

const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const session = require("express-session");
// const MongoDbSession = require("connect-mongodb-session")(session);

const { query, validationResult } = require("express-validator");

const Restaurants = require("./model/Restaurants");
const Users = require("./model/User");

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'test',
    resave: false,
    saveUninitialized: false
}))

const PORT = process.env.PORT || 4000;
const DBURI = process.env.MONGO_URI;

const validateQueryParams = [
    query("page").isInt({ min: 1 }).toInt(),
    query("perPage").isInt({ min: 1 }).toInt(),
    query("borough").optional().isString(),
];

const isAuth = (req, res, next) => {
    if(req.session.isAuth) {
        next();
    } else {
        res.redirect('/login');
    }
}

const isAuthjWT = (req, res, next) => {
    const token = req.session.token;
    if (token) {
        jwt.verify(token, process.env.SECRETKEY, (err, decoded) => {
            if (err) {
                res.redirect('/login');
            } else {
                req.user = decoded;
                next();
            }
        });
    } else {
        res.redirect('/login');
    }
};

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

app.post('/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    const errors = [];

    if (firstName == '' || lastName == '' || email == '' || password == '') {
        errors.push('Empty Fields');
    }

    // console.log(email);
    let user = await Users.findOne({ email });

    if (user !== null) {
        errors.push('User Already Exists!');
    }

    if (errors.length > 0) {
        res.render('register', { title: 'Register', errors });
    } else {
        try {
            const hashedPassword = await bcrypt.hash(password, 12);

            user = new Users({
                firstName,
                lastName,
                email,
                password: hashedPassword
            });

            await user.save();
            res.redirect('/login');
        } catch (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        }
    }
});

app.get('/login', (req, res) => {
    res.render('login', {title: 'Login', errors: []});
})

app.post('/login', async (req, res) => {
    const {email, password} = req.body;

    const errors = [];

    if(email == '' || password == ''){
        errors.push('Empty Fields');
    }

    let user = await Users.findOne({email});

    if(user === null) {
        errors.push('User does not Exist!');
    } else {
        const isMatchedPassword = await bcrypt.compare(password, user.password);

        if(!isMatchedPassword) {
            errors.push('Password does not match!');
        }
    }

    if (errors.length > 0) {
        res.render('login', { title: 'Login', errors });
    } else {
        const token = jwt.sign({ userId: user._id }, process.env.SECRETKEY); // ADDED
        req.session.token = token; // ADDED

        req.session.user = user;
        req.session.isAuth = true;
        res.redirect('/');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(); 
    res.redirect('/login');
});


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
            title: "Search",
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
                res.render('findRestaurant', {title: "Resturant Info", restaurant: result});
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

app.get("/addRestaurants", isAuth, (req, res) => {
    res.render("addRestaurant", { title: "Add Restaurant", message: "" });
});

app.post("/addRestaurants", (req, res) => {
    const newData = {
        address: {
            building: req.body.building,
            coord: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
            street: req.body.street,
            zipcode: req.body.zipcode,
        },
        borough: req.body.borough,
        cuisine: req.body.cuisine,
        name: req.body.name,
        restaurant_id: req.body.restaurant_id,
        // Ensure grades array is properly formatted
        grades: req.body.grades.map((grade) => ({
            // Parse date string to Date object, handle invalid dates
            date: new Date(grade.date) || null,
            // Ensure grade is a string, handle invalid grades
            grade: typeof grade.grade === 'string' ? grade.grade : null,
            // Parse score to integer, handle invalid scores
            score: parseInt(grade.score) || null,
        })).filter(grade => grade.date && grade.grade && !isNaN(grade.score)),
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
        address: {
            building: req.body.building,
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

app.get("/findResturant/:id", (req, res) => {
    const id = req.params.id;

    Restaurants.findById(id)
        .then((result) => res.render('findRestaurant', {title: "Resturant Info", restaurant: result}))
        .catch((err) => console.log(err));
})

app.get("/about", (req, res) => {
    res.render('about', {title: "About Us"})
})

app.get("/", isAuthjWT ,(req, res) => {
    const user = req.session.user;
    Restaurants.find()
        .limit(9)
        .then((result) =>
            res.render("index", { title: "ALL", restaurants: result, user })
        )
        .catch((err) => console.log(err));
});

app.use("", (req, res) => {
    res.status(400).send("404");
});
