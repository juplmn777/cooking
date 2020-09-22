const express = require('express');

const app = express();
const port = 3000;

const dotenv = require('dotenv').config();

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const randToken = require('rand-token');

const session = require('express-session');

const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");

const nodemailer = require("nodemailer");
const methodOverride = require('method-override');





// app.use(flash());
// app.use((req,res)=>{
//     res.locals.currentUser = req.user;
//     res.locals.error = req.flash("error");
//     res.locals.success = req.flash("success");
//     next();
// });

// IMPORT MODELS
const User = require("./models/user");
const Reset = require("./models/reset");
const Recipe = require("./models/recipe");
const Favourite = require("./models/favourite");
const Ingredient = require("./models/ingredient");
const Schedule = require("./models/schedule");

//SESSION attention à l'ordre cf doc express-session
app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: false
}));


//PASSPORT
app.use(passport.initialize());
app.use(passport.session()); //lien entre passport et session

//MONGOOSE+ATLAS mongoDB
mongoose.connect("mongodb+srv://jurecipes:3manc1pator1981@cluster0.w0htf.mongodb.net/recipes?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

//PASSPORT LOCAL MONGOOSE (permet a passport de gerer les requetes)
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//EJS VIEW-FOLDER
app.set('view engine', 'ejs');
//PUBLIC FOLDER
app.use(express.static('public'));

//BODY-PARSER
app.use(bodyParser.urlencoded({
    extended: false
}));

//METHOD OVERRIDE
app.use(methodOverride('_method'));

//FLASH MESSAGES
const flash = require('connect-flash');
const recipe = require('./models/recipe');
const favourite = require('./models/favourite');
app.use(flash());
app.use((req,res,next)=>{
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});




//GET : HOME ROUTE
app.get('/', (req, res) => {
    res.render("index");
});

//GET : SIGNUP ROUTE
app.get('/signup', (req, res) => {
    res.render('signup');
});

//POST : SIGNUP ROUTE
app.post('/signup', (req, res) => {
    const newUser = new User({
        username: req.body.username
    });
    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect('/signup');
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect('/login');
            });
        }
    });
});

app.get("/login", (req, res) => {
    res.render('login');
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.logIn(user, (err) => {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/dashboard");
            });
        }
    })
});

//GET DASHBOARD ROUTE
app.get("/dashboard",isLoggedIn, (req, res) => {
    res.render('dashboard');
});

//LOGOUT
app.get('/logout', (req, res) => {
    req.logOut();
    req.flash("success","you've been logged out !!! Thnks for coming ;-)");
    res.redirect('/');
});

app.get("/forgot", (req, res) => {
    res.render("forgot");
});

app.post("/forgot", (req, res) => {
    User.findOne({
        username: req.body.username
    }, (err, userFound) => {
        if (err) {
            console.log(err);
            res.redirect("/login");
        } else {
            const token = randToken.generate(16);
            Reset.create({
                username: userFound.username,
                resetPasswordToken: token,
                resetPasswordExpiration: Date.now() + 3600000 //expire in 1 hour = 3600000 ms
            });
            //NODEMAILER
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'testnodejscookingmama@gmail.com',
                    pass: process.env.PWD
                }
            });
            const mailOptions = {
                from: 'testnodejscookingmama@gmail.com',
                to: req.body.username,
                subject: 'reset your password',
                text: 'click here to reset your password : http://localhost:3000/reset/' + token
            }
            console.log("mail attempt to be send");
            transporter.sendMail(mailOptions, (err, response) => {
                if (err) {
                    console.log(err);
                } else {
                    req.flash("success","mail successfully send !!! check your mail address.")
                    res.redirect("/login");
                }
            });
        }
    });
});

//GET RESET/TOKEN ROUTE
app.get("/reset/:token", (req, res) => {
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpiration: {
            $gt: Date.now()
        }
    }, (err, object) => {
        if (err) {
            req.flash("error", " error : token expired !!!")
            console.log('token expired');
            res.redirect('/login');
        } else {
            res.render('reset', {
                token: req.params.token
            })
        }
    });
});

//POST RESET/TOKEN ROUTE
app.post("/reset/:token", (req, res) => {
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpiration: {
            $gt: Date.now()
        }
    }, (err, obj) => {
        if (err) {
            console.log('token expired');
            res.redirect('/login');
        } else {
            if (req.body.password == req.body.password2) {
                User.findOne({
                    username: obj.username
                }, (err, user) => {
                    if (err) {
                        console.log(err);
                    } else {
                        user.setPassword(req.body.password, (err) => {
                            if (err) {
                                console.log(err);
                            } else {
                                user.save();
                                const updatedReset = {
                                    resetPasswordToken: null,
                                    resetPasswordExpiration: null
                                }
                                Reset.findOneAndUpdate({
                                    resetPasswordToken: req.params.token
                                }, updatedReset, (err, object1) => {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        res.redirect("/login");
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    });

});


//GET RECIPES ROUTE (list of recipes)
app.get("/dashboard/myrecipes", isLoggedIn ,(req, res)=>{
    Recipe.find({
        user: req.user.id
    }, (err,recipe)=>{
        if(err){
            console.log(err);
        }else{
            res.render("recipe",{recipe: recipe});
        }
    });   
});

//ADD A RECIPE
app.get("/dashboard/newrecipe", isLoggedIn, (req,res) =>{
    res.render("newrecipe");
});

app.post("/dashboard/newrecipe", (req,res)=>{
    const newRecipe = {
        name: req.body.recipeName,
        image: req.body.logo,
        user: req.user.id
    }
    Recipe.create(newRecipe, (err, newRecipe)=>{
        (err) ? console.log(err) : req.flash("success", "New recipe added !!!");
        res.redirect("/dashboard/myrecipes");
    });
});

//ONE RECIPE ROUTE
app.get("/dashboard/myrecipes/:id", (req,res)=>{
    Recipe.findOne({
        user: req.user.id,
        _id: req.params.id
    }, (err, recipeFound)=>{
        if(err){
            console.log(err);
        }else{
            Ingredient.find({
                user: req.user.id,
                recipe: req.params.id
            },(err, ingredientFound)=>{
                err ? console.log(err) : res.render("ingredients", {
                    ingredient: ingredientFound,
                    recipe: recipeFound
                });
            })
        }
    })
})

//DELETING A RECIPE
app.delete("/dashboard/myrecipes/:id", isLoggedIn, (req,res)=> {
    Recipe.deleteOne({
        _id : req.params.id
    }, (err) => {
        if(err){
        console.log(err);
        }else{
            req.flash("success", "recipe successfully removed !!!");
            res.redirect("/dashboard/myrecipes");
        }
    })
});

//NEW INGREDIENT ROUTE
app.get("/dashboard/myrecipes/:id/newingredient", (req,res)=>{
    Recipe.findById({
        _id: req.params.id
    }, (err, found)=>{
        if(err){
            console.log(err);
        }else{
            res.render("newingredient", {
                recipe : found
            })
        }
    })
})

//POST NEW INGREDIENT
app.post("/dashboard/myrecipes/:id", (req,res)=>{
    const newIngredient = {
        name: req.body.name,
        bestDishWith: req.body.dish,
        user : req.user.id,
        quantity: req.body.quantity,
        recipe : req.params.id
    }
    Ingredient.create(newIngredient, (err, newIngredient)=>{
        if(err){
            console.log(err);
        }else{
            req.flash("success","An Ingredient has been added !!!");
            res.redirect("/dashboard/myrecipes/"+req.params.id);
        }
    })
});

//APP.DELETE (INGREDIENT)
app.delete("/dashboard/myrecipes/:id/:ingredientid", isLoggedIn, (req,res)=> {
    Ingredient.deleteOne({
        _id : req.params.ingredientid
    }, (err) => {
        if(err){
        console.log(err);
        }else{
            req.flash("success", "ingredient successfully removed !!!");
            res.redirect("/dashboard/myrecipes/"+req.params.id);
        }
    })
});

//INGREDIENT UPDATE
app.post("/dashboard/myrecipes/:id/:ingredientid/edit",isLoggedIn, (req,res)=>{
    Recipe.findOne({
        user: req.user.id,
        _id: req.params.id 
    }, (err, recipeFound)=>{
        if(err){
            console.log(err);
        }else{
            Ingredient.findOne({
                _id: req.params.ingredientid,
                recipe: req.params.id
            }, (err, ingredientFound)=>{
                if(err){
                    console.log(err);
                }else{
                    res.render("edit", {
                        ingredient : ingredientFound,
                        recipe : recipeFound
                    })
                }
            })
        }
    })
});

app.put("/dashboard/myrecipes/:id/:ingredientid", isLoggedIn, (req,res)=>{
    const updated_ingredient = {
        name: req.body.name,   //NAME OF THE INGREDIENT
        bestDishWith: req.body.dish,   //BEST DISH WITH THIS INGREDIENT
        user: req.user.id,   //USER
        quantity: req.body.quantity,   //INGREDIENTS QUANTITY
        recipe: req.params.id,     //RECIPE TO DO WITH INGREDIENT
    }
    Ingredient.findOneAndUpdate({
        _id : req.params.ingredientid
    }, updated_ingredient, (err, ingredientUpdated)=>{
        if(err){
            console.log(err);
        }else{
            req.flash("success", "your ingredient has been updated successfully !!!");
            res.redirect("/dashboard/myrecipes/"+req.params.id);
        }
    })
})

//ROUTE FAVOURITES
app.get("/dashboard/favorites/", isLoggedIn, (req,res)=>{
    Favourite.find({
            user: req.user.id
        },(err,favourite)=>{
            if(err){
            console.log(err);
            }else{
                res.render("favorites", { favourite : favourite});
            }

        })

})

//DELETING A FAVOURITE RECIPE
app.delete("/dashboard/favorites/:id", isLoggedIn, (req,res)=> {
    Favourite.deleteOne({
        _id : req.params.id
    }, (err) => {
        if(err){
        console.log(err);
        }else{
            req.flash("success", "Favourite recipe successfully removed !!!");
            res.redirect("/dashboard/favorites");
        }
    })
});

//FAVOURITE RECIPEs
app.get("/dashboard/favorites/newfavorite", isLoggedIn, (req,res)=>{
    res.render("newfavorite");
});

//ADDING A FAVOURITES RECIPES
app.post("/dashboard/favorites",isLoggedIn, (req,res)=>{
    const newFavourite = {
        image: req.body.image,  
        title: req.body.title,  
        description: req.body.description,    
        user: req.user.id  
    }
    favourite.create(newFavourite, (err,newFavourite)=>{
        if(err){
            console.log(err);
        }else{
            req.flash("success","You've added a new favorite recipe !!!");
            res.redirect("/dashboard/favorites");
        }
    })
})

//SCHEDULES ROUTE
app.get("/dashboard/schedule", isLoggedIn, (req,res)=>{
    Schedule.find({
        user : req.user.id
    }, (err,schedule)=>{
        if(err){
            console.log(err);
        }else{
            res.render("schedule",{schedule : schedule});
        }
    })
});


//NEW SHEDULE ROUTE
app.get("/dashboard/schedule/newschedule", isLoggedIn, (req,res)=> {
    res.render("newschedule");
});

//ADDING A SCHEDULE
app.post("/dashboard/schedule", isLoggedIn, (req,res)=>{
    const newSchedule = {
        recipeName: req.body.recipename,
        scheduleDate: req.body.scheduledate,
        user: req.user.id,
        cookingTime: req.body.cookingtime
    }
    Schedule.create(newSchedule, (err,newSchedule)=>{
        if(err){
            console.log(err);
        }else{
            req.flash("success", "A new Schedule has successfully been added !!!");
            res.redirect("/dashboard/schedule");
        }
    })
});

//DELETING A SCHEDULE
app.delete("/dashboard/schedule/:id", isLoggedIn, (req,res)=> {
    Schedule.deleteOne({
        _id : req.params.id
    }, (err) => {
        if(err){
        console.log(err);
        }else{
            req.flash("success", "Schedule successfully removed !!!");
            res.redirect("/dashboard/schedule");
        }
    })
});


//CHECK USER AUTHENTICATION FUNCTION
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }else{
        req.flash("error","you're not connected !!! Please log first...");
        res.redirect("/login")
    }
}


//RUN SERVER
app.listen(port, () => {
    console.log(`app run at port : ${port}`);
});