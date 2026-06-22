define(['knockout', 'accUtils', 'models/orders.model', 'configuration/ServerCaller'], function (ko, Utils, ordersModel, server) {
  function MyOrdersViewModel() {
    var self = this;
    var serverBase = (server.baseUrl || '').replace(/\/+$/, '');

    self.orders = ko.observableArray([]);
    self.NOOrders = ko.observable(0);

    self.loadOrders = function () {
      ordersModel.listCurrentOrders(function (ok, data, status) {
        if (!ok) {
          if (status === 401 || status === 403) {
            localStorage.removeItem("role");
            localStorage.removeItem("token");
            return router.go({ path: "login" });
          }
          self.orders([]);
          self.NOOrders(0);
          return;
        }
        
        var list = Array.isArray(data) ? data : [];
        // add UI fields
        list.forEach(function (o) {
          o.total_price = Number(o.total_price);
          o.total_quantity = Number(o.total_quantity);
          o.previewImageSrc = o.preview_image
            ? serverBase + String(o.preview_image || '')
            : 'css/images/front.jpeg';
            console.log(o)
          if (Number(o.group_status) === 0) {
            console.log('1')
            o.statusText = "Pending";
            o.statusClass = "status-pending";
          } else {
            o.statusText = "In Delivery";
            o.statusClass = "status-delivery";
          }
        });

        self.orders(list);
        self.NOOrders(list.length);
      });
    };
    self.openOrder = ()=>{

    }
    self.connected = function () {
      document.title = "My Orders";
      Utils.announce('My Orders page loaded.', 'polite');
      self.loadOrders();
    };

    self.disconnected = function () {};
  }

  return new MyOrdersViewModel();
});
