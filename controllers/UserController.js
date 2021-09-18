var User = require("../models/User");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const createHttpError = require("http-errors");

exports.redirectToLogin = function (req, res, next) {
  if (!req.session.user_id) {
    res.redirect("/login");
  } else {
    next();
  }
};

var getUserDashboard = function (req, res, next) {
  let user_id = req.session.user_id;
  User.findById({ _id: user_id }, (err, user) => {
    if (err) {
      console.log("User not found");
      res.render("login");
    } else {
      if (user["role"] === "admin") {
        return res.redirect("/admin");
      } else if (user["role"] === "user" && user["status"] === "active") {
        return res.redirect("/dashboard");
      }
    }
  });
};

exports.home = function (res, resp, next) {
  getUserDashboard(res, resp, next);
};

exports.signUp = function (req, res, next) {
  var new_user = req.body;
  User.find({ email: new_user.email }, (err, user) => {
    if (user.length)
      res.render("signup", { error: "Please use another email" });
    else {
      bcrypt.hash(new_user.p_password, 10, (err, hash) => {
        if (err) {
          console.log("Error has occurred while hashing");
          // returnFn({ error: "No password field provided", status: 400 });
        } else {
          let user = new User({
            firstName: new_user.fname,
            lastName: new_user.lname,
            email: new_user.email,
            password: hash,
          });
          user.save((err, result) => {
            if (err) console.log("Mongoose: Sign up error");
            req.session.user_id = result._id;
            // console.log(req.session.user_id);
            getUserDashboard(req, res, next);
          });
        }
      });
    }
  });
};

exports.renderUserDashboardPage = function (req, res, next) {
  let user_id = req.session.user_id;
  User.findById({ _id: user_id }, (err, user) => {
    if (err) {
      res.status(404);
      res.render("error", {
        error: { status: 404 },
        message: "Not found",
      });
    } else {
      if (user["role"] === "user" && user["status"] === "active") {
        return res.render("dashboard", {
          username: user["firstName"] + " " + user["lastName"],
        });
      } else {
        resp.status(403);
        resp.render("error", {
          error: { status: 403 },
          message: "Access Forbidden: Unauthorized user",
        });
      }
    }
  });
};

exports.renderAdminDashboardPage = function (req, res, next) {
  let user_id = req.session.user_id;
  User.findById({ _id: user_id }, (err, user) => {
    if (err) {
      res.status(404);
      res.render("error", {
        error: { status: 404 },
        message: "Not found",
      });
    } else {
      if (user["role"] === "admin") {
        return res.render("admin-dashboard", {
          username: user["firstName"] + " " + user["lastName"],
        });
      } else {
        return res.redirect("login");
      }
    }
  });
};

exports.renderFeedbackPage = function (req, res, next) {
  let user_id = req.session.user_id;
  User.findById({ _id: user_id }, (err, user) => {
    if (err) {
      res.status(404);
      res.render("error", {
        error: { status: 404 },
        message: "Not found",
      });
    } else {
      if (user["role"] === "user" && user["status"] === "active") {
        return res.render("add-feedback");
      } else {
        resp.status(403);
        resp.render("error", {
          error: { status: 403 },
          message: "Access Forbidden: Unauthorized user",
        });
      }
    }
  });
};

exports.renderEditFeedbackPage = function (req, res, next) {
  let user_id = req.session.user_id;
  User.findById({ _id: user_id }, (err, user) => {
    if (err) {
      res.status(404);
      res.render("error", {
        error: { status: 404 },
        message: "Not found",
      });
    } else {
      if (user["role"] === "user" && user["status"] === "active") {
        // console.log(req.params.id);
        return res.render("edit-feedback");
      } else {
        resp.status(403);
        resp.render("error", {
          error: { status: 403 },
          message: "Access Forbidden: Unauthorized user",
        });
      }
    }
  });
};

exports.loginUser = function (req, resp, next) {
  var login_user = req.body;
  User.find(
    { email: login_user.email, status: "active" },
    function (err, user) {
      if (err)
        return res.render("login", {
          error: "Sign in failed. Please try again.",
        });
      else if (user.length) {
        bcrypt.compare(
          login_user.password,
          user[0].password,
          function (err, res) {
            if (!res)
              return resp.render("login", {
                error: "Invalid credentials. Please try again.",
              });
            else {
              req.session.user_id = user[0]._id;
              getUserDashboard(req, resp, next);
            }
          }
        );
      } else {
        return resp.render("login", {
          error: "Invalid credentials. Please try again.",
        });
      }
    }
  );
};

exports.changeUserStatus = function (req, res, next) {
  let user_id = req.session.user_id;
  User.findById({ _id: user_id }, (err, user) => {
    if (err) {
      resp.status(404);
      resp.render("error", {
        error: { status: 404 },
        message: "Not found",
      });
    } else {
      if (user["role"] === "admin") {
        User.findById({ _id: req.params.id }, (err, change_user) => {
          if (err) {
            console.log(err);
          } else {
            var status = change_user.status == "active" ? "inactive" : "active";
            console.log(status);
            User.updateOne(
              { _id: req.params.id },
              { status: status },
              (err, result) => {
                if (err) {
                  res.redirect("/login");
                } else {
                  console.log(result);
                  res.success = true;
                  return res.render("admin-dashboard", { success: true });
                }
              }
            );
          }
        });
      } else {
        resp.status(403);
        resp.render("error", {
          error: { status: 403 },
          message: "Access Forbidden: Unauthorized user",
        });
      }
    }
  });
};

exports.logout = (req, res) => {
  req.session.destroy(function (err) {
    if (err) {
      resp.status(404);
      resp.render("error", {
        error: { status: 404 },
        message: "Not found",
      });
    }
    res.redirect("/");
  });
};
