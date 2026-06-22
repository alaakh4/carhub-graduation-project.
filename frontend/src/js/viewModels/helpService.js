define([
  'knockout',
  'models/help-order.model',
  'models/shop.model'
], function (ko, helpOrderModel, shopModel) {
  function HelpOrderViewModel() {
    var self = this;

    self.aiSuggestion = ko.observable('');

    self.form = {
      fname: ko.observable(''),
      lname: ko.observable(''),
      phone: ko.observable(''),
      address: ko.observable(''),
      details: ko.observable(''),
      shop_id: ko.observable(''),
      is_home_service: ko.observable('0')
    };

    self.shopsList = ko.observableArray([]);
    self.isLoadingShops = ko.observable(false);

    self.isSubmitting = ko.observable(false);
    self.errorMessage = ko.observable('');
    self.successMessage = ko.observable('');

    self.isHomeServiceSelected = ko.computed(function () {
      return parseInt(self.form.is_home_service(), 10) === 1;
    });
    self.form.is_home_service.subscribe(function (value) {
      if (parseInt(value, 10) === 0) {
        self.form.address('');
      }
    });
    self.getShopIdFromUrl = function () {
      var params = new URLSearchParams(window.location.search);
      var shopId = params.get('shopId') || '';
      return shopId ? String(shopId).trim() : '';
    };

    self.prefillAiSuggestion = function () {
      var params = new URLSearchParams(window.location.search);
      var details = (params.get('details') || '').trim();
      var predictedLabel = (params.get('predictedLabel') || '').trim();
      var predictedClass = (params.get('predictedClass') || '').trim();

      if (details && !self.form.details()) {
        self.form.details(details);
      }

      if (predictedLabel || predictedClass) {
        self.aiSuggestion('AI suggestion: ' + (predictedLabel || predictedClass) + '. You can still choose workshop visit or home service below.');
      }
    };

    self.loadShops = function () {
      self.isLoadingShops(true);

      shopModel.shopsList(function (ok, data) {
        self.isLoadingShops(false);

        if (!ok) {
          self.errorMessage('Failed to load workshops.');
          return;
        }

        var shops = Array.isArray(data) ? data : [];
        self.shopsList(shops);

        var preselectedShopId = self.getShopIdFromUrl();
        if (preselectedShopId) {
          var found = shops.some(function (shop) {
            return String(shop.id) === preselectedShopId;
          });

          if (found) {
            self.form.shop_id(preselectedShopId);
          }
        }
      });
    };

    self.submitHelpOrder = function () {
      self.errorMessage('');
      self.successMessage('');

      var fname = (self.form.fname() || '').trim();
      var lname = (self.form.lname() || '').trim();
      var phone = (self.form.phone() || '').trim();
      var address = (self.form.address() || '').trim();
      var details = (self.form.details() || '').trim();
      var shopId = parseInt(self.form.shop_id(), 10);
      var isHomeService = Number(self.form.is_home_service());

      if (!fname || !lname || !phone || !details) {
        self.errorMessage('Please fill in all required fields.');
        return false;
      }

      if (!shopId) {
        self.errorMessage('Please select a shop.');
        return false;
      }

      if (isHomeService === 1 && !address) {
        self.errorMessage('Address is required for home service.');
        return false;
      }

      var payload = {
        fname: fname,
        lname: lname,
        phone: phone,
        address: address,
        details: details,
        shop_id: shopId,
        is_home_service: isHomeService
      };

      self.isSubmitting(true);

      helpOrderModel.create(payload, function (ok, data) {
        self.isSubmitting(false);

        if (!ok) {
          self.errorMessage('Failed to send request.');
          return;
        }

        self.successMessage('Your service request has been sent successfully. The workshop will contact you shortly.');

        self.form.fname('');
        self.form.lname('');
        self.form.phone('');
        self.form.address('');
        self.form.details('');
        self.form.is_home_service('0');

        if (!self.getShopIdFromUrl()) {
          self.form.shop_id('');
        }
      });

      return false;
    };

    self.connected = function () {
      document.title = 'Request Service | CarHub';
      self.prefillAiSuggestion();
      self.loadShops();
    };
  }

  return HelpOrderViewModel;
});
