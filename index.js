var express = require('express');
var app = express();
var http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 7000;

var member = [];
var history = [];
var tanka_hist = [];

// 状態 開始待ち=0, 受信待ち=1, 結果発表=2
var state = 0;
var send_phrase = 0;

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    console.log('connection : ' + socket.id);
    
    io.to(socket.id).emit('member_state_change', member.map(function(v){ return {'name': v.name, 'state': v.state}}));
    io.to(socket.id).emit('receive_history', history.map(function(v){ return `[${v.name}] : ${v.content} - ${v.date}`}), tanka_hist);

    function send_message(name, content){
        let date = new Date();
        date.setTime(date.getTime() + 1000*60*60*9);// JSTに変換
        date_str = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
        
        io.emit('message',`[${name}] : ${content} - ${date_str}`);
        history.push({'name': name, 'content': content, 'date': date_str});
        if(history.length > 50){
            history.shift();
        }
        return true;
    }

    socket.on('login', function(name){
        if(member.length >= 5){
            io.to(socket.id).emit('login_result', false);
            return false;
        }
        if(!name) name = '名無し';
        socket.userName = name;
        console.log('enter : ' + name);
        member.push({'id': socket.id, 'name': name, 'state': 0, 'phrase': ""});
        send_message("おしらせ", `${name}が参加しました。`);
        io.to(socket.id).emit('login_result', true);
        
        if(member.length == 5){
            // ゲーム開始
            state = 1;
            send_phrase = 0;
            member.forEach(function(v,key){
                member[key].state = 1;
            });
            send_message("おしらせ", `5人そろったのではじめます...`);
            io.emit('statechange', state);
        }
        io.emit('member_state_change', member.map(function(v){ return {'name': v.name, 'state': v.state}}));
    });

    socket.on('message', function(msg){
        console.log('message : ' + msg + ' by : ' + socket.id);
        let check = member.find((v) => v.id === socket.id);
        if(typeof check != 'undefined'){
            let send_msg = `[${check.name}] : ${msg}`;
            send_message(check.name, msg);
        }
    });

    socket.on('phrase', function(phrase){
        console.log('フレーズ : ' + phrase + ' by + ' + socket.id);
        let check_index = member.findIndex((v) => v.id === socket.id);
        if(typeof check_index != -1){
            member[check_index].phrase = phrase;
            member[check_index].state = 2;
            send_phrase++;
        }
        io.emit('member_state_change', member.map(function(v){ return {'name': v.name, 'state': v.state}}));
        if(send_phrase >= 5){
            io.emit('tanka_kansei', member.map(function(v){ return v.phrase }));
            tanka_hist.push({'naiyo': (member.map(function(v){ return v.phrase })).join(' '), 'member': (member.map(function(v){ return v.name })).join(' ')});
            if(tanka_hist.length > 10){
                tanka_hist.shift();
            }
            send_message("短歌完成", (member.map(function(v){ return v.phrase })).join(' '));
            state = 0;
            member = [];
            send_phrase = 0;
        }
    });

    socket.on('disconnect', function(){
        // 入室しているかチェック
        let check = member.find((v) => v.id === socket.id);
        if(typeof check != 'undefined'){
            member = member.filter(v => v.id != check.id);
            console.log('memberleave : ' + check.number + ' ' + check.name);
            send_message("おしらせ", `${check.name}が退出しました。`)
            io.emit('member_state_change', member.map(function(v){ return {'name': v.name, 'state': v.state}}));

            if(state==1){
                // ゲーム中断
                send_message("おしらせ", `${check.name}が切断したため、ゲームが中断されました。`)
                state = 0;
                member = [];
                send_phrase = 0;
                io.emit('statechange', -1);
            }
        };
        console.log('disconnect : ' + socket.id);
    });
});

http.listen(PORT, function(){
    console.log('Server listening. Port:' + PORT);
});
