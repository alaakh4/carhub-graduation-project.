define(['jquery', 'knockout', 'models/shop.model', 'stores/appState', 'stores/rate', 'stores/serviceMatcher', 'ojs/ojmodule-element-utils', 'accUtils',
  'ojs/ojarraydataprovider'], function ($, ko, shopModel, appState, rate, serviceMatcher, ojmodule, Utils, ArrayDataProvider) {
    function WorkshopsViewModel() {
      var self = this;
      self.ratePercent = rate.ratePercent;
      self.rateText = rate.rateText;
      self.selectedShops = ko.observableArray([]);
      self.NOShops = ko.observable(0);

      // top | reviews | new
      self.sortBy = ko.observable('top');

      self.selectedServices = ko.observableArray([]);
      self.selectedRate = ko.observable('');

      self.currentPage = ko.observable(1);
      self.previousBtnDisabled = ko.observable(true);
      self.nextBtnDisabled = ko.observable(false);
      var restoringFromUrl = false;

      var PAGE_SIZE = 4;
      var maxPages = 1;
      var workingList = [];

      function _setMaxPages(listLength) {
        maxPages = Math.max(1, Math.ceil((listLength || 0) / PAGE_SIZE));
      }

      function _updatePagerButtons(page) {
        self.previousBtnDisabled(page <= 1);
        self.nextBtnDisabled(page >= maxPages);
      }

      function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function sortShops(type, data, page = 1) {
        // IMPORTANT: an empty array is a valid filtered result.
        // Only fall back when data is NOT provided.
        var list = Array.isArray(data) ? data : (workingList || []);

        if (type === 'top') {
          list.sort(function (a, b) {
            return (Number(b.rate) || 0) - (Number(a.rate) || 0) ||
              (Number(b.rate_count) || 0) - (Number(a.rate_count) || 0);
          });
        } else if (type === 'reviews') {
          list.sort(function (a, b) {
            return (Number(b.rate_count) || 0) - (Number(a.rate_count) || 0) ||
              (Number(b.rate) || 0) - (Number(a.rate) || 0);
          });
        } else {
          // newest
          list.sort(function (a, b) {
            return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
          });
        }

        workingList = list;
        self.NOShops(workingList.length);
        _setMaxPages(workingList.length);
        _updatePagerButtons(page);
        render(page, workingList);
      }

      function applyFilters(pageNumber = 1) {
        var shops = appState.shops() || [];
        var filtered = shops;

        // Services Filter
        var service = self.selectedServices();
        if (service && service.length) {
          var serviceLower = service.map(serviceMatcher.lower);
          filtered = filtered.filter(function (item) {
            return serviceLower.some(function (s) { return serviceMatcher.matchesService(item, s); });
          });
        }

        // Rating filter (min)
        var rateVal = self.selectedRate();
        if (rateVal) {
          var minRate = Number(rateVal) || 0;
          filtered = filtered.filter(function (item) {
            return (Number(item.rate) || 0) >= minRate;
          });
        }

        workingList = filtered;
        _setMaxPages(workingList.length);
        _updatePagerButtons(pageNumber);
        sortShops(self.sortBy(), workingList, pageNumber);
      }

      self.refreshShops = function (pageToRender) {
        var shopsList = appState.shops();
        if (!shopsList || shopsList.length === 0) {
          shopModel.shopsList(function (success, data) {
            if (!success) {
              appState.setShops([]);
              workingList = [];
              self.NOShops(0);
              _setMaxPages(0);
              _updatePagerButtons(1);
              render(1, []);
              return;
            }

            appState.setShops(data);
            workingList = data;
            applyFilters(pageToRender || 1);
          });
        } else {
          workingList = shopsList;
          applyFilters(pageToRender || 1);
        }
      };

      self.clearAll = function () {
        self.selectedServices.removeAll();
        self.selectedRate('');
        applyFilters();
      };

      self.selectedServices.subscribe(function () {
        if (restoringFromUrl) return;
        applyFilters(1);
        const url = new URL(window.location.href);
        url.searchParams.delete("services");
        (self.selectedServices() || []).forEach(function (s) {
          url.searchParams.append("services", String(s));
        });
        history.replaceState(history.state, "", url.toString());
      });

      self.selectedRate.subscribe(function () {
        if (restoringFromUrl) return;
        applyFilters(1);
        const url = new URL(window.location.href);
        if (self.selectedRate() == "") url.searchParams.delete("rate")
        else url.searchParams.set("rate", self.selectedRate())
        history.replaceState(history.state, '', url.toString());
      });

      self.sortBy.subscribe(function (newValue) {
        if (restoringFromUrl) return;
        sortShops(newValue, workingList, self.currentPage());
      });


      function render(page, data) {
        // IMPORTANT: an empty array is a valid filtered result.
        // Do NOT fall back to the full list when data/workingList is [].
        var list = Array.isArray(data) ? data : (workingList || []);

        var startData = (page - 1) * PAGE_SIZE;
        var endData = page * PAGE_SIZE;

        self.selectedShops.removeAll();
        self.selectedShops(list.slice(startData, endData));
        self.currentPage(page);
        _updatePagerButtons(page);
        scrollToTop();
        const url = new URL(window.location.href);
        url.searchParams.set("pageNo", page)
        history.replaceState(history.state, '', url.toString())
      }

      self.previousPage = function () {
        var newPage = self.currentPage() - 1;
        if (newPage < 1) newPage = 1;
        _updatePagerButtons(newPage);
        render(newPage, workingList);
      };

      self.nextPage = function () {
        var newPage = self.currentPage() + 1;
        if (newPage > maxPages) newPage = maxPages;
        _updatePagerButtons(newPage);
        render(newPage, workingList);
      };
      self.openViewDetail = (_, e) => {
        var id = e.currentTarget.id.split("-")[1];
        window.location.href = "workShopDetail/" + id
      }

      self.connected = function () {
        document.title = 'Work Shops';

        const sp = new URLSearchParams(window.location.search);

        // Always get services as array (even if 1 value)
        const services = sp.getAll('services');   // [] or ["oil","tires"]
        const rateVal = sp.get('rate') || '';    // "4"
        const pageVal = Number(sp.get('pageNo')) || 1;

        restoringFromUrl = true;
        if (services.length) self.selectedServices(services);
        else self.selectedServices([]);           // keep it an array
        self.selectedRate(rateVal);
        restoringFromUrl = false;

        // IMPORTANT: load shops then apply filters + render correct page
        self.refreshShops(pageVal);
      };


      self.disconnected = function () { };
    }

    return new WorkshopsViewModel();
  });
