define([
  'knockout',
  'models/auth.model'
], function (ko, authModel) {
  function ForgotPasswordViewModel() {
    var self = this;

    self.email = ko.observable('');
    self.accountType = ko.observable('client');

    self.isSubmitting = ko.observable(false);
    self.errorMessage = ko.observable('');
    self.successMessage = ko.observable('');

    self.submitForgotPassword = function () {
      self.errorMessage('');
      self.successMessage('');

      var email = (self.email() || '').trim().toLowerCase();
      var accountType = (self.accountType() || '').trim().toLowerCase();

      if (!email) {
        self.errorMessage('Please enter your email address.');
        return false;
      }

      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        self.errorMessage('Please enter a valid email address.');
        return false;
      }

      if (accountType !== 'client' && accountType !== 'shop') {
        self.errorMessage('Please choose a valid account type.');
        return false;
      }

      self.isSubmitting(true);

      authModel.forgotPassword(email, accountType, function (ok, data) {
        self.isSubmitting(false);

        if (!ok) {
          self.errorMessage(typeof data === 'string' ? data : 'Failed to send reset link.');
          return;
        }

        self.successMessage((data && data.msg) ? data.msg : 'Reset link has been sent successfully.');
        self.email('');
      });

      return false;
    };

    self.connected = function () {
      document.title = 'Forgot Password | CarHub';
    };
  }

  return ForgotPasswordViewModel;
});