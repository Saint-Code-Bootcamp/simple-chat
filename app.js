const express = require('express'); 
const bodyParser = require('body-parser'); 
const session = require('express-session');
const redisStorage = require('connect-redis')(session);
const redis = require('redis');
const nunjucks = require('nunjucks') ;
const settings = require('./settings');
const ChatClass = require('./chat');

const mysql = require('mysql2');
const db_pool = mysql.createPool({
    host: 'localhost',
    user: 'chat',
    password: 'chat',
    database: 'chat'
});
const app = express(); 
const port = 3000; //определили порт для соединения с приложением
const host = 'localhost'; 
const client = redis.createClient()
// парсер для данных формы application/x-www-form-urlencoded
const urlencodedParser = bodyParser.urlencoded({ extended: true });
app.use(express.static(settings.dirs.STATIC))
app.use(bodyParser.json());
app.use(urlencodedParser);
app.use(session({
    storage: new redisStorage({
        ttl: 360000000, //в милисекундах
        host: host,
        port: 6379,
        client: client}),
    secret: 'skoi89ujSAd3#k34',
    saveUninitialized: true})
);

//настраиваем шаблонизатор
nunjucks.configure(settings.dirs.TEMPLATES, {
    autoescape: true,
    express: app
 });

app.get('/', (request, response) => { // запрос email(начальная страница)
    chat = new ChatClass(request.sessionID);
    response.render('index.html', {sess_id: request.sessionID});
});


app.post('/new_nickname', urlencodedParser, async (request, response) => {    
    const new_nickname = request.body.nickname;
    chat = new ChatClass(request.sessionID);
    data = await chat.set_nickname(new_nickname);
    response.json(data);
});

app.post('/load_data', urlencodedParser, async (request, response) => {    
    chat = new ChatClass(request.sessionID);    
    data = await chat.get_data(request.body.last_id);
    response.json(data);
});

app.post('/post_message', urlencodedParser, async (request, response) => {    
    const message = request.body.message;
    chat = new ChatClass(request.sessionID);    
    data = await chat.post_message(message);
    response.json(data);
});


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

