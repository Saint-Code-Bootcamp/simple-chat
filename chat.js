const mysql_promise = require('mysql2/promise');
const Cache = require('memcached-promisify');
const cache = new Cache('localhost:11211', { keyPrefix: 'chat', maxExpiration: 10}); 

//в разных функциях работа с БД через колбеки, промисы и асинк авейт
const db_pool_promise = mysql_promise.createPool({
    host: 'localhost',
    user: 'chat',
    password: 'chat',
    database: 'chat'
});

escapeStr = function(str) {
    //функция экранирует любые символы которые могет привести к sql-инъекции 
    return str.replace(/[\\"']/g, "\\$&").replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r").replace(/\x00/g, "\\0")
                .replace(/\b/g, "\\b").replace(/\t/g, "\\t")
                .replace(/\x32/g, "\\Z") // \Z == ASCII 26
                .replace(/_/g, "\\_").replace(/%/g, "\\%");
};

class ChatClass {
    max_messages = 200; //максимальное число сообщенией отображаемых в чате
    user_id = null;
    nickname = 'Гость';
    last_message_id = 0;

    constructor(user_id) {
        this.user_id = escapeStr(user_id);
        this.init();
    }

    //самостоятельно - сделать автоматическое сообщение в чат о смене ника пользователя
    //выведите отдельное окно со списком пользвателей в онлайне(активность последняя не поже 10 мин)
    set_nickname = async function(nickname){
        nickname = escapeStr(nickname);
        await db_pool_promise.execute(`UPDATE users SET nickname = '${nickname}' WHERE user_id='${this.user_id}' LIMIT 1;`); //LIMIT 1  правило хорошего тона
        this.nickname = nickname;        
    }

    // опубликовать сообщение
    post_message = async function(message){
        message = escapeStr(message);
        await db_pool_promise.execute(`INSERT INTO messages (user_id, datetime, text) VALUES('${this.user_id}', NOW(), '${message}')`); 
        data = await this.get_data();
        return data;
    }

    // инициалиируем пользователя и загружаем его данные из БД
    init = async function(){        
        const [rows, ] = await db_pool_promise.query(`SELECT * FROM users WHERE user_id='${this.user_id}' LIMIT 1;`);        
        if (rows.length == 0){
            await db_pool_promise.execute(`INSERT INTO users(user_id, nickname) VALUES('${this.user_id}', '${this.nickname}');`);
        } else {
            this.nickname = rows[0]['nickname']
            this.last_message_id = parseInt( rows[0]['last_message_id'] );
        }
    }

    get_data = async function(last_id){
        //прочитать данные пользователя из БД
        if (typeof(last_id) == 'undefined') 
            last_id = this.last_message_id;
        last_id = parseInt(last_id);
        const [rows, ] = await db_pool_promise.query(`
            SELECT 
                id, messages.user_id, nickname, DATE_FORMAT(datetime, '%H:%i:%S') AS time, text 
            FROM 
                messages LEFT JOIN users ON messages.user_id = users.user_id
            WHERE 
                id > '${last_id}'
            ORDER BY id DESC 
            LIMIT ${this.max_messages};`);
        const [user, ] = await db_pool_promise.query(`SELECT * FROM  users WHERE user_id = '${this.user_id}' LIMIT 1;`);
        return {messages: rows,
                user: user[0]};
    }

    get_data_cached = async function (last_id) {
        if (typeof(last_id) == 'undefined') 
            last_id = this.last_message_id;
        last_id = parseInt(last_id);
        //возбмем дату для формирования ключа
        var now = new Date();
        //прочитаем из кеша
        const cache_key = 'msg' + now.getHours() + now.getMinutes() + now.getSeconds();
        let [rows,err] = await cache.get(cache_key);
        if (err){
            //если в кеше нету, прочитаем из базы изапишем в кеш
            [rows, ] = await db_pool_promise.query(`
                SELECT 
                    id, user_id, DATE_FORMAT(datetime, '%H:%i') AS time, text 
                FROM 
                    messages 
                WHERE 
                    id > '${last_id}'
                ORDER BY id DESC 
                LIMIT ${this.max_messages};`);
            await cache.set(cache_key, rows);
        }
        //прочитаем о пользовательях с кеша
        const cache_key = 'users';
        //кеш будет храниться 10 секунд
        let [users, err] = await cache.get(cache_key);
        if (err){
            [users, ] = await db_pool_promise.query(`
                SELECT 
                    user_id, nickname
                FROM 
                    users
                WHERE 
                    DATE_SUB(now(), INTERVAL 10 MINUTE) > last_update_time ;`);
            await cache.set(cache_key, users);
        }
        //объеденим данные
        uk = [];
        //преобразуем список в ключ -> значение
        for (u in users){
            let a = {};
            a[u[0]] = u[1];
            uk.push(a);
        }
        for (rows in row){
            row['nickname'] = uk[row['users_id']];
        }

        return rows;
    }
}

module.exports = ChatClass