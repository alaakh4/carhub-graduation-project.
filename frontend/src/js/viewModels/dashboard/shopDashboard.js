define(['knockout', 'ojs/ojmodule-element-utils', 'accUtils'],
  function (ko, ModuleElementUtils, Utils) {

    function ShopDashboardViewModel() {
      var self = this;

      self.activePage = ko.observable('overview');
      self.pageTitle = ko.observable('Overview');
      self.innerModuleConfig = ko.observable();

      function _titleFor(page) {
        if (page === 'orders') return 'Orders';
        if (page === 'help') return 'Help Requests';
        if (page === 'parts') return 'Parts';
        if (page === 'part-form') return 'Part Form';
        if (page === 'profile') return 'Shop Profile';
        return 'Overview';
      }

      function _load(page, params) {
        self.activePage(page === 'part-form' ? 'parts' : page);
        self.pageTitle(_titleFor(page));

        var name = 'dashboard/shop-' + page;

        return ModuleElementUtils.createConfig({
          name: name,
          params: params || {
            openPartForm: self.openPartForm,
            backToParts: self.backToParts
          }
        }).then(function (cfg) {
          self.innerModuleConfig(cfg);
        });
      }

      self.go = function (page) {
        _load(page);
      };

      self.openPartForm = function (partId) {
        _load('part-form', {
          partId: partId || null,
          backToParts: self.backToParts
        });
      };

      self.backToParts = function () {
        _load('parts');
      };

      self.refreshActive = function () {
        var current = self.pageTitle() === 'Part Form' ? 'part-form' :
          (self.pageTitle() || 'Overview').toLowerCase();

        if (current === 'help requests') current = 'help';
        if (current === 'part form') current = 'part-form';

        _load(current);
      };

      self.logout = function () {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('carhub_cart');
          window.location.href = '/home';
        
      };

      self.connected = function () {
        document.title = 'Shop Dashboard';
        Utils.announce('Shop dashboard loaded.', 'polite');
        _load('overview');
      };

      self.disconnected = function () { };
    }

    return new ShopDashboardViewModel();
  });