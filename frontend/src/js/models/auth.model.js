/**
 * models/auth.model.js
 * -------------------
 * Auth API calls using configuration/ServerCaller (same style as part.model.js).
 *
 * Endpoints used (change if your backend differs):
 * - POST /api/client/login
 * - POST /api/shop/login
 * - POST /api/client/register
 * - POST /api/shop/register
 */

define(['configuration/ServerCaller'], function (server) {
  const ENDPOINTS = {
    client: {
      login: '/api/client/login',
      register: '/api/client/register'
    },
    shop: {
      login: '/api/shop/login',
      register: '/api/shop/register'
    },
    auth: {
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password'
    }
  };

  function _extractError(res, fallbackMsg) {
    if (!res) return fallbackMsg || 'Request failed';
    return res.msg || res.error || fallbackMsg || 'Request failed';
  }

  class AuthModel {
    /**
     * Login
     * @param {'client'|'shop'} role
     * @param {string} email
     * @param {string} password
     * @param {(ok:boolean, data:any)=>void} notify
     */
    login(role, email, password, notify) {
      const r = (role === 'shop') ? 'shop' : 'client';
      const url = ENDPOINTS[r].login;
      const body = { email: email, password: password };

      server.submitRequest(url, 'POST', body, {}, (success, msg, res) => {
        // success means HTTP success from ServerCaller
        if (!success) return notify(false, _extractError(res, msg));
        // some APIs also include success=false in body
        if (res && res.success === false) return notify(false, _extractError(res, 'Login failed'));
        return notify(true, res);
      }, { json: true });
    }

    /**
     * Register
     * @param {'client'|'shop'} role
     * @param {object} payload
     * @param {(ok:boolean, data:any)=>void} notify
     */
    register(role, payload, notify) {
      const r = (role === 'shop') ? 'shop' : 'client';
      const url = ENDPOINTS[r].register;

      server.submitRequest(url, 'POST', payload || {}, {}, (success, msg, res) => {
        if (!success) return notify(false, _extractError(res, msg));
        if (res && res.success === false) return notify(false, _extractError(res, 'Register failed'));
        return notify(true, res);
      }, { json: true });
    }
    /**
     * Forgot Password
     */
    forgotPassword(email, accountType, notify) {
      const body = {
        email: email,
        account_type: accountType
      };

      server.submitRequest(ENDPOINTS.auth.forgotPassword, 'POST', body, {}, (success, msg, res) => {
        if (!success) return notify(false, _extractError(res, msg));
        if (res && res.success === false) return notify(false, _extractError(res, 'Forgot password failed'));
        return notify(true, res);
      }, { json: true });
    }

    /**
     * Reset Password
     */
    resetPassword(token, newPassword, notify) {
      const body = {
        token: token,
        new_password: newPassword
      };
      server.submitRequest(ENDPOINTS.auth.resetPassword, 'POST', body, {}, (success, msg, res) => {
        if (!success) return notify(false, _extractError(res, msg));
        if (res && res.success === false) return notify(false, _extractError(res, 'Reset password failed'));
        return notify(true, res);
      }, { json: true });
    }
  }
  return new AuthModel();
});
