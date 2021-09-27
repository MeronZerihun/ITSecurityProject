var express = require("express");
var router = express.Router();

const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  max: 50,
  windowMs: 60 * 60 * 1000, // suspends for an hour
  message: "Too many requests sent by this IP, please try again in an hour!",
});

var csrf = require("csurf");
var csrfProtection = csrf({ cookie: { httpOnly: true, secure: true } });

const { check, validationResult } = require("express-validator");

var UserController = require("../controllers/UserController");
const User = require("../models/User");

var FeedbackController = require("../controllers/FeedbackController");
const feedback = require("../models/Feedback");

router.all("/", limiter);
router.all("/login", limiter);
router.all("/signup", limiter);
router.all("/dashboard", limiter);
router.all("/feedback", limiter);
router.all("/:id/edit", limiter);
router.all("/admin", limiter);
router.all("/nimda", limiter);
router.all("/confirm", limiter);

router.get("/", UserController.redirectToLogin, UserController.home);

router.get("/signup", csrfProtection, function (req, res, next) {
  res.render("signup", { csrfToken: req.csrfToken() });
});

// For No-sql injection
var cleanSignupBody = (req, res, next) => {
  req.body.fname = req.body.fname.replace(/[{$}]/g, "");
  req.body.lname = req.body.lname.replace(/[{$}]/g, "");
  req.body.email = req.body.email.replace(/[{$}]/g, "");
  console.log(req.body);
  next();
};

router.post(
  "/signup",
  cleanSignupBody,
  csrfProtection,
  [
    check("fname")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Please provide your first name."),
    check("lname")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Please provide your last name."),
    check("teacher")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Please provide your favorite teacher."),
    check("mother")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Please provide your mother's last name."),
    check("role_model")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Please provide your role model."),
    check("email", "Please provide a correct email address.")
      .isEmail()
      .trim()
      .escape(),
    check("p_password", "Your password should be atleast 6 characters.")
      .isLength({ min: 6 })
      .custom((val, { req, loc, path }) => {
        if (val !== req.body.re_password) {
          throw new Error("Passwords don't match");
        }
        return val;
      }),
  ],
  (req, res, next) => {
    var errors = validationResult(req).array();
    if (errors.length > 0) {
      // req.session.errors = errors;
      req.session.success = false;
      res.render("signup", { csrfToken: req.body._csrf, errors: errors });
    } else {
      req.session.success = true;
      UserController.signUp(req, res, next);
    }
  }
);

router.get("/login", csrfProtection, (req, res, next) => {
  var token = req.csrfToken();
  var redirect = req.query.redirect ? req.query.redirect : "";
  res.render("login", { redirect: redirect, csrfToken: token });
});

// For No-sql injection
var cleanLoginBody = (req, res, next) => {
  req.body.email = req.body.email.replace(/[{$}]/g, "");
  console.log(req.body);
  next();
};

router.post(
  "/login",
  cleanLoginBody,
  csrfProtection,
  [
    check("email")
      .trim()
      .escape()
      .isEmail()
      .withMessage("Please provide a correct email address."),
    check("password", "Please provide a password.").not().isEmpty(),
  ],
  (req, res, next) => {
    var errors = validationResult(req).array();
    if (errors.length > 0) {
      // req.session.errors = errors;
      req.session.success = false;
      return res.render("login", { csrfToken: req.body._csrf, errors: errors });
    } else {
      UserController.loginUser(req, res, next);
    }
  }
);

router.get("/logout", UserController.redirectToLogin, UserController.logout);

router.get(
  "/dashboard",
  UserController.redirectToLogin,
  FeedbackController.getUserFeedbacks
);

router.get(
  "/feedback",
  UserController.redirectToLogin,
  csrfProtection,
  UserController.renderFeedbackPage
);

// For No-sql injection
var cleanHeader = (req, res, next) => {
  req.params.id = req.params.id
    .replace(/[{$}]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  next();
};

router.get(
  "/:id/edit",
  cleanHeader,
  UserController.redirectToLogin,
  csrfProtection,
  FeedbackController.renderEditFeedbackPage
);

const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `files/${file.fieldname}-${uuidv4()}-${Date.now()}.${ext}`);
  },
});
const multerFilter = (req, file, cb) => {
  if (file.mimetype.split("/")[1] === "pdf") {
    cb(null, true);
  } else {
    cb(new Error("Not a PDF File!!"), false);
  }
};

const uploadFile = multer({ storage: multerStorage, fileFilter: multerFilter });

// For No-sql injection
var cleanFeedbackBody = (req, res, next) => {
  req.body.complaint = req.body.complaint.replace(/[{$}]/g, "");
  console.log(req.body);
  next();
};

router.post(
  "/feedback",
  UserController.redirectToLogin,
  uploadFile.single("file"),
  cleanFeedbackBody,
  csrfProtection,

  [
    check("complaint", "Please provide your complaint.")
      .not()
      .isEmpty()
      .trim()
      .escape(),
  ],
  (req, res, next) => {
    var errors = validationResult(req).array();
    if (errors.length > 0) {
      res.render("add-feedback", { csrfToken: req.body._csrf, errors: errors });
    } else {
      FeedbackController.submitFeedback(req, res, next);
    }
  }
);

router.post(
  "/:id/edit",
  cleanHeader,
  UserController.redirectToLogin,
  uploadFile.single("file"),
  cleanFeedbackBody,
  csrfProtection,
  [
    check("complaint", "Please provide your complaint.")
      .not()
      .isEmpty()
      .trim()
      .escape(),
  ],
  (req, res, next) => {
    var errors = validationResult(req).array();
    if (errors.length > 0) {
      res.render("add-feedback", { errors: errors });
    } else {
      FeedbackController.editUserFeedback(req, res, next);
    }
  }
);

router.get(
  "/nimda",
  UserController.redirectToLogin,
  csrfProtection,
  FeedbackController.getAllFeedbacks
);

router.post(
  "/nimda",
  UserController.redirectToLogin,
  csrfProtection,
  UserController.changeUserStatus
);

router.get("/admin", UserController.redirectToLogin, UserController.honeyPot);

router.post(
  "/admin",
  UserController.redirectToLogin,
  csrfProtection,
  UserController.honeyPot
);

router.get(
  "/confirm",
  UserController.checkIfSignedIn,
  csrfProtection,
  (req, res, next) => res.render("confirmReset", { csrfToken: req.csrfToken() })
);

router.post(
  "/confirm",
  csrfProtection,
  [
    check("fname")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Please provide your first name."),
    check("lname")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Please provide your last name."),
    check("teacher")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Please provide your favorite teacher."),
    check("mother")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Please provide your mother's last name."),
    check("role_model")
      .not()
      .isEmpty()
      .trim()
      .escape()
      .withMessage("Please provide your role model."),
  ],
  (req, res, next) => {
    var errors = validationResult(req).array();
    if (errors.length > 0) {
      res.render("confirmReset", { csrfToken: req.body._csrf, errors: errors });
    } else {
      UserController.confirmUser(req, res, next);
    }
  }
);

router.get(
  "/reset",
  UserController.redirectToReset,
  csrfProtection,
  (req, res, next) => res.render("reset", { csrfToken: req.csrfToken() })
);

router.post(
  "/reset",
  UserController.redirectToReset,
  csrfProtection,
  [
    check("password", "Your password should be atleast 6 characters.")
      .isLength({ min: 6 })
      .custom((val, { req, loc, path }) => {
        if (val !== req.body.c_password) {
          throw new Error("Passwords don't match");
        }
        return val;
      }),
  ],
  (req, res, next) => {
    var errors = validationResult(req).array();
    if (errors.length > 0) {
      // req.session.errors = errors;
      req.session.success = false;
      return res.render("reset", { csrfToken: req.body._csrf, errors: errors });
    } else {
      UserController.updatePassword(req, res, next);
    }
  }
);

module.exports = router;
