const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const bodyParser = require('body-parser')

// path.join(__dirname, 'public') 表示工程路径后面追加 public
app.use('/static', express.static(path.join(__dirname, 'public')))

// body-parser 用于解析post数据  application/x-www.form-urlencoded
app.use(bodyParser.urlencoded({extended: true}))

// multer 用于解析post文件  multipart/form-data
// app.use(multer({dest: './dist'}).array('file'));  //此处的array('file')对应html部分的name
const uploader = multer({ dest: './dist' })

const server = require('http').createServer(app)
const io = require('socket.io').listen(server).sockets

const port = 5000
const Base_Record_Url = 'http://localhost:' + port;

const connectedUser = []
const map = new Map()

app.post('/file_upload', uploader.array('file'),function(req, res){
    //console.log(req.files);
    fs.readFile(req.files[0].path, function(err, data){
        if (err) { failRes(res, err); return; }
        const dir_file = '/public/record/' + req.files[0].originalname;
        fs.writeFile(__dirname+dir_file, data, function(err){
            if (err) { failRes(res, err); return; }
            const obj = { status: 'ok', filename: dir_file.toString().replace('public','static') };
            //console.log(obj);
            deleteFile(req.files[0].path);
            res.send(JSON.stringify(obj));
        })
    });
})

io.on('connection',socket => {
    var username = '';

    socket.on('disconnect',()=>{
        console.log(username + " isdisconnected");
        connectedUser.splice(connectedUser.indexOf(username));
        map.delete(username);
        updateUsername()
    })
    
    socket.on("login",(name,callback = null) => {
        if ( name.trim().length === 0) return
        if (!!callback ){
            callback(true)
        }
        username = name;
        console.log(name+' is connected')
        connectedUser.push(username)
        map.set(username,socket)
        setTimeout(()=> updateUsername(), 300)
    })

    socket.on('chat message', messge => {
        const {msg,to} = messge
        if (!to || to === '') {
           return;
        }
        map.has(to) && map.get(to).emit('chat message',{
            name: username,
            msg
        })
    })

    socket.on('audio message', message => {
        const { to, filename, duration } = message
        console.log(message);
        if (!to || to === '' || !filename ){
           return;
        }
        map.get(to).emit('audio message',{
            name: username,
            filename: Base_Record_Url + filename,
            duration
        })
    })

    function updateUsername(){
        io.emit('loadUser',connectedUser);
    }
})

app.get('/',( _,res)=>{
    res.sendFile(__dirname+'/index.html')
})

server.listen(port,()=>{
    console.log("server is listening on " + port)
})

function deleteFile (filePath) {
    fs.unlink(filePath, function(err){
        if (err) console.error(filePath + ' 删除失败');
   })
}

function failRes (res, err) {
    console.error(err);
    res.send(JSON.stringify({ status: '' }));
}