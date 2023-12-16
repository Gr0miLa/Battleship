// Запуск страницы
// ecE9yV@gdenchek
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("fire").style.display = 'none';
    document.getElementById("wait").style.display = 'none';
    document.getElementById("end").style.display = 'none';
    createLeftTable('left-table');
    createRightTable('right-table');
});

const socket = io();

var greenCellsCount = 0;
var сellsCount = 20;
var shipsFound = 0;
var fields = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К'];
var matrix = new Array(121).fill(false);

// Начало игры
function startGame(playername) {
    let table = document.getElementById('left-table');
    let cells = table.getElementsByTagName('td');
    let countShips = 0;
    for (let i = 0; i < cells.length; i++) {
        let cell = cells[i];
        let hasShip = cell.getAttribute('data-has-ship') === 'true'
        if (hasShip) {
            matrix[i] = hasShip;
            countShips++;
        }
    }
    if (countShips === сellsCount) {
        document.getElementById("startGame").style.display = 'none';
        document.getElementById("fire").style.display = 'none';
        document.getElementById("wait").style.display = 'flex';

        socket.emit('startGame', { playername, matrix });

        let leftTable = document.getElementById('left-table');
        let leftCells = leftTable.getElementsByTagName('td');
        for (let i = 0; i < leftCells.length; i++) {
            leftCells[i].onclick = null;
        }
    } else {
        alert('Вы поставили не все корабли!');
    }
}

// Создание поля соперника
function createRightTable(tableId) {
    console.log("createTable");
    var table = document.getElementById(tableId);
    var tbody = table.getElementsByTagName('tbody')[0];

    for (var i = 0; i < 11; i++) {
        var row = document.createElement('tr');
        for (var j = 0; j < 11; j++) {
            var cell = document.createElement('td');
            if (i === 0 && j != 0) {
                cell.textContent = fields[j - 1];
            } else if (j === 0 && i != 0) {
                cell.textContent = i.toString();
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
}

// Создание своего поля
function createLeftTable(tableId) {
    console.log("createTable");
    let table = document.getElementById(tableId);
    let tbody = table.getElementsByTagName('tbody')[0];

    for (let i = 0; i < 11; i++) {
        let row = document.createElement('tr');

        for (let j = 0; j < 11; j++) {
            let cell = document.createElement('td');

            if (i === 0 && j != 0) {
                cell.textContent = fields[j - 1];
            } else if (j === 0 && i != 0) {
                cell.textContent = i.toString();
            } else if (i != 0 && j != 0) {
                cell.setAttribute('data-has-ship', 'false'); // Начальное значение: нет корабля
                cell.onclick = function () {
                    let hasShip = this.getAttribute('data-has-ship') === 'true';

                    if (hasShip) {
                        this.style.backgroundColor = '';
                        this.setAttribute('data-has-ship', 'false');
                        greenCellsCount--;
                    } else if (greenCellsCount < сellsCount) {
                        console.log("testgreen");
                        this.style.backgroundColor = 'green';
                        this.setAttribute('data-has-ship', 'true');
                        greenCellsCount++;
                    }
                };
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
}

// Игра | Выбор клетки для выстрела
function game() {
    let choice = false;
    let rightTable = document.getElementById('right-table');
    let rightCells = rightTable.getElementsByTagName('td');
    for (let index = 0; index < rightCells.length; index++) {
        if ((index % 11 != 0) && (index > 11)) {
            let cell = rightCells[index];
            cell.onclick = function () {
                if ((this.style.backgroundColor === '') && (!choice)) {
                    this.setAttribute('fire', 'true');
                    this.style.backgroundColor = 'yellow';
                    console.log("Выбор клетки");
                    choice = true;
                } else if ((this.style.backgroundColor === 'yellow') && (choice)) {
                    this.setAttribute('fire', 'false');
                    this.style.backgroundColor = '';
                    console.log("Отмена выбора клетки");
                    choice = false;
                }
            };
        }
    }
}

// Нажатие кнопки выстрела | Отправка результатов на сервер
function fire(playername) {
    let rightTable = document.getElementById('right-table');
    let rightCells = rightTable.getElementsByTagName('td');
    let flag = false;
    for (let index1 = 0; index1 < rightCells.length; index1++) {
        let cell = rightCells[index1];
        if (cell.getAttribute('fire') === 'true') {
            flag = true;
            break;
        }
    }
    if (flag) {
        for (let index2 = 0; index2 < rightCells.length; index2++) {
            let cell = rightCells[index2];
            if (cell.getAttribute('fire') === 'true') {
                cell.setAttribute('fire', 'false');
                console.log("Игрок:", playername, "Выстрел:", index2);
                let indexCell = parseInt(index2);
                socket.emit('checkShot', { playername, indexCell });
                break;
            }
        }
    } else {
        alert('Вы не выбрали клетку!');
    }
}

// Получение ответа от сервера о выстреле (поле соперника)
socket.on('shot', (result) => {
    var rightTable = document.getElementById('right-table');
    var rightCells = rightTable.getElementsByTagName('td');
    var index = result.indexCell;
    console.log(result);
    console.log("Результат: ", result.hit, "Выстрел: ", result.indexCell);
    if (result.hit) {
        rightCells[index].style.backgroundColor = 'red';
        game();
    } else {
        rightCells[index].style.backgroundColor = 'gray';
        document.getElementById("fire").style.display = 'none';
        document.getElementById("wait").style.display = 'flex';
        blockedTable();
    }
});

// Получение ответа от сервера о выстреле (своё поле)
socket.on('hit', (result) => {
    var leftTable = document.getElementById('left-table');
    var leftCells = leftTable.getElementsByTagName('td');
    var index = result.indexCell;
    console.log("Результат: ", result.hit, "Выстрел: ", index);

    if (result.hit) {
        leftCells[index].style.backgroundColor = 'red';
        blockedTable();
    } else {
        leftCells[index].style.backgroundColor = 'gray';
        game();
    }
});

// Получение ответа от сервера для отображения кнопки выстрела
socket.on('display', () => {
    document.getElementById("wait").style.display = 'none';
    document.getElementById("fire").style.display = 'flex';
});

// Получение ответа от сервера для первого игрока для начала игры
socket.on('gameStart', () => {
    document.getElementById("wait").style.display = 'none';
    document.getElementById("fire").style.display = 'flex';
    game();
});

// Получение ответа от сервера об окончании игры
socket.on('endGame', (result) => {
    blockedTable();

    document.getElementById("wait").style.display = 'none';
    document.getElementById("fire").style.display = 'none';
    document.getElementById("end").style.display = 'flex';
    document.getElementById("fire").style.display = 'none';

    console.log("Игра окончена. Победил -", result.winner);
    console.log("Количество ходов -", result.countMoves);
    console.log("Количество выстрелов -", result.countShots);
    console.log("Длительность партии: -", result.duration, "секунд");
});

// Блокирование поля
function blockedTable() {
    let rightTable = document.getElementById('right-table');
    let rightCells = rightTable.getElementsByTagName('td');
    for (let i = 0; i < rightCells.length; i++) {
        rightCells[i].onclick = null;
    }
}