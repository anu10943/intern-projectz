require('dotenv').config() 
const dotenv=require('dotenv');
const express=require('express');
 const ejs=require('ejs');
 const bodyParser=require('body-parser');
 const mongoose=require('mongoose');
const encrypt=require('mongoose-encryption');
const session=require('express-session');//same order
const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');//not really used
const GoogleStrategy=require( 'passport-google-oauth2' ).Strategy;
const findOrCreate=require('mongoose-findorcreate');
const app=express();

app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs');
app.use(express.static("public"));


app.use(session({
    secret:process.env.SECRET,//any long string
    resave:false,
    saveUninitialized:false

}))
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true,useUnifiedTopology:true});
mongoose.set('useCreateIndex', true);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {

  console.log("mongodb is connected");
});

const userSchema=new mongoose.Schema({
     
    email:String,
    password:String,
    googleId:String

})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User=mongoose.model('User',userSchema);

passport.use(User.createStrategy());
 
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());//this is only fo rbasic not when oauth user 

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
 
passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/projectz",//prev the email and profile id is from G+(by passport-oauth2 pkg),but now G+ is deprecated ,so if we visit github=issues=a guy solved it by adding below code
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, email, done) {
    console.log(email);
    User.findOrCreate({ googleId: email }, function (err, user) { 
      return done(err, user);
    });
  }
));

app.get("/home",function(req,res){
  res.render("home");
})

app.get("/login",function(req,res){
    res.render("login");
})
app.get("/auth/google", 
  passport.authenticate('google',{
    scope:['email']
  })

)
app.get("/register",function(req,res){
  res.render("register")
})
app.get("/auth/google/projectz",
  passport.authenticate('google',{
    successRedirect:'/home',
    failureRedirect:'/login'
  })  
)
app.get("/home/:user",function(req,res){
  res.render("profile",{message:req.params.user})
})
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/login")
})


app.post("/register",function(req,res){
  User.register({username:req.body.email},req.body.password,function(err,user){
      if(err){
        console.log(err);
        res.redirect("/register");
      }
      else{
        // console.log(req.body.email);
        // console.log(req.body.password); 
        res.redirect("/home/"+ req.body.email);
     }

     

      
  }
)})
app.post("/login",function(req,res){
  const user=new User({
    username:req.body.username,
    password:req.body.password
});
req.login(user,function(err){
 if(err){
     console.log(err);
     res.redirect("/login");

 }
 else{
     passport.authenticate("local")(req,res,function(){
         res.redirect("/home/"+req.body.email);  
     })
 }
})
})

app.listen(process.env.PORT || 3000,function(req,res){
    console.log("Server is running");
})
