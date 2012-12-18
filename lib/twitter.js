/**
 * Twitter Client Library for Windows Store App.
 *
 */
; (function () {
  "use strict";

  var Client = WinJS.Class.define(
    /**
     * Constructor
     */
    function (consumerKey, conssumerSecret, callbackUrl) {
      var self = this;
      this.oauth = new OAuth.Client(
        "https://api.twitter.com/oauth/request_token",
        "https://api.twitter.com/oauth/access_token",
        callbackUrl,
        consumerKey,
        conssumerSecret
      );
    },

    /**
     * Instance members
     */
    {
      AUTHORIZE_URL: "https://api.twitter.com/oauth/authorize",
      STREAM_API_BASE_URL: "https://userstream.twitter.com/1.1/",
      REST_API_BASE_URL: "https://api.twitter.com/1.1/",

      setAuthInfo: function (accessToken, accessTokenSecret, userId, screenName) {
        this.accessToken_ = accessToken;
        this.accessTokenSecret_ = accessTokenSecret;
        this.userId_ = userId;
        this.screenName_ = screenName;
      },

      authenticate: function (callback) {
        var self = this;
        this.oauth.authenticate(this.AUTHORIZE_URL, function (err, accessToken, accessTokenSecret, additionalParams) {
          if (err) return callback(err);
          self.accessToken_ = accessToken;
          self.accessTokenSecret_ = accessTokenSecret;
          self.userId_ = additionalParams.user_id;
          self.screenName_ = additionalParams.screen_name;
          return callback(null, accessToken, accessTokenSecret, additionalParams.user_id, additionalParams.screen_name);
        });
      }, 

      getTimelines: function (method, params, callback) {
        if (["home_timeline", "user_timeline", "mentions_timeline", "retweets_of_me"].indexOf(method) === -1) {
          return callback(new Error("Unsupported method: " + method));
        }
        this.oauth.get(
          this.REST_API_BASE_URL + "statuses/" + method + ".json",
          this.accessToken_,
          this.accessTokenSecret_,
          params
        ).then(
          function complete(req) {
            var tweets = JSON.parse(req.responseText);
            return callback(null, tweets);
          },
          function error(req) {
            return callback(new Error(req.statusText));
          }
        );
      },

      getSearch: function(method, params, callback){
        if (["tweets", "universal"].indexOf(method) === -1) {
          return callback(new Error("Unsupported method: " + method));
        }
        this.oauth.get(
          this.REST_API_BASE_URL + "search/" + method + ".json",
          this.accessToken_,
          this.accessTokenSecret_,
          params
        ).then(
          function complete(req) {
            var result = JSON.parse(req.responseText);
            return callback(null, result)
          },
          function error(req) {
            return callback(new Error(req.statusText));
          }
        );
      },

      getUserStream: function (params, callback) {
        this.oauth.getStream(
          this.STREAM_API_BASE_URL + "user.json",
          this.accessToken_,
          this.accessTokenSecret_
        ).then(
          function complete(req) {
          },
          function error(err) {
            callback(err);
          },
          function progress(req) {
            if (req.readyState === req.LOADING) {
              var stream = req.response.msDetachStream();
            }
          }
        );
      }
    }
  );

  WinJS.Namespace.define("Twitter", {
    Client: Client
  });
})();
