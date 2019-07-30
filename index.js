var express = require('express');
var app = express();
var http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 7000;

var member = [];
var usernum = 0;

// 状態 開始待ち=0, 受信待ち=1, 結果発表=2
var state = 0;

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    console.log('connection : ' + socket.id);
    
    io.to(socket.id).emit('loginned_member', member.map(function(v){ return {'name': v.name, 'number': v.number}}));

    socket.on('login', function(name){
        if(!name) name = '名無し' + usernum;
        socket.userName = name;
        console.log('enter : ' + name);
        member.push({'id': socket.id, 'name': name, 'number': usernum});
        io.emit('message', `[おしらせ] : ${name}が参加しました。`);
        if(member.length == 5){
            // ゲーム開始
            state = 1;
            io.emit('message', `[おしらせ] : 5人そろったのではじめます...`);
            io.emit('statechange', state);
        }
        io.to(socket.id).emit('login_result', true);
        io.emit('member_add', usernum, name, member.length);
        usernum += 1;
    });

    socket.on('message', function(msg){
        console.log('message : ' + msg + ' by : ' + socket.id);
        let check = member.find((v) => v.id === socket.id);
        if(typeof check != 'undefined'){
            let send_msg = `[${check.name}] : ${msg}`;
            io.emit('message', send_msg);
        }
    });

    socket.on('reply', function(){
        
    });

    socket.on('disconnect', function(){
        // 入室しているかチェック
        let check = member.find((v) => v.id === socket.id);
        if(typeof check != 'undefined'){
            member = member.filter(v => v.id != check.id);
            console.log('memberleave : ' + check.number);
            io.emit('message', `[おしらせ] : ${check.name}が退出しました。`);
            io.emit('memberleave', check.number, member.length);
        };
        console.log('disconnect : ' + socket.id);
    });
});

http.listen(PORT, function(){
    console.log('Server listening. Port:' + PORT);
});
