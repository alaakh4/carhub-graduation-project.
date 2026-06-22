define(['knockout', 'accUtils', 'ojs/ojarraydataprovider', 'stores/cartStore', 'models/profile.model', 'models/city.model', 'models/orders.model', 'ojs/ojselectsingle'],
  function (ko, accUtils, ArrayDataProvider, cartStore, profileModel, cityModel, ordersModel) {

    function CartViewModel() {
      var self = this;

      self.selectedItems = ko.observableArray([]);
      self.totalItems = ko.observable();
      self.totalMoney = ko.observable();

      self.contactPhone = ko.observable('');

      self.firstName = ko.observable('');
      self.lastName = ko.observable('');
      self.address = ko.observable('');
      self.apartment = ko.observable('');
      self.neighborhood = ko.observable('');
      self.zipCode = ko.observable('');

      self.paymentMethod = ko.observable('card');

      self.clientCity = ko.observable();
      self.selectedCities = ko.observableArray([]);
      self.selectedCitiesDP = new ArrayDataProvider(self.selectedCities, {
        keyAttributes: 'value'
      })

      self.getItems = () => {
        var items = cartStore.readCart();
        var totalItems = cartStore.totalNumberItems(items);
        var totalMoney = cartStore.totalMoney(items);
        self.totalItems(totalItems);
        self.selectedItems(items);
        self.totalMoney(totalMoney);
      }

      self.switchPaymentMethod = function (_, e) {
        var method = (e && e.currentTarget) ? e.currentTarget.getAttribute('data-tab') : 'card';
        self.paymentMethod(method || 'card');
      };
      self.loadMe = function () {
        var token = window.localStorage ? (window.localStorage.getItem('token') || '') : ''
        if (!token) {
          return router.go({ path: "login" });
        }

        profileModel.getMe(function (ok, payload, status) {
          if (!ok) {
            if (status == 401) {
              localStorage.removeItem("role")
              localStorage.removeItem("token")
            }
            return router.go({ path: "login" });
          }

          var userData = (payload && payload.user) ? payload.user : {};

          // Prefill ONLY if empty (don’t override user typing)
          if (!self.contactPhone()) self.contactPhone(userData.phone || '');

          if (!self.firstName()) self.firstName(userData.fname || '');
          if (!self.lastName()) self.lastName(userData.lname || '');

          if (!self.address()) self.address(userData.address || '');
          if (!self.apartment()) self.apartment(userData.apartment || '');

          // city might be name or id depending on your DB/API
          if (!self.clientCity()) self.clientCity(userData.city || '');

          if (!self.neighborhood()) self.neighborhood(userData.neighborhood || '');
          if (!self.zipCode()) self.zipCode(userData.zip_code || '');
        });
      };

      self.backToCart = () => {
        document.getElementById("cart").style.color = "";
        document.getElementById("parts").classList.add('active');
        router.go({ path: "cart" })
      }
      self.refreshCities = function () {
        cityModel.listAll((success, res) => {
          var cities = []
          res.forEach((city) => {
            console.log(city)
            cities.push({ "value": city.id, "label": city.name })
          })
          self.selectedCities(cities)
          self.loadMe();
        })
      }
      self.placeOrder = function () {
        var items = self.selectedItems() || [];
        if (!items.length) return;

        // validate required checkout fields (backend requires them)
        var contactPhone = String(self.contactPhone()).trim();
        var shipF = String(self.firstName()).trim();
        var shipL = String(self.lastName()).trim();
        var shipAddr = String(self.address()).trim();

        if (!contactPhone || !shipF || !shipL || !shipAddr) {
          alert("Please fill phone, first name, last name, and address.");
          return;
        }

        // Create ONE group id per shop (Option B)
        var groupIdByShop = {}; // { [shopId]: groupId }

        function makeGroupId() {
          return (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : (String(Date.now()) + '-' + Math.random().toString(16).slice(2));
        }

        var idx = 0;

        (function step() {
          if (idx >= items.length) {
            cartStore.removeCart();
            var dlg = document.getElementById('placeOrderDialog');
            dlg.open();
            return;
          }

          // handle both plain objects and {data: obj}
          var raw = items[idx];
          var it = raw && raw.data ? raw.data : raw;

          var shopId = Number(it.shop_id);
          if (!shopId) {
            alert("Order item is missing shop_id.");
            return;
          }

          // reuse group id for this shop
          if (!groupIdByShop[shopId]) {
            groupIdByShop[shopId] = makeGroupId();
          }

          var payload = {
            // group per shop
            order_group_id: groupIdByShop[shopId],

            part_id: Number(it.id),
            quantity: Number(it.quantityOrder || 1),

            // required fields
            contact_phone: contactPhone,
            ship_first_name: shipF,
            ship_last_name: shipL,
            ship_address: shipAddr,

            // optional fields
            ship_apartment: self.apartment ? (self.apartment() || null) : null,
            ship_neighborhood: self.neighborhood ? (self.neighborhood() || null) : null,
            ship_zip_code: self.zipCode ? (self.zipCode() || null) : null,

            // city + shop
            ship_city_id: Number(self.clientCity()),
            shop_id: shopId
          };

          ordersModel.placeOrder(payload, function (ok, resp, status) {
            if (!ok) {
              console.log('Order failed on item', it, 'status:', status, 'resp:', resp);
              alert((resp && resp.msg) ? resp.msg : ("Order failed (status " + status + ")"));
              return;
            }
            idx++;
            step();
          });
        })();
      };
      // Helper: close dialog and go home
      self.onPlaceOrderOk = function () {
        var dlg = document.getElementById('placeOrderDialog');
        if (dlg && dlg.close) dlg.close();
        document.getElementById("home").classList.add("active");
        setTimeout(() => { router.go({ path: "home" }) }, 400);
      };
      self.connected = function () {
        self.getItems();
        self.refreshCities();
      };

      self.disconnected = function () { };
    }

    return new CartViewModel();
  });
