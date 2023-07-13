require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

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
    secret: process.env.SESSIONSECRET,
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
});

//plugin passport local mongoose
userSchema.plugin(passportLocalMongoose);

// //password encryption
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ["password"],
// });

const User = mongoose.model("User", userSchema);

//passport configuration
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  //render the login page with username, password, and error message left empty
  res.render("login", { username: "", password: "", errorMessage: "" });
});

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

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

// app.post("/login", (req, res) => {
//   const username = req.body.username;
//   // const password = md5(req.body.password);  //hash password
//   const password = req.body.password;

//   //find user in database by username(email)
//   User.findOne({ email: username })
//     .then((foundUser) => {
//       //if found a matching user
//       if (foundUser) {
//         //check password
//         bcrypt.compare(password, foundUser.password, function (err, result) {
//           if (result === true) {
//             res.render("secrets");
//           } else {
//             //display error message to user
//             res.render("login", {
//               username: username,
//               password: password,
//               errorMessage: "Incorrect username or password.",
//             });
//           }
//         });
//       } else {
//         //if no user matches
//         res.render("login", {
//           username: username,
//           password: password,
//           errorMessage: "Username does not exist.",
//         });
//       }
//     })
//     .catch((err) => console.log(err));
// });

app.get("/register", (req, res) => {
  res.render("register");
});

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

// app.post("/register", (req, res) => {
//   bcrypt.hash(req.body.password, saltRounds, function (error, hash) {
//     //create new user obj base on user input value
//     const newUser = new User({
//       email: req.body.username,
//       // password: md5(req.body.password),  //hash password
//       password: hash,
//     });

//     //save new user to database
//     newUser
//       .save()
//       .then(() => {
//         //navigate to secret page
//         res.render("secrets");
//       })
//       .catch((err) => console.log(err));
//   });
// });

app.get("/secrets", (req, res) => {
  //check if user is authenticated
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

//set up port
app.listen(3000, () => {
  console.log("Server started on port 3000.");
});
