const simpleChat = {
    last_id: 0, //идентификатор последнего полученного и отображенного сообщения
    messages: [], //упорядоченый список отображаемых сообщений
    user_id: '', //уникальный идентификатор пользователя в чате
    nickname: '', //имя для чата


    redraw: function() {
        //перерисовать всю информацию кроме сообщений
        $("input[name=nickname]").val(this.nickname);
    },

    // отобразить сообщения в чате
    show_messages: function (messages) {
        //если в функцию передали сообщения - обновим эти данные у себя
        if (typeof(messages) != 'undefined')
            this.messages = messages;

        //отобразить все сообщения 
        for (var i in this.messages){ //цыкл по всем сообщениям
            const msg = this.messages[i]; 
            this.last_id = msg.id; //
            if ($(`#post${msg.id}`).length > 0) continue; //чтобы не дублировать элементы
            const element = $(`<div id="post${msg.id}">`);
            element.append(`<span>${msg.time}</span>`);
            element.append(`<span>${msg.nickname}:</span>`);
            element.append(`<span>${msg.text}</span>`);
            $("div.messages").append(element);            
        }
        //удалить все сообщения больше 200
        while ($("div.messages").length > 200){
            $("div.messages")[0].remove();
        }
        
    },
   
    parce_data: function(responce){
        //обрабатывает и разбирает все данные полученные от сервера
        console.log(responce);
        if (typeof(responce.messages) != 'undefined') 
            this.messages = responce.messages;
        if (typeof(responce.user.nickname) != 'undefined') 
            this.nickname = responce.user.nickname;   
        
        this.show_messages(); //показать сообщения
        this.redraw(); //обновить остальные данные
    },

    load_data: function () {
        //полцчить с сервера все новые сообщения после this.last_id
        $.post('/load_data', {last_id: this.last_id}, (resp) => {
            this.parce_data(resp);
        });
    }
}

//идентификатором пользователя в чате будет идентификатор сессии пользователя
simpleChat.user_id = window.sess_id;
//загрузить данные
simpleChat.load_data();
// объяснить про this и почему не делаем setInterval(simpleChat.load_data, 10000);
setInterval(() => {
    //установить таймер - обновлять сообщения раз в 10 сек
    simpleChat.load_data();
}, 10000);
setInterval(simpleChat.load_data, 10000);

$(() => {
    //смена никнейм
    $("input[name=nickname]").blur((event) => {
        const new_nickname = event.target.value;
        console.log(new_nickname);
        //если никнейм поменялся - отправим сообщение на сервер
        if (simpleChat.nickname != new_nickname){
            simpleChat.nickname = new_nickname;
            $.post('/new_nickname', {nickname: new_nickname}, (responce) => {
                simpleChat.show_messages(responce.messages);
            });
        }
    });

    //отправить сообщение
    $(".input form").submit(() => {
        const message = $("input[name=message]").val();
        $.post('/post_message', {message: message}, (resp) => {
            simpleChat.parce_data(resp);
            $("input[name=message]").val('');
        });
        return false
    });
});