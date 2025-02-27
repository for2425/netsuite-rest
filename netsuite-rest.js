const OAuth = require("oauth-1.0a");
const crypto = require("crypto");
const http = require("needle");

class NetsuiteRest {
  constructor(options) {
    this.consumer_key = options.consumer_key;
    this.consumer_secret_key = options.consumer_secret_key;
    this.token = options.token;
    this.token_secret = options.token_secret;
    this.version = "1.0";
    this.algorithm = "HMAC-SHA256";
    this.realm = options.realm;
    this.base_url = options.base_url;
    this.timeout = options.timeout || 60000;
  }
  getAuthorizationHeader(options) {
    const oauth = OAuth({
      consumer: {
        key: this.consumer_key,
        secret: this.consumer_secret_key,
      },
      realm: this.realm,
      signature_method: this.algorithm,
      hash_function(base_string, key) {
        return crypto
          .createHmac("sha256", key)
          .update(base_string)
          .digest("base64");
      },
    });
    return oauth.toHeader(
      oauth.authorize(
        {
          url: options.url,
          method: options.method,
        },
        {
          key: this.token,
          secret: this.token_secret,
        }
      )
    );
  }
  request(opts) {
    const { path = "*", method = "GET", body = "", heads = {} } = opts;

    // Setup the Request URI
    let uri;
    if (this.base_url) uri = `${this.base_url}/services/rest/${path}`;
    else {
      // as suggested by dylbarne in #15: sanitize url to enhance overall usability
      uri = `https://${this.realm
        .toLowerCase()
        .replace("_", "-")}.suitetalk.api.netsuite.com/services/rest/${path}`;
    }

    const options = {
      url: uri,
      method,
      throwHttpErrors: true,
      decompress: true,
      open_timeout: this.timeout
    };
    options.headers = this.getAuthorizationHeader(options);
    if (Object.keys(heads).length > 0) {
      options.headers = { ...options.headers, ...heads };
    }
    if (body) {
      options.body = body;
      options.headers.prefer = "transient";
    }
    options.json = true; 
    
      return http(options.method.toLowerCase(), options.url, options.body, options)
        .then((response) => {
          if (response.statusCode !== 200) {
            return Promise.reject(new Error(response.body));
          }
          if (response.body) { 
            return { 
              data: JSON.parse(response.body)  
            };
          }
   
          return {}; 
        })
        .catch((e) => Promise.reject(new Error(e.message)));

  }
}
module.exports = NetsuiteRest;
