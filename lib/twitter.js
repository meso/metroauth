/**
 * Twitter Client Library for Windows Store App.
 *
 */
; ( function () {
  "use strict";

  var Client = WinJS.Class.define(
    /**
     * Constructor
     */
    function ( consumerKey, conssumerSecret, callbackUrl ) {
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

      setAuthInfo: function ( info ) {
        if ( !info.accessToken || !info.accessTokenSecret ) {
          throw new Error( "Auth information not found." );
        }
        this.accessToken_ = info.accessToken;
        this.accessTokenSecret_ = info.accessTokenSecret;
        this.userId_ = info.userId;
        this.screenName_ = info.screenName;
      },

      authenticate: function () {
        var self = this;
        return new WinJS.Promise(
          function ( c, e, p ) {
            self.oauth.authenticate( self.AUTHORIZE_URL, function ( err, accessToken, accessTokenSecret, additionalParams ) {
              if ( err ) return e( err );
              self.accessToken_ = accessToken;
              self.accessTokenSecret_ = accessTokenSecret;
              self.userId_ = additionalParams.user_id;
              self.screenName_ = additionalParams.screen_name;
              return c( {
                accessToken: accessToken,
                accessTokenSecret: accessTokenSecret,
                userId: additionalParams.user_id,
                screenName: additionalParams.screen_name
              } );
            } );
          }
        );
      },

      getTimelines: function ( method, params ) {
        var self = this;
        return new WinJS.Promise(
          function ( c, e, p ) {
            if ( ["home_timeline", "user_timeline", "mentions_timeline", "retweets_of_me"].indexOf( method ) === -1 ) {
              return e( new Error( "Unsupported method: " + method ) );
            }
            self.oauth.get(
              self.REST_API_BASE_URL + "statuses/" + method + ".json",
              self.accessToken_,
              self.accessTokenSecret_,
              params
            ).then(
              function complete( req ) {
                var tweets = JSON.parse( req.responseText );
                return c( tweets );
              },
              function error( req ) {
                return e( new Error( req.statusText ) );
              }
            );
          }
        );
      },

      getSearch: function ( method, params ) {
        var self = this;
        return new WinJS.Promise(
          function ( c, e, p ) {
            if ( ["tweets", "universal"].indexOf( method ) === -1 ) {
              return e( new Error( "Unsupported method: " + method ) );
            }
            self.oauth.get(
              self.REST_API_BASE_URL + "search/" + method + ".json",
              self.accessToken_,
              self.accessTokenSecret_,
              params
            ).then(
              function complete( req ) {
                var result = JSON.parse( req.responseText );
                return c( result )
              },
              function error( req ) {
                return e( new Error( req.statusText ) );
              }
            );
          }
        );
      },

      getUserStream: function ( params ) {
        var self = this;
        return new WinJS.Promise(
          function ( c, e, p ) {
            self.oauth.getStream(
              self.STREAM_API_BASE_URL + "user.json",
              self.accessToken_,
              self.accessTokenSecret_
            ).then(
              function complete( req ) {
              },
              function error( err ) {
                return e( err );
              },
              function progress( req ) {
                if ( req.readyState === req.LOADING ) {
                  var stream = req.response.msDetachStream();
                }
              }
            );
          }
        );
      },

      postTweet: function ( method, tweet) {
        var self = this;
        return new WinJS.Promise(
          function ( c, e, p ) {
            self.oauth.post(
              self.REST_API_BASE_URL + "statuses/update.json",
              self.accessToken_,
              self.accessTokenSecret_,
              { status: tweet }
            ).then(
              function complete( req ) {
                console.log( req );
                return c( req );
              },
              function error( err ) {
                // TODO: move error-code to resource file.
                // 187:Status is a duplicate
                var error = JSON.parse( err.message ).errors['0'];
                console.log( '[error]' + error.code + ':' + error.message );
                return e( err );
              }
            );
          }
        );
      }
    }
  );

  WinJS.Namespace.define( "Twitter", {
    Client: Client
  } );
} )();
