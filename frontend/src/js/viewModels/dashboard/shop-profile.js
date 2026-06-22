define(['knockout', 'models/shop.model'], function (ko, shopModel) {
  function ShopProfileViewModel() {
    var self = this;

    self.loading = ko.observable(true);
    self.shop = ko.observable(null);

    self.name = ko.pureComputed(function () {
      var s = self.shop() || {};
      return s.name || '-';
    });

    self.email = ko.pureComputed(function () {
      var s = self.shop() || {};
      return s.email || '-';
    });

    self.phone = ko.pureComputed(function () {
      var s = self.shop() || {};
      return s.phone || '-';
    });

    self.address = ko.pureComputed(function () {
      var s = self.shop() || {};
      return s.address || '-';
    });

    self.city = ko.pureComputed(function () {
      var s = self.shop() || {};
      return s.city_name || s.city || '-';
    });

    self.description = ko.pureComputed(function () {
      var s = self.shop() || {};
      return s.description || '-';
    });

    self.services = ko.pureComputed(function () {
      var s = self.shop() || {};
      return s.services || '-';
    });

    self.photoUrl = ko.pureComputed(function () {
      var s = self.shop() || {};
      var raw = s.photo_url || '';
      if (!raw) return '';
      if (raw.indexOf('http') === 0) return raw;
      return 'http://localhost:4567/' + String(raw).replace(/^\/+/, '');
    });

    self.statusText = ko.pureComputed(function () {
      var s = self.shop() || {};
      var st = Number(s.is_active || 0);
      if (st === 1) return 'Active';
      if (st === 2) return 'Deactivated';
      return 'Pending Approval';
    });

    self.statusClass = ko.pureComputed(function () {
      var s = self.shop() || {};
      var st = Number(s.is_active || 0);
      if (st === 1) return 'completed';
      if (st === 2) return 'rejected';
      return 'pending';
    });

    self.load = function (token) {
      self.loading(true);

      shopModel.getMyProfile(token,function (success, dataOrMsg) {
        self.loading(false);

        if (!success) {
          self.shop(null);
          return;
        }

        self.shop(dataOrMsg || {});
      });
    };

    self.connected = function () {
      var token = localStorage.getItem("token");
      var role = localStorage.getItem("role");
      if(!token || role != "shop") return window.location.href = '/home'
      self.load(token);
    };

    self.disconnected = function () {};
  }

  return ShopProfileViewModel;
});