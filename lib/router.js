const Methods = require("./methods");
const parseUrl = require("parse-url");

function Route(path) {
  // route contains a path
  // route contains
  this.path = path;
  this.stack = [];
  this.methods = {}
  this._handles_method = (method) =>{
    this.methods[method.toLowerCase()];
  }
  this.dispatch = (req, res, done) =>{

    let method = req.method.toLowerCase();

    let stack_location = 0;
    let stack = this.stack;
    if(stack.length === 0){
      return done();
    }

    req.route = this;

    next();

    function next(err){

      let layer = stack[stack_location++];
      if (!layer) {
        return done(err);
      }

      if(layer.method !== method){
        return done(err);
      }

      layer.handle_req(req, res, next);
    }

  }
}

Methods.forEach(function(method){
  Route.prototype[method] = function(...fns){
      //todo next
      fns.forEach(f => {
        const layer = new Layer('/', f);
        layer.method = method;
        this.methods[method] = true;
        this.stack.push(layer);
      });
  }
})

function Layer(path, fn) {
  // layer contains a path
  // layers contains a way to handle a request
  this.handle = fn;
  this.path = path;
  this.route = undefined;
  this.method = undefined;
  this.match = (path) => {
    //console.log(path)
    // this needs to be more advanced but for this demo we will use this;
    if(this.mountPath){
      //console.log(this.mountPath + this.path)
      //return this.mountPath + this.path || this.path === '*';
    }

    return this.path === path || this.path ===  '*';
  };
  this.handle_req = function(req, res, next){
    this.handle(req, res, next);
  };
}

function Router() {
  this.stack = [];
  this.handle = (req, res, done) => {
    // handle the request from the server by moving through the stack and matching the routes
    done =
      done ||
      function(err) {
        console.log("done");
      };

    let stack_location = 0;
    let stack = this.stack;
    //loop through the stack check if a layer has a route?
    req.next = next;
    
    next();

    function next() {
      if (stack_location >= stack.length) {
        return;
      }
      // get the current path
      let path = parseUrl(req.url).pathname;
      // if path is empty we should use /
      if(path === ''){
        path = '/'
      }
      // if there is an issue with the path 
      if (path == null) {
        return done(layerError);
      }

      let layer;
      let match;
      let route;

      while (match !== true && stack_location < stack.length) {
        layer = stack[stack_location++];
        match = layer.match(path);
        route = layer.route;

        if (!route) {
          // process non-route handlers normally
          continue;
        }

        const method = req.method;

        const has_method = route._handles_method(method);

        if(!has_method){
          match = false;
          continue;
        }
      }

      if (match !== true) {
        // if there are no matches for the request
        return done();
      }
     
      if (route) {
        return layer.handle_req(req, res, next);
      }

      layer.handle_req(req, res, next);
    }
  };
  this.use = (path, ...fn) => {
    // add layers to stack
    // if path is a function
    if (typeof path === "function") {
      fn = [path];
      path = "*";
    }

    fn.forEach(f => {
      // if f has handle it is a router or app object, if not handle it normally
      //console.log(f.handle)
      if (!f.handle) {
        const layer = new Layer(path, f);
        layer.route = undefined;
        return this.stack.push(layer);
      }
      f.mountPath = path;
      
      // if f has a handle function we use that one to handle the requests
      const layer = new Layer(path, (req, res, next) => {
        f.handle(req, res, next);
      });
      layer.route = undefined;
      console.log(layer)
      this.stack.push(layer);
    }, this);

    return this;
  };
  this.route = (path) => {
    if (typeof path !== "string") {
      throw "please provide a path";
    }
    const route = new Route(path);
    const layer = new Layer(path, route.dispatch.bind(route));      
    this.stack.push(layer);
    return route;
  };
}

Methods.forEach(function(method){
  // assign methods to Router when router is defined outside of
  // this is not used unless defined with Router[methodname]
  Router.prototype[method] = function(path, ...fn) {
    var route = this.route(path);
    route[method].apply(route, fn);
    return this;
  };
});

function createRouter() {
  return new Router();
}

module.exports = createRouter;