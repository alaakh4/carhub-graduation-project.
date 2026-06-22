define(['knockout', 'models/shop.model'], function (ko, shopModel) {
  function ShopHelpViewModel() {
    var self = this;

    self.help = ko.observableArray([]);
    self.statusFilter = ko.observable(''); // '', '0','1','2','3'
    self.searchText = ko.observable('');

    function mapStatus(o) {
      var s = Number(o.status);
      if (s === 0) return { text: 'Pending', cls: 'pending' };
      if (s === 1) return { text: 'Accepted', cls: 'delivery' };
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

    self.filteredHelp = ko.pureComputed(function () {
      var st = self.statusFilter();
      var q = (self.searchText() || '').trim().toLowerCase();

      return (self.help() || []).filter(function (o) {
        var okStatus = !st || String(o.status) === String(st);
        var hay = (String(o.id) + ' ' + (o.fname || '') + ' ' + (o.lname || '') + ' ' + (o.phone || '')).toLowerCase();
        var okQ = !q || hay.indexOf(q) !== -1;
        return okStatus && okQ;
      });
    });

    function setStatus(row, newStatus) {
      shopModel.updateHelpOrderStatus(row.id, newStatus, function (success, dataOrMsg) {
        if (success) self.load();
        else alert((dataOrMsg && dataOrMsg.msg) || dataOrMsg || 'Failed');
      });
    }

    self.acceptHelp = function (row) { setStatus(row, 1); };
    self.rejectHelp = function (row) { setStatus(row, 2); };
    self.completeHelp = function (row) { setStatus(row, 3); };

    self.load = function () {
      shopModel.listHelpOrders(function (success, dataOrMsg) {
        if (!success) {
          self.help([]);
          return;
        }
        self.help(decorate(dataOrMsg));
      });
    };

    self.connected = function () { self.load(); };
    self.disconnected = function () { };
  }

  return ShopHelpViewModel;
});