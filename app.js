require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt  = require("mongoose-encryption");


const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

//connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/userDB", {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

//password encryption
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  //render the login page with username, password, and error message left empty
  res.render("login", { username: "", password: "", errorMessage: "" });
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  //find user in database by username(email)
  User.findOne({ email: username })
    .then((foundUser) => {
      //if found a matching user
      if (foundUser) {
        //check password
        if (foundUser.password === password) {
          res.render("secrets");
        } else {
          //display error message to user
          res.render("login", {
            username: username,
            password: password,
            errorMessage: "Incorrect username or password.",
          });
        }
      } else {
        //if no user matches
        res.render("login", {
          username: username,
          password: password,
          errorMessage: "Username does not exist.",
        });
      }
    })
    .catch((err) => console.log(err));
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  //create new user obj base on user input value
  const newUser = new User({
    email: req.body.username,
    password: req.body.password,
  });

  //save new user to database
  newUser
    .save()
    .then(() => {
      //navigate to secret page
      res.render("secrets");
    })
    .catch((err) => console.log(err));
});

app.listen(3000, () => {
  console.log("Server started on port 3000.");
});
