const SUPABASE_URL = "https://shybnvruiojqlcdvbgzo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_T3Rv7KgqaZ59UT2FbauSMA_z9z7pRyr";

const EMBEDDED_DATA = {
    
    categories: [
    
   
    ],
};

/* =========================================
    Data Loading & State
    ========================================= */
const state = {
    products: [],
    categories: [],
    reviews: [],
    faq: [],
    currentCategory: 'all',
    currentSort: 'default',
    searchQuery: '',
    categoriesWithProducts: new Set()
};

const WHATSAPP_NUMBER = '213799442733';

/* =========================================
     Utility Functions
    ========================================= */
function formatPrice(price) {
    return `${price} DA`;
}

function getDiscountedPrice(price, discount) {
    return Math.round(price * (1 - discount / 100));
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/* =========================================
    Data Fetching
    ========================================= */
async function loadData() {
    try {
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const [categoriesRes, productsRes] = await Promise.all([
            supabase.from('categories').select('*'),
            supabase.from('products').select('*, product_images (*)').eq('is_active', true)
        ]);

        if (categoriesRes.error) throw categoriesRes.error;
        if (productsRes.error) throw productsRes.error;

        const categoryIdMap = {};
        categoriesRes.data.forEach(cat => {
            const slug = (cat.slug || '').toLowerCase();
            const name = (cat.name || '').toLowerCase();
            let mappedId = cat.id;
            if (slug.includes('men') && !slug.includes('women')) mappedId = 'men';
            else if (slug.includes('women')) mappedId = 'women';
            else if (slug.includes('sport')) mappedId = 'sports';
            else if (slug.includes('child') || slug.includes('kid')) mappedId = 'children';
            else if (name.includes('men') && !name.includes('women')) mappedId = 'men';
            else if (name.includes('women')) mappedId = 'women';
            else if (name.includes('sport')) mappedId = 'sports';
            else if (name.includes('child') || name.includes('kid')) mappedId = 'children';
            categoryIdMap[cat.id] = mappedId;
        });

        const productImages = {
            'benyar': [
                'images/benyar/benyar product 1 pic 1.jpg',
                'images/benyar/benyar product 1 pic 3.jpg',
                'images/benyar/benyar product 1 pic3.jpg'
            ],
            'casio': [
                'images/casio/casio watches product 1 pic 1.png',
                'images/casio/casio watches product 1 pic 2.png',
                'images/casio/casio watches product 1 pic 3.png'
            ],
            'rolex': [
                'images/rolex/rolex watches product 1 pic 1.png',
                'images/rolex/rolex watches product 1 pic 2.png',
                'images/rolex/rolex watches product 1 pic 3.png'
            ]
        };

        state.products = productsRes.data.map(p => {
            const lowerName = (p.name || '').toLowerCase();
            let localImages = [];
            if (lowerName.includes('benyar')) localImages = productImages.benyar;
            else if (lowerName.includes('casio') || lowerName.includes('g-shock')) localImages = productImages.casio;
            else if (lowerName.includes('rolex')) localImages = productImages.rolex;

            const productImgs = (p.product_images || [])
                .filter(img => img.path && !String(img.path).startsWith('temp-'))
                .sort((a, b) => (a.position || 0) - (b.position || 0));
            const supabaseImages = productImgs.map(img => img.url);
            const validSupabaseImages = supabaseImages.filter(url => url && !String(url).includes('temp-'));

            const images = localImages.length > 0 ? localImages : (validSupabaseImages.length > 0 ? validSupabaseImages : ['images/watch.svg']);

            return {
                id: p.id,
                name: p.name,
                category: categoryIdMap[p.category_id] || p.category_id,
                price: parseFloat(p.price) || 0,
                discount: parseInt(p.discount) || 0,
                description: p.description || '',
                specifications: p.specifications || {},
                colors: p.colors || [],
                bestSeller: !!p.best_seller,
                featured: !!p.featured,
                offer: !!p.offer,
                stock: parseInt(p.stock) || 0,
                images: images
            };
        });

        const arabicCategoryMap = {};
        (EMBEDDED_DATA.categories || []).forEach(cat => {
            arabicCategoryMap[cat.id] = {
                name: cat.name,
                description: cat.description || '',
                icon: cat.icon || '📦'
            };
        });

        const dbCategories = categoriesRes.data.map(cat => {
            const mappedId = categoryIdMap[cat.id] || cat.slug || cat.id;
            const arabic = arabicCategoryMap[mappedId];
            return {
                id: mappedId,
                name: arabic ? arabic.name : cat.name,
                description: arabic ? arabic.description : (cat.description || ''),
                icon: arabic ? arabic.icon : (cat.icon || '📦')
            };
        });

        const dbCategoryIds = new Set(dbCategories.map(c => c.id));
        const missingCategories = (EMBEDDED_DATA.categories || [])
            .filter(cat => !dbCategoryIds.has(cat.id))
            .map(cat => ({
                id: cat.id,
                name: cat.name,
                description: cat.description || '',
                icon: cat.icon || '📦'
            }));

        state.categories = [...dbCategories, ...missingCategories];

        state.categories = state.categories.map(cat => {
            const currentName = (cat.name || '').toLowerCase();
            const fallback = EMBEDDED_DATA.categories.find(ac => {
                const acName = (ac.name || '').toLowerCase();
                return (
                    (currentName.includes('men') && !currentName.includes('women') && ac.id === 'men') ||
                    (currentName.includes('women') && ac.id === 'women') ||
                    (currentName.includes('sport') && ac.id === 'sports') ||
                    ((currentName.includes('child') || currentName.includes('kid')) && ac.id === 'children')
                );
            });
            if (fallback) {
                return { ...cat, name: fallback.name, description: fallback.description, icon: fallback.icon };
            }
            return cat;
        });

        state.categoriesWithProducts = new Set(state.products.map(p => p.category));

        state.reviews = EMBEDDED_DATA.reviews;
        state.faq = EMBEDDED_DATA.faq;
    } catch (error) {
        console.error('Error loading data from Supabase:', error);
        state.products = EMBEDDED_DATA.products;
        state.categories = EMBEDDED_DATA.categories;
        state.reviews = EMBEDDED_DATA.reviews;
        state.faq = EMBEDDED_DATA.faq;
    }
}

/* =========================================
    Product Card Component
    ========================================= */
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const badges = [];
    if (product.discount > 0) badges.push(`<span class="badge badge-discount">${product.discount}% خصم</span>`);
    if (product.bestSeller) badges.push(`<span class="badge badge-best">الأكثر مبيعاً</span>`);
    if (product.featured && !product.bestSeller && product.discount === 0) {
        badges.push(`<span class="badge badge-featured">مميز</span>`);
    }
    
    const badgesHtml = badges.join('');
    const oldPrice = product.discount > 0 
        ? `<span class="product-card-old-price">${formatPrice(product.price)}</span>` 
        : '';
    const displayPrice = product.discount > 0 
        ? formatPrice(getDiscountedPrice(product.price, product.discount)) 
        : formatPrice(product.price);

    const images = (product.images && product.images.length) ? product.images : ['images/watch.svg'];
    const mainImage = images[0];
    const thumbnails = images.slice(1);

card.innerHTML = `
        <div class="product-card-media">
            <div class="product-card-gallery">
                ${thumbnails.map((img, idx) => `
                    <img src="${img}" alt="${product.name} - صورة ${idx + 2}" loading="lazy" class="product-card-thumb" onerror="this.onerror=null;this.style.display='none';">
                `).join('')}
            </div>
            <div class="product-card-image">
                <img src="${mainImage}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='images/watch.svg';">
                ${badgesHtml}
            </div>
        </div>
        <div class="product-card-body">
            <h3 class="product-card-title">${product.name}</h3>
            <p class="product-card-desc">${product.description}</p>
            <div class="product-card-price">
                ${displayPrice}
                ${oldPrice}
            </div>
            <div class="product-card-footer">
                <a href="product.html?id=${product.id}" class="btn btn-primary" style="width:100%">عرض المنتج</a>
            </div>
            <div class="product-card-footer">
                <a href="${getWhatsAppLink(product.name, displayPrice, `/product.html?id=${product.id}`)}" 
                   class="btn btn-whatsapp" target="_blank" rel="noopener" style="width:100%">
                    🛒 شراء عبر واتساب
                </a>
            </div>
        </div>
    `;

    images.forEach(src => cacheImage(src));

    const mainImgEl = card.querySelector('.product-card-image img');
    const thumbs = card.querySelectorAll('.product-card-thumb');
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            if (mainImgEl) {
                mainImgEl.src = thumb.src;
            }
            thumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    return card;
}

/* =========================================
    WhatsApp Order
    ========================================= */
function getWhatsAppLink(productName, price, productUrl) {
    const message = `مرحباً بك في بوخاري للساعات\n\n`;
    const productInfo = ` المنتج: ${productName}\n السعر: ${price}\n`;
    const linkInfo = ` رابط المنتج: ${window.location.origin}${productUrl}\n`;
    const request = `\n الاسم الكامل\n العنوان\n رقم الهاتف`;
    const closing = `\n\nشكراً لثقتك بنا `;

    const fullMessage = message + productInfo + linkInfo + request + closing;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(fullMessage)}`;
}

/* =========================================
    Homepage Sections
    ========================================= */
function renderFeaturedProducts() {
    const container = document.getElementById('featured-products-grid');
    if (!container) return;
    const featured = state.products.filter(p => p.featured).slice(0, 8);
    if (featured.length === 0) {
        container.innerHTML = '<p class="no-products">لا توجد منتجات مميزة حالياً</p>';
        return;
    }
    featured.forEach(product => {
        container.appendChild(createProductCard(product));
    });
}

function renderBestSelling() {
    const container = document.getElementById('best-selling-products');
    if (!container) return;
    const bestSellers = state.products.filter(p => p.bestSeller).slice(0, 4);
    if (bestSellers.length === 0) {
        container.innerHTML = '<p class="no-products">لا توجد منتجات حالياً</p>';
        return;
    }
    bestSellers.forEach(product => {
        container.appendChild(createProductCard(product));
    });
}

function renderOffers() {
    const container = document.getElementById('offers-products');
    if (!container) return;
    const offers = state.products.filter(p => p.discount > 0).slice(0, 4);
    if (offers.length === 0) {
        container.innerHTML = '<p class="no-products">لا توجد عروض حالياً</p>';
        return;
    }
    offers.forEach(product => {
        container.appendChild(createProductCard(product));
    });
}

function renderCategories() {
     const container = document.getElementById('categories-grid');
     if (!container) return;
     const cardsHtml = state.categories.map(cat => {
         const isEmpty = !state.categoriesWithProducts.has(cat.id);
         const iconHtml = cat.icon.match(/^https?:\/\//) || cat.icon.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
             ? `<img src="${cat.icon}" alt="${cat.name}" class="category-icon-img" loading="lazy">`
             : `<span class="category-icon">${cat.icon}</span>`;
         return `
             <a href="shop.html?category=${cat.id}" class="category-card ${isEmpty ? 'category-empty' : ''}">
                 ${iconHtml}
                 <h3 class="category-name">${cat.name}</h3>
                 <p class="category-desc">${cat.description}</p>
                 ${isEmpty ? '<span class="category-coming-soon">قريبا</span>' : ''}
             </a>
         `;
     }).join('');
     container.innerHTML = cardsHtml;
 }

function renderAllProducts() {
    const container = document.getElementById('all-products-grid');
    if (!container) return;
    if (state.products.length === 0) {
        container.innerHTML = '<p class="no-products">لا توجد منتجات حالياً</p>';
        return;
    }
    state.products.forEach(product => {
        container.appendChild(createProductCard(product));
    });
}

function renderReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;
    container.innerHTML = state.reviews.map(review => {
        const stars = '⭐'.repeat(review.rating);
        const initials = review.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        return `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-avatar">${initials}</div>
                    <div>
                        <div class="review-name">${review.name}</div>
                        <div class="review-date">${review.date}</div>
                    </div>
                </div>
                <div class="review-stars">${stars}</div>
                <p class="review-text">${review.text}</p>
            </div>
        `;
    }).join('');
}

function renderFaq() {
    const container = document.getElementById('faq-container');
    if (!container) return;
    container.innerHTML = state.faq.map(item => `
        <div class="faq-item">
            <button class="faq-question">${item.question}</button>
            <div class="faq-answer">${item.answer}</div>
        </div>
    `).join('');
    
    container.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const isActive = item.classList.contains('active');
            container.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

/* =========================================
    Shop Page
    ========================================= */
function renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    container.innerHTML = `
        <button class="filter-btn ${state.currentCategory === 'all' ? 'active' : ''}" data-category="all">الكل</button>
    ` + state.categories.map(cat => `
        <button class="filter-btn ${state.currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">${cat.name}</button>
    `).join('');
    
    container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentCategory = btn.dataset.category;
            renderShopProducts();
        });
    });
}

function getFilteredAndSortedProducts() {
    let filtered = [...state.products];
    
    if (state.currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === state.currentCategory);
    }
    
    if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.description.toLowerCase().includes(query)
        );
    }
    
    switch (state.currentSort) {
        case 'price-asc':
            filtered.sort((a, b) => getDiscountedPrice(a.price, a.discount) - getDiscountedPrice(b.price, b.discount));
            break;
        case 'price-desc':
            filtered.sort((a, b) => getDiscountedPrice(b.price, b.discount) - getDiscountedPrice(a.price, a.discount));
            break;
        case 'name-asc':
            filtered.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            break;
        default:
            break;
    }
    
    return filtered;
}

function renderShopProducts() {
     const container = document.getElementById('shop-products');
     if (!container) return;
     
     const filtered = getFilteredAndSortedProducts();
     container.innerHTML = '';
     
     if (filtered.length === 0) {
         if (state.currentCategory !== 'all' && !state.categoriesWithProducts.has(state.currentCategory)) {
             container.innerHTML = `
                 <div class="no-products coming-soon-message">
                     <span>🕐</span>
                     <p>قريبا ستعرض فيها ساعات</p>
                 </div>
             `;
         } else {
             container.innerHTML = '<p class="no-products">لا توجد منتجات مطابقة لبحثك</p>';
         }
         return;
     }
     
     filtered.forEach(product => {
         container.appendChild(createProductCard(product));
     });
 }

function initShop() {
    renderCategoryFilters();
    renderShopProducts();
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        const debouncedSearch = debounce((e) => {
            state.searchQuery = e.target.value;
            renderShopProducts();
        }, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }
    
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.currentSort = e.target.value;
            renderShopProducts();
        });
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        state.currentCategory = categoryParam;
        const filterBtn = document.querySelector(`.filter-btn[data-category="${categoryParam}"]`);
        if (filterBtn) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            filterBtn.classList.add('active');
        }
        renderShopProducts();
    }
}

/* =========================================
    Product Detail Page
    ========================================= */
function renderProductPage() {
    const productId = getQueryParam('id');
    if (!productId) {
        window.location.href = 'shop.html';
        return;
    }
    
    const product = state.products.find(p => String(p.id) === String(productId));
    if (!product) {
        window.location.href = 'shop.html';
        return;
    }
    
    const productImage = document.getElementById('product-image');
    const images = (product.images && product.images.length) ? product.images : [product.image || 'images/watch.svg'];
    if (productImage) {
        productImage.src = images[0];
        productImage.alt = product.name;
        productImage.onerror = function() {
            this.onerror = null;
            this.src = 'images/watch.svg';
        };
        cacheImage(images[0]);
    }
    
    const gallery = document.getElementById('product-gallery');
    if (gallery) {
        gallery.innerHTML = '';
        if (images.length > 0) {
images.forEach((img, index) => {
                 const thumb = document.createElement('img');
                 thumb.src = img;
                 thumb.alt = `${product.name} - صورة ${index + 1}`;
                 thumb.loading = 'lazy';
                 thumb.className = 'gallery-thumb' + (index === 0 ? ' active' : '');
                 thumb.onerror = function() {
                     this.onerror = null;
                     this.src = 'images/watch.svg';
                 };
                 cacheImage(img);
thumb.addEventListener('click', () => {
                     productImage.src = img;
                     cacheImage(img);
                     gallery.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
                     thumb.classList.add('active');
                 });
                gallery.appendChild(thumb);
            });
        }
    }
    
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-description').textContent = product.description;
    
    const priceEl = document.getElementById('product-price');
    const discountEl = document.getElementById('product-discount');
    const oldPrice = product.discount > 0 ? product.price : null;
    priceEl.textContent = formatPrice(getDiscountedPrice(product.price, product.discount));
    if (oldPrice) {
        discountEl.textContent = `${product.discount}% خصم`;
        discountEl.style.display = 'inline-block';
    } else {
        discountEl.style.display = 'none';
    }
    
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const whatsappBtnMobile = document.getElementById('whatsapp-btn-mobile');
    const whatsappLink = getWhatsAppLink(product.name, formatPrice(getDiscountedPrice(product.price, product.discount)), `/product.html?id=${product.id}`);
    whatsappBtn.href = whatsappLink;
    if (whatsappBtnMobile) {
        whatsappBtnMobile.href = whatsappLink;
    }

    if (product.stock !== undefined && product.stock <= 5) {
        const stockEl = document.getElementById('stock-indicator');
        if (stockEl) {
            stockEl.textContent = `الكمية المتبقية: ${product.stock} قطع فقط!`;
            stockEl.style.display = 'block';
        }
    }

    if (product.discount > 0) {
        const urgencyEl = document.getElementById('urgency-indicator');
        if (urgencyEl) {
            urgencyEl.textContent = `خصم ${product.discount}% لفترة محدودة`;
            urgencyEl.style.display = 'block';
        }
    }

    const related = state.products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
    const relatedContainer = document.getElementById('related-products');
    relatedContainer.innerHTML = '';
    if (related.length === 0) {
        relatedContainer.innerHTML = '<p class="no-products">لا توجد منتجات مشابهة</p>';
    } else {
        related.forEach(p => {
            relatedContainer.appendChild(createProductCard(p));
        });
    }
}

/* =========================================
      Header Scroll & Back to Top
      ========================================= */
function initHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    const handleScroll = () => {
        if (window.scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
}

function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    
    const handleScroll = () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    };
    
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
}

/* =========================================
       Image Zoom
       ========================================= */
function initImageZoom() {
    const productImage = document.getElementById('product-image');
    const zoomBtn = document.getElementById('zoom-btn');
    if (!productImage || !zoomBtn) return;

    const overlay = document.createElement('div');
    overlay.className = 'zoom-overlay';
    overlay.innerHTML = `
        <button class="zoom-close" aria-label="إغلاق">&times;</button>
        <button class="zoom-nav prev" aria-label="صورة سابقة">&#10094;</button>
        <div class="zoom-modal">
            <img src="" alt="" class="zoom-image">
        </div>
        <button class="zoom-nav next" aria-label="صورة تالية">&#10095;</button>
        <div class="zoom-counter"></div>
    `;
    document.body.appendChild(overlay);

    const zoomImg = overlay.querySelector('.zoom-image');
    const closeBtn = overlay.querySelector('.zoom-close');
    const prevBtn = overlay.querySelector('.zoom-nav.prev');
    const nextBtn = overlay.querySelector('.zoom-nav.next');
    const counter = overlay.querySelector('.zoom-counter');

    let currentIndex = 0;
    let images = [];

    function getImages() {
        const imgs = [];
        if (productImage.src) imgs.push(productImage.src);
        const thumbs = document.querySelectorAll('.gallery-thumb');
        thumbs.forEach(t => imgs.push(t.src));
        return imgs;
    }

    function openZoom(index) {
        images = getImages();
        if (images.length === 0) return;
        currentIndex = index;
        updateZoomImage();
        images.forEach(src => cacheImage(src));
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeZoom() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateZoomImage() {
        if (images.length === 0) return;
        zoomImg.src = images[currentIndex];
        zoomImg.alt = productImage.alt || 'صورة المنتج';
        if (images.length > 1) {
            counter.textContent = `${currentIndex + 1} / ${images.length}`;
            counter.style.display = 'block';
        } else {
            counter.style.display = 'none';
        }
    }

    zoomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openZoom(0);
    });

    productImage.addEventListener('click', () => {
        openZoom(0);
    });

    closeBtn.addEventListener('click', closeZoom);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeZoom();
    });

    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (images.length === 0) return;
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateZoomImage();
    });

    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (images.length === 0) return;
        currentIndex = (currentIndex + 1) % images.length;
        updateZoomImage();
    });

    document.addEventListener('keydown', (e) => {
        if (!overlay.classList.contains('active')) return;
        if (e.key === 'Escape') closeZoom();
        if (e.key === 'ArrowLeft') {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            updateZoomImage();
        }
        if (e.key === 'ArrowRight') {
            currentIndex = (currentIndex + 1) % images.length;
            updateZoomImage();
        }
    });
}

/* =========================================
    Image Preloading & Lazy Loading
    ========================================= */
const IMAGE_CACHE_NAME = 'marketofwatches-images-v1';

function cacheImage(src) {
    if (!src) return;
    if (!('caches' in window)) return;
    caches.open(IMAGE_CACHE_NAME).then((cache) => {
        cache.match(src).then((cached) => {
            if (cached) return;
            fetch(src, { mode: 'cors' }).then((response) => {
                if (response && response.status === 200) {
                    cache.put(src, response.clone());
                }
            }).catch(() => {});
        });
    });
}

function preloadImage(src) {
    if (!src) return;
    cacheImage(src);
    const img = new Image();
    img.src = src;
}

function preloadProductImages(product) {
    if (!product || !product.images) return;
    product.images.forEach(src => preloadImage(src));
}

function initImagePreloader() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    cacheImage(img.src);
                }
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '200px 0px',
        threshold: 0.01
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        observer.observe(img);
    });
}

function observeProductImages() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const mainImg = card.querySelector('.product-card-image img');
                const thumbs = card.querySelectorAll('.product-card-thumb');
                if (mainImg && mainImg.dataset.src) {
                    preloadImage(mainImg.dataset.src);
                }
                thumbs.forEach(thumb => {
                    if (thumb.dataset.src) {
                        preloadImage(thumb.dataset.src);
                    }
                });
                observer.unobserve(card);
            }
        });
    }, {
        rootMargin: '300px 0px',
        threshold: 0.01
    });

    document.querySelectorAll('.product-card').forEach(card => {
        observer.observe(card);
    });
}

function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        initImagePreloader();
        observeProductImages();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    initHeaderScroll();
    initBackToTop();
    initImageZoom();
    initLazyLoading();
    await loadData();
    
    const path = window.location.pathname;
    
    if (path.includes('shop.html')) {
        initShop();
    } else if (path.includes('product.html')) {
        renderProductPage();
    } else {
        renderCategories();
        renderFeaturedProducts();
        renderReviews();
    }
});
