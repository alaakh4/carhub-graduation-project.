/**
 * viewModels/login.js
 * -------------------
 * Login ViewModel.
 *
 * What it does:
 * - Lets user choose role (client/shop)
 * - Calls auth.model.js login
 * - Stores token in localStorage under key: 'token'
 */

define(['knockout', 'models/auth.model', 'accUtils'], function (ko, authModel, accUtils) {
  function LoginViewModel() {
    var self = this;

    // -------------------------
    // Form fields
    // -------------------------

    /** role selector: 'client' or 'shop' */
    self.role = ko.observable('client');
    self.email = ko.observable('');
    self.password = ko.observable('');

    // -------------------------
    // UI state
    // -------------------------

    self.loading = ko.observable(false);
    self.errorMsg = ko.observable('');

    /** Clear errors before new actions */
    self.clearError = function () {
      self.errorMsg('');
    };

    /**
     * Save token & basic info.
     * Why: profile/me endpoints need token, and pages can know current role.
     */
    self._storeSession = function (token, role, userObj) {
      try {
        window.localStorage.setItem('token', token || '');
        window.localStorage.setItem('role', role || '');
        window.localStorage.setItem('user', JSON.stringify(userObj || {}));
      } catch (e) {
        // ignore
      }
    };

    /**
     * Navigate after login.
     * Why: client should go to profile, shop can go to profile for now (or change to your shop dashboard route).
     */
    self._goNext = function (role) {
      if (role === 'shop') {
        document.getElementById("MyProfileText").innerText = "Dashboard"
        window.location.href = '/shop-dashboard'
      } else {
        document.getElementById("MyProfileText").innerText = "My Profile"
        window.location.href = '/home'
      }
    };

    /**
     * Submit login.
     * Why: calls backend and stores token on success.
     */
    self.login = function (form, event) {
      if (event && event.preventDefault) event.preventDefault();

      self.clearError();

      var role = self.role();
      var email = (self.email() || '').trim();
      var password = (self.password() || '').trim();

      if (!email || !password) {
        self.errorMsg('Please enter email and password.');
        return false;
      }

      self.loading(true);
      authModel.login(role, email, password, function (ok, res) {
        self.loading(false);
        if (!ok) {
          self.errorMsg(res || 'Login failed');
          return;
        }
        var token = res.msg.token

        var userObj = (role === 'shop') ? (res.msg.shop) : (res.msg.client || {});
        self._storeSession(token, role, userObj);
        self._goNext(role);
      });

      return false;
    };

    // -------------------------
    // JET lifecycle
    // -------------------------

    self.connected = function () {
      document.title = 'Login';
      accUtils.announce('Login page loaded.', 'polite');
      var role = window.localStorage.getItem('role') || '';
      var token = window.localStorage.getItem('token') || '';
      // redirect only if BOTH exist
      if (role && token && token.trim()) {
        if (role === 'client') router.go({ path: "profile" });
       // else if (role === 'shop') router.go({ path: "workshops" });
      }
    };

    self.disconnected = function () { };
  }

  return new LoginViewModel();
});
