const Сhat = function(user_id){
    const max_messages = 200; //максимальное число сообщенией отображаемых в чате

    this.last_id = 0; //идентификатор последнего полученного и отображенного сообщения
    this.messages = []; //упорядоченый список отображаемых сообщений
    this.user_id = user_id; //уникальный идентификатор пользователя в чате
    this.nickname; //имя для чата

    this.post_message = function(text){
        // отправляет текстовое сообщение на сервер
    }

    this.get_messages = function(){
        //полцчить с сервера все новые сообщения после this.last_id
    }

    this.show_messages = function(){
        //отобразить все сообщения и подчистить список(и объяснить зачем это)
    }


}

$(() => {
    //иниализация никнейм
    if (typeof(chat) != 'undefined'){
        chat.nickname = $("input[name=nickname]").val();
        if (chat.nickname == ''){
            chat.nickname = "Гость";
        }
    }

    $("input[name=nickname]").onchange((ta))
});