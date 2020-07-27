const express = require('express');  //фреймворк
const bodyParser = require('body-parser'); //для передачи параметров из POST запросов
const session = require('express-session'); //для работы с сессиями
const redisStorage = require('connect-redis')(session); //для запруска сервера Radis для хранения данных сессии
const redis = require('redis'); //клиент для соединения с сервером Radis
const nunjucks = require('nunjucks') ; //шаблонизатор
const settings = require('./settings'); //настройки сайта
const ChatClass = require('./chat'); //библиотека для работы с чатом

const mysql = require('mysql2'); //Настроим соединение с БД
const db_pool = mysql.createPool({
    host: 'localhost',
    user: 'chat',
    password: 'chat',
    database: 'chat'
});
const app = express(); 
const port = 3000; //определили порт для соединения с приложением
const host = 'localhost'; 
const client = redis.createClient() //запустим клиент Radis
const urlencodedParser = bodyParser.urlencoded({ extended: true }); // парсер для данных формы application/x-www-form-urlencoded
app.use(express.static(settings.dirs.STATIC)) //Отдадим статические файлы в директории settings.dirs.STATIC
app.use(bodyParser.json()); //для формирования ответов в формате JSON
app.use(urlencodedParser); //Чтобы получить доступ к параметрам POST запроса
app.use(session({ //Инициализируем механизм сессий
    storage: new redisStorage({
        ttl: 360000000, //время жизни сесссии в милисекундах
        host: host,
        port: 6379,
        client: client}),
    secret: 'skoi89ujSAd3#k34',
    saveUninitialized: true})
);
nunjucks.configure(settings.dirs.TEMPLATES, { //настраиваем шаблонизатор
    autoescape: true,
    express: app
 });

//Индексная страница чата
app.get('/', (request, response) => { //
    chat = new ChatClass(request.sessionID);
    response.render('index.html', {sess_id: request.sessionID});
});

//обновить nickname
app.post('/new_nickname', urlencodedParser, async (request, response) => {    
    const new_nickname = request.body.nickname;
    chat = new ChatClass(request.sessionID);
    data = await chat.set_nickname(new_nickname);
    response.json(data);
});

//загрузить данные(сообщения и список пользователей)
app.post('/load_data', urlencodedParser, async (request, response) => {    
    chat = new ChatClass(request.sessionID);    
    data = await chat.get_data(request.body.last_id);
    response.json(data);
});

//опубликовать сообщение
app.post('/post_message', urlencodedParser, async (request, response) => {    
    const message = request.body.message;
    chat = new ChatClass(request.sessionID);    
    data = await chat.post_message(message);
    response.json(data);
});


//загрузить данные (используя колбек вызовы)
app.get('/load_data_callback', (request, response) => {    
    // получить данные используя callback вызовы
    //прочитать данные пользователя из БД
    var user_id = request.sessionID;
    var last_id = parseInt(last_id);
    db_pool.query(`
        SELECT 
            id, messages.user_id, nickname, DATE_FORMAT(datetime, '%H:%i') AS time, text 
        FROM 
            messages LEFT JOIN users ON messages.user_id = users.user_id
        WHERE 
            id > '${last_id}'
        ORDER BY id DESC 
        LIMIT 100;`, function(err, results, fields) {
            var rows = results;
            db_pool.query(`
                SELECT * 
                FROM  users 
                WHERE user_id = '${user_id}' 
                LIMIT 1;`, function (err, results, fields){
                    //Возврат результата
                    response.json({ messages: rows,
                                    user: results[0]});
            });
    });
});

// запускаем сервер на прослушивание порта
app.listen(port, host, () => {
    //Выводим в консоле сообщение о запуске сервера
    console.log(`Сервер чата запущен по адресу http://${host}:${port}/`); 
});

