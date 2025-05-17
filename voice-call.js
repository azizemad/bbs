class VoiceCall {
    constructor() {
        this.peer = null;
        this.localStream = null;
        this.remoteStream = null;
        this.callDocRef = null;
        this.callTimer = null;
        this.currentCallData = null;
        this.isCaller = false;
        this.callStatus = 'idle';
        
        this.createCallModal();
        this.setupEventListeners();
    }

    createCallModal() {
        this.callModal = document.createElement('div');
        this.callModal.id = 'voice-call-modal';
        this.callModal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            z-index: 2000;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            color: white;
        `;
        
        this.callModal.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 id="call-status">جاري الاتصال...</h2>
                <p id="call-timer">00:00</p>
                <p id="caller-name"></p>
            </div>
            <audio id="remote-audio" autoplay></audio>
            <div style="display: flex; gap: 20px;">
                <button id="end-call-btn" style="background: #d63031; color: white; border: none; border-radius: 50%; width: 60px; height: 60px; font-size: 1.5rem;">
                    <i class="fas fa-phone-slash"></i>
                </button>
                <button id="mute-btn" style="background: #636e72; color: white; border: none; border-radius: 50%; width: 60px; height: 60px; font-size: 1.5rem;">
                    <i class="fas fa-microphone"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(this.callModal);
    }

    setupEventListeners() {
        document.getElementById('end-call-btn').addEventListener('click', () => this.endCall());
        document.getElementById('mute-btn').addEventListener('click', () => this.toggleMute());
    }

    async startCall(friendId) {
        try {
            this.isCaller = true;
            this.callStatus = 'calling';
            
            const friendSnapshot = await firebase.database().ref(`users/${friendId}`).once('value');
            const friendData = friendSnapshot.val();
            
            if (!friendData) {
                throw new Error('لم يتم العثور على بيانات المستلم');
            }

            this.currentCallData = {
                friendId,
                friendName: friendData.username
            };

            this.showCallModal(`جاري الاتصال بـ ${friendData.username}`);

            // الحصول على إذن الميكروفون
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // إنشاء Peer
            this.peer = new SimplePeer({
                initiator: true,
                stream: this.localStream,
                config: { 
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' }
                    ]
                }
            });

            // إنشاء مستند المكالمة في Firebase
            const callId = `${currentUser.uid}_${friendId}_${Date.now()}`;
            this.callDocRef = firebase.database().ref(`calls/${callId}`);
            
            await this.callDocRef.set({
                callerId: currentUser.uid,
                callerName: currentUser.displayName || 'مستخدم',
                calleeId: friendId,
                calleeName: friendData.username,
                status: 'calling',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });

            this.setupPeerEvents();

            // إرسال إشعار للمستلم
            firebase.database().ref(`users/${friendId}/notifications`).push({
                type: 'voice_call',
                from: currentUser.uid,
                fromName: currentUser.displayName || 'مستخدم',
                callId: callId,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false
            });

        } catch (error) {
            console.error('Error starting call:', error);
            this.endCall();
            showNotification('حدث خطأ أثناء بدء المكالمة: ' + error.message, 'error');
        }
    }

    async answerCall(callId, callerId) {
        try {
            this.isCaller = false;
            this.callStatus = 'answering';
            
            const callSnapshot = await firebase.database().ref(`calls/${callId}`).once('value');
            const callData = callSnapshot.val();
            
            if (!callData) {
                throw new Error('لم يتم العثور على بيانات المكالمة');
            }

            this.currentCallData = {
                callId,
                callerId,
                callerName: callData.callerName
            };

            this.showCallModal(`مكالمة مع ${callData.callerName}`);

            // الحصول على إذن الميكروفون
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // إنشاء Peer
            this.peer = new SimplePeer({
                initiator: false,
                stream: this.localStream,
                config: { 
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' }
                    ]
                }
            });

            this.callDocRef = firebase.database().ref(`calls/${callId}`);
            await this.callDocRef.update({
                status: 'answered',
                answeredAt: firebase.database.ServerValue.TIMESTAMP
            });

            this.setupPeerEvents();

        } catch (error) {
            console.error('Error answering call:', error);
            this.endCall();
            showNotification('حدث خطأ أثناء الرد على المكالمة: ' + error.message, 'error');
        }
    }

    setupPeerEvents() {
        this.peer.on('signal', data => {
            if (this.callDocRef) {
                this.callDocRef.update({ signalData: data });
            }
        });

        this.peer.on('connect', () => {
            this.callStatus = 'connected';
            this.startCallTimer();
            this.showCallModal(`مكالمة مع ${this.isCaller ? this.currentCallData.friendName : this.currentCallData.callerName}`);
        });

        this.peer.on('stream', stream => {
            this.remoteStream = stream;
            const remoteAudio = document.getElementById('remote-audio');
            remoteAudio.srcObject = stream;
            remoteAudio.play().catch(e => console.error('Error playing audio:', e));
        });

        this.peer.on('close', () => {
            this.endCall();
        });

        this.peer.on('error', err => {
            console.error('Peer error:', err);
            this.endCall();
            showNotification('حدث خطأ في الاتصال: ' + err.message, 'error');
        });

        // الاستماع لتغييرات المكالمة في Firebase
        if (this.callDocRef) {
            this.callDocRef.on('value', snapshot => {
                const callData = snapshot.val();
                if (!callData) return;

                if (callData.signalData && this.peer && !this.peer.destroyed && !this.peer.connected) {
                    this.peer.signal(callData.signalData);
                }

                if (callData.endedAt) {
                    this.endCall();
                }
            });
        }
    }

    showCallModal(statusText) {
        this.callModal.style.display = 'flex';
        document.getElementById('call-status').textContent = statusText;
    }

    endCall() {
        try {
            if (this.peer) {
                this.peer.destroy();
                this.peer = null;
            }
            
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            
            if (this.callDocRef) {
                this.callDocRef.update({
                    status: 'ended',
                    endedAt: firebase.database.ServerValue.TIMESTAMP
                });
                this.callDocRef.off();
                this.callDocRef = null;
            }
            
            this.callModal.style.display = 'none';
            clearInterval(this.callTimer);
            this.callTimer = null;
            
            const remoteAudio = document.getElementById('remote-audio');
            if (remoteAudio) {
                remoteAudio.srcObject = null;
            }
            
            this.remoteStream = null;
            this.currentCallData = null;
            this.callStatus = 'idle';
            
        } catch (error) {
            console.error('Error ending call:', error);
        }
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const muteBtn = document.getElementById('mute-btn');
                if (muteBtn) {
                    muteBtn.innerHTML = audioTrack.enabled ? 
                        '<i class="fas fa-microphone"></i>' : 
                        '<i class="fas fa-microphone-slash"></i>';
                    muteBtn.style.background = audioTrack.enabled ? '#636e72' : '#d63031';
                }
            }
        }
    }

    startCallTimer() {
        let seconds = 0;
        clearInterval(this.callTimer);
        
        this.callTimer = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            const timerElement = document.getElementById('call-timer');
            if (timerElement) {
                timerElement.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
}

// تهيئة نظام المكالمات
let voiceCall = null;

function initializeVoiceCall() {
    if (typeof SimplePeer === 'undefined') {
        console.error('SimplePeer لم يتم تحميله');
        return false;
    }
    
    voiceCall = new VoiceCall();
    setupIncomingCallListener();
    return true;
}

// الاستماع لطلبات المكالمات الواردة
function setupIncomingCallListener() {
    if (!currentUser) return;
    
    firebase.database().ref('calls')
        .orderByChild('calleeId')
        .equalTo(currentUser.uid)
        .on('child_added', snapshot => {
            const callData = snapshot.val();
            if (callData.status === 'calling') {
                const acceptCall = confirm(`${callData.callerName} يتصل بك. هل تريد الرد؟`);
                if (acceptCall) {
                    voiceCall.answerCall(snapshot.key, callData.callerId);
                } else {
                    snapshot.ref.update({
                        status: 'rejected',
                        endedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            }
        });
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // انتظر حتى يتم تحميل SimplePeer
    const checkLibrary = setInterval(() => {
        if (typeof SimplePeer !== 'undefined') {
            clearInterval(checkLibrary);
            if (initializeVoiceCall()) {
                console.log('Voice call system initialized');
            }
        }
    }, 100);
});