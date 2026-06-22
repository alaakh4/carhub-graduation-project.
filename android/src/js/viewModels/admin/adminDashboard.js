define([
  'knockout',
  'ojs/ojmodule-element-utils',
  'models/admin.model',
  'ojs/ojmodule'
], function (ko, moduleUtils, AdminModel) {
  function AdminDashboardViewModel() {
    var self = this;

    self.currentPage = ko.observable('overview');
    self.moduleConfig = ko.observable();

    self.adminName = ko.observable('Admin');
    self.adminEmail = ko.observable('-');

    self.pageTitle = ko.pureComputed(function () {
      switch (self.currentPage()) {
        case 'shops':
          return 'Shops Management';
        case 'profile':
          return 'Admin Profile';
        default:
          return 'Dashboard Overview';
      }
    });

    self.pageSubtitle = ko.pureComputed(function () {
      switch (self.currentPage()) {
        case 'shops':
          return 'Approve, deactivate, and manage workshop accounts';
        case 'profile':
          return 'View your administrator account information';
        default:
          return 'Quick summary of platform activity';
      }
    });

    self.loadAdminInfo = function () {
      var admin = AdminModel.getSavedAdmin ? AdminModel.getSavedAdmin() : {};
      self.adminName(admin.name || 'Admin');
      self.adminEmail(admin.email || '-');
    };

    self.goPage = function (page) {
      self.currentPage(page);

      var viewPromise = moduleUtils.createView({
        viewPath: 'views/admin/' + page + '.html'
      });

      var viewModelPromise = moduleUtils.createViewModel({
        viewModelPath: 'viewModels/admin/' + page
      });

      self.moduleConfig(Promise.all([viewPromise, viewModelPromise]).then(function (values) {
        return {
          view: values[0],
          viewModel: values[1]
        };
      }));
    };

    self.logout = function () {
      AdminModel.logout();
      window.location.href = "admin-login"
    };

    self.connected = function () {
      self.loadAdminInfo();
      self.goPage('overview');
    };
  }

  return AdminDashboardViewModel;
});