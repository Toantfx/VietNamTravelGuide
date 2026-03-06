// js/main_logic.js
console.log("🚀 Main logic is loading...");

// ========== GLOBAL VARIABLES ==========
let currentProvince = null;
let currentPage = 1;
const itemsPerPage = 6;
let currentRegion = 'all';
let filteredProvinces = [];
let slideshowInterval = null;
let globalUser = null;
let currentPostId = null;
let sliderIdx = 0;
let commentImages = [];
let commentVideo = null;

// Khởi tạo dữ liệu
if (window.provincesData && window.provincesData.length > 0) {
    filteredProvinces = [...window.provincesData];
    console.log("✅ Đã tải dữ liệu:", window.provincesData.length, "tỉnh thành");
} else {
    console.warn("⚠️ provincesData trống!");
    filteredProvinces = [];
}

// ========== UTILITY FUNCTIONS ==========
function removeDiacritics(str) {
    if (!str) return '';
    const accents = 'àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
    const noAccents = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';
    return str.toLowerCase().split('').map(char => {
        const index = accents.indexOf(char);
        return index !== -1 ? noAccents[index] : char;
    }).join('');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const colors = { success: '#2c5f2d', error: '#b91c1c', warning: '#d97706', info: '#2563eb' };
    toast.textContent = message;
    toast.style.backgroundColor = colors[type];
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

function timeAgo(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    const intervals = [
        [31536000, 'năm'], [2592000, 'tháng'], [86400, 'ngày'],
        [3600, 'giờ'], [60, 'phút'], [1, 'giây']
    ];
    for (let [sec, text] of intervals) {
        const interval = Math.floor(seconds / sec);
        if (interval >= 1) return interval + ' ' + text + ' trước';
    }
    return 'vài giây trước';
}

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ========== STORAGE FUNCTIONS ==========
function getStorage(key, defaultValue = []) {
    try {
        return JSON.parse(localStorage.getItem(key)) || defaultValue;
    } catch {
        return defaultValue;
    }
}

function setStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function loadPosts(provinceId) {
    const all = getStorage('communityPosts', []);
    return all.filter(p => p.provinceId == provinceId);
}

function savePost(provinceId, post) {
    const all = getStorage('communityPosts', []);
    const others = all.filter(p => p.provinceId != provinceId);
    setStorage('communityPosts', [...others, post]);
}

function loadComments(postId) {
    const all = getStorage('communityComments', {});
    return all[postId] || [];
}

function saveComment(postId, comment) {
    const all = getStorage('communityComments', {});
    if (!all[postId]) all[postId] = [];
    all[postId].push(comment);
    setStorage('communityComments', all);
}

function loadLikes(postId) {
    const all = getStorage('communityLikes', {});
    return all[postId] || [];
}

function toggleLike(postId, userName) {
    const all = getStorage('communityLikes', {});
    if (!all[postId]) all[postId] = [];
    const idx = all[postId].indexOf(userName);
    idx === -1 ? all[postId].push(userName) : all[postId].splice(idx, 1);
    setStorage('communityLikes', all);
    return all[postId];
}

// ========== SCROLL TO DESTINATIONS ==========
function scrollToDestinations() {
    console.log("Scrolling to destinations...");
    const destinationsSection = document.getElementById('destinations');
    if (destinationsSection) {
        const navbarHeight = 70;
        const elementPosition = destinationsSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    } else {
        console.log("Destinations section not found");
    }
}

// ========== LANGUAGE ==========
function applyLanguage(lang) {
    if (!window.translations || !window.translations[lang]) {
        console.error("Không tìm thấy translations cho ngôn ngữ:", lang);
        return;
    }
    
    localStorage.setItem('vietnamTravelLanguage', lang);
    const data = window.translations[lang];
    
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.dataset.key;
        const text = data[key];
        if (text) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = text;
            } else if (el.tagName === 'SELECT') {
                const options = el.querySelectorAll('option');
                options.forEach(option => {
                    if (option.value === 'vn') option.textContent = 'VN';
                    if (option.value === 'en') option.textContent = 'EN';
                });
            } else {
                el.textContent = text;
            }
        }
    });

    const pageTitle = document.querySelector('title');
    if (pageTitle) {
        pageTitle.textContent = lang === 'en' ? 'Vietnam Travel Guide' : 'VTG';
    }
    
    if (currentProvince) {
        renderProvinceDetail(currentProvince);
        
        const activeTab = document.querySelector('.menu-item.active');
        if (activeTab) {
            loadTab(activeTab.dataset.type);
        } else {
            const firstTab = document.querySelector('.menu-item');
            if (firstTab) {
                firstTab.classList.add('active');
                loadTab(firstTab.dataset.type);
            }
        }
        
        const activeFilter = document.querySelector('.filter-btn.active');
        if (activeFilter) {
            renderPosts(currentProvince.id, activeFilter.dataset.filter);
        } else {
            renderPosts(currentProvince.id);
        }
    }
    
    if (document.getElementById('destinationsGrid')) {
        renderHome();
    }
    
    updateModalTranslations(lang);
    
    if (globalUser) {
        updateUserUI(globalUser);
    }
    
    console.log(`Đã đổi sang ngôn ngữ: ${lang}`);
}

function updateModalTranslations(lang) {
    const data = window.translations[lang];
    if (!data) return;
    
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        const loginTitle = loginModal.querySelector('[data-key="loginTitle"]');
        if (loginTitle) loginTitle.textContent = data.loginTitle;
        
        const loginSubtitle = loginModal.querySelector('[data-key="loginSubtitle"]');
        if (loginSubtitle) loginSubtitle.textContent = data.loginSubtitle;
        
        const loginLabel = loginModal.querySelector('[data-key="loginLabel"]');
        if (loginLabel) loginLabel.textContent = data.loginLabel;
        
        const loginInput = loginModal.querySelector('#loginUsername');
        if (loginInput) loginInput.placeholder = data.loginPlaceholder;
        
        const loginButton = loginModal.querySelector('[data-key="loginButton"]');
        if (loginButton) loginButton.textContent = data.loginButton;
        
        const loginTerms = loginModal.querySelector('[data-key="loginTerms"]');
        if (loginTerms) loginTerms.textContent = data.loginTerms;
        
        const terms = loginModal.querySelector('[data-key="terms"]');
        if (terms) terms.textContent = data.terms;
        
        const and = loginModal.querySelector('[data-key="and"]');
        if (and) and.textContent = data.and;
        
        const privacy = loginModal.querySelector('[data-key="privacy"]');
        if (privacy) privacy.textContent = data.privacy;
        
        const loginWith = loginModal.querySelector('[data-key="loginWith"]');
        if (loginWith) loginWith.textContent = data.loginWith;
        
        const registerLink = loginModal.querySelector('[data-key="registerLink"]');
        if (registerLink) registerLink.textContent = data.registerLink;
    }
    
    const registerModal = document.getElementById('registerModal');
    if (registerModal) {
        const registerTitle = registerModal.querySelector('[data-key="registerTitle"]');
        if (registerTitle) registerTitle.textContent = data.registerTitle;
        
        const registerSubtitle = registerModal.querySelector('[data-key="registerSubtitle"]');
        if (registerSubtitle) registerSubtitle.textContent = data.registerSubtitle;
        
        const nameLabel = registerModal.querySelector('[data-key="registerNameLabel"]');
        if (nameLabel) nameLabel.textContent = data.registerNameLabel;
        
        const nameInput = registerModal.querySelector('#registerFullName');
        if (nameInput) nameInput.placeholder = data.registerNamePlaceholder;
        
        const emailLabel = registerModal.querySelector('[data-key="registerEmailLabel"]');
        if (emailLabel) emailLabel.textContent = data.registerEmailLabel;
        
        const emailInput = registerModal.querySelector('#registerEmail');
        if (emailInput) emailInput.placeholder = data.registerEmailPlaceholder;
        
        const passLabel = registerModal.querySelector('[data-key="registerPasswordLabel"]');
        if (passLabel) passLabel.textContent = data.registerPasswordLabel;
        
        const passInput = registerModal.querySelector('#registerPassword');
        if (passInput) passInput.placeholder = data.registerPasswordPlaceholder;
        
        const registerButton = registerModal.querySelector('[data-key="registerButton"]');
        if (registerButton) registerButton.textContent = data.registerButton;
        
        const registerTerms = registerModal.querySelector('[data-key="registerTerms"]');
        if (registerTerms) registerTerms.textContent = data.registerTerms;
        
        const registerWith = registerModal.querySelector('[data-key="registerWith"]');
        if (registerWith) registerWith.textContent = data.registerWith;
        
        const loginLink = registerModal.querySelector('[data-key="loginLink"]');
        if (loginLink) loginLink.textContent = data.loginLink;
    }
}

// ========== SEARCH ==========
function setupSearch() {
    const btn = document.getElementById('searchBtn');
    const overlay = document.getElementById('searchOverlay');
    if (!btn || !overlay) return;

    btn.onclick = () => {
        overlay.classList.add('active');
        setTimeout(() => {
            const input = document.getElementById('searchInput');
            if (input) {
                input.focus();
                input.value = '';
            }
        }, 100);
    };

    const close = document.getElementById('closeSearch');
    if (close) close.onclick = closeSearch;

    overlay.onclick = (e) => {
        if (e.target === overlay) closeSearch();
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeSearch();
        }
    });

    const input = document.getElementById('searchInput');
    const submit = document.getElementById('searchSubmit');
    if (!input || !submit) return;

    const doSearch = () => {
        const query = input.value.trim();
        if (!query) return;

        const noDiacritics = removeDiacritics(query);
        const results = (window.provincesData || []).filter(p => 
            removeDiacritics(p.name.toLowerCase()).includes(noDiacritics) ||
            p.name.toLowerCase().includes(query.toLowerCase())
        );

        const container = document.getElementById('searchResults');
        if (!container) return;

        const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
        const data = window.translations[lang] || window.translations.vn;

        if (results.length) {
            container.innerHTML = results.map(p => `
                <div class="search-result-item" onclick="window.location.href='detai.html?id=${p.id}'">
                    <h4 style="color: #0066cc; text-decoration: underline;">${p.name}</h4>
                    <p>${typeof p.intro === 'object' ? (p.intro[lang] || p.intro.vn).substring(0, 100) + '...' : p.intro.substring(0, 100) + '...'}</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="search-not-found">
                    <p>${data.searchNotFound || 'Không tìm thấy kết quả'}</p>
                    <div class="search-external-buttons">
                        <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank"><i class="fab fa-google"></i> ${data.searchGoogle || 'Google'}</a>
                        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(query)}" target="_blank"><i class="fab fa-youtube"></i> ${data.searchYouTube || 'YouTube'}</a>
                    </div>
                </div>
            `;
        }
    };

    submit.onclick = doSearch;
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            doSearch();
        }
    };
    
    input.addEventListener('input', () => {
        const query = input.value.trim();
        if (query.length < 2) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }
        
        const noDiacritics = removeDiacritics(query);
        const results = (window.provincesData || []).filter(p => 
            removeDiacritics(p.name.toLowerCase()).includes(noDiacritics) ||
            p.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
        
        const container = document.getElementById('searchResults');
        
        if (results.length) {
            container.innerHTML = results.map(p => `
                <div class="search-result-item" onclick="window.location.href='detai.html?id=${p.id}'">
                    <h4 style="color: #0066cc; text-decoration: underline;">${p.name}</h4>
                </div>
            `).join('');
        } else {
            container.innerHTML = '';
        }
    });
}

function closeSearch() {
    const overlay = document.getElementById('searchOverlay');
    const results = document.getElementById('searchResults');
    const input = document.getElementById('searchInput');
    if (overlay) overlay.classList.remove('active');
    if (results) results.innerHTML = '';
    if (input) input.value = '';
}

// ========== DETAIL PAGE FUNCTIONS ==========
function renderProvinceDetail(province) {
    const container = document.getElementById('headerProvince');
    if (!container) return;
    
    const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
    let intro = '';
    
    if (typeof province.intro === 'object') {
        intro = province.intro[lang] || province.intro.vn;
    } else {
        intro = province.intro;
    }
    
    let slideshowHtml = '';
    if (province.images && province.images.length > 0) {
        const firstImage = province.images[0];
        slideshowHtml = `
            <div class="province-slideshow" id="provinceSlideshow">
                <div class="slideshow-container" id="slideshowContainer" style="background-image: url('${firstImage}')"></div>
            </div>
        `;
    }
    
    container.innerHTML = `
        <h1 class="province-title">${province.name}</h1>
        <p class="province-intro">${intro}</p>
        ${slideshowHtml}
    `;
    
    if (province.images && province.images.length > 1) {
        startProvinceSlideshow(province.images);
    }
}

function startProvinceSlideshow(images) {
    if (!images || images.length === 0) return;
    
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
    
    const container = document.getElementById('slideshowContainer');
    if (!container) return;
    
    let currentIndex = 0;
    container.style.transition = 'background-image 1s ease-in-out';
    
    slideshowInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % images.length;
        container.style.backgroundImage = `url('${images[currentIndex]}')`;
    }, 5000);
}

function loadTab(type) {
    const content = document.getElementById('sliderContent');
    if (!content || !currentProvince) return;
    
    document.querySelectorAll('.menu-item').forEach(btn => 
        btn.classList.toggle('active', btn.dataset.type === type));
    
    const list = currentProvince[type + 'List'] || [];
    const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
    
    const menuItems = document.querySelectorAll('.menu-item');
    const data = window.translations[lang];
    
    if (menuItems.length >= 3 && data) {
        menuItems[0].textContent = data.foodTitle || 'Ẩm thực';
        menuItems[1].textContent = data.cultureTitle || 'Văn hóa';
        menuItems[2].textContent = data.playTitle || 'Trải nghiệm';
    }
    
    if (!list.length) {
        content.innerHTML = '<div class="no-data-message"><h3>' + 
            (lang === 'en' ? 'Updating...' : 'Đang cập nhật...') + 
            '</h3></div>';
        return;
    }
    
    content.innerHTML = list.map(item => {
        const img = Array.isArray(item.images) ? item.images[0] : item.image;
        
        let name = item.name;
        if (lang === 'en') {
            name = item.name_en || item.name;
        }
        
        let desc = item.desc;
        if (lang === 'en') {
            desc = item.desc_en || item.desc;
        }
        
        return `
            <div class="slider-item" onclick='openDetailPopup("${name.replace(/"/g, '&quot;')}", "${desc.replace(/"/g, '&quot;').replace(/\n/g, ' ')}", "${img}")'>
                <img src="${img}" alt="${name}" onerror="this.src='https://images.unsplash.com/photo-1528181304800-259b08848526?w=500'">
                <div class="slider-item-title">${name}</div>
            </div>
        `;
    }).join('');
    
    sliderIdx = 0;
    if (content.style) {
        content.style.transform = 'translateX(0)';
    }
}

function moveSlider(step) {
    const content = document.getElementById('sliderContent');
    if (!content || !content.children.length) return;
    const itemWidth = content.children[0].offsetWidth + 24;
    sliderIdx = Math.max(0, Math.min(sliderIdx + step, content.children.length - 1));
    content.style.transform = `translateX(-${sliderIdx * itemWidth}px)`;
}

function openDetailPopup(name, desc, img) {
    const overlay = document.getElementById('infoOverlay');
    document.getElementById('infoBody').innerHTML = `
        <div class="info-popup-content">
            <img src="${img}" alt="${name}">
            <h3>${name}</h3>
            <p>${desc}</p>
        </div>
    `;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeDetailPopup() {
    document.getElementById('infoOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ========== HOME PAGE FUNCTIONS ==========
function renderHome() {
    const grid = document.getElementById('destinationsGrid');
    if (!grid) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const items = filteredProvinces.slice(start, start + itemsPerPage);
    
    if (items.length === 0) {
        grid.innerHTML = '<p class="no-data">Không có dữ liệu</p>';
        return;
    }
    
    grid.innerHTML = items.map(p => `
        <div class="destination-card" onclick="window.location.href='detai.html?id=${p.id}'">
            <div class="card-image">
                <img src="${p.images?.[0] || 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=500'}" alt="${p.name}">
                <div class="card-title">${p.name}</div>
            </div>
        </div>
    `).join('');
    
    renderPagination();
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const total = Math.ceil(filteredProvinces.length / itemsPerPage);
    if (total <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = `<button class="page-btn prev" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span class="page-dots">...</span>';
        }
    }
    
    html += `<button class="page-btn next" ${currentPage === total ? 'disabled' : ''} onclick="changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    
    const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
    const data = window.translations[lang] || window.translations.vn;
    html += `<div class="page-info">${data.pageInfo || 'Trang'} ${currentPage} / ${total}</div>`;
    
    pagination.innerHTML = html;
}

function changePage(page) {
    const total = Math.ceil(filteredProvinces.length / itemsPerPage);
    if (page < 1 || page > total) return;
    currentPage = page;
    renderHome();
    scrollToDestinations();
}

function filterByRegion(region) {
    console.log("Filtering by region:", region);
    currentRegion = region;
    currentPage = 1;
    
    if (region === 'all') {
        filteredProvinces = [...(window.provincesData || [])];
    } else {
        filteredProvinces = (window.provincesData || []).filter(p => p.region === region);
    }
    
    renderHome();
    
    document.querySelectorAll('.nav-link.region-link').forEach(link => 
        link.classList.toggle('active', link.dataset.region === region));
        
    const url = new URL(window.location);
    if (region === 'all') {
        url.searchParams.delete('region');
    } else {
        url.searchParams.set('region', region);
    }
    window.history.replaceState({}, '', url);
    
    setTimeout(scrollToDestinations, 100);
}

// ========== COMMUNITY POSTS FUNCTIONS ==========
function renderPosts(provinceId, filter = 'all') {
    const container = document.getElementById('communityPosts');
    if (!container) return;
    
    const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
    const data = window.translations[lang] || window.translations.vn;
    
    let posts = loadPosts(provinceId);
    if (filter === 'image') posts = posts.filter(p => p.images && p.images.length > 0);
    if (filter === 'video') posts = posts.filter(p => p.video);
    
    if (!posts.length) {
        container.innerHTML = `<p class="no-posts">${data.noPosts || 'Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!'}</p>`;
        return;
    }
    
    posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    container.innerHTML = posts.map(post => {
        const likes = loadLikes(post.id);
        const liked = globalUser && likes.includes(globalUser.name);
        const comments = loadComments(post.id);
        
        // KIỂM TRA QUYỀN SỞ HỮU BÀI VIẾT
        const isOwner = globalUser && (globalUser.name === post.author || globalUser.email === post.authorEmail);
        
        let media = '';
        if (post.images && post.images.length > 0) {
            if (post.images.length === 1) {
                media = `<img src="${post.images[0]}" alt="post image">`;
            } else {
                media = `<div class="post-media multi-image">${post.images.slice(0,4).map(img => `<img src="${img}" alt="">`).join('')}</div>`;
            }
        } else if (post.video) {
            const vid = extractYouTubeId(post.video);
            if (vid) {
                media = `<iframe src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe>`;
            }
        }
        
        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-avatar">${post.author[0].toUpperCase()}</div>
                    <div class="post-author-info">
                        <div class="post-author-name">${post.author}</div>
                        <div class="post-time">${timeAgo(post.timestamp)}</div>
                    </div>
                    ${isOwner ? `
                        <div class="post-actions-menu" style="margin-left: auto; display: flex; gap: 8px;">
                            <button class="edit-post-btn" onclick="event.stopPropagation(); editPost('${post.id}')" style="background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 0.9rem;" title="Sửa bài viết">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-post-btn" onclick="event.stopPropagation(); deletePost('${post.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.9rem;" title="Xóa bài viết">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="post-content"><p>${post.description}</p></div>
                ${media ? `<div class="post-media">${media}</div>` : ''}
                <div class="post-stats">
                    <span><i class="far fa-heart"></i> ${likes.length} ${data.likes || 'lượt thích'}</span>
                    <span><i class="far fa-comment"></i> ${comments.length} ${data.comments || 'bình luận'}</span>
                </div>
                <div class="post-actions">
                    <button class="action-btn like-btn ${liked ? 'liked' : ''}" data-post-id="${post.id}">
                        <i class="${liked ? 'fas' : 'far'} fa-heart"></i> ${data.like || 'Thích'}
                    </button>
                    <button class="action-btn comment-btn" data-post-id="${post.id}">
                        <i class="far fa-comment"></i> ${data.comment || 'Bình luận'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Like buttons
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            if (!globalUser) {
                document.getElementById('loginModal').classList.add('active');
                return;
            }
            
            const post = posts.find(p => p.id == btn.dataset.postId);
            if (!post) return;
            
            const newLikes = toggleLike(post.id, globalUser.name);
            const card = btn.closest('.post-card');
            const statsSpan = card.querySelector('.post-stats span:first-child');
            statsSpan.innerHTML = `<i class="far fa-heart"></i> ${newLikes.length} ${data.likes || 'lượt thích'}`;
            
            if (newLikes.includes(globalUser.name)) {
                btn.classList.add('liked');
                btn.querySelector('i').className = 'fas fa-heart';
            } else {
                btn.classList.remove('liked');
                btn.querySelector('i').className = 'far fa-heart';
            }
        };
    });
    
    // Comment buttons
    document.querySelectorAll('.comment-btn, .post-card').forEach(el => {
        el.onclick = (e) => {
            if (e.target.closest('.like-btn') || e.target.closest('.edit-post-btn') || e.target.closest('.delete-post-btn')) return;
            const postId = el.dataset.postId || el.closest('.post-card')?.dataset.postId;
            const post = posts.find(p => p.id == postId);
            if (post) showPostDetail(post);
        };
    });
}

function showPostDetail(post) {
    currentPostId = post.id;
    const modal = document.getElementById('postDetailModal');
    if (!modal) return;
    
    let media = '';
    if (post.images && post.images.length > 0) {
        if (post.images.length === 1) {
            media = `<img src="${post.images[0]}" style="width:100%; max-height:400px; object-fit:contain;">`;
        } else {
            media = `<div class="post-media multi-image">${post.images.map(img => `<img src="${img}" style="height:150px; object-fit:cover;">`).join('')}</div>`;
        }
    } else if (post.video) {
        const vid = extractYouTubeId(post.video);
        if (vid) {
            media = `<iframe width="100%" height="300" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe>`;
        }
    }
    
    const likes = loadLikes(post.id);
    const liked = globalUser && likes.includes(globalUser.name);
    
    const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
    const data = window.translations[lang] || window.translations.vn;
    
    document.getElementById('postDetailBody').innerHTML = `
        <div class="post-detail">
            <div class="post-header">
                <div class="post-avatar">${post.author[0].toUpperCase()}</div>
                <div class="post-author-info">
                    <div class="post-author-name">${post.author}</div>
                    <div class="post-time">${timeAgo(post.timestamp)}</div>
                </div>
            </div>
            ${media ? `<div class="post-media">${media}</div>` : ''}
            <p>${post.description}</p>
            <div class="post-stats">
                <span><i class="far fa-heart"></i> <span id="detailLikeCount">${likes.length}</span> ${data.likes || 'lượt thích'}</span>
            </div>
            <div class="post-actions">
                <button class="action-btn like-btn ${liked ? 'liked' : ''}" id="detailLikeBtn">
                    <i class="${liked ? 'fas' : 'far'} fa-heart"></i> ${data.like || 'Thích'}
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('commentFormWrapper').innerHTML = globalUser ? getCommentForm() : getLoginPrompt();
    renderComments(post.id);
    modal.classList.add('active');
    
    document.getElementById('detailLikeBtn').onclick = (e) => {
        e.stopPropagation();
        if (!globalUser) {
            modal.classList.remove('active');
            document.getElementById('loginModal').classList.add('active');
            return;
        }
        const newLikes = toggleLike(post.id, globalUser.name);
        document.getElementById('detailLikeCount').textContent = newLikes.length;
        const btn = document.getElementById('detailLikeBtn');
        if (newLikes.includes(globalUser.name)) {
            btn.classList.add('liked');
            btn.querySelector('i').className = 'fas fa-heart';
        } else {
            btn.classList.remove('liked');
            btn.querySelector('i').className = 'far fa-heart';
        }
    };
    
    if (globalUser) initCommentForm();
    
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.remove('active');
            currentPostId = null;
        };
    }
    
    window.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            currentPostId = null;
        }
    };
}

function getCommentForm() {
    const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
    const data = window.translations[lang] || window.translations.vn;
    
    return `
        <div class="comment-form-new">
            <div class="comment-avatar-small">${globalUser?.name?.[0].toUpperCase() || 'U'}</div>
            <div class="comment-input-area">
                <textarea id="commentText" placeholder="${data.commentPlaceholder || 'Nhập nội dung bình luận...'}" rows="2" maxlength="3000"></textarea>
                <div class="comment-toolbar">
                    <div class="comment-char-count"><span id="commentCharCount">0</span>/3000</div>
                    <div class="comment-media-actions">
                        <button type="button" class="comment-media-btn" id="addCommentImage"><i class="fas fa-image"></i></button>
                        <button type="button" class="comment-media-btn" id="addCommentVideo"><i class="fas fa-video"></i></button>
                    </div>
                    <button type="button" class="comment-submit-btn" id="submitComment">${data.comment || 'Gửi bình luận'}</button>
                </div>
                <div class="comment-image-preview" id="commentImagePreview" style="display:none;"></div>
                <div class="comment-video-input" id="commentVideoInput" style="display:none">
                    <input type="text" placeholder="Nhập link YouTube...">
                    <button type="button" class="remove-video"><i class="fas fa-times"></i></button>
                </div>
            </div>
        </div>
    `;
}

function getLoginPrompt() {
    const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
    const data = window.translations[lang] || window.translations.vn;
    
    return `
        <div class="comment-login-prompt">
            <i class="far fa-comment-dots"></i>
            <p>${data.commentLoginPrompt || 'Hãy đăng nhập để bình luận và chia sẻ!'}</p>
            <button class="btn-login-prompt" onclick="document.getElementById('loginModal').classList.add('active'); document.getElementById('postDetailModal').classList.remove('active');">${data.loginNow || 'Đăng nhập ngay'}</button>
        </div>
    `;
}

function initCommentForm() {
    const text = document.getElementById('commentText');
    const count = document.getElementById('commentCharCount');
    if (text) {
        text.oninput = () => {
            if (count) count.textContent = text.value.length;
        };
    }

    document.getElementById('addCommentImage')?.addEventListener('click', () => {
        if (commentImages.length >= 5) {
            alert('Tối đa 5 ảnh!');
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            const remainingSlots = 5 - commentImages.length;
            
            files.slice(0, remainingSlots).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    commentImages.push(ev.target.result);
                    updateImagePreview();
                };
                reader.readAsDataURL(file);
            });
        };
        input.click();
    });

    document.getElementById('addCommentVideo')?.addEventListener('click', () => {
        const v = document.getElementById('commentVideoInput');
        if (v) v.style.display = v.style.display === 'none' ? 'flex' : 'none';
    });

    document.querySelector('.remove-video')?.addEventListener('click', () => {
        commentVideo = null;
        const v = document.getElementById('commentVideoInput');
        if (v) {
            v.style.display = 'none';
            const input = v.querySelector('input');
            if (input) input.value = '';
        }
    });

    document.querySelector('#commentVideoInput input')?.addEventListener('change', (e) => {
        commentVideo = e.target.value;
    });

    document.getElementById('submitComment')?.addEventListener('click', () => {
        if (!globalUser) {
            document.getElementById('loginModal').classList.add('active');
            return;
        }
        
        const text = document.getElementById('commentText')?.value.trim() || '';
        if (!text && commentImages.length === 0 && !commentVideo) {
            alert('Vui lòng nhập nội dung!');
            return;
        }

        const comment = {
            id: Date.now() + Math.random(),
            postId: currentPostId,
            author: globalUser.name,
            authorEmail: globalUser.email,
            text: text,
            images: [...commentImages],
            video: commentVideo,
            timestamp: new Date().toISOString(),
            likes: 0
        };

        saveComment(currentPostId, comment);
        renderComments(currentPostId);
        
        document.getElementById('commentText').value = '';
        if (count) count.textContent = '0';
        commentImages = [];
        commentVideo = null;
        updateImagePreview();
        
        const v = document.getElementById('commentVideoInput');
        if (v) v.style.display = 'none';
    });
}

function updateImagePreview() {
    const c = document.getElementById('commentImagePreview');
    if (!c) return;
    
    if (commentImages.length === 0) {
        c.style.display = 'none';
        c.innerHTML = '';
        return;
    }
    
    c.style.display = 'flex';
    c.innerHTML = commentImages.map((img, i) => `
        <div class="comment-preview-item">
            <img src="${img}">
            <button class="remove-preview" onclick="removeCommentImage(${i})">&times;</button>
        </div>
    `).join('');
}

window.removeCommentImage = (index) => {
    commentImages.splice(index, 1);
    updateImagePreview();
};

function renderComments(postId) {
    const comments = loadComments(postId);
    const container = document.getElementById('commentList');
    const count = document.getElementById('commentCount');
    if (count) count.textContent = comments.length;

    if (!container) return;
    
    const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
    const data = window.translations[lang] || window.translations.vn;
    
    comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    container.innerHTML = comments.map(c => {
        const isAdmin = c.authorEmail?.includes('admin') || 
                       c.author === 'Nguyễn Khắc Dương' || 
                       c.author === 'Nguyễn Đức Huy';
        
        // KIỂM TRA QUYỀN SỞ HỮU BÌNH LUẬN
        const isOwner = globalUser && (globalUser.name === c.author || globalUser.email === c.authorEmail);
        
        let media = '';
        if (c.images && c.images.length > 0) {
            media = `<div class="comment-media-new">${c.images.map(img => `<img src="${img}">`).join('')}</div>`;
        }
        if (c.video) {
            const vid = extractYouTubeId(c.video);
            if (vid) {
                media += `<div class="comment-video-new"><iframe width="100%" height="150" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe>`;
            }
        }
        
        return `
            <div class="comment-item-new" data-comment-id="${c.id}">
                <div class="comment-avatar-new">${c.author[0].toUpperCase()}</div>
                <div class="comment-content-new">
                    <div class="comment-header-new">
                        <span class="comment-author-new">${c.author}</span>
                        ${isAdmin ? '<span class="comment-badge">Quản trị viên</span>' : ''}
                        <span class="comment-time-new">${timeAgo(c.timestamp)}</span>
                        ${isOwner ? `
                            <div class="comment-actions-menu" style="margin-left: auto; display: flex; gap: 5px;">
                                <button class="edit-comment-btn" onclick="event.stopPropagation(); editComment('${c.id}')" style="background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 0.8rem;" title="Sửa bình luận">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-comment-btn" onclick="event.stopPropagation(); deleteComment('${c.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.8rem;" title="Xóa bình luận">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="comment-text-new">${c.text}</div>
                    ${media}
                    <div class="comment-actions-new">
                        <button class="comment-action-btn" onclick="likeComment('${c.id}')">
                            <i class="far fa-thumbs-up"></i> ${c.likes || 0}
                        </button>
                        <button class="comment-action-btn" onclick="replyComment('${c.id}')">
                            <i class="far fa-comment"></i> ${data.reply || 'Trả lời'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== EDIT/DELETE POST FUNCTIONS ==========
window.editPost = function(postId) {
    event.stopPropagation();
    
    if (!globalUser) {
        document.getElementById('loginModal').classList.add('active');
        return;
    }
    
    // Lấy tất cả bài viết
    const allPosts = getStorage('communityPosts', []);
    
    // Tìm bài viết cần sửa
    const postIndex = allPosts.findIndex(p => p.id == postId);
    if (postIndex === -1) return;
    
    const post = allPosts[postIndex];
    
    // Kiểm tra quyền sở hữu
    if (globalUser.name !== post.author && globalUser.email !== post.authorEmail) {
        alert('Bạn không có quyền sửa bài viết này!');
        return;
    }
    
    // Hỏi nội dung mới
    const newContent = prompt('Sửa nội dung bài viết:', post.description);
    if (newContent !== null && newContent.trim() !== '') {
        // Cập nhật
        allPosts[postIndex].description = newContent.trim();
        allPosts[postIndex].edited = true;
        allPosts[postIndex].editedAt = new Date().toISOString();
        
        // Lưu lại
        setStorage('communityPosts', allPosts);
        
        // Cập nhật giao diện
        if (currentProvince) {
            const activeFilter = document.querySelector('.filter-btn.active');
            renderPosts(currentProvince.id, activeFilter?.dataset.filter || 'all');
        }
        
        showToast('Đã sửa bài viết', 'success');
    }
};

window.deletePost = function(postId) {
    event.stopPropagation();
    
    if (!globalUser) {
        document.getElementById('loginModal').classList.add('active');
        return;
    }
    
    // Lấy tất cả bài viết
    const allPosts = getStorage('communityPosts', []);
    
    // Tìm bài viết cần xóa
    const post = allPosts.find(p => p.id == postId);
    if (!post) return;
    
    // Kiểm tra quyền sở hữu
    if (globalUser.name !== post.author && globalUser.email !== post.authorEmail) {
        alert('Bạn không có quyền xóa bài viết này!');
        return;
    }
    
    // Xác nhận
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    
    // Lọc bỏ bài viết cần xóa
    const filteredPosts = allPosts.filter(p => p.id != postId);
    setStorage('communityPosts', filteredPosts);
    
    // Xóa comments và likes liên quan
    const comments = getStorage('communityComments', {});
    delete comments[postId];
    setStorage('communityComments', comments);
    
    const likes = getStorage('communityLikes', {});
    delete likes[postId];
    setStorage('communityLikes', likes);
    
    // Cập nhật giao diện
    if (currentProvince) {
        const activeFilter = document.querySelector('.filter-btn.active');
        renderPosts(currentProvince.id, activeFilter?.dataset.filter || 'all');
    }
    
    showToast('Đã xóa bài viết', 'success');
};

// ========== EDIT/DELETE COMMENT FUNCTIONS ==========
window.editComment = function(commentId) {
    event.stopPropagation();
    
    if (!globalUser) {
        document.getElementById('loginModal').classList.add('active');
        return;
    }
    
    const comments = getStorage('communityComments', {});
    let foundComment = null;
    let foundPostId = null;
    
    // Tìm comment cần sửa
    for (const pid in comments) {
        const index = comments[pid].findIndex(c => c.id == commentId);
        if (index !== -1) {
            foundComment = comments[pid][index];
            foundPostId = pid;
            break;
        }
    }
    
    if (!foundComment) return;
    
    // Kiểm tra quyền sở hữu
    if (globalUser.name !== foundComment.author && globalUser.email !== foundComment.authorEmail) {
        alert('Bạn không có quyền sửa bình luận này!');
        return;
    }
    
    // Hỏi nội dung mới
    const newText = prompt('Sửa bình luận:', foundComment.text);
    if (newText !== null && newText.trim() !== '') {
        foundComment.text = newText.trim();
        foundComment.edited = true;
        foundComment.editedAt = new Date().toISOString();
        
        setStorage('communityComments', comments);
        
        if (currentPostId) {
            renderComments(currentPostId);
        }
        
        showToast('Đã sửa bình luận', 'success');
    }
};

window.deleteComment = function(commentId) {
    event.stopPropagation();
    
    if (!globalUser) {
        document.getElementById('loginModal').classList.add('active');
        return;
    }
    
    const comments = getStorage('communityComments', {});
    let foundPostId = null;
    
    // Tìm comment cần xóa
    for (const pid in comments) {
        const index = comments[pid].findIndex(c => c.id == commentId);
        if (index !== -1) {
            const comment = comments[pid][index];
            
            // Kiểm tra quyền sở hữu
            if (globalUser.name !== comment.author && globalUser.email !== comment.authorEmail) {
                alert('Bạn không có quyền xóa bình luận này!');
                return;
            }
            
            // Xóa comment
            comments[pid].splice(index, 1);
            foundPostId = pid;
            break;
        }
    }
    
    if (!foundPostId) return;
    
    // Xác nhận
    if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    
    setStorage('communityComments', comments);
    
    if (currentPostId) {
        renderComments(currentPostId);
    }
    
    showToast('Đã xóa bình luận', 'success');
};

// ========== POST FORM FUNCTIONS ==========
function initPostForm(provinceId) {
    const container = document.getElementById('postFormContainer');
    if (!container) return;

    let selectedImages = [];

    document.getElementById('addLinkBtn')?.addEventListener('click', () => {
        document.getElementById('linkInputContainer').style.display = 'block';
    });

    document.getElementById('libraryBtn')?.addEventListener('click', () => {
        document.getElementById('libraryUpload').click();
    });

    document.getElementById('libraryUpload')?.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                selectedImages.push(ev.target.result);
                updatePostPreview(selectedImages);
            };
            reader.readAsDataURL(file);
        });
    });

    window.removePostImage = (index) => {
        selectedImages.splice(index, 1);
        updatePostPreview(selectedImages);
    };

    document.getElementById('postContent')?.addEventListener('input', (e) => {
        document.getElementById('submitPostBtn').disabled = !e.target.value.trim();
    });

    document.getElementById('submitPostBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!globalUser) {
            document.getElementById('loginModal').classList.add('active');
            return;
        }

        const desc = document.getElementById('postContent')?.value.trim();
        const link = document.getElementById('postLink')?.value.trim();

        if (!desc) {
            alert('Vui lòng nhập nội dung!');
            return;
        }

        let images = [];
        let video = null;

        if (link) {
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
            if (youtubeRegex.test(link)) {
                video = link;
            } else {
                images = [link];
            }
        } else if (selectedImages.length > 0) {
            images = [...selectedImages];
        }

        const newPost = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            provinceId: provinceId,
            author: globalUser.name,
            authorEmail: globalUser.email,
            description: desc,
            images: images,
            video: video,
            timestamp: new Date().toISOString()
        };

        savePost(provinceId, newPost);

        document.getElementById('postContent').value = '';
        document.getElementById('postLink').value = '';
        document.getElementById('linkInputContainer').style.display = 'none';
        document.getElementById('libraryUpload').value = '';
        selectedImages = [];
        updatePostPreview([]);
        document.getElementById('submitPostBtn').disabled = true;

        renderPosts(provinceId);
    });
}

function updatePostPreview(images) {
    const c = document.getElementById('imagePreviewContainer');
    if (!c) return;
    
    if (images.length === 0) {
        c.style.display = 'none';
        c.innerHTML = '';
        return;
    }
    
    c.style.display = 'flex';
    c.innerHTML = images.map((img, i) => `
        <div class="preview-item">
            <img src="${img}">
            <button class="remove-btn" onclick="removePostImage(${i})">&times;</button>
        </div>
    `).join('');
}

// ========== USER SYSTEM FUNCTIONS ==========
function initUserSystem() {
    const saved = localStorage.getItem('currentSession');
    if (saved) {
        try { 
            setGlobalUser(JSON.parse(saved), false); 
        } catch (e) {
            console.log('Lỗi parse session:', e);
        }
    }

    const avatar = document.getElementById('globalUserAvatar');
    const dropdown = document.getElementById('globalDropdown');
    
    if (avatar) {
        avatar.onclick = (e) => {
            e.stopPropagation();
            if (globalUser) {
                if (dropdown) dropdown.classList.toggle('show');
            } else {
                document.getElementById('loginModal')?.classList.add('active');
            }
        };
    }

    const detailAvatar = document.getElementById('detailUserAvatar');
    const detailDropdown = document.getElementById('detailDropdown');
    
    if (detailAvatar) {
        detailAvatar.onclick = (e) => {
            e.stopPropagation();
            if (globalUser) {
                if (detailDropdown) detailDropdown.classList.toggle('show');
            } else {
                document.getElementById('loginModal')?.classList.add('active');
            }
        };
    }

    document.addEventListener('click', (e) => {
        if (dropdown && !document.getElementById('userMenuWrapper')?.contains(e.target)) {
            dropdown.classList.remove('show');
        }
        if (detailDropdown && !document.getElementById('detailUserWrapper')?.contains(e.target)) {
            detailDropdown.classList.remove('show');
        }
    });

    document.getElementById('globalShowLoginBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('loginModal')?.classList.add('active');
        if (dropdown) dropdown.classList.remove('show');
    });

    document.getElementById('globalShowRegisterBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('registerModal')?.classList.add('active');
        if (dropdown) dropdown.classList.remove('show');
    });

    document.getElementById('globalLogoutBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        clearGlobalUser();
        showToast('Đã đăng xuất', 'info');
        if (dropdown) dropdown.classList.remove('show');
    });

    document.getElementById('changeAvatarBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('avatarUploadInput')?.click();
        if (dropdown) dropdown.classList.remove('show');
    });

    document.getElementById('detailShowLoginBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('loginModal')?.classList.add('active');
        if (detailDropdown) detailDropdown.classList.remove('show');
    });

    document.getElementById('detailShowRegisterBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('registerModal')?.classList.add('active');
        if (detailDropdown) detailDropdown.classList.remove('show');
    });

    document.getElementById('detailLogoutBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        clearGlobalUser();
        showToast('Đã đăng xuất', 'info');
        if (detailDropdown) detailDropdown.classList.remove('show');
    });

    document.getElementById('detailChangeAvatarBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('avatarUploadInput')?.click();
        if (detailDropdown) detailDropdown.classList.remove('show');
    });

    document.getElementById('avatarUploadInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !globalUser) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            globalUser.avatar = ev.target.result;
            setGlobalUser(globalUser, true);
            showToast('Đã cập nhật ảnh đại diện', 'success');
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('submitLoginBtn')?.addEventListener('click', () => {
        const username = document.getElementById('loginUsername')?.value;
        if (!username) {
            alert('Vui lòng nhập email!');
            return;
        }

        const user = {
            name: username.split('@')[0],
            email: username,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username.split('@')[0])}&background=2c5f2d&color=fff&size=128`
        };

        setGlobalUser(user, true);
        document.getElementById('loginModal')?.classList.remove('active');
        showToast('Đăng nhập thành công!', 'success');
    });

    document.getElementById('submitRegisterBtn')?.addEventListener('click', () => {
        const name = document.getElementById('registerFullName')?.value;
        const email = document.getElementById('registerEmail')?.value;
        const pass = document.getElementById('registerPassword')?.value;

        if (!name || !email || !pass) {
            alert('Vui lòng điền đầy đủ!');
            return;
        }
        if (pass.length < 6) {
            alert('Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }

        const user = {
            name: name,
            email: email,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2c5f2d&color=fff&size=128`
        };

        setGlobalUser(user, true);
        document.getElementById('registerModal')?.classList.remove('active');
        showToast('Đăng ký thành công!', 'success');
    });

    document.getElementById('googleLoginBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.firebaseLogin === 'function') {
            window.firebaseLogin();
        } else {
            alert('Firebase chưa được tải!');
        }
    });

    document.getElementById('googleRegisterBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.firebaseLogin === 'function') {
            window.firebaseLogin();
        } else {
            alert('Firebase chưa được tải!');
        }
    });

    document.getElementById('switchToRegisterLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginModal')?.classList.remove('active');
        document.getElementById('registerModal')?.classList.add('active');
    });

    document.getElementById('switchToLoginLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerModal')?.classList.remove('active');
        document.getElementById('loginModal')?.classList.add('active');
    });

    document.getElementById('closeLoginModal')?.addEventListener('click', () => {
        document.getElementById('loginModal')?.classList.remove('active');
    });

    document.getElementById('closeRegisterModal')?.addEventListener('click', () => {
        document.getElementById('registerModal')?.classList.remove('active');
    });

    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('loginModal')) {
            document.getElementById('loginModal')?.classList.remove('active');
        }
        if (e.target === document.getElementById('registerModal')) {
            document.getElementById('registerModal')?.classList.remove('active');
        }
    });
}

function setGlobalUser(userData, save = true) {
    globalUser = userData;
    if (save) localStorage.setItem('currentSession', JSON.stringify(userData));
    updateUserUI(userData);

    const form = document.getElementById('postFormContainer');
    if (form) form.style.display = userData ? 'block' : 'none';
    
    if (currentProvince) {
        renderPosts(currentProvince.id);
    }
    
    const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
    const message = userData ? 
        (lang === 'en' ? 'Login successful!' : 'Đăng nhập thành công!') : 
        (lang === 'en' ? 'Logged out' : 'Đã đăng xuất');
    
    showToast(message, userData ? 'success' : 'info');
}

function clearGlobalUser() {
    globalUser = null;
    localStorage.removeItem('currentSession');
    updateUserUI(null);
    
    const form = document.getElementById('postFormContainer');
    if (form) form.style.display = 'none';
    
    if (currentProvince) {
        renderPosts(currentProvince.id);
    }
}

function updateUserUI(user) {
    const avatar = document.getElementById('globalUserAvatar');
    if (avatar) {
        if (user) {
            if (user.avatar) {
                avatar.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                avatar.textContent = user.name[0].toUpperCase();
                avatar.style.display = 'flex';
                avatar.style.alignItems = 'center';
                avatar.style.justifyContent = 'center';
            }
            avatar.classList.add('logged-in');
            
            const notLogged = document.getElementById('globalDropdownNotLogged');
            const logged = document.getElementById('globalDropdownLogged');
            if (notLogged) notLogged.style.display = 'none';
            if (logged) logged.style.display = 'block';
            
            const userName = document.getElementById('globalUserName');
            const userEmail = document.getElementById('globalUserEmail');
            if (userName) userName.textContent = user.name;
            if (userEmail) userEmail.textContent = user.email;
        } else {
            avatar.innerHTML = '<i class="far fa-user-circle"></i>';
            avatar.classList.remove('logged-in');
            
            const notLogged = document.getElementById('globalDropdownNotLogged');
            const logged = document.getElementById('globalDropdownLogged');
            if (notLogged) notLogged.style.display = 'block';
            if (logged) logged.style.display = 'none';
        }
    }

    const detailAvatar = document.getElementById('detailUserAvatar');
    if (detailAvatar) {
        if (user) {
            if (user.avatar) {
                detailAvatar.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                detailAvatar.textContent = user.name[0].toUpperCase();
                detailAvatar.style.display = 'flex';
                detailAvatar.style.alignItems = 'center';
                detailAvatar.style.justifyContent = 'center';
            }
            detailAvatar.classList.add('logged-in');
            
            const detailNotLogged = document.getElementById('detailDropdownNotLogged');
            const detailLogged = document.getElementById('detailDropdownLogged');
            if (detailNotLogged) detailNotLogged.style.display = 'none';
            if (detailLogged) detailLogged.style.display = 'block';
            
            const detailUserName = document.getElementById('detailUserName');
            const detailUserEmail = document.getElementById('detailUserEmail');
            if (detailUserName) detailUserName.textContent = user.name;
            if (detailUserEmail) detailUserEmail.textContent = user.email;
        } else {
            detailAvatar.innerHTML = '<i class="far fa-user-circle"></i>';
            detailAvatar.classList.remove('logged-in');
            
            const detailNotLogged = document.getElementById('detailDropdownNotLogged');
            const detailLogged = document.getElementById('detailDropdownLogged');
            if (detailNotLogged) detailNotLogged.style.display = 'block';
            if (detailLogged) detailLogged.style.display = 'none';
        }
    }
}

window.handleGoogleLogin = function(user) {
    const userData = {
        name: user.displayName,
        email: user.email,
        avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=2c5f2d&color=fff&size=128`
    };
    
    setGlobalUser(userData, true);
    
    document.getElementById('loginModal')?.classList.remove('active');
    document.getElementById('registerModal')?.classList.remove('active');
    
    const lang = localStorage.getItem('vietnamTravelLanguage') || 'vn';
    applyLanguage(lang);
};

// ========== HERO VIDEO ==========
function initHeroVideo() {
    const video = document.getElementById('heroVideo');
    const mute = document.getElementById('muteToggle');
    if (!video || !mute) return;

    const videos = [
	'videos/nen1.mp4' 
	// thêm video
	];
    let idx = 0;

    const play = (i) => {
        video.src = videos[i];
        video.load();
        video.play().catch(e => console.log('Autoplay error:', e));
    };

    video.addEventListener('ended', () => {
        idx = (idx + 1) % videos.length;
        play(idx);
    });

    play(0);

    mute.onclick = () => {
        video.muted = !video.muted;
        const icon = mute.querySelector('i');
        if (icon) icon.className = video.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    };
}

// ========== SIMPLE COMMENT FUNCTIONS ==========
function initSimpleComment() {
    const commentForm = document.querySelector('.simple-comment-form');
    if (!commentForm) return;
    
    console.log('Khởi tạo khung bình luận');
    
    const input = commentForm.querySelector('.simple-comment-input');
    const submitBtn = commentForm.querySelector('.simple-comment-submit');
    const mediaBtn = document.getElementById('commentMediaBtn');
    const mediaDropdown = document.getElementById('commentMediaDropdown');
    const chooseImageBtn = document.getElementById('chooseImageBtn');
    const chooseVideoBtn = document.getElementById('chooseVideoBtn');
    const previewsContainer = document.getElementById('commentPreviews');
    const videoPreview = document.getElementById('commentVideoPreview');
    
    let imageCount = 0;
    let videoUrl = null;
    
    window.commentState = {
        imageCount: 0,
        videoUrl: null,
        previewsContainer: previewsContainer,
        videoPreview: videoPreview,
        input: input,
        submitBtn: submitBtn
    };
    
    if (mediaBtn && mediaDropdown) {
        mediaBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('Click nút +');
            mediaDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', function(e) {
            if (!mediaBtn.contains(e.target) && !mediaDropdown.contains(e.target)) {
                mediaDropdown.classList.remove('show');
            }
        });
    }
    
    if (chooseImageBtn) {
        chooseImageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Click chọn ảnh');
            
            if (mediaDropdown) mediaDropdown.classList.remove('show');
            
            if (!globalUser) {
                document.getElementById('loginModal').classList.add('active');
                return;
            }
            
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.multiple = true;
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            fileInput.addEventListener('change', function(event) {
                const files = Array.from(event.target.files);
                
                if (files.length === 0) {
                    document.body.removeChild(fileInput);
                    return;
                }
                
                if (window.commentState.imageCount + files.length > 5) {
                    alert(`Chỉ được thêm tối đa 5 ảnh! Bạn đã có ${window.commentState.imageCount} ảnh.`);
                    document.body.removeChild(fileInput);
                    return;
                }
                
                files.forEach((file, index) => {
                    const reader = new FileReader();
                    
                    reader.onload = function(ev) {
                        const preview = document.createElement('div');
                        preview.className = 'simple-comment-preview-item';
                        preview.innerHTML = `
                            <img src="${ev.target.result}" alt="preview">
                            <button class="remove-preview" onclick="removeCommentImage(this)">&times;</button>
                        `;
                        
                        if (previewsContainer) {
                            previewsContainer.appendChild(preview);
                            previewsContainer.style.display = 'flex';
                        }
                        
                        window.commentState.imageCount++;
                        imageCount = window.commentState.imageCount;
                        
                        if (submitBtn) {
                            submitBtn.disabled = false;
                        }
                    };
                    
                    reader.readAsDataURL(file);
                });
                
                document.body.removeChild(fileInput);
            });
            
            fileInput.click();
        });
    }
    
    if (chooseVideoBtn) {
        chooseVideoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Click chọn video');
            
            if (mediaDropdown) mediaDropdown.classList.remove('show');
            
            if (!globalUser) {
                document.getElementById('loginModal').classList.add('active');
                return;
            }
            
            if (window.commentState.videoUrl) {
                alert('Chỉ được thêm 1 video!');
                return;
            }
            
            const url = prompt('Nhập link YouTube:');
            if (!url) return;
            
            const match = url.match(/^.*(youtu.be\/|v\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
            const videoId = (match && match[2].length === 11) ? match[2] : null;
            
            if (!videoId) {
                alert('Link YouTube không hợp lệ!');
                return;
            }
            
            window.commentState.videoUrl = url;
            videoUrl = url;
            
            if (videoPreview) {
                videoPreview.innerHTML = `
                    <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
                    <button class="remove-video" onclick="removeCommentVideo()">&times;</button>
                `;
                videoPreview.style.display = 'block';
            }
            
            if (submitBtn) {
                submitBtn.disabled = false;
            }
        });
    }
    
    if (input && submitBtn) {
        input.addEventListener('input', function() {
            submitBtn.disabled = this.value.trim().length === 0 && 
                               window.commentState.imageCount === 0 && 
                               !window.commentState.videoUrl;
        });
        
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (this.value.trim().length > 0 || 
                    window.commentState.imageCount > 0 || 
                    window.commentState.videoUrl) {
                    submitBtn.click();
                }
            }
        });
    }
    
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            if (!globalUser) {
                document.getElementById('loginModal').classList.add('active');
                return;
            }
            
            const content = input ? input.value.trim() : '';
            
            if (!content && window.commentState.imageCount === 0 && !window.commentState.videoUrl) {
                alert('Vui lòng nhập nội dung hoặc thêm ảnh/video!');
                return;
            }
            
            // Lưu bình luận vào localStorage
            const comment = {
                id: Date.now() + Math.random(),
                postId: currentPostId,
                author: globalUser.name,
                authorEmail: globalUser.email,
                text: content,
                images: [],
                video: null,
                timestamp: new Date().toISOString(),
                likes: 0
            };
            
            if (window.commentState.imageCount > 0) {
                // Xử lý ảnh (trong thực tế sẽ upload lên server)
                comment.images = ['https://via.placeholder.com/150'];
            }
            
            if (window.commentState.videoUrl) {
                comment.video = window.commentState.videoUrl;
            }
            
            if (currentProvince) {
                // Nếu là comment trực tiếp trên trang detail
                const postId = currentProvince.id;
                const allComments = getStorage('simpleComments', {});
                if (!allComments[postId]) allComments[postId] = [];
                allComments[postId].push(comment);
                setStorage('simpleComments', allComments);
            }
            
            showToast('Đã đăng bình luận!', 'success');
            
            if (input) input.value = '';
            
            if (previewsContainer) {
                previewsContainer.innerHTML = '';
                previewsContainer.style.display = 'none';
            }
            
            if (videoPreview) {
                videoPreview.innerHTML = '';
                videoPreview.style.display = 'none';
            }
            
            window.commentState.imageCount = 0;
            window.commentState.videoUrl = null;
            imageCount = 0;
            videoUrl = null;
            
            if (submitBtn) submitBtn.disabled = true;
        });
    }
}

window.removeCommentImage = function(btn) {
    const preview = btn.closest('.simple-comment-preview-item');
    if (preview) {
        preview.remove();
        
        if (window.commentState) {
            window.commentState.imageCount--;
        }
        
        const container = document.getElementById('commentPreviews');
        if (container && container.children.length === 0) {
            container.style.display = 'none';
        }
        
        const input = document.querySelector('.simple-comment-input');
        const submitBtn = document.querySelector('.simple-comment-submit');
        if (input && submitBtn && window.commentState) {
            submitBtn.disabled = input.value.trim().length === 0 && 
                               window.commentState.imageCount === 0 && 
                               !window.commentState.videoUrl;
        }
    }
};

window.removeCommentVideo = function() {
    const videoPreview = document.getElementById('commentVideoPreview');
    if (videoPreview) {
        videoPreview.innerHTML = '';
        videoPreview.style.display = 'none';
        
        if (window.commentState) {
            window.commentState.videoUrl = null;
        }
        
        const input = document.querySelector('.simple-comment-input');
        const submitBtn = document.querySelector('.simple-comment-submit');
        if (input && submitBtn && window.commentState) {
            submitBtn.disabled = input.value.trim().length === 0 && 
                               window.commentState.imageCount === 0;
        }
    }
};

// ========== LIKE/REPLY COMMENT FUNCTIONS ==========
window.likeComment = (id) => {
    if (!globalUser) {
        document.getElementById('loginModal').classList.add('active');
        return;
    }
    showToast('Đã thích bình luận', 'success');
};

window.replyComment = (id) => {
    if (!globalUser) {
        document.getElementById('loginModal').classList.add('active');
        return;
    }
    document.getElementById('commentText')?.focus();
};

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM ready");

    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        const saved = localStorage.getItem('vietnamTravelLanguage') || 'vn';
        langSelect.value = saved;
        applyLanguage(saved);
        
        langSelect.onchange = (e) => {
            const newLang = e.target.value;
            applyLanguage(newLang);
            
            if (currentProvince) {
                renderProvinceDetail(currentProvince);
                const activeTab = document.querySelector('.menu-item.active');
                if (activeTab) loadTab(activeTab.dataset.type);
                
                const activeFilter = document.querySelector('.filter-btn.active');
                if (activeFilter) renderPosts(currentProvince.id, activeFilter.dataset.filter);
            }
            if (document.getElementById('destinationsGrid')) {
                renderHome();
            }
        };
    }

    setupSearch();
    initUserSystem();
    initHeroVideo();
    initSimpleComment();

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id && document.getElementById('headerProvince')) {
        currentProvince = (window.provincesData || []).find(p => p.id == id);
        if (currentProvince) {
            renderProvinceDetail(currentProvince);
            
            document.querySelectorAll('.menu-item').forEach(btn => 
                btn.addEventListener('click', () => loadTab(btn.dataset.type)));
            
            loadTab('food');

            document.getElementById('goNext')?.addEventListener('click', () => moveSlider(1));
            document.getElementById('goPrev')?.addEventListener('click', () => moveSlider(-1));
            document.getElementById('closeInfo')?.addEventListener('click', closeDetailPopup);

            initPostForm(id);

            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderPosts(id, btn.dataset.filter);
                });
            });

            renderPosts(id);
        }
    }

    if (document.getElementById('destinationsGrid')) {
        filteredProvinces = [...(window.provincesData || [])];
        renderHome();

        document.querySelectorAll('.nav-link.region-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                filterByRegion(link.dataset.region);
            });
        });

        document.querySelectorAll('.footer-region-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const region = link.dataset.region;
                if (region) {
                    filterByRegion(region);
                }
            });
        });

        const footerHomeLink = document.querySelector('.footer-home-link');
        if (footerHomeLink) {
            footerHomeLink.addEventListener('click', (e) => {
                e.preventDefault();
                filterByRegion('all');
            });
        }

        const region = urlParams.get('region');
        if (region && ['north', 'central', 'south'].includes(region)) {
            setTimeout(() => {
                filterByRegion(region);
            }, 300);
        }
    }

    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileBtn && navLinks) {
        mobileBtn.onclick = (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
        };
        
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !mobileBtn.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
    }

    const backTop = document.getElementById('backToTop');
    if (backTop) {
        window.onscroll = () => {
            backTop.classList.toggle('show', window.scrollY > 300);
        };
        backTop.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }
});

// ========== EXPORTS ==========
window.moveSlider = moveSlider;
window.openDetailPopup = openDetailPopup;
window.closeDetailPopup = closeDetailPopup;
window.changePage = changePage;
window.filterByRegion = filterByRegion;
window.loadTab = loadTab;
window.scrollToDestinations = scrollToDestinations;

console.log("✅ Main logic ready");