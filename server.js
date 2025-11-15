// Socket.io Server for Vercel
// Not: Vercel serverless functions ile socket.io tam desteklenmez
// Bu dosya ayrı bir server olarak çalıştırılmalı veya
// Vercel'de Socket.io için özel bir çözüm kullanılmalı

const { Server } = require('socket.io');
const http = require('http');

// Bu server ayrı bir process olarak çalışmalı
// Vercel'de serverless functions kullanıyorsanız, 
// Socket.io için alternatif çözümler düşünülmeli

const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const onlineUsers = new Set();

io.on('connection', (socket) => {
    console.log('Kullanıcı bağlandı:', socket.id);
    onlineUsers.add(socket.id);
    
    // Online kullanıcı sayısını güncelle
    io.emit('onlineUsersUpdate', onlineUsers.size);
    
    // Kullanıcı aktivitesi
    socket.on('userActivity', (data) => {
        io.emit('userActivity', {
            message: data.message || 'Kullanıcı aktivitesi',
            userId: socket.id
        });
    });
    
    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
        onlineUsers.delete(socket.id);
        io.emit('onlineUsersUpdate', onlineUsers.size);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Socket.io server running on port ${PORT}`);
});

// Vercel için: Bu dosya ayrı bir server olarak deploy edilmeli
// Alternatif: Serverless functions ile polling kullanılabilir

