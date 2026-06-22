/**
 * configuration/ServerCaller.js (Oracle JET / RequireJS)
 * -----------------------------------------------------
 * Style: class-based (like your models)
 * Base URL comes from configuration/settings.json -> API
 *
 * IMPORTANT:
 * - Your backend sometimes returns a wrapper: { success, msg }
 * - And sometimes returns raw data (array/object)
 * This ServerCaller NORMALIZES everything to: { success: true/false, msg: any }
 *
 * Auth:
 * - Sends header: token: <token>  (Spark backend reads req.headers("token"))
 */
define(['jquery', 'configuration/AppConfig'], function ($, appConfig) {
  class ServerCaller {
    constructor() {
      this.baseUrl = appConfig.apiBaseUrl + '/';
    }

    // ----------------------------
    // Token helpers
    // ----------------------------
    setToken(token) {
      try { localStorage.setItem('token', token || ''); } catch (e) {}
    }

    getToken() {
      try { return localStorage.getItem('token') || ''; } catch (e) { return ''; }
    }

    clearToken() {
      try { localStorage.removeItem('token'); } catch (e) {}
    }

    // ----------------------------
    // Helpers
    // ----------------------------
    _fullUrl(endpoint) {
      const base = (this.baseUrl || '').replace(/\/+$/, '');
      const ep = (endpoint || '').startsWith('/') ? endpoint : '/' + endpoint;
      return base + ep;
    }

    _isWrapped(res) {
      return res && typeof res === 'object' && !Array.isArray(res) &&
        Object.prototype.hasOwnProperty.call(res, 'success') &&
        Object.prototype.hasOwnProperty.call(res, 'msg');
    }

    _wrapOk(data) {
      return { success: true, msg: data };
    }

    _wrapErr(msg) {
      return { success: false, msg: msg };
    }

    _safeParse(text) {
      try { return JSON.parse(text); } catch (e) { return null; }
    }

    _buildHeaders(extraHeaders) {
      const headers = Object.assign({ Accept: 'application/json' }, extraHeaders || {});
      const t = this.getToken();
      if (t) headers.token = t;
      return headers;
    }

    _toQueryString(obj) {
      if (!obj) return '';
      const params = [];
      Object.keys(obj).forEach(function (k) {
        const v = obj[k];
        if (v === undefined || v === null) return;
        params.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
      });
      return params.join('&');
    }

    /**
     * submitRequest(endpoint, method, data, headers, callback, options)
     * ---------------------------------------------------------------
     * - endpoint: "/api/parts"
     * - method: "GET" | "POST" | "PUT" | "DELETE"
     * - data: object (JSON) OR FormData
     * - headers: extra headers object
     * - callback signature:
     *     (success, msg, res, textStatus, xhr) => {}
     *   where res is ALWAYS normalized: {success,msg}
     *
     * options:
     *  - json: true/false  (default true for non-FormData)
     *  - formData: true/false (auto if data is FormData)
     */
    submitRequest(endpoint, method, data, headers, callback, options) {
      const self = this;
      const opts = options || {};
      const isFD = opts.formData === true || (typeof FormData !== 'undefined' && data instanceof FormData);
      const isGET = (method || 'GET').toUpperCase() === 'GET';

      let url = self._fullUrl(endpoint);

      // For GET requests, put object data into query string
      if (isGET && data && !isFD && typeof data === 'object' && Object.keys(data).length) {
        const qs = self._toQueryString(data);
        if (qs) url += (url.indexOf('?') >= 0 ? '&' : '?') + qs;
      }

      const ajaxCfg = {
        url: url,
        type: method || 'GET',
        headers: self._buildHeaders(headers),
        success: function (res, textStatus, xhr) {
          const normalized = self._isWrapped(res) ? res : self._wrapOk(res);
          if (typeof callback === 'function') {
            callback(true, normalized.msg, normalized, textStatus, xhr);
          }
        },
        error: function (xhr, textStatus) {
          const parsed = self._safeParse(xhr && xhr.responseText ? xhr.responseText : '');
          let normalized;
          if (self._isWrapped(parsed)) normalized = parsed;
          else if (parsed !== null) normalized = self._wrapErr(parsed);
          else normalized = self._wrapErr(xhr && xhr.responseText ? xhr.responseText : 'Request failed');

          const errMsg = normalized && normalized.msg !== undefined ? normalized.msg : 'Request failed';

          if (typeof callback === 'function') {
            callback(false, errMsg, normalized, xhr.status, xhr);
          }
        }
      };

      // Body handling
      if (!isGET) {
        if (isFD) {
          ajaxCfg.data = data;
          ajaxCfg.processData = false;
          ajaxCfg.contentType = false;
          ajaxCfg.enctype = 'multipart/form-data';
        } else {
          const useJson = (opts.json !== false);
          ajaxCfg.data = useJson ? JSON.stringify(data || {}) : (data || {});
          ajaxCfg.contentType = useJson ? 'application/json; charset=utf-8' : 'application/x-www-form-urlencoded; charset=utf-8';
          ajaxCfg.dataType = 'json';
        }
      } else {
        ajaxCfg.dataType = 'json';
      }

      $.ajax(ajaxCfg);
    }
  }

  return new ServerCaller();
});
