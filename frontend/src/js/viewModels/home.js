define([
  'jquery',
  'knockout',
  'models/part.model',
  'models/shop.model',
  'stores/appState',
  'stores/cartStore',
  'stores/rate',
  'ojs/ojmodule-element-utils',
  'accUtils',
  'ojs/ojarraydataprovider',
  'ojs/ojdialog'
], function ($, ko, partModel, shopModel, appState, cartStore, rate, ojmodule, Utils, ArrayDataProvider) {

  function HomeViewModel() {
    var self = this;
    self.ratePercentShop = rate.ratePercent;
    self.ratePercentPart = rate.ratePercent;
    self.selectedParts = ko.observableArray([]);
    self.selectedShops = ko.observableArray([]);

    function weightedScore(item, m = 10, C = 3.5) {
      const R = Number(item?.rate ?? 0);
      const v = Number(item?.rate_count ?? 0);
      return (v / (v + m)) * R + (m / (v + m)) * C;
    }

    function partsToShow(parts) {
      const inStock = (parts || []).filter(p => (p.quantity ?? 0) > 0);

      const topRated = [...inStock]
        .sort((a, b) =>
          weightedScore(b) - weightedScore(a) ||
          (b.rate ?? 0) - (a.rate ?? 0) ||
          (b.rate_count ?? 0) - (a.rate_count ?? 0) ||
          (new Date(b.updated_at || 0) - new Date(a.updated_at || 0)) ||
          (a.price ?? 0) - (b.price ?? 0)
        )
        .slice(0, 4)
        .map(p => ({ ...p, type: "top" }));

      const newest = [...inStock]
        .sort((a, b) =>
          (new Date(b.updated_at || 0) - new Date(a.updated_at || 0)) ||
          (b.id ?? 0) - (a.id ?? 0)
        )
        .slice(0, 1)
        .map(p => ({ ...p, type: "new" }));

      const bestValue = [...inStock]
        .filter(p => (p.rate ?? 0) >= 3)
        .sort((a, b) =>
          (a.price ?? 0) - (b.price ?? 0) ||
          weightedScore(b) - weightedScore(a) ||
          (b.rate_count ?? 0) - (a.rate_count ?? 0) ||
          (b.id ?? 0) - (a.id ?? 0)
        )
        .slice(0, 1)
        .map(p => ({ ...p, type: "bestPrice" }));

      const merged = [...topRated, ...newest, ...bestValue];
      const unique = [];
      const seen = new Set();

      for (const p of merged) {
        if (!p || seen.has(p.id)) continue;
        seen.add(p.id);
        unique.push(p);
      }

      self.selectedParts(unique);
    }

    function shopsToShow(shops) {
      const topShops = [...(shops || [])]
        .sort((a, b) =>
          weightedScore(b) - weightedScore(a) ||
          (b.rate ?? 0) - (a.rate ?? 0) ||
          (b.rate_count ?? 0) - (a.rate_count ?? 0) ||
          (new Date(b.updated_at || 0) - new Date(a.updated_at || 0)) ||
          (b.id ?? 0) - (a.id ?? 0)
        )
        .slice(0, 6);

      self.selectedShops(topShops);
    }

    self.refreshParts = function () {
      const partsList = appState.parts();
      if (!partsList || partsList.length === 0) {
        partModel.listPublic(function (success, data) {
          if (success) {
            partsToShow(data);
            appState.setParts(data);
          } else {
            self.selectedParts([]);
          }
        });
      } else {
        partsToShow(partsList);
      }
    };

    self.refreshShops = function () {
      const shopsList = appState.shops();
      if (!shopsList || shopsList.length === 0) {
        shopModel.shopsList(function (success, data) {
          if (success) {
            shopsToShow(data);
            appState.setShops(data);
          } else {
            self.selectedShops([]);
          }
        });
      } else {
        shopsToShow(shopsList);
      }
    };

    // initial load
    self.refreshParts();
    self.refreshShops();

    self.addCartBtn = (_, e) => {
      var guestOrUser = document.getElementById("userLoggedIn").style.display;
      if (guestOrUser == "none") {
        var dlg = document.getElementById('guestDialog');
        return dlg.open();
      }
      var id = e.currentTarget.id.split("_")[0];
      console.log(id)
      var btn = document.getElementById(id + "_btn");
      const originalHTML = btn.innerHTML;
      var newInnerHTML = '<i class="fas fa-check"></i><span>Added Successfully!</span>';
      btn.innerHTML = newInnerHTML
      btn.style.backgroundColor = '#10B981';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.backgroundColor = '';
      }, 2000);
      var item = self.selectedParts().find(x => x.id == id);
      item.quantityOrder = 1;
      var test = cartStore.writeCartItem(item);
      console.log(test)
    }
    self.onGuestOk = () => {
      var dlg = document.getElementById('guestDialog');
      if (dlg && dlg.close) dlg.close();
      document.getElementById("home").classList.remove("active");
      document.getElementById("login").classList.add("active");
      setTimeout(() => { router.go({ path: "login" }) }, 400);
    }
    self.viewPartDetail = (_, e) => {
      var id = e.currentTarget.id.split("-")[1];
      window.location.href = "partDetail/" + id
    }
    self.viewShopDetail = (_, e) => {
        var id = e.currentTarget.id.split("-")[1];
        window.location.href = "workShopDetail/" + id
      }
    this.connected = function () {
      document.title = 'CARHUB';
    };

    this.disconnected = function () { };
  }

  return HomeViewModel;
});
