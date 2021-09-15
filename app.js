var createError = require("http-errors");
var express = require("express");
const session = require("express-session");

var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var validator = require("express-validator");

var indexRouter = require("./routes/index");

var app = express();
var helmet = require("helmet");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const { v4: uuidv4 } = require("uuid");

const SESS_TIME = 2 * 60 * 60 * 1000;

app.use(
  session({
    name: "sid",
    resave: false,
    saveUninitialized: true,
    rolling: true,
    secret: uuidv4(),
    cookie: {
      // uses httponly by default
      maxAge: SESS_TIME,
      sameSite: true,
      secure: false,
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));
// app.use(helmet());
app.disable("x-powered-by");

var dbConnect = require("./config/connectDb");

dbConnect.on("error", () => {
  console.log("Connection Error!");
});
// const { secureHeapUsed } = require("crypto");

dbConnect.once("open", () => {
  console.log("Connected to database");
});

app.use("/", indexRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
