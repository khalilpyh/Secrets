require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
//use body parser
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
//use session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
//use passport
app.use(passport.initialize());
app.use(passport.session());

//connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/userDB", {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String, //for google auth
  secret: String, //for holding user secrets
});

//plugin passport local mongooseF
userSchema.plugin(passportLocalMongoose);
// plugin mongoose findorcreate to adapt google auth
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

//passport configuration
passport.use(User.createStrategy());
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

//google auth configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

//Get - Home page
app.get("/", (req, res) => {
  res.render("home");
});

//Get - Google Signup page
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

//Get - Google Auth page
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect("/secrets");
  }
);

//Get - Login page
app.get("/login", (req, res) => {
  //render the login page with username, password, and error message left empty
  res.render("login", { username: "", password: "", errorMessage: "" });
});

//Post - Login Page
app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        //navigate to secrets page
        res.redirect("/secrets");
      });
    }
  });
});

//Get - Logout page
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

//Get - Registeration page
app.get("/register", (req, res) => {
  res.render("register");
});

//Post - Registration page
app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        //authenticate the user
        passport.authenticate("local")(req, res, () => {
          //navigate to secrets page
          res.redirect("/secrets");
        });
      }
    }
  );
});

//Get - Secrets page
app.get("/secrets", (req, res) => {
  //check if user is authenticated
  if (req.isAuthenticated()) {
    User.find({ secret: { $ne: null } })
      .then((foundUsers) => {
        if (foundUsers) {
          //navigate to secret page with all secrets
          res.render("secrets", { usersWithSecrets: foundUsers });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    res.redirect("/login");
  }
});

//Get - Submit Page
app.get("/submit", (req, res) => {
  //check if user is authenticated
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

//Post - Submit Page
app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;

  //find the user who submitted secret
  User.findById(req.user.id)
    .then((foundUser) => {
      if (foundUser) {
        //save the submitted secret and redirect to secret page
        foundUser.secret = submittedSecret;
        foundUser
          .save()
          .then(() => {
            res.redirect("/secrets");
          })
          .catch((err) => {
            console.log(err);
          });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

//set up port
app.listen(3000, () => {
  console.log("Server started on port 3000.");
});
