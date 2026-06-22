var carHubConfig = window.CarHubAppConfig || {
    apiBaseUrl: '',
    absoluteUrl: function (path) {
        var rawPath = String(path || '').trim();
        if (!rawPath) return this.apiBaseUrl;
        if (/^https?:\/\//i.test(rawPath)) return rawPath;
        if (!this.apiBaseUrl) return rawPath;
        return this.apiBaseUrl.replace(/\/+$/, '') + '/' + rawPath.replace(/^\/+/, '');
    }
};

function checkToken() {
    var token = localStorage.getItem("token");
    var role = localStorage.getItem("role")
    var guestMenu = document.getElementById("userGuest");
    var userMenu = document.getElementById("userLoggedIn");
    var cart = document.getElementById("cart");
    var shopDashboard = document.getElementById("shop-dashboard")
    if (token && role != "admin") {
        var endpoint;
        if (role == 'client') endpoint = carHubConfig.absoluteUrl('/api/me')
        else if (role == 'shop') endpoint = carHubConfig.absoluteUrl('/api/shop/parts')
        fetch(endpoint, {
            headers: { token: token }
        })
            .then(res => res.json().then((data) => { return { status: res.status, data: data } }))
            .then((result) => {
                if (result.status == 401 || result.status == 403) {
                    guestMenu.style.display = "block";
                    localStorage.removeItem("carhub_cart");
                } else if (role == 'client') {
                    if (!localStorage.getItem("carhub_cart")) document.getElementById("NOItems").style.display = "none";
                    else addNOItems();
                    userMenu.style.display = "block";
                    cart.style.display = "block";
                    var user = result.data.user;
                    var avatarUrl = (user.avatar_url != '') ? user.avatar_url : "/carhubfiles/uploads/clients/avatar.png";
                    var fullAvatarUrl = carHubConfig.absoluteUrl(avatarUrl);
                    var userAvatarImg = document.getElementById("userAvatarImg");
                    userAvatarImg.setAttribute("src", fullAvatarUrl);

                } else if (role == 'shop') {
                    shopDashboard.style.display = "block";
                }
            });
    } else {
        guestMenu.style.display = "block";
        localStorage.removeItem("carhub_cart");
    }
}
checkToken();

function urlActive(oldPath, newPath) {
    var oldEle = document.getElementById(oldPath);
    var newEle = document.getElementById(newPath);
    if (oldEle)
        oldEle.classList.remove("active");
    if (oldPath == "cart") oldEle.style.color = ""
    if (newPath == "cart")
        newEle.style.color = "#F97316"
    else if (newPath)
        newEle.classList.add("active");
    history.replaceState(history.state, '', window.location.pathname)
    router.go({ path: newPath });
}

function addNOItems() {
    var raw = localStorage.getItem("carhub_cart");
    var cart = JSON.parse(raw);
    var NOItemsEle = document.getElementById("NOItems");
    if (NOItemsEle.style.display == "none")
        NOItemsEle.style.display = "block";
    var NOItems = cart.reduce(function (sum, item) {
        var q = Number(item.quantityOrder);
        return sum + q;
    }, 0);
    NOItemsEle.innerHTML = NOItems;
}

// Main JavaScript file
document.addEventListener('DOMContentLoaded', function () {
    console.log('AutoCare website loaded successfully!');

    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function () {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');

            // Animate hamburger icon
            const spans = this.querySelectorAll('span');
            if (this.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translateY(10px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translateY(-10px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }

    // nav links move
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            var id = e.target.id;
            urlActive(router._activeState.path, id);
            //router.go({ "path": id })
        });
    });

    //dashboard move
    const myShop = document.getElementById("shop-dashboard");
    myShop.addEventListener('click', () => {
        var oldEle = document.getElementById(router._activeState.path);
        if (oldEle) oldEle.classList.remove("active");
        router.go({ path: 'shop-dashboard' })
    })
    // Navbar Scroll Effect
    let lastScroll = 0;
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', function () {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        }

        lastScroll = currentScroll;
    });

    // Add to Cart Functionality
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    const cartBadge = document.querySelector('.cart-badge');
    let cartCount = parseInt(cartBadge.textContent) || 0;

    addToCartButtons.forEach(button => {
        button.addEventListener('click', function () {
            const productCard = this.closest('.product-card');
            const productName = productCard.querySelector('.product-name').textContent;

            // Animate button
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);

            // Update cart count
            cartCount++;
            cartBadge.textContent = cartCount;

            // Animate cart badge
            cartBadge.style.transform = 'scale(1.3)';
            setTimeout(() => {
                cartBadge.style.transform = 'scale(1)';
            }, 300);

            // Change button text temporarily
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check"></i><span>Added!</span>';
            this.style.backgroundColor = '#10B981';

            setTimeout(() => {
                this.innerHTML = originalHTML;
                this.style.backgroundColor = '';
            }, 2000);
        });
    });

    // Workshop View Details
    const workshopButtons = document.querySelectorAll('.workshop-btn');
    workshopButtons.forEach(button => {
        button.addEventListener('click', function () {
            const workshopCard = this.closest('.workshop-card');
            const workshopName = workshopCard.querySelector('.workshop-name').textContent;
        });
    });

    // Search Functionality
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.querySelector('.search-input');

    if (searchBtn) {
        searchBtn.addEventListener('click', function () {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                // Here you would typically make an API call or filter results
            } else {
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }

    // Service Links
    const serviceLinks = document.querySelectorAll('.service-link');
    serviceLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const serviceName = this.closest('.service-card').querySelector('.service-title').textContent;
        });
    });

    // User Dropdown Menu Items
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const action = this.querySelector('span').textContent;
            if (action === 'Logout') {
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                localStorage.removeItem("user");
                window.location.href = "?ojr=home";
            } else if (action == "My Profile") {
                urlActive(router._activeState.path, "profile");
            } else if (action == "Login") {
                urlActive(router._activeState.path, "login");
            } else if (action == "Register") {
                urlActive(router._activeState.path, "register");
            } else if (action == "My Orders") {
                urlActive(router._activeState.path, "orders");
            } else if (action == "Fix Your Car") {
                urlActive(router._activeState.path, "fix-your-car");
            }
        });
    });

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        .nav-menu.active {
            display: flex;
            flex-direction: column;
            position: absolute;
            top: 70px;
            left: 0;
            right: 0;
            background-color: white;
            padding: 20px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);

    // Intersection Observer for Scroll Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all cards
    const cards = document.querySelectorAll('.service-card, .step-card, .workshop-card, .product-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
    });

    // Cart Icon Click
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', function () {
            urlActive(router._activeState.path, "cart");
        });
    }

    // Search Icon Click (mobile)
    const searchIconBtn = document.querySelector('.nav-icon-btn:first-child');
    if (searchIconBtn) {
        searchIconBtn.addEventListener('click', function () {
            const heroSection = document.getElementById('home');
            if (heroSection) {
                heroSection.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                    searchInput.focus();
                }, 500);
            }
        });
    }

    console.log('All interactive features initialized successfully!');
});
