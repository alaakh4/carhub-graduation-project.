define(['jquery', 'knockout', 'configuration/ServerCaller'], function ($, ko, server) {
  function _getToken() {
    try {
      return window.localStorage ? (window.localStorage.getItem('token') || '') : '';
    } catch (e) {
      return '';
    }
  }

  function _authHeaders() {
    var t = _getToken();
    if (!t) return {};
    return { token: t, Authorization: 'Bearer ' + t };
  }

  function _unwrap(res) {
    if (!res) return null;
    if (res.msg !== undefined) return res.msg;
    if (res.admin !== undefined) return res.admin;
    if (res.user !== undefined) return res.user;
    return res;
  }

  class AdminModel {
    constructor() {}

    // =========================
    // AUTH
    // =========================
    login(email, password, notify) {
      var body = {
        email: email,
        password: password
      };

      server.submitRequest('/api/admin/login', 'POST', body, {}, function (success, msg, res) {
        if (success) notify(true, res);
        else notify(false, (res && res.msg) || msg || 'Admin login failed');
      }, { json: true });
    }

    // =========================
    // PROFILE / ME
    // =========================
    getMe(notify) {
      server.submitRequest('/api/me', 'GET', {}, _authHeaders(), function (success, msg, res, status) {
        if (success) notify(true, _unwrap(res));
        else notify(false, _unwrap(res) || msg || 'Failed to load admin profile', status);
      });
    }

    // =========================
    // SHOPS MANAGEMENT
    // =========================
    getAllShops(notify) {
      server.submitRequest('/api/admin/shops', 'GET', {}, _authHeaders(), function (success, msg, res, status) {
        if (success) notify(true, _unwrap(res) || [] , 200);
        else notify(false, (res && res.msg) || msg || 'Failed to load shops', status);
      });
    }

    getPendingShops(notify) {
      server.submitRequest('/api/admin/shops/pending', 'GET', {}, _authHeaders(), function (success, msg, res) {
        if (success) notify(true, _unwrap(res) || []);
        else notify(false, (res && res.msg) || msg || 'Failed to load pending shops');
      });
    }

    approveShop(shopId, notify) {
      server.submitRequest('/api/admin/shops/' + shopId + '/approve', 'POST', {}, _authHeaders(), function (success, msg, res) {
        if (success) notify(true, _unwrap(res) || res);
        else notify(false, (res && res.msg) || msg || 'Failed to approve shop');
      });
    }

    deactivateShop(shopId, notify) {
      server.submitRequest('/api/admin/shops/' + shopId + '/deactivate', 'POST', {}, _authHeaders(), function (success, msg, res) {
        if (success) notify(true, _unwrap(res) || res);
        else notify(false, (res && res.msg) || msg || 'Failed to deactivate shop');
      });
    }

    deleteShop(shopId, notify) {
      server.submitRequest('/api/admin/shops/' + shopId, 'DELETE', {}, _authHeaders(), function (success, msg, res) {
        if (success) notify(true, _unwrap(res) || res);
        else notify(false, (res && res.msg) || msg || 'Failed to delete shop');
      });
    }

    // =========================
    // OVERVIEW HELPERS
    // =========================
    overviewLoad(notify) {
      this.getAllShops(function (success, dataOrErr, status) {
        if (!success) return notify(false, dataOrErr, status);

        var shops = Array.isArray(dataOrErr) ? dataOrErr : [];

        var pending = shops.filter(function (s) { return Number(s.is_active) === 0; });
        var active = shops.filter(function (s) { return Number(s.is_active) === 1; });
        var deactivated = shops.filter(function (s) { return Number(s.is_active) === 2; });

        notify(true, {
          shops: shops,
          pendingCount: pending.length,
          activeCount: active.length,
          deactivatedCount: deactivated.length,
          totalCount: shops.length,
          recentPending: pending.slice(0, 5)
        }, status);
      });
    }

    // =========================
    // LOCAL STORAGE HELPERS
    // =========================
    saveLoginData(loginResponse) {
      try {
          localStorage.setItem('token', loginResponse.msg.token);
          localStorage.setItem('role',"admin")
          localStorage.setItem('adminData', JSON.stringify(loginResponse.msg.admin));
      } catch (e) {}
    }

    getSavedAdmin() {
      try {
        return JSON.parse(localStorage.getItem('adminData') || '{}');
      } catch (e) {
        return {};
      }
    }

    logout() {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('adminData');
      } catch (e) {}
    }
  }

  return new AdminModel();
});