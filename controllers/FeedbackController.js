const Feedback = require("../models/Feedback");
const User = require("../models/User");
const UserController = require("./UserController");

exports.submitFeedback = function (req, resp, next) {
  var user_id = req.session.user_id;

  if (user_id) {
    User.findById({ _id: user_id }, (err, user) => {
      if (user["role"] == "user" && user["status"] === "active") {
        saveFeedback(user, req, resp);
      } else {
        UserController.redirectToLogin(req, resp, next);
      }
    });
  } else {
    UserController.redirectToLogin(req, resp, next);
  }
};

exports.editUserFeedback = function (req, resp, next) {
  var user_id = req.session.user_id;

  if (user_id) {
    User.findById({ _id: user_id }, (err, user) => {
      if (err) {
        resp.status(404);
        resp.render("error", {
          error: { status: 404 },
          message: "Not found",
        });
      } else if (user["role"] == "user" && user["status"] === "active") {
        editFeedback(user, req, resp);
      } else {
        resp.status(403);
        resp.render("error", {
          error: { status: 403 },
          message: "Access Forbidden: Unauthorized user",
        });
      }
    });
  } else {
    UserController.redirectToLogin(req, resp, next);
  }
};

exports.getUserFeedbacks = function (req, resp, next) {
  var user_id = req.session.user_id;

  if (user_id) {
    User.findById({ _id: user_id }, (err, user) => {
      if (err) {
        resp.status(404);
        resp.render("error", {
          error: { status: 404 },
          message: "Not found",
        });
      } else if (user["role"] == "user" && user["status"] === "active") {
        req.session.username = user["firstName"] + " " + user["lastName"];
        getFeedbacks(req, resp, next);
      } else {
        resp.status(403);
        resp.render("error", {
          error: { status: 403 },
          message: "Access Forbidden: Unauthorized user",
        });
      }
    });
  } else {
    UserController.redirectToLogin(req, resp, next);
  }
};

exports.getAllFeedbacks = function (req, resp, next) {
  var user_id = req.session.user_id;

  if (user_id) {
    User.findById({ _id: user_id }, (err, user) => {
      if (err) {
        resp.status(404);
        resp.render("error", {
          error: { status: 404 },
          message: "Not found",
        });
      } else if (user["role"] == "admin") {
        req.session.username = user["firstName"] + " " + user["lastName"];
        getAllUserFeedbacks(req, resp, next);
      } else {
        resp.status(403);
        resp.render("error", {
          error: { status: 403 },
          message: "Access Forbidden: Unauthorized user",
        });
        // UserController.redirectToLogin(req, resp, next);
      }
    });
  } else {
    UserController.redirectToLogin(req, resp, next);
  }
};

exports.renderEditFeedbackPage = function (req, res, next) {
  let user_id = req.session.user_id;
  Feedback.find({ _id: req.params.id, user_id: user_id }, (err, feedbacks) => {
    if (err) {
      resp.status(404);
      resp.render("error", {
        error: { status: 404 },
        message: "Not found",
      });
    } else {
      return res.render("edit-feedback", { feedback: feedbacks[0] });
    }
  });
};

var saveFeedback = async function (user, req, resp) {
  var complaint = req.body.complaint;
  var file;
  if (req.file) {
    file = req.file.filename;
    try {
      const filename = await File.create({
        name: req.file.filename,
      });
    } catch (error) {}
  }
  var user_id = req.session.user_id;
  var feedback = new Feedback({
    full_name: user["firstName"] + " " + user["lastName"],
    email: user["email"],
    complaint: complaint,
    file_lnk: file,
    user_id: user_id,
  });

  feedback.save((err, result) => {
    if (err) {
      resp.status(500);
      resp.render("error", {
        error: { status: 500 },
        message: "Internal Server Error",
      });
    } else {
      console.log("Feedback saved");
      resp.render("add-feedback", { success: true });
    }
  });
};

var editFeedback = async function (user, req, resp) {
  let user_id = user["_id"];

  var file;
  if (req.file) {
    file = req.file.filename;
    try {
      const filename = await File.create({
        name: req.file.filename,
      });
    } catch (error) {}
  }
  if (file) {
    Feedback.updateOne(
      { _id: req.params.id, user_id: user_id },
      { complaint: req.body.complaint, file_lnk: file },
      (err, feedback) => {
        if (err) {
          res.redirect("login");
        } else {
          return resp.render("edit-feedback", { success: true });
        }
      }
    );
  } else {
    Feedback.updateOne(
      { _id: req.params.id, user_id: user_id },
      { complaint: req.body.complaint },
      (err, feedback) => {
        if (err) {
          res.redirect("login");
        } else {
          return resp.render("edit-feedback", { success: true });
        }
      }
    );
  }
};

var getFeedbacks = (req, res, next) => {
  Feedback.find({ user_id: req.session.user_id })
    .sort({ updatedAt: -1 })
    .exec((err, result) => {
      res.render("dashboard", {
        feedbacks: result,
        username: req.session.username,
      });
    });
};

var getAllUserFeedbacks = (req, res, next) => {
  var feedbacks = [];
  Feedback.find({})
    .sort({ updatedAt: -1 })
    .exec((err, result) => {
      var count = 0;
      result.forEach((feedback) => {
        let user_id = feedback.user_id;
        var new_feedback = feedback.toObject();
        User.findById(user_id, (err, user) => {
          if (!err) {
            new_feedback["status"] = user.status;
            feedbacks.push(new_feedback);
            count += 1;
          }
          if (count == result.length) {
            res.render("admin-dashboard", {
              feedbacks: feedbacks,
              username: req.session.username,
            });
          }
        });
      });
    });
};
