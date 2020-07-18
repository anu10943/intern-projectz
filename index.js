require('dotenv').config() 
const dotenv=require('dotenv');//ifclientID is not present
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');

const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');


const GoogleStrategy= require('passport-google-oauth20').Strategy;
const findorCreate=require('mongoose-findorcreate'); 
//passport-local is used by passport-local-mongoose,no need to require as not used  by code specifically
const app = express();

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

//session init exactly between app.use statements and mongodb init server
app.use(session({
    secret: 'theBigSecret',
    saveUninitialized: false, // don't create session until something stored,helps login to red server storage
    resave: false, //don't save session if unmodified
}));

//directly below this, init passport
app.use(passport.initialize())
//use passport to init session
app.use(passport.session());


mongoose.connect('mongodb://localhost:27017/userDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true); //to remove deprecation warning

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("mongodb is connected")
});
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true
    },
    email: {
        type: String, 
        unique: true
    },
    password: {
        type: String
    }, //dont give password:required,else it will cause validation err in USer.register
    //didnt do before,
 
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findorCreate);

const User = new mongoose.model("User", userSchema);
//below this itself
//configure passportlocal
//create strategy to auth user using user and pass & to serialize and deserialize user=for sessions
//serialise=create cookie,stores session data
//deserialise=delete cookie by opening contents and having detials of user in it
 

passport.use(User.createStrategy()); //wont work unless passport is init
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
 
 
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/projectz",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo" ,
     
    passReqToCallback   : true
  },
  function(req,accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ username: profile.displayName,email:profile.emails[0].value }, function (err, user) {
        
        return cb(err, user);
    });
  }
));

app.get("/home", function (req, res) {
    res.render("home");
})

app.get("/login", function (req, res) {
    res.render("login");
})

app.get("/register", function (req, res) {
    res.render("register");
})
app.get("/auth/google", 
  passport.authenticate('google',{
    scope:["profile","email"]
  })

)
app.get("/home/:userName", function (req, res) {
    if (req.isAuthenticated()) {
         
        res.render("profile", {
            message:  req.user.username
        });
    } else {
        
        res.redirect("/login");
    }
});
app.get( '/auth/google/projectz', 
    passport.authenticate( 'google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/home/'+req.user.username);
    });

app.get("/logout",function(req,res){
        req.logout();
        res.redirect("/home");
      })
app.post("/register", function (req, res) {
 
    User.register({
        username: req.body.username,
        email: req.body.email
    }, req.body.password, function (err, user) {
        if (err) {
            //   res.send(err);//err_HTTP_headers_sent=a 200 or 400 resp is semt back and extra resp is json-err resp=results in err
            return done(null,false,err);
        } else {
            passport.authenticate('local')(req, res,function(){
                res.redirect('/home/'+req.user.username);//will auto have salt and hash saved into Document in DB
           });//cookie deserialized or destroyed when browser closes,not tab bloases
        }

    });
})
app.post('/login',function(req,res){
    User.findOne({email:req.body.email},function(err,user){
             
            req.login(user, function(err) {
                if (err) { return next(err); }
                res.redirect('/home/'+user.username );
              })
        
    })

})
app.listen(process.env.PORT || 3000, function (req, res) {
                console.log("Server is running");
            });