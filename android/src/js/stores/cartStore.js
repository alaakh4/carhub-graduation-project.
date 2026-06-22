define(['knockout'], function (ko) {
    const CART_KEY = "carhub_cart";

    function readCart() {
        try {
            const raw = window.localStorage.getItem(CART_KEY);
            if (!raw) return [];
            const cart = JSON.parse(raw);
            return Array.isArray(cart) ? cart : [];
        } catch (e) {
            return [];
        }
    }
    function removeItem(id) {
        const cart = readCart();
        const newCart = cart.filter(item => item.id != id)
        localStorage.setItem(CART_KEY,JSON.stringify(newCart));
        return newCart
    }
    function saveCart(cart) {
        try {
            var NOItemsEle = document.getElementById("NOItems");
            if (NOItemsEle.style.display == "none")
                NOItemsEle.style.display = "block";
            var NOItems = totalNumberItems(cart)
            NOItemsEle.innerHTML = NOItems
            window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
            return true;
        } catch (e) {
            return false;
        }
    }
    function totalNumberItems(cart) {
        var NOItems = cart.reduce(function (sum, item) {
            var q = Number(item.quantityOrder);
            return sum + q;
        }, 0);
        return NOItems
    }
    function totalMoney(cart) {
        var total = cart.reduce(function (sum, item) {
            var q = Number(item.quantityOrder) * Number(item.price);
            return sum + q;
        }, 0);
        return total
    }
    function writeCartItem(item) {
        try {
            const cart = readCart();

            // clone to avoid mutating original object
            const newItem = Object.assign({}, item);

            const q = Number(newItem.quantityOrder);
            newItem.quantityOrder = (Number.isFinite(q) && q > 0) ? q : 1;

            const idx = cart.findIndex(function (x) {
                return Number(x.id) === Number(newItem.id);
            });

            if (idx >= 0) {
                cart[idx].quantityOrder = Number(cart[idx].quantityOrder || 0) + newItem.quantityOrder;
            } else {
                cart.push(newItem);
            }

            return { success: saveCart(cart) };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    }
function removeCart() {
    try {
        window.localStorage.removeItem(CART_KEY);
        var NOItemsEle = document.getElementById("NOItems");
        if (NOItemsEle) {
            NOItemsEle.innerHTML = 0;
        }
        return true;
    } catch (e) {
        return false;
    }
}
    return {
        readCart,
        writeCartItem,
        saveCart,
        totalNumberItems,
        totalMoney,
        removeItem,
        removeCart
    };
});
