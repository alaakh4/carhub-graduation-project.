define(['knockout'], function (ko) {
  const parts = ko.observableArray([]);
  const shops = ko.observableArray([]);
  const selectedPart = ko.observable(null);
  const selectedShop = ko.observable(null);

  function setParts(list) {
    parts(Array.isArray(list) ? list : []);
  }

  function setShops(list) {
    shops(Array.isArray(list) ? list : []);
  }
  function setShop(shop) {
    selectedShop(shop);
  }
  function setPart(part) {
    selectedPart(part);
  }
  function reset() {
    parts([]);
    shops([]);
    selectedPart(null);
    selectedShop(null);
  }

  return {
    parts,
    shops,
    selectedPart,
    selectedShop,
    setParts,
    setShops,
    setShop,
    setPart,
    reset
  };
});
