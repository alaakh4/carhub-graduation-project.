define(['knockout', 'models/shop.model'], function (ko, shopModel) {
  function ShopPartsViewModel(params) {
    var self = this;

    self.parts = ko.observableArray([]);
    self.searchText = ko.observable('');

    self.filteredParts = ko.pureComputed(function () {
      var q = (self.searchText() || '').trim().toLowerCase();
      return (self.parts() || []).filter(function (p) {
        var hay = ((p.name || '') + ' ' + (p.brand || '') + ' ' + (p.category || '')).toLowerCase();
        return !q || hay.indexOf(q) !== -1;
      });
    });

    self.addPart = function () {
      if (params && params.openPartForm) params.openPartForm(null);
    };

    self.editPart = function (row) {
      if (params && params.openPartForm) params.openPartForm(row.id);
    };

    self.load = function () {
      shopModel.listMyParts(function (success, dataOrMsg) {
        if (!success) return self.parts([]);
        self.parts(Array.isArray(dataOrMsg) ? dataOrMsg : []);
      });
    };

    self.connected = function () { self.load(); };
    self.disconnected = function () { };
  }

  return ShopPartsViewModel;
});