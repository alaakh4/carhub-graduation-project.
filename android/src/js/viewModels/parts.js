define(['jquery', 'knockout', 'stores/rate', 'models/part.model', 'stores/appState', 'stores/cartStore', 'ojs/ojmodule-element-utils', 'accUtils',
  'ojs/ojarraydataprovider', 'ojs/ojslider', 'ojs/ojinputnumber', 'ojs/ojdialog'],
  function ($, ko, rate, partModel, appState, cartStore, ojmodule, Utils, ArrayDataProvider) {

    function PartsViewModel() {
      var self = this;
      self.ratePercent = rate.ratePercent;
      self.rateText = rate.rateText;

      self.selectedParts = ko.observableArray([]);
      self.NOParts = ko.observable(0);
      self.searchQuery = ko.observable('');
      self.activeSearchQuery = ko.observable('');

      // top | new | price_high | price_low
      self.sortBy = ko.observable('top');

      self.selectedCategories = ko.observableArray([]);
      self.selectedBrands = ko.observableArray([]);
      self.selectedInStock = ko.observable();
      self.selectedRate = ko.observable('');

      self.priceMinBound = ko.observable();
      self.priceMaxBound = ko.observable();
      self.ignoreFilters = true;
      // oj-range-slider value is [min,max]
      self.priceRange = ko.observable({ start: 0, end: 0 })
      var restoringFromUrl = false;

      self.currentPage = ko.observable(1);
      self.previousBtnDisabled = ko.observable(true);
      self.nextBtnDisabled = ko.observable(false);
      self.hasVisibleParts = ko.pureComputed(function () {
        return self.selectedParts().length > 0;
      });
      self.hasActiveSearch = ko.pureComputed(function () {
        return !!String(self.activeSearchQuery() || '').trim();
      });
      var maxPages = 1;
      var workingList = [];
      var PAGE_SIZE = 4;

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

      function updateSearchUrl(query, pageNumber) {
        const url = new URL(window.location.href);
        var trimmedQuery = String(query || '').trim();

        if (trimmedQuery) url.searchParams.set("q", trimmedQuery);
        else url.searchParams.delete("q");

        url.searchParams.set("pageNo", pageNumber || 1);
        history.replaceState(history.state, '', url.toString());
      }

      function _lower(v) {
        return String(v || '').trim().toLowerCase();
      }

      function _splitCsv(v) {
        return String(v || '')
          .split(',')
          .map(function (s) { return String(s || '').trim(); })
          .filter(function (s) { return !!s; });
      }

      function _matchesCategory(item, cat) {
        var needle = _lower(cat);
        var cats = _splitCsv(item.category).map(_lower);
        // item.category is stored as CSV string: 'cat1,cat2,...'
        return cats.indexOf(needle) !== -1;
      }

      function _matchesBrand(item, brand) {
        var needle = _lower(brand);
        var brands = _splitCsv(item.brand).map(_lower);
        return brands.indexOf(needle) !== -1;
      }

      function initPriceBounds(list) {
        var maxPrice = 0;
        list.forEach(function (p) {
          var price = Number(p.price) || 0;
          if (price > maxPrice) maxPrice = price;
        });

        self.priceMinBound(0);
        self.priceMaxBound(maxPrice);
        self.priceRange({ start: 0, end: maxPrice })
        // reset current range to full bounds
        self.ignoreFilters = false
      }

      function clampPriceRange() {
        return { min: self.priceRange().start, max: self.priceRange().end }
      }

      function applyFilters(pageNumber = 1) {
        if (self.ignoreFilters) return;
        var parts = appState.parts() || [];
        var filtered = parts;

        // Category filter
        var cats = self.selectedCategories();
        if (cats && cats.length) {
          var catsLower = cats.map(_lower);
          filtered = filtered.filter(function (item) {
            return catsLower.some(function (c) { return _matchesCategory(item, c); });
          });
        }

        // Brand filter
        var brands = self.selectedBrands();
        if (brands && brands.length) {
          filtered = filtered.filter(function (item) {
            return brands.some(function (b) { return _matchesBrand(item, b); });
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

        // Price filter
        var range = clampPriceRange();
        filtered = filtered.filter(function (item) {
          var price = Number(item.price);
          return price >= range.min && price <= range.max;
        });

        // availability filter
        var inStock = self.selectedInStock();
        if (inStock) {
          filtered = filtered.filter(function (item) {
            var availability = Number(item.quantity);
            return availability > 0;
          });
        }

        workingList = filtered;
        _setMaxPages(workingList.length);
        _updatePagerButtons(pageNumber);
        sortParts(self.sortBy(), workingList, pageNumber);
      }

      function render(page, data) {
        // IMPORTANT: an empty array is a valid filtered result.
        // Only fall back when data is NOT provided.
        var list = Array.isArray(data) ? data : (workingList || []);

        var startData = (page - 1) * PAGE_SIZE;
        var endData = page * PAGE_SIZE;

        self.selectedParts.removeAll();
        self.selectedParts(list.slice(startData, endData));
        self.currentPage(page);
        _updatePagerButtons(page);
        scrollToTop();

        const url = new URL(window.location.href);
        url.searchParams.set("pageNo", page);
        history.replaceState(history.state, '', url.toString());
      }

      function sortParts(type, data, page = 1) {
        // IMPORTANT: an empty array is a valid filtered result.
        // Only fall back when data is NOT provided.
        var list = Array.isArray(data) ? data : (workingList || []);

        if (type === 'top') {
          list.sort(function (a, b) {
            return (Number(b.rate) || 0) - (Number(a.rate) || 0) ||
              (Number(b.rate_count) || 0) - (Number(a.rate_count) || 0);
          });
        } else if (type === 'price_high') {
          list.sort(function (a, b) {
            return (Number(b.price) || 0) - (Number(a.price) || 0);
          });
        } else if (type === 'price_low') {
          list.sort(function (a, b) {
            return (Number(a.price) || 0) - (Number(b.price) || 0);
          });
        } else {
          // newest
          list.sort(function (a, b) {
            return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
          });
        }

        workingList = list;
        self.NOParts(workingList.length);
        _setMaxPages(workingList.length);
        _updatePagerButtons(page);
        render(page, workingList);
      }

      self.refreshParts = function (pageToRender, pMinRaw, pMaxRaw, queryOverride) {
        var query = (queryOverride === undefined || queryOverride === null)
          ? self.activeSearchQuery()
          : queryOverride;
        var normalizedQuery = String(query || '').trim();

        self.activeSearchQuery(normalizedQuery);

        partModel.listPublic(normalizedQuery, function (success, data) {
          if (!success) {
            appState.setParts([]);
            workingList = [];
            self.NOParts(0);
            _setMaxPages(0);
            _updatePagerButtons(1);
            render(1, []);
            return;
          }

          appState.setParts(data);
          initPriceBounds(data);

          if (pMinRaw != null || pMaxRaw != null) {
            var minB = Number(self.priceMinBound()) || 0;
            var maxB = Number(self.priceMaxBound()) || 0;

            var pMin = (pMinRaw === null || pMinRaw === undefined || pMinRaw === '') ? minB : (Number(pMinRaw) || minB);
            var pMax = (pMaxRaw === null || pMaxRaw === undefined || pMaxRaw === '') ? maxB : (Number(pMaxRaw) || maxB);

            pMin = Math.max(minB, Math.min(pMin, maxB));
            pMax = Math.max(minB, Math.min(pMax, maxB));
            if (pMin > pMax) { var t = pMin; pMin = pMax; pMax = t; }

            restoringFromUrl = true;
            self.priceRange({ start: pMin, end: pMax });
            restoringFromUrl = false;
          }

          workingList = data;
          applyFilters(pageToRender || 1);
        });
      };

      self.clearAll = function () {
        self.selectedCategories.removeAll();
        self.selectedBrands.removeAll();
        self.selectedRate('');

        // reset price to full range
        self.priceRange({ start: self.priceMinBound(), end: self.priceMaxBound() });

        // Re-apply filters (now empty) + keep current sort
        applyFilters();
      };

      self.sortBy.subscribe(function (newValue) {
        if (restoringFromUrl) return;
        // keep current page like Workshops page
        sortParts(newValue, workingList, self.currentPage());
      });

      // Filters (same structure as Workshops: applyFilters(1) + update URL)
      self.selectedCategories.subscribe(function () {
        if (restoringFromUrl) return;
        applyFilters(1);

        const url = new URL(window.location.href);
        url.searchParams.delete("categories");
        (self.selectedCategories() || []).forEach(function (c) {
          url.searchParams.append("categories", String(c));
        });
        history.replaceState(history.state, "", url.toString());
      });

      self.selectedBrands.subscribe(function () {
        if (restoringFromUrl) return;
        applyFilters(1);

        const url = new URL(window.location.href);
        url.searchParams.delete("brands");
        (self.selectedBrands() || []).forEach(function (b) {
          url.searchParams.append("brands", String(b));
        });
        history.replaceState(history.state, "", url.toString());
      });

      self.selectedRate.subscribe(function () {
        if (restoringFromUrl) return;
        applyFilters(1);

        const url = new URL(window.location.href);
        if (self.selectedRate() == "") url.searchParams.delete("rate");
        else url.searchParams.set("rate", self.selectedRate());
        history.replaceState(history.state, "", url.toString());
      });

      self.priceRange.subscribe(function () {
        if (self.ignoreFilters) return;
        if (restoringFromUrl) return;

        applyFilters(1);

        const url = new URL(window.location.href);

        var minB = Number(self.priceMinBound());
        var maxB = Number(self.priceMaxBound());
        var pr = self.priceRange() || {};
        var pMin = Number(pr.start);
        var pMax = Number(pr.end);

        // if full range, clear params (like Workshops clears when empty)
        if (!isNaN(minB) && !isNaN(maxB) && pMin === minB && pMax === maxB) {
          url.searchParams.delete("pMin");
          url.searchParams.delete("pMax");
        } else {
          url.searchParams.set("pMin", String(pMin));
          url.searchParams.set("pMax", String(pMax));
        }

        history.replaceState(history.state, "", url.toString());
      });

      self.selectedInStock.subscribe(function () {
        if (restoringFromUrl) return;
        applyFilters(1);

        const url = new URL(window.location.href);
        if (self.selectedInStock()) url.searchParams.set("inStock", "1");
        else url.searchParams.delete("inStock");
        history.replaceState(history.state, "", url.toString());
      });

      self.submitSearch = function () {
        var currentRange = self.priceRange() || {};
        var pMin = (self.ignoreFilters || currentRange.start === undefined) ? null : currentRange.start;
        var pMax = (self.ignoreFilters || currentRange.end === undefined) ? null : currentRange.end;

        updateSearchUrl(self.searchQuery(), 1);
        self.refreshParts(1, pMin, pMax, self.searchQuery());
      };

      self.onSearchKeyDown = function (_, e) {
        if (e && e.key === 'Enter') {
          self.submitSearch();
          return false;
        }
        return true;
      };

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

      self.addCartBtn = (_, e) => {
        var guestOrUser = document.getElementById("userLoggedIn").style.display;
        if (guestOrUser == "none") {
          var dlg = document.getElementById('guestDialog');
          return dlg.open();
        }
        var id = e.currentTarget.id.split("_")[0];
        var btn = document.getElementById(id + "_btn");
        var item = self.selectedParts().find(x => x.id == id);
        const originalHTML = btn.innerHTML;
        var cart = cartStore.readCart()
        for (const part of cart) {
          if (part.id == id) {
            if (part.quantityOrder + 1 > part.quantity) {
              btn.innerHTML = '<i class="fas fa-xmark"></i><span> max of stock added!</span>';
              btn.style.backgroundColor = '#f80808ff';
              return setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.backgroundColor = '';
              }, 2000);
            }
          }
        }
        if (item.quantity <= 0) {
          var newInnerHTML = '<i class="fas fa-xmark"></i><span> out of stock!</span>';
          btn.innerHTML = newInnerHTML
          btn.style.backgroundColor = '#f80808ff';
          return setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.backgroundColor = '';
          }, 2000);
        }
        var newInnerHTML = '<i class="fas fa-check"></i><span> Added Successfully!</span>';
        btn.innerHTML = newInnerHTML
        btn.style.backgroundColor = '#10B981';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.style.backgroundColor = '';
        }, 2000);
        item.quantityOrder = 1;
        cartStore.writeCartItem(item);
      }
      self.onGuestOk = () => {
        var dlg = document.getElementById('guestDialog');
        if (dlg && dlg.close) dlg.close();
        document.getElementById("parts").classList.remove("active");
        document.getElementById("login").classList.add("active");
        setTimeout(() => { router.go({ path: "login" }) }, 400);
      }
      self.viewPartDetail = (_, e) => {
        var id = e.currentTarget.id.split("-")[1];
        router.go({ path: "partDetail/" + id });
      }

      self.connected = function () {
        document.title = 'Parts';
        Utils.announce('Parts page loaded.', 'polite');

        const sp = new URLSearchParams(window.location.search);

        // multi params
        const categories = sp.getAll('categories'); // ?categories=a&categories=b
        const brands = sp.getAll('brands');         // ?brands=x&brands=y

        // single params
        const searchQuery = sp.get('q') || '';
        const rateVal = sp.get('rate') || '';
        const pageVal = Number(sp.get('pageNo')) || 1;
        const inStock = sp.get('inStock') === '1'; // store as 1

        // price range
        const pMinRaw = sp.get('pMin');
        const pMaxRaw = sp.get('pMax');

        restoringFromUrl = true;

        self.searchQuery(searchQuery);
        self.activeSearchQuery(searchQuery);
        self.selectedCategories(categories.length ? categories : []);
        self.selectedBrands(brands.length ? brands : []);
        self.selectedRate(rateVal);
        self.selectedInStock(inStock ? true : undefined);

        restoringFromUrl = false;

        // load data first (so price bounds exist), then we apply price + filters + page
        self.refreshParts(pageVal, pMinRaw, pMaxRaw, searchQuery);
      };

      self.disconnected = function () { };
    }

    return new PartsViewModel();
  });
