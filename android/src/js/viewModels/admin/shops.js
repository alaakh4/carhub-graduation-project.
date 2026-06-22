define([
  'knockout',
  'models/admin.model'
], function (ko, AdminModel) {
  function ShopsViewModel() {
    var self = this;

    self.loading = ko.observable(false);
    self.errorMessage = ko.observable('');
    self.successMessage = ko.observable('');

    self.searchText = ko.observable('');
    self.statusFilter = ko.observable('');
    self.shops = ko.observableArray([]);

    self.statusLabel = function (value) {
      value = Number(value);

      if (value === 0) return 'Pending';
      if (value === 1) return 'Active';
      if (value === 2) return 'Deactivated';

      return 'Unknown';
    };

    self.statusClassName = function (value) {
      value = Number(value);

      if (value === 0) return 'pending';
      if (value === 1) return 'active';
      if (value === 2) return 'inactive';

      return '';
    };

    self.decorateRows = function (rows) {
      return (rows || []).map(function (item) {
        item.statusText = self.statusLabel(item.is_active);
        item.statusClass = self.statusClassName(item.is_active);
        return item;
      });
    };

    self.filteredShops = ko.pureComputed(function () {
      var q = (self.searchText() || '').toLowerCase().trim();
      var status = self.statusFilter();

      return self.shops().filter(function (item) {
        var matchStatus = (status === '') || (String(item.is_active) === String(status));

        var blob = [
          item.id || '',
          item.name || '',
          item.email || '',
          item.phone || '',
          item.address || ''
        ].join(' ').toLowerCase();

        var matchSearch = !q || blob.indexOf(q) !== -1;

        return matchStatus && matchSearch;
      });
    });

    self.loadShops = function () {
      self.loading(true);
      self.errorMessage('');
      self.successMessage('');

      AdminModel.getAllShops(function (success, dataOrErr) {
        self.loading(false);

        if (!success) {
          self.errorMessage(dataOrErr || 'Failed to load shops');
          self.shops([]);
          return;
        }

        self.shops(self.decorateRows(Array.isArray(dataOrErr) ? dataOrErr : []));
      });
    };

    self.approveShop = function (shop) {
      self.errorMessage('');
      self.successMessage('');

      AdminModel.approveShop(shop.id, function (success, msg) {
        if (!success) {
          self.errorMessage(msg || 'Failed to approve shop');
          return;
        }

        self.successMessage('Shop approved successfully');
        self.loadShops();
      });
    };

    self.deactivateShop = function (shop) {
      self.errorMessage('');
      self.successMessage('');

      AdminModel.deactivateShop(shop.id, function (success, msg) {
        if (!success) {
          self.errorMessage(msg || 'Failed to deactivate shop');
          return;
        }

        self.successMessage('Shop deactivated successfully');
        self.loadShops();
      });
    };

    self.deleteShop = function (shop) {
      self.errorMessage('');
      self.successMessage('');

      AdminModel.deleteShop(shop.id, function (success, msg) {
        if (!success) {
          self.errorMessage(msg || 'Failed to delete shop');
          return;
        }

        self.successMessage('Shop deleted successfully');
        self.loadShops();
      });
    };

    self.connected = function () {
      self.loadShops();
    };
  }

  return ShopsViewModel;
});