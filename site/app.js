var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var nodemailer = require('nodemailer');
var Email = require('email-templates');
var path = require('path');
var config = require('./config');
var bcrypt = require('bcrypt');
// var http = require('http');
// var https = require('https');
// var fs = require('fs');

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

var transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  service: 'gmail',
  auth: {
    user: config.email,
    pass: config.pw,
  },
});

// Email Template
const email = new Email({
  message: {
    from: 'Team ISTE',
  },
  // uncomment below to send emails in development/test env:
  send: true,
  preview: false,
  transport: transporter,
});

//loading models
var User = require('./models/user');
var Team = require('./models/team');
var Event = require('./models/event');

// loading modules
const signalFrontend = require('./signals');

//hosting the front end
var app = new express();

//coneectiong to backend
mongoose.connect('mongodb://localhost/prodyDB', { useNewUrlParser: true });

var db = mongoose.connection;
db.on('error', () =>
  console.log('error connecting to the database!'),
).once('open', () => console.log('connected to the database'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static('public'));

app.set('view engine', 'pug');

app.post('/regPlayer', (req, res) => {
  const data = new User(req.body);
  var mailid;

  //////validation code
  User.findOne({ email: data.email }, (err, result) => {
    if (err) {
      console.log(err);
    } else if (result == null) {
      if (req.body.pw == req.body.confpw) {
        bcrypt.hash(data.pw, 10, (err, hash) => {
          if (err) {
            console.log(err);
          } else {
            data.pw = hash;
            data
              .save()
              .then((item) => {
                mailid = item._id;
                console.log(item);

                res.redirect(
                  signalFrontend({
                    type: 'player-registered',
                    name: item.name,
                  }),
                );
                // res.render('register', {
                //   title: 'User Registration',
                //   id: item._id,
                // });
              })
              .then(() => {
                email.send({
                  template: path.join(__dirname, 'emails', 'user'),
                  message: {
                    to: data.email,
                  },
                  locals: {
                    id: mailid,
                    name: data.name,
                  },
                });
              })
              .then(() => console.log('email sent'))
              .catch((err) => console.log(err));
          }
        });
      } else {
        res.redirect(
          signalFrontend({
            type: 'error',
            error: 'password and conformation password different',
          }),
        );
        // res.render('error', {
        //   title: 'Error',
        //   message: 'password and conformation password must be the same',
        // });
      }
    } else {
      //res.send("The email has already been registered");
      res.redirect(
        signalFrontend({
          type: 'error',
          error: 'email already registered',
        }),
      );
      // res.render('error', {
      //   title: 'Error',
      //   message: 'The email has already been registered',
      // });
    }
  });
});

var events = {
  'Crazy Crawler':4,
  'Molecular Mystery':4,
  'Compact Condo':1,
  'Risk Reduction':4,
  'Lost Lander':4,
  'Spaghetti Bridge':5,
  'Ropeway Design':5,
  'Dev Dash':1,
}
app.post('/regTeam', (req, res) => {
  var recieved_data = req.body;
  //console.log(recieved_data)
  var data = {
    name: recieved_data.team_name,
    event: recieved_data.event,
    team_limit: events[recieved_data.event],
    members: [],
  };
  User.findOne({ email: recieved_data.team_leader_email }, (err, userDoc) => {
    if (err) {
      consolse.log(err);
    } else if (userDoc == null) {
      res.redirect(
        signalFrontend({
          type: 'error',
          error: 'The team leader email is not registered',
        }),
      );
      // res.render('error', {
      //   title: 'Error',
      //   message: 'The team leader email is not registered',
      // });
    } else {
      bcrypt.compare(recieved_data.leader_pw, userDoc.pw, (err, resp) => {
        if (err) {
          console.log(err);
        } else if (resp) {
          Event.findOne({ name: recieved_data.event }, (err, doc) => {
            var participants = doc != null ? doc.participants : [];
            var participationFlag = participants.includes(userDoc.id);
            if (err) {
              console.log(err);
            } else if (participationFlag == true) {
              res.redirect(
                signalFrontend({
                  type: 'error',
                  error: 'You have already registered for this event',
                }),
              );
              // res.render('error', {
              //   title: 'Error',
              //   message: 'Team leader has already registered for this event',
              // });
            } else {
              data.members.push(userDoc._id);
              var team = new Team(data);
              team
                .save()
                .then((item) => {
                  tid = item._id;
                  res.redirect(
                    signalFrontend({
                      type: 'team-registered',
                      id: item._id,
                      name: item.name,
                      event: item.event,
                    }),
                  );
                  // res.render('teamRegister', {
                  //   title: 'Team Registration',
                  //   id: item._id,
                  //   name: item.name,
                  // });
                })
                .then(() => {
                  email.send({
                    template: path.join(__dirname, 'emails', 'team'),
                    message: {
                      to: userDoc.email,
                    },
                    locals: {
                      Tid: tid,
                      Tname: data.name,
                    },
                  });
                })
                .then(() => console.log('email sent'))
                .catch((err) => console.log(err));

              Event.findOneAndUpdate(
                { name: data.event },
                { $push: { participants: userDoc._id } },
                { new: true, upsert: true },
                (err, docs) => {
                  if (err) {
                    console.log(err);
                  }
                },
              );
            }
          });
        } else {
          res.redirect(
            signalFrontend({
              type: 'error',
              error: 'Invalid Password',
            }),
          );
          // res.render('error', {
          //   title: 'Error',
          //   message: 'Invalid Team Leader Password',
          // });
        }
      });
    }
  });
});

app.post('/joinTeam', (req, res) => {
  var recieved_data = req.body;

  User.findOne({ email: recieved_data.email }, (err, userDoc) => {
    if (err) {
      console.log(err);
    } else if (userDoc == null) {
      res.redirect(
        signalFrontend({
          type: 'error',
          error: 'Your email is not registered',
        }),
      );
      // res.render('error', {
      //   title: 'Error',
      //   message: 'This email is not registered',
      // });
    } else {
      bcrypt.compare(recieved_data.pw, userDoc.pw, (err, resp) => {
        if (err) {
          console.log(err);
        } else if (resp) {
          Team.findOne({ _id: recieved_data.team_id }, (err, teamDoc) => {
            if (err) {
              console.log(err);
            } else if (teamDoc != null) {
              var event = teamDoc.event;
              var limit = teamDoc.team_limit;
              Event.findOne({ name: event }, (err, eventDoc) => {
                var participants =
                  eventDoc != null ? eventDoc.participants : [];
                var participationFlag = participants.includes(userDoc.id);
                if (err) {
                  console.log(err);
                } else if (participationFlag == true) {
                  res.redirect(
                    signalFrontend({
                      type: 'error',
                      error: 'You have already registered for this event',
                    }),
                  );
                  // res.render('error', {
                  //   title: 'Error',
                  //   message: 'You have already registered for this event',
                  // });
                } else {
                  if (teamDoc.members.length < limit) {
                    teamDoc.members.push(userDoc._id);
                    eventDoc.participants.push(userDoc._id);
                    teamDoc.save();
                    eventDoc.save();

                    res.redirect(
                      signalFrontend({
                        type: 'joined-team',
                        name: teamDoc.name,
                      }),
                    );
                    // res.render('joinTeam', {
                    //   title: 'Done!',
                    //   team: teamDoc.name,
                    // });
                    User.findOne(
                      { id: teamDoc.members[0].email },
                      (err, lead) => {
                        console.log('Email not sent to Leader');
                        email
                          .send({
                            template: path.join(
                              __dirname,
                              'emails',
                              'memberJoin',
                            ),
                            message: {
                              to: lead.email,
                            },
                            locals: {
                              team: teamDoc.name,
                              member: userDoc.name,
                              event: teamDoc.event,
                            },
                          })
                          .then(() => console.log('email sent'))
                          .catch((err) => console.log(err));
                      },
                    );
                  } else {
                    res.redirect(
                      signalFrontend({
                        type: 'error',
                        error: 'Max number of members reached',
                      }),
                    );
                    // res.render('error', {
                    //   title: 'Error',
                    //   message: 'Max number of members reached',
                    // });
                  }
                }
              });
            } else {
              res.redirect(
                signalFrontend({
                  type: 'error',
                  error: 'Invalid Team Id',
                }),
              );
              // res.render('error', {
              //   title: 'Error',
              //   message: 'Invalid Team Id',
              // });
            }
          });
        } else {
          // res.render('error', { title: 'Error', message: 'Invalid Password' });
          res.redirect(
            signalFrontend({
              type: 'error',
              error: 'Invalid Team Id',
            }),
          );
        }
      });
    }
  });
});

module.exports = app;

// http.createServer(app).listen(3000);