'use strict';

module.exports = function (configObj) {
  function urlRewriteMiddleware(req, res, next) {
    // If request is for a real file (js/css/images/fonts/etc), let it pass through
    const isStatic =
      req.url.match(/\.(js|css|map|json|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/i) ||
      req.url.startsWith('/js/') ||
      req.url.startsWith('/css/') ||
      req.url.startsWith('/images/') ||
      req.url.startsWith('/resources/') ||
      req.url.startsWith('/themes/') ||
      req.url.startsWith('/libs/');

    if (!isStatic) {
      req.url = '/index.html';
    }
    next();
  }

  return new Promise((resolve) => {
    // run BEFORE JET’s default middleware (keeps live reload working)
    console.log("running before_serve hook")

    configObj.preMiddleware = [urlRewriteMiddleware];
    resolve(configObj);
  });
};
