var User = require("../models/User");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const createHttpError = require("http-errors");
var FeedbackController = require("./FeedbackController");
const mongoSanitize = require("express-mongo-sanitize");
// var sanitize = require("mongo-sanitize");

exports.redirectToReset = function (req, res, next) {
  if (!req.session.user_id) {
    res.redirect(`/login?redirect=${req.originalUrl.substring(1)}`);
  } else {
    User.find({ _id: req.session.user_id, role: "user" }, (err, user) => {
      if (user.length) {
        next();
      } else {
        res.status(403);
        res.render("error", {
          error: { status: 403 },
          message: "Access Forbidden: Unauthorized user",
        });
      }
    });
  }
};

exports.redirectToLogin = function (req, res, next) {
  if (!req.session.user_id) {
    res.redirect(`/login?redirect=${req.originalUrl.substring(1)}`);
  } else {
    next();
  }
};

exports.redirectToSignUp = function (req, res, next) {
  if (!req.session.user_id) {
    next();
  } else {
    req.session.destroy(function (err) {
      if (err) {
        res.status(404);
        res.render("error", {
          error: { status: 404 },
          message: "Not found",
        });
      } else {
        next();
      }
    });
  }
};

var getUserDashboard = function (req, res, next) {
  let user_id = req.session.user_id;
  User.findById({ _id: user_id }, (err, user) => {
    if (err) {
      console.log("User not found");
      res.redirect("/login");
    } else {
      if (user["role"] === "admin") {
        const allowlist = ["nimda", "admin"];
        req.session.save((err) => {
          if (
            req.query.redirect &&
            (allowlist.indexOf(req.query.redirect) > -1 ||
              req.query.redirect.match(/^files*/g))
          ) {
            return res.redirect("/" + req.query.redirect);
          } else res.redirect("/nimda");
        });
      } else if (user["role"] === "user" && user["status"] === "active") {
        const allowlist = ["dashboard", "feedback", "admin"];
        if (
          req.query.redirect &&
          (allowlist.indexOf(req.query.redirect) > -1 ||
            req.query.redirect.match(/\/edit$/g) ||
            req.query.redirect.match(/^files*/g))
        ) {
          req.session.save((err) => {
            res.redirect("/" + req.query.redirect);
          });
        } else {
          req.session.save((err) => {
            res.redirect("/dashboard");
          });
        }
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
    if (user.length) {
      console.log("Already in use");
      return res.render("signup", {
        csrfToken: req.body._csrf,
        error: "Please use another email",
      });
    } else {
      bcrypt.hash(new_user.p_password, 10, (err, hash) => {
        if (err) {
          console.log("Error has occurred while hashing");
        } else {
          let user = new User({
            firstName: new_user.fname,
            lastName: new_user.lname,
            email: new_user.email,
            password: hash,
            mother: new_user.mother,
            teacher: new_user.teacher,
            roleModel: new_user.role_model,
          });
          user.save((err, result) => {
            if (err) console.log("Mongoose: Sign up error");

            req.session.regenerate((s_err) => {
              if (!s_err) {
                req.session.user_id = result._id;
                getUserDashboard(req, res, next);
              }
            });
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
        res.status(403);
        res.render("error", {
          error: { status: 403 },
          message: "Access Forbidden: Unauthorized user",
        });
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
      const token = req.csrfToken();
      if (user["role"] === "user" && user["status"] === "active") {
        return res.render("add-feedback", { csrfToken: token });
      } else {
        res.status(403);
        res.render("error", {
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
        return res.render("edit-feedback", { csrfToken: req.csrfToken() });
      } else {
        res.status(403);
        res.render("error", {
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
      if (err || user.length == 0)
        resp.render("login", {
          csrfToken: req.body._csrf,
          error: "Sign in failed. Please try again.",
        });
      else if (user.length) {
        bcrypt.compare(
          login_user.password,
          user[0].password,
          function (err, res) {
            if (!res)
              return resp.render("login", {
                csrfToken: req.body._csrf,
                error: "Invalid credentials. Please try again.",
              });
            else {
              req.session.regenerate((s_err) => {
                if (!s_err) {
                  console.log(user[0]._id);
                  req.session.user_id = user[0]._id;
                  getUserDashboard(req, resp, next);
                }
              });
            }
          }
        );
      } else {
        return resp.render(
          "login",
          { csrfToken: req.body._csrf },
          {
            error: "Invalid credentials. Please try again.",
          }
        );
      }
    }
  );
};

exports.changeUserStatus = function (req, res, next) {
  console.log("changeUserStatus");
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
        User.findById({ _id: req.body.user_id }, (err, change_user) => {
          if (err) {
            res.status(404);
            res.render("error", {
              error: { status: 404 },
              message: "Not found",
            });
          } else {
            var status = change_user.status == "active" ? "inactive" : "active";
            User.updateOne(
              { _id: req.body.user_id },
              { status: status },
              (err, result) => {
                if (err) {
                  res.redirect("/login");
                } else {
                  req.session.success = true;
                  console.log("Success: " + req.session.success);
                  FeedbackController.getUpdatedFeedbacks(req, res, next);
                }
              }
            );
          }
        });
      } else {
        res.status(403);
        res.render("error", {
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
      res.status(404);
      res.render("error", {
        error: { status: 404 },
        message: "Not found",
      });
    }
    res.redirect("/");
  });
};

exports.honeyPot = (req, res) => {
  let user_id = req.session.user_id;
  User.findById({ _id: user_id }, (err, user) => {
    if (err) {
      res.status(404);
      res.render("error", {
        error: { status: 404 },
        message: "Not found",
      });
    } else {
      var honeyPot = 0;
      if (user.honeyPot === undefined) honeyPot = 0;
      else {
        honeyPot = user.honeyPot;
      }

      User.updateOne(
        { _id: user_id },
        { $set: { honeyPot: honeyPot + 1 } },
        (err, result) => {
          if (err) {
            res.redirect("/login");
          } else {
            console.log(result);
            res.render("honeyPot");
          }
        }
      );
    }
  });
};

exports.checkIfSignedIn = function (req, res, next) {
  if (req.session.user_id) {
    res.redirect("/");
  } else {
    next();
  }
};

exports.confirmUser = (req, res, next) => {
  var user = req.body;
  User.find(
    {
      firstName: user.fname,
      lastName: user.lname,
      mother: user.mother,
      teacher: user.teacher,
      roleModel: user.role_model,
    },
    (err, users) => {
      if (users.length === 1) {
        req.session.user_id = users[0]._id;
        req.session.save((err) => {
          res.redirect("/reset");
        });
      } else {
        res.render("confirmReset", {
          error: "Oops...something went wrong. Please try again.",
          csrfToken: user._csrf,
        });
      }
    }
  );
};

exports.updatePassword = (req, res, next) => {
  var user_id = req.session.user_id;
  console.log(user_id);
  bcrypt.hash(req.body.password, 10, (err, hash) => {
    if (!err) {
      User.updateOne(
        { _id: user_id, role: "user" },
        { $set: { password: hash } },
        (err, result) => {
          if (!err && result.modifiedCount)
            res.render("reset", { success: true });
          else
            res.render("error", {
              error: { status: 403 },
              message: "Access Forbidden: Unauthorized user",
            });
        }
      );
    }
  });
};
