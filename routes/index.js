var express = require("express");
var router = express.Router();

const { check, validationResult } = require("express-validator");

var UserController = require("../controllers/UserController");
const User = require("../models/User");

var FeedbackController = require("../controllers/FeedbackController");
const feedback = require("../models/Feedback");

router.get("/", UserController.home);

router.get("/signup", function (req, res, next) {
  res.render("signup");
});

router.post(
  "/signup",
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
      res.render("signup", { errors: errors });
    } else {
      req.session.success = true;
      UserController.signUp(req, res, next);
    }
  }
);

router.get("/login", (req, res, next) => {
  res.render("login");
});

router.post(
  "/login",
  [
    check("email", "Please provide a correct email address.")
      .isEmail()
      .trim()
      .escape(),
    check("password", "Please provide a password.").not().isEmpty(),
  ],
  (req, res, next) => {
    var errors = validationResult(req).array();
    if (errors.length > 0) {
      // req.session.errors = errors;
      req.session.success = false;
      res.render("login", { errors: errors });
    } else {
      req.session.success = true;
      UserController.loginUser(req, res, next);
    }
  }
);

router.get("/logout", UserController.logout);

router.get(
  "/dashboard",
  UserController.redirectToLogin,
  // UserController.renderUserDashboardPage
  FeedbackController.getUserFeedbacks
);

router.get(
  "/feedback",
  UserController.redirectToLogin,
  UserController.renderFeedbackPage
);

router.get(
  "/:id/edit",
  UserController.redirectToLogin,
  FeedbackController.renderEditFeedbackPage
);

const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public");
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

router.post(
  "/feedback",
  uploadFile.single("file"),
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
      FeedbackController.submitFeedback(req, res, next);
    }
  }
);

router.post(
  "/:id/edit",
  uploadFile.single("file"),
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
  "/admin",
  UserController.redirectToLogin,
  FeedbackController.getAllFeedbacks
);

router.get(
  "/:id/changeStatus",
  UserController.redirectToLogin,
  UserController.changeUserStatus
);

module.exports = router;
