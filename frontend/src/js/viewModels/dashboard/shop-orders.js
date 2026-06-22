define(['knockout', 'models/shop.model'], function (ko, shopModel) {
  function ShopOrdersViewModel() {
    var self = this;

    self.orders = ko.observableArray([]);
    self.statusFilter = ko.observable('');   // '', '0','1','2','3'
    self.searchText = ko.observable('');

    function mapStatus(o) {
      var s = Number(o.status);
      if (s === 0) return { text: 'Pending', cls: 'pending' };
      if (s === 1) return { text: 'In Delivery', cls: 'delivery' };
      if (s === 2) return { text: 'Rejected', cls: 'rejected' };
      return { text: 'Completed', cls: 'completed' };
    }

    function decorate(list) {
      var arr = Array.isArray(list) ? list : [];
      return arr.map(function (o) {
        var p = mapStatus(o);
        return Object.assign({}, o, { statusText: p.text, statusClass: p.cls });
      });
    }

    self.filteredOrders = ko.pureComputed(function () {
      var st = self.statusFilter();
      var q = (self.searchText() || '').trim().toLowerCase();

      return (self.orders() || []).filter(function (o) {
        var okStatus = !st || String(o.status) === String(st);
        var hay = (String(o.id) + ' ' + (o.part_name || '') + ' ' + (o.contact_phone || '')).toLowerCase();
        var okQ = !q || hay.indexOf(q) !== -1;
        return okStatus && okQ;
      });
    });

    self.load = function () {
      shopModel.ordersLoad(function (success, dataOrMsg) {
        if (!success) {
          self.orders([]);
          return;
        }
        self.orders(decorate(dataOrMsg));
      });
    };

    self.acceptOrder = function (row) {
      shopModel.acceptPartsOrder(row.id, function (ok, msg) {
        if (ok) self.load();
        else alert((msg && msg.msg) || msg || 'Failed');
      });
    };

    self.rejectOrder = function (row) {
      shopModel.rejectPartsOrder(row.id, function (ok, msg) {
        if (ok) self.load();
        else alert((msg && msg.msg) || msg || 'Failed');
      });
    };

    self.completeOrder = function (row) {
      shopModel.completePartsOrder(row.id, function (ok, msg) {
        if (ok) self.load();
        else alert((msg && msg.msg) || msg || 'Failed');
      });
    };

    self.connected = function () {
      self.load();
    };

    self.disconnected = function () { };
  }

  return ShopOrdersViewModel;
});