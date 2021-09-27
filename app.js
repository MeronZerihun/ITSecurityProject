var createError = require("http-errors");
var express = require("express");
const session = require("express-session");

var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var fileRouter = require("./routes/files");
var helmet = require("helmet");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(helmet.referrerPolicy({ policy: "same-origin" }));
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "script-src": [
        "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js",
        "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.min.js",
        "https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js",
        "'unsafe-inline'",
      ],
      "script-src-attr": ["'unsafe-inline'"],
    },
  })
);
const { v4: uuidv4 } = require("uuid");

const SESS_TIME = 2 * 60 * 60 * 1000; // 2hrs

var FileStore = require("session-file-store")(session);

var fileStoreOptions = {
  path: path.resolve(__dirname) + "/sessions",
  ttl: 86400,
  retries: 0,
};

app.use(
  session({
    name: "sid",
    store: new FileStore(fileStoreOptions),
    resave: false,
    saveUninitialized: true,
    rolling: true,
    secret: uuidv4(),
    cookie: {
      // uses httponly by default
      maxAge: SESS_TIME,
      sameSite: true,
      secure: true, // make true on production to use ssl
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));
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

app.use("/files", fileRouter);

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
