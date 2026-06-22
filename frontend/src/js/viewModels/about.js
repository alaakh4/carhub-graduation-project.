define([
  'knockout',
  'ojs/ojcontext'
], function (ko, Context) {
  function AboutViewModel() {
    var self = this;

    self.goWorkshops = function () {
      document.getElementById("about").classList.remove("active");
      document.getElementById("workshops").classList.add("active");
      router.go({path:'workshops'})
    };

    self.goParts = function () {
      document.getElementById("about").classList.remove("active");
      document.getElementById("parts").classList.add("active");
      router.go({path:'parts'})
    };

    self.connected = function () {
      document.title = 'About | CarHub';
    };
  }

  return AboutViewModel;
});