define(['knockout', 'jquery', 'models/shop.model'], function (ko, $, shopModel) {
  function ShopOverviewViewModel(params) {
    var self = this;

    var LOW_STOCK = 5;

    self.kpiPending = ko.observable(0);
    self.kpiDelivery = ko.observable(0);
    self.kpiCompleted = ko.observable(0);
    self.kpiRejected = ko.observable(0);
    self.kpiLowStock = ko.observable(0);

    self.recentOrders = ko.observableArray([]);

    function pill(status) {
      status = Number(status);
      if (status === 0) return { text: 'Pending', cls: 'pending' };
      if (status === 1) return { text: 'In Delivery', cls: 'delivery' };
      if (status === 2) return { text: 'Rejected', cls: 'rejected' };
      return { text: 'Completed', cls: 'completed' };
    }

    function actionButtonsHtml(o) {
      var st = Number(o.status);
      var id = o.id;

      if (st === 0) {
        return (
          '<button class="mini primary" data-act="accept" data-id="' + id + '">Accept</button>' +
          '<button class="mini danger" data-act="reject" data-id="' + id + '">Reject</button>'
        );
      }
      if (st === 1) {
        return (
          '<button class="mini primary" data-act="complete" data-id="' + id + '">Complete</button>' +
          '<button class="mini danger" data-act="reject" data-id="' + id + '">Reject</button>'
        );
      }
      return '';
    }

    function statusFromAction(act) {
      if (act === 'accept') return 1;
      if (act === 'reject') return 2;
      if (act === 'complete') return 3;
      return 0;
    }

    // Bind actions after table renders
    function bindActionClicks() {
      var container = document.querySelector('.shopdash-page');
      if (!container) return;

      container.querySelectorAll('button[data-act]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          var act = btn.getAttribute('data-act');
          var status = statusFromAction(act);

          shopModel.updatePartsOrderStatus(id, status, function (success, dataOrMsg) {
            if (success) self.load();
            else alert((dataOrMsg && dataOrMsg.msg) || dataOrMsg || 'Failed');
          });
        }, { once: true });
      });
    }

    self.load = function () {
      shopModel.overviewLoad(function (success, dataOrMsg) {
        if (!success) {
          self.recentOrders([]);
          self.kpiPending(0);
          self.kpiDelivery(0);
          self.kpiRejected(0);
          self.kpiCompleted(0);
          self.kpiLowStock(0);
          return window.location.href = 'login';
        }

        var orders = (dataOrMsg && dataOrMsg.orders) ? dataOrMsg.orders : [];
        var parts = (dataOrMsg && dataOrMsg.parts) ? dataOrMsg.parts : [];

        self.kpiPending(orders.filter(function (x) { return Number(x.status) === 0; }).length);
        self.kpiDelivery(orders.filter(function (x) { return Number(x.status) === 1; }).length);
        self.kpiRejected(orders.filter(function (x) { return Number(x.status) === 2; }).length);
        self.kpiCompleted(orders.filter(function (x) { return Number(x.status) === 3; }).length);

        self.kpiLowStock(parts.filter(function (p) {
          return Number(p.quantity || 0) <= LOW_STOCK;
        }).length);

        var latest = (orders || []).slice(0, 10).map(function (o) {
          var p = pill(o.status);
          return Object.assign({}, o, {
            statusText: p.text,
            statusClass: p.cls,
            actionsHtml: actionButtonsHtml(o)
          });
        });

        self.recentOrders(latest);

        // re-bind after DOM update
        setTimeout(bindActionClicks, 0);
      });
    };

    self.connected = function () {
      self.load();
    };

    self.disconnected = function () { };
  }

  return ShopOverviewViewModel;
});