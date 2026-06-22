define([
  'knockout',
  'models/admin.model'
], function (ko, AdminModel) {
  function ProfileViewModel() {
    var self = this;

    self.admin = {
      name: ko.observable('Admin'),
      email: ko.observable('-')
    };

    self.loadAdmin = function () {
      var saved = AdminModel.getSavedAdmin ? AdminModel.getSavedAdmin() : {};

      self.admin.name(saved.name || 'Admin');
      self.admin.email(saved.email || '-');
    };

    self.connected = function () {
      self.loadAdmin();
    };
  }

  return ProfileViewModel;
});