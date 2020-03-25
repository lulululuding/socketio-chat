let pc;
let send;
let localStream = null;
let isSender = false;
let remoteStream;
var rtcTo = null;
var remoteVideo = document.querySelector('#remotevideo');

// modal initialization
var modalInstance; 
var modalEl;
document.addEventListener('DOMContentLoaded', function() {
    const elems = document.querySelectorAll('.modal');
    const instances = M.Modal.init(elems, { dismissible: false });
    modalInstance = instances[0]
    modalEl = elems[0]
});
// 关闭弹窗
function closeDia () {
    setTimeout(() => modalInstance.isOpen && modalInstance.close(), 500)
}
// 打开呼叫方对话弹窗
function openModal () {
    const modalHeader = modalEl.querySelector('.modal-content h4');
    modalHeader.innerText = "Contacting with " + rtcTo
    const modalContent = modalEl.querySelector('.modal-content p');
    modalContent.innerHTML = `<button id='start' disabled onclick="startCall()">Waiting for agreement</button>`
    
    modalInstance.open()
}
// 允许呼叫方开始通讯
function allowStart () {
    const btn = document.querySelector('#start')
    btn.innerText = 'You can click here and start contacting now'
    btn.disabled = false 
}
// 打开被呼叫方
function openRequestedModal () {
    const modalHeader = modalEl.querySelector('.modal-content h4');
    modalHeader.innerText = "Are you willing to contact with " + rtcTo
    const modalContent = modalEl.querySelector('.modal-content p');
    modalContent.innerText = 'Waiting for your operation...'
    const footer = modalEl.querySelector('.modal-footer');
    const a = document.createElement('a')
    a.href = "#!"
    a.classList = "waves-effect waves-green btn-flat"
    a.innerText = "Allow"
    a.addEventListener('click', function () {
        !!send && send({ type: 'res' })
        setIsSender(false)
        start() 
        this.style.display = 'none'
    })
    
    footer.appendChild(a)
    modalInstance.open()
}

function setIsSender (val) {
    isSender = val
}

const remoteAudio = document.querySelector('remoteAudio')

function getRemoteStream(e){
    console.log(e)
	remoteStream = e.streams[0];
	remoteVideo.srcObject = e.streams[0];
}

function getPc () {
    const config = {
        "iceServers": [{
            'urls': 'turn:121.41.131.227:3478',
            'credential': '123456',
            'username': 'test'
        }]
    }
    pc = new RTCPeerConnection(config)
    pc.onicecandidate = e => {
        if (e.candidate) {
            send({ 
                type:'candidate',
                label: e.candidate.sdpMLineIndex,
                id: e.candidate.sdpMid,
                candidate: e.candidate.candidate 
            })
        }
    }

    pc.ontrack = getRemoteStream
}

function start(){
	if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
		console.error('the getUserMedia is not supported!');
		return;
	}

    const constraints = {
        video: true,
        audio: false //{
        //     echoCancellation: true,
        //     noiseSuppression: true,
        //     autoGainControl: true
        // }
    }

    navigator.mediaDevices.getUserMedia(constraints)
        .then(getMediaStream)
        .catch(err => console.error("failed to get media stream " + err))
}

function getMediaStream(stream){
	localStream = stream;	
    // if (!isSender) !!send && send({ type: 'res' })
}

function createPeerConn () {
    getPc()
    bindTracks()
    if (isSender) { 
        const options = {
            offerToReceiveAudio: 0,
            offerToReceiveVideo: 1
        }
        pc.createOffer(options)
        .then(getOffer)
        .then(desc => !! send && send(desc))
        .catch(handleOfferError)
    }
}

function bindTracks () {
    
	console.log('bind tracks into RTCPeerConnection!');

	if( pc === null || pc === undefined) {
		console.error('pc is null or undefined!');
		return;
	}

	if(localStream === null || localStream === undefined) {
		console.error('localstream is null or undefined!');
		return;
	}

	//add all track into peer connection
	localStream.getTracks().forEach((track)=>{
		pc.addTrack(track, localStream);	
	});

}

function startAnswer(data) {
    pc.setRemoteDescription(new RTCSessionDescription(data))
    pc.createAnswer()
        .then(getAnswer)
        .then( desc => !!send && send(desc) )
        .catch(handleAnswerError)
}

function onReceiveRTCMsg (messgae, socket) {
    const { data, to } = messgae
    if (!data) return
    switch (data.type) {
        case 'req':
            // 说明是接收方开始准备
            if (!!rtcTo){
                // 如果当前已经有链接 则直接拒绝
                socket.emit('rtc', { to, data: { type: 'rej' } })
                return
            }
            rtcTo = to
            send = obj => socket.emit('rtc', { data: obj, to: rtcTo })
            openRequestedModal()
            return;
        
        case "res":
            // // 远端用户同意了通讯请求
            allowStart() 
            start()
            return 

        case 'rej':
            // 远端用户拒接了通讯请求
            hangup()
            closeDia()
            return

        case 'offer':
            // 受到offer 说明是被呼叫方 听该设置远端媒体描述符 并产生answer
            createPeerConn()
            startAnswer(data)
            return

        case 'answer':
            // 说明是请求方
            pc.setRemoteDescription(new RTCSessionDescription(data))
            return

        case 'candidate':
            const candidate = new RTCIceCandidate({
                sdpMLineIndex: data.label,
                candidate: data.candidate
            })
            pc.addIceCandidate(candidate)
            return
        default:
            console.log('invalid message')
            return
    }
}

function getOffer (desc) {
    pc.setLocalDescription(desc)
    return desc
}

function getAnswer (desc) {
    pc.setLocalDescription(desc)
    return desc
}

function call (_send) {
    send = _send
    createPeerConn()
}

function hangup(){
    rtcTo = null
    closeLocalMedia()
	if(pc) {
		pc.close();
		pc = null;
	}
}

function closeLocalMedia(){
	if(localStream && localStream.getTracks()){
		localStream.getTracks().forEach((track)=>{
			track.stop();
		});
	}
	localStream = null;
}

function handleOfferError (err) {
    console.error("Failed to create offer "+err)
}

function handleAnswerError (err) {
    console.error("Failed to create anser "+err)
}