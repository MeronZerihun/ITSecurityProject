var express = require("express");
var path = require("path");
var router = express.Router();
var UserController = require("../controllers/UserController");
var FeedbackController = require("../controllers/FeedbackController");

// For No-sql injection
var cleanHeader = (req, res, next) => {
  req.params.filename = req.params.filename.replace(/[{$}]/g, "");
  next();
};

router.get(
  "/:filename",
  cleanHeader,
  UserController.redirectToLogin,
  FeedbackController.checkFileAccess,
  (req, res, next) => {
    router.use(express.static(path.join(__dirname, "uploads/")));
    res.sendFile(
      path.join(__dirname, `../uploads/files/${req.params.filename}`)
    );
  }
);

module.exports = router;
