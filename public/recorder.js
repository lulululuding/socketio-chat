var recorder;
const port = 5000
const BaseUrl = "http://localhost:" + port

function playaudio (url) {
    document.getElementById('audio4play').src = url;
    document.getElementById('audio4play').play();
}

function startrecorder (cbk) {
    const audioTarget = document.getElementById('audio');
    const types = ["video/webm",
        "audio/webm",
        "video/webm\;codecs=vp8",
        "video/webm\;codecs=daala",
        "video/webm\;codecs=h264",
        "audio/webm\;codecs=opus",
        "video/mpeg"];
    let suporttype = "";
    for (let i in types) {
        if(MediaRecorder.isTypeSupported(types[i])){
            suporttype = types[i];
        }
    }
    if(!suporttype){
        alert("浏览器不支持录制音频")
        return ;
    }

    const duration = new Date().getTime();
    navigator.mediaDevices.getUserMedia({audio: true, video: false})
    .then( stream => {
        recorder = new MediaRecorder(stream);
        audioTarget.srcObject = stream;

        recorder.ondataavailable = event => {
            console.log("ondataavailable");
            const audioName = generateAudioName();
            const _duration = Math.ceil((new Date().getTime() - duration)/1000);
            uploadmp3("/file_upload", event.data, audioName).then( res => { 
                console.log(res);
                if ( res.status == 'ok') {
                    document.getElementById('audio4play').src = BaseUrl + res.filename;
                    sendaudiomsg(res.filename, _duration);
                }
            });
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            showprocess = false
        }
        recorder.start();
				setTimeout(() => cbk(), 100)
    })
    .catch( err => {
        console.error(err)
        alert(err)
        showprocess = false
    });
}

function stoprecorder () {
    if(typeof recorder.stop == "function"){
        recorder.stop();
    }
    console.log("stoprecorder")
}

function uploadmp3 (uri,blob,originalname) {
    const url = BaseUrl + uri;
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open("POST",url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 304)) {
                resolve(JSON.parse(xhr.responseText));
            }
        };

        xhr.onerror = function(){
            reject({"code":-1,"msg":"服务器繁忙"})
        }

        const formdata = new FormData();
        formdata.append("file",blob, originalname+'.mp3')
        xhr.send(formdata);
    })

}

function generateAudioName () {
    return myName +'@' + Date.now();
}