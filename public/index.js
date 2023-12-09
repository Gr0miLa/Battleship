document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("fire").style.display = 'none';
    createLeftTable('left-table', true);
    createRightTable('right-table', false);
});

const socket = io();

var greenCellsCount = 0;
var redCellsCount = 0;
var shipsFound = 0;
var fields = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К'];
var matrix = new Array(121).fill(false);

var indexCell = -1;

// Начало игры
function startGame(playername) {
    var table = document.getElementById('left-table');
    var cells = table.getElementsByTagName('td');
    for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        var hasShip = cell.getAttribute('data-has-ship') === 'true'
        if (hasShip) {
            matrix[i] = hasShip;
        }
    }
    for (var i = 0; i < cells.length; i++) {
        console.log(matrix[i]);
    }
    socket.emit('startGame', { playername, matrix });
    console.log("startGame");
    var leftTable = document.getElementById('left-table');
    var leftCells = leftTable.getElementsByTagName('td');
    for (var i = 0; i < leftCells.length; i++) {
        leftCells[i].onclick = null;
    }
    document.getElementById("startGame").style.display = 'none';
    document.getElementById("fire").style.display = 'flex';
    if (playername == "player1") {
        game();
    }
}

// Создание поля соперника
function createRightTable(tableId, isEditable) {
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
function createLeftTable(tableId, isEditable) {
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
            } else if (i != 0 && j != 0) {
                cell.setAttribute('data-has-ship', 'false'); // Начальное значение: нет корабля

                if (isEditable) {
                    cell.onclick = function () {
                        var hasShip = this.getAttribute('data-has-ship') === 'true';

                        if (hasShip) {
                            this.style.backgroundColor = '';
                            this.setAttribute('data-has-ship', 'false');
                            greenCellsCount--;
                        } else if (greenCellsCount < 20) {
                            console.log("testgreen");
                            this.style.backgroundColor = 'green';
                            this.setAttribute('data-has-ship', 'true');
                            greenCellsCount++;
                        }
                    };
                }
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
}

// Выбор клетки для выстрела
function game() {
    var choice = false;
    var rightTable = document.getElementById('right-table');
    var rightCells = rightTable.getElementsByTagName('td');
    for (var index = 0; index < rightCells.length; index++) {
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
    var rightTable = document.getElementById('right-table');
    var rightCells = rightTable.getElementsByTagName('td');
    for (var index1 = 0; index1 < rightCells.length; index1++) {
        let cell = rightCells[index1];
        if (cell.getAttribute('fire') === 'true') {
            indexCell = index1;
            cell.setAttribute('fire', 'false');
            console.log("Итог:", index1);
        }
    }
    console.log("Игрок:", playername, "Выстрел:", indexCell);
    socket.emit('checkShot', { playername, indexCell });
}

// Получение ответа от сервера о выстреле (поле соперника)
socket.on('shot', (result) => {
    var rightTable = document.getElementById('right-table');
    var rightCells = rightTable.getElementsByTagName('td');
    var index = result.indexCell;

    console.log("Результат: ", result.hit, "Выстрел: ", index);
    if (result.hit) {
        rightCells[index].style.backgroundColor = 'red';
        game();
    } else {
        rightCells[index].style.backgroundColor = 'gray';
        blockedTable();
    }
    indexCell = -1;
});

// Получение ответа от сервера (своё поле)
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
    indexCell = -1;
});

// Блокирование поля
function blockedTable() {
    var rightTable = document.getElementById('right-table');
    var rightCells = rightTable.getElementsByTagName('td');
    for (var i = 0; i < rightCells.length; i++) {
        rightCells[i].onclick = null;
    }
}