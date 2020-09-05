require('dotenv').config();
// require('https').globalAgent.options.rejectUnauthorized = false;
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
   secret: "Prograde website secret",
   resave: false,
   saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true, useUnifiedTopology:true});

mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema({
   name: String,
   phone: String,
   email:String,
   username: String,
   password: String,
   googleId : String,
   facebookId : String,
   bio:String,
   hobbies:[String]
});

const demoUser = "Nagu123";

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());


passport.serializeUser(function(user, done) {
   done(null, user.id);
 });
 
passport.deserializeUser(function(id, done) {
   User.findById(id, function(err, user) {
     done(err, user);
   });
 });


app.get("/",function(req,res){
   res.render("home");
}); 

app.get("/register",function(req,res){
  res.render("register");
}); 

app.get("/myProfile",function(req,res){

  User.findOne({username: demoUser }, function(err,foundUser){
      if(err){
        console.log(err);
      }else{
        if(foundUser){
          res.render("myProfile", {nameOfUser: foundUser.name, emailOfUser : foundUser.email , phoneOfUser: foundUser.phone, usernameOfUser: foundUser.username,
            bioOfUser: req.body.bio});
          
        }else{
          res.redirect("/dashboard");
        }
      }
  });

});

app.get("/editProfile",function(req,res){
  res.render("editProfile");
});

// app.post("/myProfile",function(req,res){
//   res.render("myProfile");
// });

app.post("/editProfile",function(req,res){

  const nameOfUser = req.body.name;
  const phoneOfUser = req.body.phone;
  const emailOfUser = req.body.email;
  const bioOfUser = req.body.bio;

  User.findOne({username: req.body.username },function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(!foundUser){
         res.redirect("/register");
      }else{
        foundUser.name = nameOfUser;
        foundUser.phone = phoneOfUser;
        foundUser.email = emailOfUser;
        foundUser.bio = bioOfUser;
        foundUser.save(function(){
           res.redirect("/myProfile");
        });
      }
    }
  });
});

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){

    if(err){
        console.log(err);
        res.redirect("/register");
    }else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/editProfile");
        });
    }
});

});

//----------------------- GOOGLE Authentication --------------------------------

passport.use(new GoogleStrategy({
   clientID: process.env.CLIENT_ID,
   clientSecret: process.env.CLIENT_SECRET,
   callbackURL: "http://localhost:3000/auth/google/dashboard",
   userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
 },
 function(accessToken, refreshToken, profile, cb) {
   // console.log(profile);

   User.findOrCreate({ googleId: profile.id }, function (err, user) {
     return cb(err, user);
   });
 }
));


 
app.get('/auth/google',
 passport.authenticate('google', { scope: ['profile'] 
}));

app.get('/auth/google/dashboard', 
 passport.authenticate('google', { failureRedirect: '/login' }),
 function(req, res) {
   // Successful authentication, redirect home.
   res.redirect('/dashboard');
 });



// ------------------ FACEBOOK Authentication ----------------



passport.use(new FacebookStrategy({
   clientID: process.env.FACEBOOK_APP_ID,
   clientSecret: process.env.FACEBOOK_APP_SECRET,
   callbackURL: "http://localhost:3000/auth/facebook/dashboard"
 },
 function(accessToken, refreshToken, profile, cb) {
   User.findOrCreate({ facebookId: profile.id }, function (err, user) {
     return cb(err, user);
   });
 }
));

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/dashboard',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect dashboard.
    res.redirect('/dashboard');
  });

// app.get('/auth/facebook',
//   passport.authenticate('facebook', { scope: ['user_friends'] }));

// app.get('/auth/facebook',
// passport.authenticate('facebook', { authType: 'rerequest', scope: ['user_friends'] }));






 /*--------------------------- fb login ends ------------------------ */

app.get("/login",function(req,res){
    res.render("login");
 });  
 
app.get("/dashboard",function(req,res){
  if(req.isAuthenticated()){
    res.render("dashboard");
  }else{
    res.redirect("/login");
  }
});  

app.post("/login",function(req,res){
      const user = new User({
        email: req.body.email,
        password: req.body.password
      });

      req.login(user,function(err){
         if(err){
             console.log(err);
         }else{
             passport.authenticate("local")(req,res,function(){
                res.redirect("/dashboard");
             });
         }
     });
    

});
    

app.get("/logout",function(req,res){
      req.logout();
      res.redirect("/");
});  
    
app.listen(3000,function(){
         console.log("Server is started on port 3000");
});