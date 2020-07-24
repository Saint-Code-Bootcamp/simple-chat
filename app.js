const express = require('express'); 
const express = require('body-parser'); 

const settings = require('./settings');

const app = express(); 
const port = 3000; //определили порт для соединения с приложением
const host = 'localhost'; 

// парсер для данных формы application/x-www-form-urlencoded
const urlencodedParser = bodyParser.urlencoded();


app.get('/', (req, res) => { // запрос email(начальная страница)
    const compiledFunction = pug.compileFile(settings.dirs.TEMPLATES + 'index.html');
    const resp = compiledFunction();
    res.send(resp);
}); 

app.post('/', urlencodedParser, (req, res) => {    //получим значение email  из тела запроса
});


// запускаем сервер на прослушивание порта
app.listen(port, host, () => {
    //Выводим в консоле сообщение о запуске сервера
    console.log(`Сервер чата запущен по адресу http://${host}:${port}/`); 
});

