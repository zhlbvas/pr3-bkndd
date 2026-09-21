const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

function sendJSON(res, status, data) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(data));
}

function readItems(callback) {
    fs.readFile(DATA_FILE, "utf8", function (err, text) {

        if (err) {
            callback(err, null);
            return;
        }

        try {
            const data = JSON.parse(text);
            callback(null, data);
        } catch (error) {
            callback(error, null);
        }

    });
}

function writeItems(items, callback) {
    const text = JSON.stringify(items, null, 2);
    fs.writeFile(DATA_FILE, text, "utf8", callback);
}

function readBody(req, callback) {
    let body = "";

    req.on("data", function (chunk) {
        body += chunk;
    });

    req.on("end", function () {

        try {
            const data = JSON.parse(body);
            callback(null, data);
        } catch (error) {
            callback(error, null);
        }

    });
}

const server = http.createServer(function (req, res) {

    const url = new URL(req.url, "http://localhost:" + PORT);

    // Главная страница
    if (url.pathname === "/" && req.method === "GET") {

        fs.readFile(
            path.join(__dirname, "index.html"),
            "utf8",
            function (err, data) {

                if (err) {
                    res.writeHead(500, {
                        "Content-Type": "text/plain; charset=utf-8"
                    });

                    res.end("Не удалось загрузить index.html");
                    return;
                }

                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8"
                });

                res.end(data);
            }
        );

        return;
    }

    // CSS
    if (url.pathname === "/style.css" && req.method === "GET") {

        fs.readFile(
            path.join(__dirname, "style.css"),
            function (err, data) {

                if (err) {
                    res.writeHead(404);
                    res.end("CSS not found");
                    return;
                }

                res.writeHead(200, {
                    "Content-Type": "text/css; charset=utf-8"
                });

                res.end(data);
            }
        );

        return;
    }

    // JavaScript
    if (url.pathname === "/app.js" && req.method === "GET") {

        fs.readFile(
            path.join(__dirname, "app.js"),
            function (err, data) {

                if (err) {
                    res.writeHead(404);
                    res.end("JS not found");
                    return;
                }

                res.writeHead(200, {
                    "Content-Type": "application/javascript; charset=utf-8"
                });

                res.end(data);
            }
        );

        return;
    }

    // Получить одно место
    if (url.pathname.startsWith("/items/") && req.method === "GET") {

        const id = Number(url.pathname.split("/")[2]);

        readItems(function (err, items) {

            if (err) {
                sendJSON(res, 500, {
                    error: "Не удалось прочитать данные"
                });
                return;
            }

            const item = items.find(function (item) {
                return item.id === id;
            });

            if (!item) {
                sendJSON(res, 404, {
                    error: "Место не найдено"
                });
                return;
            }

            sendJSON(res, 200, item);
        });

        return;
    }

    // Получить все места
    if (url.pathname === "/items" && req.method === "GET") {

        readItems(function (err, items) {

            if (err) {
                sendJSON(res, 500, {
                    error: "Не удалось прочитать данные"
                });
                return;
            }

            const category = url.searchParams.get("category");

            if (category) {
                items = items.filter(function (item) {
                    return item.category === category;
                });
            }

            sendJSON(res, 200, items);
        });

        return;
    }

    // POST /items
    if (url.pathname === "/items" && req.method === "POST") {

        readBody(req, function (err, newItem) {

            if (err || !newItem) {
                sendJSON(res, 400, {
                    error: "Неверный JSON"
                });
                return;
            }

            const problems = [];

            if (!newItem.title) {
                problems.push("Нужно поле title");
            }

            if (!newItem.category) {
                problems.push("Нужно поле category");
            }

            if (!newItem.price) {
                problems.push("Нужно поле price");
            }

            if (!newItem.description) {
                problems.push("Нужно поле description");
            }

            if (problems.length > 0) {
                sendJSON(res, 400, {
                    error: "Данные заполнены неверно",
                    problems: problems
                });

                return;
            }

            readItems(function (err2, items) {

                if (err2) {
                    sendJSON(res, 500, {
                        error: "Не удалось прочитать данные"
                    });
                    return;
                }

                let maxId = 0;

                for (const item of items) {
                    if (item.id > maxId) {
                        maxId = item.id;
                    }
                }

                newItem.id = maxId + 1;

                items.push(newItem);

                writeItems(items, function (err3) {

                    if (err3) {
                        sendJSON(res, 500, {
                            error: "Не удалось сохранить данные"
                        });
                        return;
                    }

                    sendJSON(res, 201, newItem);
                });
            });
        });

        return;
    }

    sendJSON(res, 404, {
        error: "Маршрут не найден"
    });
});

server.listen(PORT, function () {
    console.log(
        "Сервер запущен: http://localhost:" + PORT
    );
});
