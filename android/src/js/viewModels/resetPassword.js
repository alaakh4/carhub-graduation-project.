define([
  'knockout',
  'models/auth.model'
], function (ko, authModel) {
  function ResetPasswordViewModel() {
    var self = this;

    self.token = ko.observable('');
    self.newPassword = ko.observable('');
    self.confirmPassword = ko.observable('');

    self.isSubmitting = ko.observable(false);
    self.errorMessage = ko.observable('');
    self.successMessage = ko.observable('');

    self.readTokenFromUrl = function () {
      var params = new URLSearchParams(window.location.search);
      var token = params.get('token') || '';
      self.token(token.trim());
    };

    self.submitResetPassword = function () {
      self.errorMessage('');
      self.successMessage('');

      var token = (self.token() || '').trim();
      var newPassword = (self.newPassword() || '').trim();
      var confirmPassword = (self.confirmPassword() || '').trim();

      if (!token) {
        self.errorMessage('Reset token is missing or invalid.');
        return false;
      }

      if (!newPassword || !confirmPassword) {
        self.errorMessage('Please fill in all password fields.');
        return false;
      }

      if (newPassword.length < 8) {
        self.errorMessage('Password must be at least 8 characters.');
        return false;
      }

      if (newPassword !== confirmPassword) {
        self.errorMessage('Passwords do not match.');
        return false;
      }

      self.isSubmitting(true);

      authModel.resetPassword(token, newPassword, function (ok, data) {
        self.isSubmitting(false);

        if (!ok) {
          self.errorMessage(typeof data === 'string' ? data : 'Failed to reset password.');
          return;
        }

        self.successMessage((data && data.msg) ? data.msg : 'Password reset successfully.');
        self.newPassword('');
        self.confirmPassword('');
      });

      return false;
    };

    self.connected = function () {
      document.title = 'Reset Password | CarHub';
      self.readTokenFromUrl();
    };
  }

  return ResetPasswordViewModel;
});