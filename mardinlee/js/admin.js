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

// Send Heartbeat - Kullanıcının online olduğunu bildirir
async function sendHeartbeat() {
    try {
        const userId = localStorage.getItem('userId') || 'anonymous-' + Date.now();
        if (!localStorage.getItem('userId')) {
            localStorage.setItem('userId', userId);
        }
        
        await fetch('/api/online-users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                userAgent: navigator.userAgent
            })
        });
    } catch (error) {
        console.error('Heartbeat gönderilirken hata:', error);
    }
}

// Update Online Users
async function updateOnlineUsers() {
    try {
        const response = await fetch('/api/online-users');
        const data = await response.json();
        if (data.count !== undefined) {
            document.getElementById('onlineUsers').textContent = data.count;
        }
    } catch (error) {
        console.error('Çevrimiçi kullanıcı sayısı yüklenirken hata:', error);
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPurchases();
    loadStats();
    loadActivities();
    updateOnlineUsers();
    
    // İlk heartbeat gönder
    sendHeartbeat();
    
    // Her 30 saniyede bir heartbeat gönder (online kal)
    setInterval(() => {
        sendHeartbeat();
    }, 30000);
    
    // Her 30 saniyede bir stats güncelle
    setInterval(() => {
        loadStats();
        updateOnlineUsers();
        loadActivities();
    }, 30000);
    
    // Sayfa kapatılırken son heartbeat
    window.addEventListener('beforeunload', () => {
        sendHeartbeat();
    });
    
    // Sayfa görünür olduğunda heartbeat gönder
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            sendHeartbeat();
            updateOnlineUsers();
        }
    });
    
    // Mouse hareketi, klavye tuşları, scroll ile de heartbeat gönder (aktif kullanıcı)
    let activityTimer;
    const resetActivityTimer = () => {
        clearTimeout(activityTimer);
        activityTimer = setTimeout(() => {
            sendHeartbeat();
        }, 10000); // 10 saniye hareketsizlikten sonra heartbeat
    };
    
    window.addEventListener('mousemove', resetActivityTimer);
    window.addEventListener('keypress', resetActivityTimer);
    window.addEventListener('scroll', resetActivityTimer);
    window.addEventListener('click', resetActivityTimer);
});

