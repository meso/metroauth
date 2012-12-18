# metroauth #
JavaScript Auth Library for Windows Store App

## Usage ##
```javascript
var twitter = new Twitter.Client("consumer_key", "consumer_secret", "callback_url");
twitter.authenticate(function(err, accessToken, accessTokenSecret, userId, screenName) {
  twitter.getTimeline("home_timeline", {count: 100}, function(err, tweets) {
    tweets.reverse().forEach(function(tweet, index, array) {
      console.log("[" + tweet.created_at + "] @" + tweet.user.screen_name + " | " + tweet.text);
    });
  });
});
```