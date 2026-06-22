/**
 * @license
 * Copyright (c) 2014, 2023, Oracle and/or its affiliates.
 * Licensed under The Universal Permissive License (UPL), Version 1.0
 * as shown at https://oss.oracle.com/licenses/upl/
 * @ignore
 */
define([
  'knockout',
  'text!configuration/settings.json',
  'configuration/ServerCaller',
  'ojs/ojcontext',
  'ojs/ojknockouttemplateutils',
  'ojs/ojcorerouter',
  'ojs/ojmodulerouter-adapter',
  'ojs/ojknockoutrouteradapter',
  'ojs/ojurlparamadapter',
  'ojs/ojmodule-element',
  'ojs/ojknockout'
], function (
  ko,
  settings,
  server,
  Context,
  KnockoutTemplateUtils,
  CoreRouter,
  ModuleRouterAdapter,
  KnockoutRouterAdapter,
  UrlParamAdapter
) {
  function ControllerViewModel() {
    var self = this;
    var conf = JSON.parse(settings || '{}');
    var navData = conf.pages || [];
    var publicRoutes = ['login', 'register', 'forget-password', 'reset-password'];
    var announcementHandler;
    var router;
    var routeMeta = {
      login: { title: 'Welcome Back', subtitle: 'Sign in to continue into CarHub Mobile.' },
      register: { title: 'Create Account', subtitle: 'Set up your client account to continue.' },
      'forget-password': { title: 'Forgot Password', subtitle: 'Recover your client account securely.' },
      'reset-password': { title: 'Reset Password', subtitle: 'Create a new password for your account.' },
      home: { title: 'Discover', subtitle: 'Browse parts, workshops, and service tools.' },
      workshops: { title: 'Workshops', subtitle: 'Find the right workshop for your car.' },
      workShopDetail: { title: 'Workshop Details', subtitle: 'Check workshop info, reviews, and available parts.' },
      parts: { title: 'Auto Parts', subtitle: 'Shop trusted parts from your phone.' },
      partDetail: { title: 'Part Details', subtitle: 'Review part specs, ratings, and similar items.' },
      'fix-your-car': { title: 'Fix Your Car', subtitle: 'Describe the issue and get AI-guided help.' },
      'request-service': { title: 'Request Service', subtitle: 'Book the service type that fits your situation.' },
      cart: { title: 'My Cart', subtitle: 'Review your selected parts before checkout.' },
      checkout: { title: 'Checkout', subtitle: 'Complete your order and shipping details.' },
      orders: { title: 'My Orders', subtitle: 'Track active and completed orders.' },
      profile: { title: 'My Profile', subtitle: 'Manage your account, avatar, and history.' },
      about: { title: 'About CarHub', subtitle: 'Learn more about the CarHub experience.' },
      contact: { title: 'Contact Us', subtitle: 'Reach the CarHub team when you need help.' }
    };

    this.KnockoutTemplateUtils = KnockoutTemplateUtils;
    this.manner = ko.observable('polite');
    this.message = ko.observable('');
    this.pageTitle = ko.observable('Welcome Back');
    this.pageSubtitle = ko.observable('Sign in to continue into CarHub Mobile.');
    this.currentRoute = ko.observable('login');
    this.isAuthenticated = ko.observable(false);
    this.showChrome = ko.observable(false);
    this.userMenuOpen = ko.observable(false);
    this.userName = ko.observable('Client');
    this.userEmail = ko.observable('');
    this.userInitials = ko.observable('CH');
    this.avatarSrc = ko.observable('');
    this.cartCount = ko.observable(0);
    this.primaryNav = [
      { id: 'home', label: 'Home', iconClass: 'fas fa-house' },
      { id: 'workshops', label: 'Workshops', iconClass: 'fas fa-wrench' },
      { id: 'parts', label: 'Parts', iconClass: 'fas fa-box-open' },
      { id: 'fix-your-car', label: 'Fix', iconClass: 'fas fa-wand-magic-sparkles' },
      { id: 'orders', label: 'Orders', iconClass: 'fas fa-bag-shopping' },
      { id: 'profile', label: 'Profile', iconClass: 'fas fa-user' }
    ];

    announcementHandler = function (event) {
      self.message(event.detail.message);
      self.manner(event.detail.manner);
    };

    document.getElementById('globalBody').addEventListener('announce', announcementHandler, false);

    function trim(value) {
      return String(value || '').trim();
    }

    function parseStoredUser() {
      try {
        return JSON.parse(window.localStorage.getItem('user') || '{}');
      } catch (e) {
        return {};
      }
    }

    function buildInitials(user) {
      var first = trim(user.fname || user.name).charAt(0);
      var last = trim(user.lname).charAt(0);
      var email = trim(user.email).charAt(0);
      var initials = (first + last) || first || email || 'C';
      return initials.toUpperCase();
    }

    function buildName(user) {
      var fullName = trim((user.fname || '') + ' ' + (user.lname || ''));
      return fullName || trim(user.name) || trim(user.email) || 'Client';
    }

    function normalizeAvatar(url) {
      var raw = trim(url);
      if (!raw) return '';
      if (/^https?:\/\//i.test(raw)) return raw;

      var base = trim(server && server.baseUrl);
      if (!base) return raw;
      return base.replace(/\/+$/, '') + '/' + raw.replace(/^\/+/, '');
    }

    function hasClientSession() {
      var token = trim(window.localStorage.getItem('token'));
      var role = trim(window.localStorage.getItem('role'));
      return !!token && role === 'client';
    }

    function clearSession() {
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('role');
      window.localStorage.removeItem('user');
      window.localStorage.removeItem('carhub_cart');
    }

    function resolveRouteBase(path) {
      var raw = trim(path);
      var base = raw.split('/')[0] || 'login';
      if (base === 'partDetail') return 'parts';
      if (base === 'workShopDetail') return 'workshops';
      if (base === 'checkout') return 'cart';
      return base;
    }

    function getRouteMeta(path) {
      var raw = trim(path);
      var base = raw.split('/')[0] || 'login';
      return routeMeta[base] || routeMeta.home;
    }

    function buildAppUrl(path, params) {
      var url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('ojr', trim(path) || 'login');

      Object.keys(params || {}).forEach(function (key) {
        var value = params[key];
        if (value === undefined || value === null || value === '') return;
        url.searchParams.set(key, value);
      });

      return url.toString();
    }

    function setActiveMarker(path) {
      var routeIds = ['home', 'workshops', 'parts', 'fix-your-car', 'orders', 'profile', 'cart', 'about', 'contact', 'login', 'register'];
      routeIds.forEach(function (id) {
        var element = document.getElementById(id);
        if (!element) return;
        element.classList.remove('active');
        if (id === 'cart') element.style.color = '';
      });

      var activeId = resolveRouteBase(path);
      var activeElement = document.getElementById(activeId);
      if (!activeElement) return;
      activeElement.classList.add('active');
      if (activeId === 'cart') activeElement.style.color = '#F97316';
    }

    this.isCurrentRoute = function (path) {
      return resolveRouteBase(self.currentRoute()) === path;
    };

    this.refreshCartBadge = function () {
      var items;
      var total = 0;
      var badge = document.getElementById('NOItems');

      try {
        items = JSON.parse(window.localStorage.getItem('carhub_cart') || '[]');
      } catch (e) {
        items = [];
      }

      (Array.isArray(items) ? items : []).forEach(function (item) {
        total += Number(item.quantityOrder || 0);
      });

      self.cartCount(total);

      if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 && self.isAuthenticated() ? 'inline-flex' : 'none';
      }
    };

    this.refreshSessionState = function () {
      var role = trim(window.localStorage.getItem('role'));
      var user = parseStoredUser();
      var routeBase = resolveRouteBase(self.currentRoute());
      var sessionValid = hasClientSession();

      if (!sessionValid && (trim(window.localStorage.getItem('token')) || role)) {
        clearSession();
      }

      self.isAuthenticated(sessionValid);
      self.showChrome(sessionValid && publicRoutes.indexOf(routeBase) === -1);
      self.userName(buildName(user));
      self.userEmail(trim(user.email));
      self.userInitials(buildInitials(user));
      self.avatarSrc(normalizeAvatar(user.avatar_url));
      self.refreshCartBadge();
    };

    this.goTo = function (path) {
      if (!path) return;
      self.userMenuOpen(false);
      router.go({ path: path });
    };

    this.openCart = function () {
      if (!self.isAuthenticated()) {
        router.go({ path: 'login' });
        return;
      }
      router.go({ path: 'cart' });
    };

    this.toggleUserMenu = function (_, event) {
      if (event && event.stopPropagation) event.stopPropagation();
      self.userMenuOpen(!self.userMenuOpen());
    };

    this.closeUserMenu = function () {
      self.userMenuOpen(false);
    };

    this.logout = function () {
      clearSession();
      self.userMenuOpen(false);
      self.refreshSessionState();
      router.go({ path: 'login' });
    };

    document.addEventListener('click', function (event) {
      var button = document.getElementById('mobileUserMenuButton');
      var menu = document.getElementById('mobileUserMenu');

      if (!self.userMenuOpen()) return;
      if (button && button.contains(event.target)) return;
      if (menu && menu.contains(event.target)) return;
      self.userMenuOpen(false);
    });

    window.buildCarHubAppUrl = buildAppUrl;

    window.router = new CoreRouter(navData, {
      urlAdapter: new UrlParamAdapter()
    });
    router = window.router;

    this.selection = new KnockoutRouterAdapter(router);
    this.moduleAdapter = new ModuleRouterAdapter(router, { pathKey: 'file' });

    router.beforeStateChange.subscribe(function (args) {
      var nextPath = (args && args.state && args.state.path) ? args.state.path : 'login';
      var base = resolveRouteBase(nextPath);
      var isPublicRoute = publicRoutes.indexOf(base) !== -1;
      var authenticated = hasClientSession();

      if (!authenticated && !isPublicRoute) {
        setTimeout(function () {
          router.go({ path: 'login' });
        }, 0);
        args.accept(Promise.reject('login required'));
        return;
      }

      if (authenticated && isPublicRoute) {
        setTimeout(function () {
          router.go({ path: 'home' });
        }, 0);
        args.accept(Promise.reject('already logged in'));
        return;
      }

      args.accept(Promise.resolve(true));
    });

    router.currentState.subscribe(function (args) {
      var path = (args && args.state && args.state.path) ? args.state.path : 'login';
      var meta = getRouteMeta(path);

      self.currentRoute(path);
      self.pageTitle(meta.title);
      self.pageSubtitle(meta.subtitle);
      setActiveMarker(path);
      self.refreshSessionState();
    });

    window.addEventListener('storage', function () {
      self.refreshSessionState();
    });

    window.addEventListener('focus', function () {
      self.refreshSessionState();
    });

    router.sync().catch(function () {
      return router.go({ path: hasClientSession() ? 'home' : 'login' });
    }).then(function () {
      var meta = getRouteMeta(self.selection.path() || 'login');
      self.pageTitle(meta.title);
      self.pageSubtitle(meta.subtitle);
      self.refreshSessionState();
      setActiveMarker(self.selection.path() || 'login');
    });
  }

  Context.getPageContext().getBusyContext().applicationBootstrapComplete();

  return new ControllerViewModel();
});
