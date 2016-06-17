'use strict';
var express = require('express');
var router = express.Router();
var tweetBank = require('../tweetBank');

module.exports = function makeRouterWithSockets (io, client) {

  // a reusable function
  function respondWithAllTweets (req, res, next){
    client.query('SELECT content, name, Tweets.id AS id, pictureurl FROM Tweets INNER JOIN Users ON tweets.userid = Users.id', function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweets = result.rows;
      res.render('index', { title: 'Twitter.js', tweets: tweets, showForm: true });
    });

    // var allTheTweets = tweetBank.list();
    // res.render('index', {
    //   title: 'Twitter.js',
    //   tweets: allTheTweets,
    //   showForm: true
    // });
  }

  // here we basically treet the root view and tweets view as identical
  router.get('/', respondWithAllTweets);
  router.get('/tweets', respondWithAllTweets);

  // single-user page
  router.get('/users/:username', function(req, res, next){
    client.query('SELECT content, name, Tweets.id AS id, pictureurl FROM Tweets INNER JOIN Users ON tweets.userid = Users.id WHERE Users.name=$1', [req.params.username], function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweets = result.rows;
      res.render('index', { title: 'Twitter.js', tweets: tweets, showForm: true, username: req.params.username });
    });

    // var tweetsForName = tweetBank.find({ name: req.params.username });
    // res.render('index', {
    //   title: 'Twitter.js',
    //   tweets: tweetsForName,
    //   showForm: true,
    //   username: req.params.username
    // });
  });

  // single-tweet page
  router.get('/tweets/:id', function(req, res, next){

    client.query('SELECT content, name, Tweets.id AS id, pictureurl, Users.name AS username FROM Tweets INNER JOIN Users ON tweets.userid = Users.id WHERE Tweets.id=$1', [req.params.id], function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweets = result.rows;
      res.render('index', { title: 'Twitter.js', tweets: tweets, showForm: true, username: tweets.username });
    });

    // var tweetsWithThatId = tweetBank.find({ id: Number(req.params.id) });
    // res.render('index', {
    //   title: 'Twitter.js',
    //   tweets: tweetsWithThatId // an array of only one element ;-)
    // });
  });

  // create a new tweet
  router.post('/tweets', function(req, res, next){ 

    client.query('SELECT * FROM Users WHERE name = $1',[req.body.name], function(err, result){
      if (err) return next(err);
      var currentUser = req.body.name;
      if (!result.rows[0]){
        client.query('INSERT INTO Users (name) VALUES ($1)', [req.body.name], function(err, result){
          if (err) return next(err);
          // console.log("insertion result: "+JSON.stringify(result.rows[0]));

          // We could have used a RETURNING clause before VALUES to return from our query the user of interest!!!

          client.query('SELECT * FROM Users WHERE name = $1',[req.body.name], function(err, result){
            if (err) return next(err);
            client.query('INSERT INTO tweets (userId, content) VALUES ($1, $2)', [result.rows[0].id, req.body.content], function (err, result) {
              if (err) return next(err);
              io.sockets.emit('new_tweet', {name: req.body.name, content: req.body.content});
              res.redirect('/');
            });
          });
        });
      }
      else{
        client.query('INSERT INTO tweets (userId, content) VALUES ($1, $2)', [result.rows[0].id, req.body.content], function (err, result) {
          if (err) return next(err);
          io.sockets.emit('new_tweet', {name: req.body.name, content: req.body.content});
          res.redirect('/');
        });
      }
    });
  });




  return router;
}
