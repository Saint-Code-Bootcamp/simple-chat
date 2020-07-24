const mysql = require('mysql2/promise');
const db_pool = mysql.createPool({
    host: 'localhost',
    user: 'chat',
    password: 'chat',
    database: 'chat'
});

escapeStr = function(str) {
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

    set_nickname = async function(nickname){
        nickname = escapeStr(nickname);
        await db_pool.execute(`UPDATE users SET nickname = '${nickname}' WHERE user_id='${this.user_id}' LIMIT 1;`); //LIMIT 1  правило хорошего тона
        this.nickname = nickname;        
    }

    post_message = async function(message){
        message = escapeStr(message);
        await db_pool.execute(`INSERT INTO messages (user_id, datetime, text) VALUES('${this.user_id}', NOW(), '${message}')`); 
        data = await this.get_data();
        return data;
    }

    init = async function(){
        // инициалиируем пользователя и загружаем его данные из БД
        const [rows, ] = await db_pool.query(`SELECT * FROM users WHERE user_id='${this.user_id}' LIMIT 1;`);        
        if (rows.length == 0){
            await db_pool.execute(`INSERT INTO users(user_id, nickname) VALUES('${this.user_id}', '${this.nickname}');`);
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
        const [rows, ] = await db_pool.query(`
            SELECT 
                id, messages.user_id, nickname, DATE_FORMAT(datetime, '%H:%i') AS time, text 
            FROM 
                messages LEFT JOIN users ON messages.user_id = users.user_id
            WHERE 
                id > '${last_id}'
            ORDER BY id DESC 
            LIMIT ${this.max_messages};`);
        const [user, ] = await db_pool.query(`SELECT * FROM  users WHERE user_id = '${this.user_id}' LIMIT 1;`);
        return {messages: rows,
                user: user[0]};
    }
}

module.exports = ChatClass