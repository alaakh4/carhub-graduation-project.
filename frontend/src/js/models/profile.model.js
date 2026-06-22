
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
    // In this project, many endpoints return the payload inside res.msg.
    if (!res) return null;
    if (res.msg !== undefined) return res.msg;
    if (res.client !== undefined) return res.client;
    if (res.user !== undefined) return res.user;
    return res;
  }

  class ProfileModel {
    getMe(notify) {
      server.submitRequest('/api/me', 'GET', {}, _authHeaders(), (success, msg, res, status) => {
        if (success) notify(true, _unwrap(res));
        else notify(false, _unwrap(res) || msg || 'Failed to load profile', status);
      });
    }

    updateClientProfile(profileBody, notify, method) {
      const httpMethod = (method || 'PUT').toUpperCase();
      server.submitRequest('/api/client/profile', httpMethod, profileBody || {}, _authHeaders(), (success, msg, res) => {
        if (success) notify(true, _unwrap(res));
        else notify(false, _unwrap(res) || msg || 'Failed to update profile');
      }, { json: true });
    }
    uploadClientAvatar(file, notify) {
      var fd = new FormData();
      fd.append('image', file);
      fd.append('folder', 'clients');

      server.submitRequest('/api/upload/image', 'POST', fd, _authHeaders(), (success, msg, res) => {
        var payload = msg || (res && res.msg) || res || {};
        if (success) notify(true, payload.image_url || '');
        else notify(false, payload.msg || payload.error || 'Failed to upload avatar');
      }, { formData: true });
    }
    changeMyPassword(currentPassword, newPassword, notify) {
      const body = { current_password: currentPassword, new_password: newPassword };
      server.submitRequest('/api/client/change-password', 'PATCH', body, {}, (success, msg, res) => {
        if (success) notify(true, res.msg || 'Password changed successfully');
        else notify(false, res.msg);
      }, { json: true });
    }
  }

  return new ProfileModel();
});
