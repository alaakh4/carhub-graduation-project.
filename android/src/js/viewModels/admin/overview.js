define([
  'knockout',
  'models/admin.model'
], function (ko, AdminModel) {
  function OverviewViewModel() {
    var self = this;

    self.loading = ko.observable(false);
    self.errorMessage = ko.observable('');

    self.pendingCount = ko.observable(0);
    self.activeCount = ko.observable(0);
    self.deactivatedCount = ko.observable(0);
    self.totalCount = ko.observable(0);

    self.recentPending = ko.observableArray([]);

    self.loadData = function () {
      self.loading(true);
      self.errorMessage('');

      AdminModel.overviewLoad(function (success, dataOrErr, status) {
        self.loading(false);
        if (status == 403) {
          AdminModel.logout();
          return window.location.href = "admin-login"
        }
        if (!success) {
          self.errorMessage(dataOrErr || 'Failed to load dashboard overview');
          return;
        }
        var guestMenu = document.getElementById("userGuest");
        var shopDashboard = document.getElementById("shop-dashboard")
        guestMenu.style.display = "none";
        const myAdmin = document.getElementById("admin-dashboard");
        myAdmin.style.display = "block"
        myAdmin.addEventListener('click', () => {
          var oldEle = document.getElementById(router._activeState.path);
          if (oldEle) oldEle.classList.remove("active");
          router.go({ path: 'admin-dashboard' })
        })
        self.pendingCount(dataOrErr.pendingCount || 0);
        self.activeCount(dataOrErr.activeCount || 0);
        self.deactivatedCount(dataOrErr.deactivatedCount || 0);
        self.totalCount(dataOrErr.totalCount || 0);
        self.recentPending(dataOrErr.recentPending || []);
      });
    };

    self.connected = function () {
      self.loadData();
    };
  }

  return OverviewViewModel;
});