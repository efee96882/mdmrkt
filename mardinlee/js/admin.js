// Socket.io connection
// Not: Vercel'de socket.io için ayrı bir server gerekebilir
// Şimdilik polling ile çalışacak şekilde ayarlandı
let socket = null;

try {
    // Socket.io server URL'i - Vercel'de ayrı bir server gerekebilir
    // Şimdilik mevcut origin'i kullan, veya SOCKET_URL environment variable'ı set edilebilir
    const socketUrl = window.SOCKET_URL || window.location.origin;
    socket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });
} catch (error) {
    console.warn('Socket.io bağlantısı kurulamadı:', error);
    // Socket.io olmadan da çalışabilir (polling ile)
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.getAttribute('data-section');
        
        // Update active nav
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Update active section
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(section).classList.add('active');
    });
});

// Socket.io Events
if (socket) {
    socket.on('connect', () => {
        console.log('Socket.io bağlandı');
        updateOnlineUsers();
    });

    socket.on('disconnect', () => {
        console.log('Socket.io bağlantısı kesildi');
    });

    socket.on('userActivity', (data) => {
        addActivityLog(data);
    });

    socket.on('onlineUsersUpdate', (count) => {
        document.getElementById('onlineUsers').textContent = count;
    });

    socket.on('cartUpdate', (count) => {
        document.getElementById('totalCarts').textContent = count;
    });
} else {
    // Socket.io yoksa polling ile güncelleme yap
    console.log('Socket.io kullanılamıyor, polling modunda çalışılıyor');
}

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

// Load Purchases
async function loadPurchases() {
    const tbody = document.getElementById('purchasesTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Yükleniyor...</td></tr>';
    
    try {
        const response = await fetch('/api/purchases');
        const data = await response.json();
        
        if (data.error) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${data.error}</td></tr>`;
            return;
        }
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Henüz satın alma kaydı yok</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.map(purchase => `
            <tr>
                <td>${purchase.firstName || '-'}</td>
                <td>${purchase.lastName || '-'}</td>
                <td>${purchase.iban || '-'}</td>
                <td>${new Date(purchase.createdAt).toLocaleString('tr-TR')}</td>
                <td>
                    <button class="btn-view" onclick="viewPurchase('${purchase._id}')">Detay</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Satın almalar yüklenirken hata:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Veriler yüklenirken bir hata oluştu</td></tr>';
    }
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

// Initialize - Sayfa yüklendiğinde çalışır
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin panel yüklendi');
    
    loadPurchases();
    loadStats();
    loadActivities();
    updateOnlineUsers();
    
    // Her 30 saniyede bir stats güncelle
    const statsInterval = setInterval(() => {
        loadStats();
        loadActivities();
    }, 30000); // 30 saniye
    
    // Cleanup (sayfa kapatılırken interval'ları temizle)
    window.addEventListener('unload', () => {
        clearInterval(statsInterval);
    });
});

