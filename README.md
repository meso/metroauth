# metroauth #
JavaScript Auth Library for Windows Store App

## Usage ##
```javascript
var twitter = new Twitter.Client("consumer_key", "consumer_secret", "callback_url");
twitter.authenticate().then(
  function complete(info) {
    twitter.getTimelines("home_timeline", {count: 100}).then(
      function complete(tweets) {
        tweets.reverse().forEach(function(tweet, index, array) {
          console.log("[" + tweet.created_at + "] @" + tweet.user.screen_name + " | " + tweet.text);
        });
      },
      function error(err) {
        console.log(err.message);
      }
    );
  },
  function error(err) {
    console.log(err.message);
  }
);
```
