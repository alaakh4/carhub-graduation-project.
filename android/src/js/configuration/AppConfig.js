define(['text!configuration/settings.json'], function (settings) {
  var parsed;

  try {
    parsed = JSON.parse(settings || '{}');
  } catch (e) {
    parsed = {};
  }

  var rawBaseUrl = String(parsed.API || '').trim();
  var apiBaseUrl = rawBaseUrl.replace(/\/+$/, '');

  function absoluteUrl(path) {
    var rawPath = String(path || '').trim();
    if (!rawPath) return apiBaseUrl;
    if (/^https?:\/\//i.test(rawPath)) return rawPath;
    if (!apiBaseUrl) return rawPath;
    return apiBaseUrl + '/' + rawPath.replace(/^\/+/, '');
  }

  var config = {
    apiBaseUrl: apiBaseUrl,
    absoluteUrl: absoluteUrl
  };

  if (typeof window !== 'undefined') {
    window.CarHubAppConfig = config;
  }

  return config;
});
