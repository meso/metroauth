/**
 * OAuth 1.0(a) Library for Windows Store App.
 * Especially for Twitter, currently.
 */
; (function () {
  "use strict";

  function isValidUri(uri) {
    try {
      new Windows.Foundation.Uri(uri);
      return true;
    } catch (err) {
    }
    return false;
  };

  var Client = WinJS.Class.define(
    /**
     * Constructor
     */
    function(requestTokenUrl, accessTokenUrl, callbackUrl, consumerKey, consumerSecret, signatureMethod, version, nonceSize, userAgent) {
      if (!isValidUri(requestTokenUrl)) {
        throw new Error("RequestTokenUrl is not valid: " + requestTokenUrl);
      }
      this.requestTokenUrl_ = requestTokenUrl;
      if (!isValidUri(accessTokenUrl)) {
        throw new Error("AccessTokenUrl is not valid: " + accessTokenUrl);
      }
      this.accessTokenUrl_ = accessTokenUrl;
      this.callbackUrl_ = callbackUrl;

      this.consumerKey_ = consumerKey;
      this.consumerSecret_ = consumerSecret;

      if (signatureMethod && signatureMethod != "HMAC-SHA1" && signatureMethod != "PLAINTEXT") {
        throw new Error("Unsupported signature method: " + signatureMethod);
      }
      this.signatureMethod_ = signatureMethod || "HMAC-SHA1"
      this.version_ = version || "1.0";
      this.nonceSize_ = nonceSize || 32;
      this.userAgent_ = userAgent || "JavaScript Client for Windows Store App";
    },

    /**
     * Instance members
     */
    {

      getTimestamp_: function () {
        return Math.round(new Date().getTime() / 1000.0);
      },

      encodeData_: function (toEncode) {
        if (toEncode === null || toEncode === undefined || toEncode === "") return "";
        var result = encodeURIComponent(toEncode);
        // Fix the mismatch between RFC3986 and encodeURIComponent
        return result.replace(/\!/g, "%21")
                     .replace(/\'/g, "%27")
                     .replace(/\(/g, "%28")
                     .replace(/\)/g, "%29")
                     .replace(/\*/g, "%sA");
      },

      decodeData_: function (toDecode) {
        if (toDecode === null || toDecode === undefined || toDecode === "") return "";
        return decodeURIComponent(toDecode.replace(/\+/g, " "));
      },

      getSortedKeys_: function (obj) {
        var keys = [];

        for (var key in obj) if (obj.hasOwnProperty(key)) {
          keys.push(key);
        }
        return keys.sort();
      },

      createNonce_: function () {
        var nonce = "";
        for (var i = 0; i < this.nonceSize_; i++) {
          nonce += Math.floor(Math.random() * 16).toString(16);
        }
        return nonce;
      },

      createSignatureBase_: function (params, method, url) {
        var paramsStr = "";
        var sortedKeys = this.getSortedKeys_(params);
        for (var i in sortedKeys) {
          var key = sortedKeys[i];
          var val = params[key];
          if (val !== null && val !== undefined) {
            if (paramsStr !== "") {
              paramsStr += "&";
            }
            paramsStr += this.encodeData_(key) + "=" + this.encodeData_(val);
          }
        }
        return method.toUpperCase() + "&" + this.encodeData_(url) + "&" + this.encodeData_(paramsStr);
      },

      createSignature_: function (signatureBase, tokenSecret) {
        var keyStr = this.encodeData_(this.consumerSecret_) + "&";
        if (tokenSecret !== null && tokenSecret !== undefined) {
          keyStr += this.encodeData_(tokenSecret);
        }

        var hash = "";
        if (this.signatureMethod_ === "PLAINTEXT") {
          hash = keyStr;
        } else {
          hash = this.generateHmacSha1Signature_(signatureBase, keyStr);
        }
        return hash;
      },

      generateHmacSha1Signature_: function (signatureBase, keyStr) {
        console.log(signatureBase);
        var keyMaterial = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(keyStr, Windows.Security.Cryptography.BinaryStringEncoding.Utf8);
        var sigMaterial = Windows.Security.Cryptography.CryptographicBuffer.convertStringToBinary(signatureBase, Windows.Security.Cryptography.BinaryStringEncoding.Utf8);
        var key = Windows.Security.Cryptography.Core.MacAlgorithmProvider.openAlgorithm("HMAC_SHA1").createKey(keyMaterial);
        var signatureBuffer = Windows.Security.Cryptography.Core.CryptographicEngine.sign(key, sigMaterial);
        return Windows.Security.Cryptography.CryptographicBuffer.encodeToBase64String(signatureBuffer);
      },

      prepareParameters_: function (oauthToken, oauthTokenSecret, oauthVerifier, method, url, extraParams) {
        var oauthParameters = {
          "oauth_consumer_key": this.consumerKey_,
          "oauth_nonce": this.createNonce_(),
          "oauth_signature_method": this.signatureMethod_,
          "oauth_timestamp": this.getTimestamp_(),
          "oauth_version": this.version_,
        };

        if (oauthToken) {
          oauthParameters["oauth_token"] = oauthToken;
        }
        if (oauthVerifier) {
          oauthParameters["oauth_verifier"] = oauthVerifier;
        }
        if (extraParams) {
          for (var key in extraParams) if (extraParams.hasOwnProperty(key)) {
            oauthParameters[key] = extraParams[key];
          }
        }

        var signatureBase = this.createSignatureBase_(oauthParameters, method, url);
        var signature = this.createSignature_(signatureBase, oauthTokenSecret);
        oauthParameters["oauth_signature"] = signature;

        return oauthParameters;
      },

      createParamsStr_: function (params) {
        var str = "";
        for (var key in params) if (params.hasOwnProperty(key)) {
          if (str === "") {
            str += "OAuth ";
          } else {
            str += ", ";
          }
          str += this.encodeData_(key) + "=\"" + this.encodeData_(params[key]) + "\""
        }
        console.log(str);
        return str;
      },

      authenticate: function (redirectUrlBase, callback) {
        var self = this;
        this.getRequestToken_("POST", function(err, oauthToken, oauthTokenSecret) {
          if (err) {
            return callback(err);
          }
          var url = redirectUrlBase + "?oauth_token=" + oauthToken;
          var startUri = new Windows.Foundation.Uri(url);
          var endUri = new Windows.Foundation.Uri(self.callbackUrl_);

          Windows.Security.Authentication.Web.WebAuthenticationBroker.authenticateAsync(
          Windows.Security.Authentication.Web.WebAuthenticationOptions.none, startUri, endUri).done(function(result) {
            if (result.responseStatus === Windows.Security.Authentication.Web.WebAuthenticationStatus.errorHttp) {
              return callback(new Error("HTTP Response Error: " + result.responseErrorDetail));
            } else {
              var oauthVerifier = "";
              try {
                var pairs = result.responseData.split("?")[1].split("&");
                pairs.forEach(function(element, index, array) {
                  var splits = element.split("=");
                  switch (splits[0]) {
                    case "oauth_verifier":
                      oauthVerifier = splits[1];
                      break;
                  }
                });
              } catch (err) {
              }
              if (oauthVerifier === "") {
                // retry if your application MUST needs authentication
                self.authenticate(redirectUrlBase, callback);
                return;
              }
              self.getAccessToken_("POST", oauthToken, oauthTokenSecret, oauthVerifier, function (err, accessToken, accessTokenSecret, additionalParams) {
                if (err) {
                  return callback(err);
                }
                if (accessToken === false) {
                  return callback(new Error("Authentication cancelled."));
                } else {
                  self.accessToken_ = accessToken;
                  self.accessTokenSecret_ = accessTokenSecret;
                  return callback(null, accessToken, accessTokenSecret, additionalParams);
                }
              });
            }
          }, function(err) {
            return callback(err);
          });
        });
      },

      getRequestToken_: function (method, callback) {
        method = method || "POST";
        var extraParams = {
          "oauth_callback": this.callbackUrl_
        }
        var options = {
          type: method,
          url: this.requestTokenUrl_,
          headers: {
            "Accept": "*/*",
            "User-Agent": this.userAgent_,
            "Authorization": this.createParamsStr_(this.prepareParameters_(null, null, null, method, this.requestTokenUrl_, extraParams))
          }
        };
        WinJS.xhr(options).done(
          function complete(result) {
            var pairs = result.responseText.split("&");
            var oauthToken, oauthTokenSecret;
            pairs.forEach(function(element, index, array) {
              var splits = element.split("=");
              switch (splits[0]) {
                case "oauth_token":
                  oauthToken = splits[1];
                  break;
                case "oauth_token_secret":
                  oauthTokenSecret = splits[1];
                  break;
              }
            });
            return callback(null, oauthToken, oauthTokenSecret);
          },
          function error(result) {
            return callback(new Error("getRequestTokenError: " + result.responseText));
          }
        );
      },

      getAccessToken_: function (method, oauthToken, oauthTokenSecret, oauthVerifier, callback) {
        method = method || "POST";
        var options = {
          type: method,
          url: this.accessTokenUrl_,
          headers: {
            "Accept": "*/*",
            "User-Agent": this.userAgent_,
            "Authorization": this.createParamsStr_(this.prepareParameters_(oauthToken, oauthTokenSecret, oauthVerifier, method, this.accessTokenUrl_))
          }
        };

        WinJS.xhr(options).done(
          function complete(result) {
            var pairs = result.responseText.split("&");
            var accessToken, accessTokenSecret, additionalParams = {};
            pairs.forEach(function(element, index, array) {
              var splits = element.split("=");
              switch (splits[0]) {
                case "oauth_token":
                  accessToken = splits[1];
                  break;
                case "oauth_token_secret":
                  accessTokenSecret = splits[1];
                  break;
                default:
                  additionalParams[splits[0]] = splits[1];
                  break;
              }
            });
            return callback(null, accessToken, accessTokenSecret, additionalParams);
          },
          function error(result) {
            return callback(new Error("getAccessTokenError: " + result.responseText));
          }
        );
      },

      get: function (url, accessToken, accessTokenSecret, extraParams) {
        var paramStr = "";
        if (extraParams) {
          for (var key in extraParams) if (extraParams.hasOwnProperty(key)) {
            paramStr += paramStr === "" ? "?" : "&";
            paramStr += (key + "=" + this.encodeData_(extraParams[key]));
          }
        }
        var options = {
          type: "GET",
          url: url + paramStr,
          headers: {
            "Accept": "*/*",
            "User-Agent": this.userAgent_,
            "Authorization": this.createParamsStr_(this.prepareParameters_(accessToken, accessTokenSecret, null, "GET", url, extraParams))
          }
        }
        return WinJS.xhr(options);
      },

      getStream: function (url, accessToken, accessTokenSecret) {
        var options = {
          type: "GET",
          url: url,
          responseType: "ms-stream",
          headers: {
            "Accept": "*/*",
            "User-Agent": this.userAgent_,
            "Authorization": this.createParamsStr_(this.prepareParameters_(accessToken, accessTokenSecret, null, "GET", url))
          }
        }
        return WinJS.xhr(options);
      }

    });

  WinJS.Namespace.define("OAuth", {
    Client: Client
  });
})();
