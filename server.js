const express = require('express');
const session = require('express-session');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const port = 3000;

const clients = {};

var countPlayers = 0;
var countMoves = 0;

app.use(session({
    secret: 'secret-key',
    resave: true,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

//
app.get('/', (req, res) => {
    const gameStarted = req.session.gameStarted || false;
    res.render('index', { gameStarted });
});

app.get('/:player', (req, res) => {
    if (countPlayers <= 2) {
        let playername = req.params.player;
        if (!(req.session.gameStarted)) {
            console.log('Игрок 1 присоединился');
            clients[0] = {
                username: playername,
                ready: true,
                tableData: [],
            };
            console.log('client:', clients[0]);
            countPlayers++;
        } else {
            console.log('Игрок 2 присоединился');
            clients[1] = {
                username: playername,
                ready: false,
                tableData: [],
            };
            console.log('client:', clients[1]);
            countPlayers++;
        }
    
        req.session.gameStarted = true;
        res.render('game', { playername });
    }
});

// ---------------- Начало игры -------------------

// ---------------- Загрузка данных на сервер -------------------

io.on('connection', (socket) => {
    console.log(socket.id);
    console.log('User connected ', (countPlayers + 1));
    if (countPlayers === 0) {
        countPlayers++;
    }

    socket.on('startGame', ({ playername, matrix }) => {
        console.log("Игрок: ", playername, "Матрица: ", matrix);
        for (let key in clients) {
            if (clients[key].username === playername) {
                clients[key].tableData = matrix;
                break;
            }
        }
    });

    socket.on('checkShot', ({ playername, indexCell }) => {
        console.log("Игрок:", playername, "Выстрел:", indexCell);
        if ((playername == "player1") && (clients[0].ready)) {
            countMoves++;
            var lengthOfTableData = clients[1].tableData.length;
            var hit = false;

            for (let i = 0; i < lengthOfTableData; i++) {
                if (indexCell == i) {
                    if (clients[1].tableData[i] === true) {
                        hit = true;
                    }
                    break;
                }
            }
            if (hit) {
                console.log("Попадание игрока 1");
                socket.emit('shot', {indexCell, hit});
                socket.broadcast.emit('hit', {indexCell, hit});
            } else {
                console.log("Промах игрока 1");
                socket.emit('shot', {indexCell, hit});
                socket.broadcast.emit('hit', {indexCell, hit});
                clients[0].ready = false;
                clients[1].ready = true;
            }
        } else if ((playername == "player2") && (clients[1].ready)) {
            var lengthOfTableData = clients[0].tableData.length;
            var hit = false;

            for (let i = 0; i < lengthOfTableData; i++) {
                if (indexCell == i) {
                    if (clients[0].tableData[i] === true) {
                        hit = true;
                    }
                    break;
                }
            }
            if (hit) {
                console.log("Попадание игрока 2");
                socket.emit('shot', {indexCell, hit});
                socket.broadcast.emit('hit', {indexCell, hit});
            } else {
                console.log("Промах игрока 2");
                socket.emit('shot', {indexCell, hit});
                socket.broadcast.emit('hit', {indexCell, hit});
                clients[1].ready = false;
                clients[0].ready = true;
            }
        }
    });
});

server.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});