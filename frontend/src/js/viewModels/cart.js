define(['knockout', 'accUtils', 'ojs/ojarraydataprovider', 'stores/cartStore', 'ojs/ojbutton', 'ojs/ojinputnumber'], function (ko, accUtils, ArrayDataProvider, cartStore) {
  function CartViewModel() {
    var self = this;
    self.selectedItems = ko.observableArray([]);
    self.totalItems = ko.observable();
    self.totalMoney = ko.observable();
    self.maxQuantityDis = ko.observable(false);
    self.minQuantityDis = ko.observable(false);
    function stockMsg(id, quantity) {
      var ele = document.getElementById(id + "_stockMsg");
      ele.innerText = `Only ${quantity} available — you’ve reached the limit`
      ele.style.display = "block"
    }

    function updatePrices(items) {
      var totalItems = cartStore.totalNumberItems(items);
      var totalMoney = cartStore.totalMoney(items);
      self.totalItems(totalItems);
      self.totalMoney(totalMoney);
    }

    self.getItems = () => {
      var items = cartStore.readCart();
      var totalItems = cartStore.totalNumberItems(items);
      var totalMoney = cartStore.totalMoney(items);
      self.totalItems(totalItems);
      self.selectedItems(items);
      self.totalMoney(totalMoney);
    }
    self.minusItemBtn = (e) => {
      var id = e.currentTarget.id.split("_")[0];
      self.selectedItems().forEach((item, i) => {
        if (id == item.id) {
          var quantity = self.selectedItems()[i].quantityOrder - 1
          if (quantity == 0) {
            self.selectedItems().splice(i, 1);
            cartStore.saveCart(self.selectedItems());
          } else {
            self.selectedItems()[i].quantityOrder = quantity;
            cartStore.saveCart(self.selectedItems());
          }
          self.selectedItems.valueHasMutated();
          return updatePrices(self.selectedItems());
        }
      })

    }
    self.addItemBtn = (e) => {
      const id = e.currentTarget.id.split("_")[0];
      self.selectedItems().forEach((item, i) => {
        if (id == item.id) {
          const nextQty = self.selectedItems()[i].quantityOrder + 1;
          if (nextQty > item.quantity) return;
          self.selectedItems()[i].quantityOrder = nextQty;
          self.selectedItems.valueHasMutated();
          cartStore.saveCart(self.selectedItems());
          return updatePrices(self.selectedItems());
        }
      });
    };
    self.qtyChanged = (e) => {
      const id = e.currentTarget.id.split("_")[0];
      let val = Number(e.detail.value);
      if (Number.isNaN(val) || val < 1) val = 1;
      self.selectedItems().forEach((item, i) => {
        if (id != item.id) return;
        const max = item.quantity;
        if (val > max)
          val = max;
        self.selectedItems()[i].quantityOrder = val;
        self.selectedItems.valueHasMutated();
        cartStore.saveCart(self.selectedItems());
        return updatePrices(self.selectedItems());
      });
    };

    self.removeItemBtn = (_, e) => {
      const id = e.currentTarget.id.split("_")[0];
      const newCart = cartStore.removeItem(id);
      self.selectedItems(newCart);
      updatePrices(newCart);
    }
    self.continueShopping = () => {
      document.getElementById("cart").style.color = "";
      document.getElementById("parts").classList.add('active');
      router.go({path:"parts"})
    }
    self.chickoutBtn = () => {
      document.getElementById("cart").style.color = ""
      router.go({path:"checkout"})
    }
    self.connected = function () {
      self.getItems();
    };

    self.disconnected = function () {

    };
  }

  return new CartViewModel();
});
