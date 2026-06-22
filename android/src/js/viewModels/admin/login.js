define([
  'knockout',
  'models/admin.model'
], function (ko, AdminModel) {
  function AdminLoginViewModel() {
    var self = this;

    self.email = ko.observable('');
    self.password = ko.observable('');
    self.loading = ko.observable(false);
    self.errorMsg = ko.observable('');
    self.successMsg = ko.observable('');

    self.clearMessages = function () {
      self.errorMsg('');
      self.successMsg('');
    };

    self.login = function () {
      self.clearMessages();

      var email = (self.email() || '').trim();
      var password = (self.password() || '').trim();

      if (!email || !password) {
        self.errorMsg('Email and password are required');
        return;
      }

      self.loading(true);

      AdminModel.login(email, password, function (success, resOrMsg) {
        self.loading(false);

        if (!success) {
          self.errorMsg(resOrMsg || 'Admin login failed');
          return;
        }

        try {
          AdminModel.saveLoginData(resOrMsg);
        } catch (e) {}

        self.successMsg('Login successful');

        if (window.router) {
          router.go({ path: 'admin-dashboard' });
        }
      });
    };

    self.connected = function () {
      try {
        var token = localStorage.getItem('token');
        var adminData = localStorage.getItem('adminData');

        if (token && adminData && window.router) {
          router.go({ path: 'admin-dashboard' });
        }
      } catch (e) {}
    };
  }

  return AdminLoginViewModel;
});