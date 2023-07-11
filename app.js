//jshint esversion:6

require('dotenv').config();
// const md5 = require("md5")

const bcrypt = require("bcrypt")
const saltRound = 10

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption")

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");



const app = express();
// console.log(process.env.API_KEY);
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(session({
    secret: "Our little secret",
    recieve: false,
    saveUninitialized: false,
    resave: true
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', true);
mongoose.connect('mongodb://127.0.0.1/userDB', {
    useUnifiedTopology: true,
    useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
})
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// const secret = process.env.SECRET

const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
        });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    (accessToken, refreshToken, profile, cb) => {

        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));



// userSchema.plugin(encrypt , {secret: secret , encryptedFields:["password"] });

app.get("/", function (req, res) {
    // console.log("data",data);
    res.render("home");
})

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
)

app.get("/auth/google/secrets",
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get("/login", function (req, res) {
    res.render("login");
})

app.get("/register", function (req, res) {
    res.render("register")
})

app.get("/secrets", function (req, res) {
//    User.find({"secret" : {$ne:null}} , function(err , foundUsers){
//     if(err){
//         console.log(err);
//     }else{
//         if(foundUsers){
//          res.render("secrets" , {userWithSecrets : foundUsers})
//         }

//     }
//    })

User.find({"secret" : {$ne:null}}).then(function(foundUsers){
    
    res.render("secrets" , {userWithSecrets : foundUsers})

  })
})

app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit")
    } else {
        res.redirect("/login");
    }
});


app.post("/submit", async function (req, res) {
    const submittedSecret = req.body.secret;

    const foundUser = await User.findById(req.user.id).exec();
    if (foundUser) {

        foundUser.secret = submittedSecret
        foundUser.save().then(() => {
            res.redirect("/secrets")
      
        }).catch((err) => {
            console.log(err);
        });
    };

})
// console.log((req.user));


app.get("/logout", function (req, res, next) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        } else
            res.redirect("/");
    });
})

app.post("/register", function (req, res) {

    // bcrypt.hash(req.body.password , saltRound , function(err , hash){

    //     const newUser = new User({
    //         email : req.body.username,
    //         password : hash
    //     })

    //     newUser.save().then(()=>{
    //         res.render("secrets")
    //     }).catch((err)=>{
    //         console.log(err);
    //     })
    // })

    ///code to add cookies 

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })


})

app.post("/login", async function (req, res) {
    // const username = req.body.username;
    // const password = req.body.password;
    // // console.log(md5(req.body.password));
    // const foundUser = await User.findOne({email : username},).exec();
    // if(foundUser){
    //         bcrypt.compare(password , foundUser.password , function(err , result){
    //             if (result === true ){
    //                 res.render("secrets")
    //             }else{
    //                 res.send("<h1>Wrong password</h1>")
    //             }
    //         })
    // }else{
    //     res.send("<h1>" + username + " is not regestered</h1>")
    // }

    //// code for cookies

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })
})
app.listen(3000, function () {
    console.log("server is started at port : 3000");
})



