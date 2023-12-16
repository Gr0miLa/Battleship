const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const port = 3000;
const clients = {};
const сellsCount = 20;
const currentDate = new Date();

var countPlayers = 0;
var countMoves = 1;
var countShots = 0;
var gameStarted = false;
var startTime;
var endTime;

app.set('view engine', 'ejs');
app.use(express.static('public'));

// Форматирование даты в виде ДД.ММ.ГГГГ
const formattedDate = currentDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
});

// Форматирование времени в формате ЧЧ:ММ:СС
const formattedTime = currentDate.toLocaleTimeString('ru-RU', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
});

// Таблица в базе данных
const db = new sqlite3.Database('./database.db');
db.run(`
    CREATE TABLE IF NOT EXISTS games (
        date TEXT,
        time TEXT,
        duration TEXT,
        result TEXT
)`);

// Подключение к начальной странице
app.get('/', (req, res) => {
    res.render('index', { gameStarted });
});

// Переход на страницу с игрой | Определение игроков
app.get('/:player', (req, res) => {
    if (countPlayers <= 2) {
        let playername = req.params.player;
        if (!(gameStarted)) {
            console.log('Игрок 1 присоединился');
            clients[0] = {
                username: playername,   // Имя игрока
                ready: false,           // Готовность игрока к игре
                tableData: [],          // Таблица кораблей игрока
                countShips: 0,          // Количество оставшихся кораблей
            };
            // console.log('client:', clients[0]);  
            countPlayers++;
        } else {
            console.log('Игрок 2 присоединился');
            clients[1] = {
                username: playername,   // Аналогично
                ready: false,
                tableData: [],
                countShips: 0,
            };
            // console.log('client:', clients[1]);
            countPlayers++;
        }
        
        gameStarted = true;
        res.render('game', { playername });
    }
});

// Подключение игроков
io.on('connection', (socket) => {
    // Старт игры | Получение таблицы данных на сервере
    socket.on('startGame', ({ playername, matrix }) => {
        // console.log("Игрок: ", playername, "Матрица: ", matrix);
        for (let key in clients) {
            if (clients[key].username === playername) {
                clients[key].tableData = matrix;
                clients[key].countShips = сellsCount;
                clients[key].ready = true;
            }
        }

        if ((clients[0].ready) && (clients[1].ready)) {
            startTime = new Date().getTime();
            if (playername == "player1") {
                socket.emit('gameStart');
            } else if (playername == "player2") {
                socket.broadcast.emit('gameStart');
            }
        }
    });

    // Проверка выстрела | Получение данных о выстреле на сервере
    socket.on('checkShot', ({ playername, indexCell }) => {
        countShots++;
        let hit = false;
        if (playername == "player1") {
            let lengthOfTableData = clients[1].tableData.length;

            for (let i = 0; i < lengthOfTableData; i++) {
                if (indexCell == i) {
                    if (clients[1].tableData[i] === true) {
                        clients[1].tableData[i] = false;
                        hit = true;
                    }
                    break;
                }
            }
            console.log("Игрок:", playername, "Выстрел:", indexCell, "Результат:", hit);
            if (hit) {
                console.log("Попадание игрока 1");
                clients[1].countShips -= 1;
                checkCountShips();
            } else {
                console.log("Промах игрока 1");
                socket.broadcast.emit('display');
            }
        } else if (playername == "player2") {
            let lengthOfTableData = clients[0].tableData.length;

            for (let i = 0; i < lengthOfTableData; i++) {
                if (indexCell == i) {
                    if (clients[0].tableData[i] === true) {
                        clients[0].tableData[i] = false;
                        hit = true;
                    }
                    break;
                }
            }
            console.log("Игрок:", playername, "Выстрел:", indexCell, "Результат:", hit);
            if (hit) {
                console.log("Попадание игрока 2");
                clients[0].countShips -= 1;
                checkCountShips();
            } else {
                console.log("Промах игрока 2");
                socket.broadcast.emit('display');
                
                countMoves++;
            }
        }
        socket.emit('shot', {indexCell, hit});
        socket.broadcast.emit('hit', {indexCell, hit});
    });
});

// Проверка на количество оставшихся кораблей
function checkCountShips() {
    for (let key in clients) {
        if (clients[key].countShips === 0) {
            let num = (parseInt(key) + 1) % 2;
            let winner = clients[num].username;
            endTime = new Date().getTime();
            gameStarted = false;
            let duration = (endTime - startTime) / (1000);

            console.log("Игра окончена. Победил -", winner);
            console.log("Количество ходов -", countMoves);
            console.log("Количество выстрелов -", countShots);
            console.log("Длительность партии -", duration, "секунд");

            io.emit('endGame', ({winner, countMoves, countShots, duration}));

            db.run(`INSERT INTO games (date, time, duration, result) VALUES (?, ?, ?, ?)`, [formattedDate, formattedTime, duration, winner], function(err) {
                if (err) {
                    console.error(err.message);
                } else {
                    console.log(`Данные добавлены в базу данных в строку ${this.lastID}`);
                }
            });
        }
    }
}

// Запуск сервера
server.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});