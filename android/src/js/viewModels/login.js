define(['knockout', 'models/auth.model', 'accUtils'], function (ko, authModel, accUtils) {
  function LoginViewModel() {
    var self = this;

    self.role = ko.observable('client');
    self.email = ko.observable('');
    self.password = ko.observable('');

    self.loading = ko.observable(false);
    self.errorMsg = ko.observable('');
    self.clearError = function () {
      self.errorMsg('');
    };

    self._storeSession = function (token, role, userObj) {
      try {
        window.localStorage.setItem('token', token || '');
        window.localStorage.setItem('role', role || '');
        window.localStorage.setItem('user', JSON.stringify(userObj || {}));
      } catch (e) {
        // ignore
      }
    };

    self._goNext = function () {
      router.go({ path: 'home' });
    };

    self.login = function (form, event) {
      if (event && event.preventDefault) event.preventDefault();

      self.clearError();

      var role = 'client';
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

        var userObj = res.msg.client || {};
        self._storeSession(token, role, userObj);
        self._goNext();
      });

      return false;
    };

    self.connected = function () {
      document.title = 'Login | CarHub Mobile';
      accUtils.announce('Login page loaded.', 'polite');
      var passwordInput = document.querySelector('.auth-form input[type="password"]');
      var footerHint = document.querySelector('.auth-footer span');
      if (passwordInput) passwordInput.setAttribute('placeholder', 'Password');
      if (footerHint) footerHint.textContent = "Don't have an account?";
      var role = window.localStorage.getItem('role') || '';
      var token = window.localStorage.getItem('token') || '';
      if (role === 'client' && token && token.trim()) {
        router.go({ path: 'home' });
      }
    };

    self.disconnected = function () { };
  }

  return new LoginViewModel();
});
