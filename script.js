        // تهيئة Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyAFG65jPp_XEpjECxDhE3gw6F-OUeUJhjw",
            authDomain: "football-az-5a50d.firebaseapp.com",
            databaseURL: "https://football-az-5a50d-default-rtdb.firebaseio.com",
            projectId: "football-az-5a50d",
            storageBucket: "football-az-5a50d.appspot.com",
            messagingSenderId: "740799005307",
            appId: "1:740799005307:web:75b5bdc70e80aeee5f18de"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const database = firebase.database();
        const storage = firebase.storage();

        // متغيرات عامة
        let currentUser = null;
        let currentChatFriend = null;
        let audioRecorder = null;
        let audioChunks = [];
        let recording = false;

        // عناصر DOM
        const authContainer = document.getElementById('auth-container');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const loginToggle = document.getElementById('login-toggle');
        const signupToggle = document.getElementById('signup-toggle');
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const profileSetupContainer = document.getElementById('profile-setup-container');
        const friendsContainer = document.getElementById('friends-container');
        const chatContainer = document.getElementById('chat-container');
        const loadingOverlay = document.getElementById('loading-overlay');
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');

        // إظهار إشعار
        function showNotification(message, type = 'success') {
            notificationMessage.textContent = message;
            notification.style.display = 'flex';
            
            if (type === 'error') {
                notification.style.backgroundColor = 'var(--danger-color)';
            } else if (type === 'warning') {
                notification.style.backgroundColor = 'var(--warning-color)';
            } else {
                notification.style.backgroundColor = 'var(--primary-color)';
            }
            
            // إعادة تعيين الرسالة بعد الاختفاء
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }

        // أحداث تسجيل الدخول والتسجيل
        loginToggle.addEventListener('click', () => {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        });

        signupToggle.addEventListener('click', () => {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        });

        loginBtn.addEventListener('click', handleLogin);
        signupBtn.addEventListener('click', handleSignup);

        // معاينة الصورة في صفحة الملف الشخصي
        document.getElementById('image-preview').addEventListener('click', () => {
            document.getElementById('profile-pic').click();
        });

        document.getElementById('settings-image-preview').addEventListener('click', () => {
            document.getElementById('settings-profile-pic').click();
        });

        // التحقق من حالة المصادقة عند تحميل الصفحة
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                checkUserProfile(user.uid);
            } else {
                showAuthContainer();
            }
        });

        // تسجيل الدخول
        function handleLogin() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                showNotification('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
                return;
            }
            
            showLoading();
            
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    currentUser = userCredential.user;
                    checkUserProfile(currentUser.uid);
                })
                .catch((error) => {
                    hideLoading();
                    showNotification(error.message, 'error');
                });
        }

        // إنشاء حساب
        function handleSignup() {
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            
            if (!email || !password || !confirmPassword) {
                showNotification('يرجى ملء جميع الحقول', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('كلمتا المرور غير متطابقتين', 'error');
                return;
            }
            
            showLoading();
            
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    currentUser = userCredential.user;
                    
                    // إنشاء بيانات أولية للمستخدم
                    const userData = {
                        email: email,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        hasProfile: false
                    };
                    
                    return database.ref('users/' + currentUser.uid).set(userData);
                })
                .then(() => {
                    hideLoading();
                    showProfileSetup();
                })
                .catch((error) => {
                    hideLoading();
                    showNotification(error.message, 'error');
                });
        }

        // التحقق من وجود ملف شخصي للمستخدم
        function checkUserProfile(userId) {
            showLoading();
            
            database.ref('users/' + userId).once('value')
                .then((snapshot) => {
                    const userData = snapshot.val();
                    
                    if (userData && userData.hasProfile) {
                        loadUserData(userId);
                        showFriendsContainer();
                    } else {
                        showProfileSetup();
                    }
                    
                    hideLoading();
                })
                .catch((error) => {
                    hideLoading();
                    showNotification('حدث خطأ في تحميل بيانات المستخدم: ' + error.message, 'error');
                });
        }

        // عرض واجهة المصادقة
        function showAuthContainer() {
            authContainer.style.display = 'flex';
            profileSetupContainer.style.display = 'none';
            friendsContainer.style.display = 'none';
            chatContainer.style.display = 'none';
            
            // إعادة تعيين حقول النماذج
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-confirm-password').value = '';
        }

        // عرض واجهة إكمال الملف الشخصي
        function showProfileSetup() {
            authContainer.style.display = 'none';
            profileSetupContainer.style.display = 'flex';
            friendsContainer.style.display = 'none';
            chatContainer.style.display = 'none';
            
            // إعداد معاينة الصورة
            const profilePicInput = document.getElementById('profile-pic');
            const imagePreview = document.getElementById('image-preview');
            
            profilePicInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        imagePreview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة"><div class="edit-overlay">تغيير الصورة</div>`;
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // حدث حفظ الملف الشخصي
            document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
        }

        // حفظ الملف الشخصي
        function saveProfile() {
            const username = document.getElementById('username').value;
            const userHandle = document.getElementById('user-handle').value;
            const phone = document.getElementById('phone').value;
            const birthdate = document.getElementById('birthdate').value;
            const profilePic = document.getElementById('profile-pic').files[0];
            
            if (!username || !userHandle || !phone || !birthdate) {
                showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
                return;
            }
            
            showLoading();
            
            // تحقق من أن اليوزر فريد
            database.ref('userHandles').orderByChild('handle').equalTo(userHandle).once('value')
                .then(snapshot => {
                    if (snapshot.exists()) {
                        throw new Error('هذا اليوزر موجود بالفعل، يرجى اختيار يوزر آخر');
                    }
                    
                    // تحميل الصورة إذا تم اختيارها
                    if (profilePic) {
                        const storageRef = storage.ref('profilePics/' + currentUser.uid);
                        return storageRef.put(profilePic).then(snapshot => snapshot.ref.getDownloadURL());
                    } else {
                        return Promise.resolve(null);
                    }
                })
                .then(profilePicUrl => {
                    // حفظ بيانات المستخدم
                    const userData = {
                        username: username,
                        handle: userHandle,
                        phone: phone,
                        birthdate: birthdate,
                        profilePic: profilePicUrl || '',
                        walletBalance: 0,
                        status: 'متصل الآن',
                        hasProfile: true,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        lastSeen: firebase.database.ServerValue.TIMESTAMP,
                        online: true
                    };
                    
                    // حفظ اليوزر في قائمة اليوزرات الفريدة
                    const updates = {};
                    updates['users/' + currentUser.uid] = userData;
                    updates['userHandles/' + userHandle] = { userId: currentUser.uid, handle: userHandle };
                    
                    return database.ref().update(updates);
                })
                .then(() => {
                    hideLoading();
                    loadUserData(currentUser.uid);
                    showFriendsContainer();
                    showNotification('تم إنشاء الحساب بنجاح!');
                })
                .catch(error => {
                    hideLoading();
                    showNotification(error.message, 'error');
                });
        }

        // عرض واجهة قائمة الأصدقاء
        function showFriendsContainer() {
            authContainer.style.display = 'none';
            profileSetupContainer.style.display = 'none';
            friendsContainer.style.display = 'flex';
            chatContainer.style.display = 'none';
            
            // تحميل بيانات المستخدم
            loadUserData(currentUser.uid);
            
            // تحميل قائمة الأصدقاء
            loadFriendsList();
            
            // تحميل طلبات الصداقة
            loadFriendRequests();
            
            // تحميل سجل المعاملات
            loadTransactions();
            
            // أحداث التبويبات
            setupTabs();
            
            // أحداث البحث عن أصدقاء
            setupFriendSearch();
            
            // أحداث المحفظة
            setupWallet();
            
            // أحداث الإعدادات
            setupSettings();
            
            // أحداث الدردشة
            setupChat();
            
            // تحديث حالة الاتصال
            updateUserOnlineStatus();
        }

        // عرض واجهة الدردشة
        function showChatContainer() {
            friendsContainer.style.display = 'none';
            chatContainer.style.display = 'flex';
        }

        // العودة إلى قائمة الأصدقاء
        function backToFriends() {
            chatContainer.style.display = 'none';
            friendsContainer.style.display = 'flex';
            currentChatFriend = null;
        }

        // تحميل بيانات المستخدم
        function loadUserData(userId) {
            database.ref('users/' + userId).on('value', snapshot => {
                const userData = snapshot.val();
                
                if (userData) {
                    // تحديث معلومات المستخدم في الشريط الجانبي
                    const sidebarUserImg = document.getElementById('sidebar-user-img');
                    const sidebarUserName = document.getElementById('sidebar-user-name');
                    const sidebarUserStatus = document.getElementById('sidebar-user-status');
                    
                    sidebarUserName.textContent = userData.username;
                    
                    if (userData.profilePic) {
                        sidebarUserImg.src = userData.profilePic;
                    } else {
                        sidebarUserImg.src = 'https://via.placeholder.com/48';
                    }
                    
                    // تحديث حالة المستخدم
                    if (userData.online) {
                        sidebarUserStatus.textContent = 'متصل الآن';
                        sidebarUserStatus.style.color = 'var(--success-color)';
                    } else {
                        const lastSeen = new Date(userData.lastSeen);
                        sidebarUserStatus.textContent = `آخر ظهور: ${formatLastSeen(lastSeen)}`;
                        sidebarUserStatus.style.color = 'var(--dark-gray)';
                    }
                    
                    // تحديث معلومات المستخدم في الإعدادات
                    document.getElementById('settings-username').value = userData.username;
                    document.getElementById('settings-user-handle').value = userData.handle;
                    document.getElementById('settings-status').value = userData.status || 'متصل الآن';
                    document.getElementById('settings-email').textContent = currentUser.email;
                    document.getElementById('settings-phone').textContent = userData.phone;
                    document.getElementById('settings-birthdate').textContent = userData.birthdate;
                    document.getElementById('settings-user-id').textContent = userId;
                    
                    if (userData.profilePic) {
                        document.getElementById('settings-image-preview').innerHTML = 
                            `<img src="${userData.profilePic}" alt="صورة الملف الشخصي"><div class="edit-overlay">تغيير الصورة</div>`;
                    }
                    
                    // تحديث رصيد المحفظة
                    if (userData.walletBalance !== undefined) {
                        document.getElementById('wallet-balance').textContent = userData.walletBalance + ' جنيه';
                    }
                }
            });
        }

        // تحديث حالة الاتصال للمستخدم
        function updateUserOnlineStatus() {
            const userStatusRef = database.ref('users/' + currentUser.uid);
            
            // تحديث الحالة إلى متصل عند فتح التطبيق
            userStatusRef.update({
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
            
            // تحديث الحالة عند إغلاق التبويب/التطبيق
            window.addEventListener('beforeunload', () => {
                userStatusRef.update({
                    online: false,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
            });
        }

        // تنسيق وقت آخر ظهور
        function formatLastSeen(date) {
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / (1000 * 60));
            
            if (minutes < 1) return 'الآن';
            if (minutes < 60) return `منذ ${minutes} دقيقة`;
            if (minutes < 1440) return `منذ ${Math.floor(minutes / 60)} ساعة`;
            return `منذ ${Math.floor(minutes / 1440)} يوم`;
        }

        // تحميل قائمة الأصدقاء
        function loadFriendsList() {
            const friendsList = document.getElementById('friends-list');
            
            database.ref('friends/' + currentUser.uid).on('value', snapshot => {
                friendsList.innerHTML = '';
                
                if (snapshot.exists()) {
                    const friends = snapshot.val();
                    let unreadCount = 0;
                    
                    Object.keys(friends).forEach(friendId => {
                        database.ref('users/' + friendId).once('value')
                            .then(friendSnapshot => {
                                const friendData = friendSnapshot.val();
                                
                                if (friendData) {
                                    // حساب الرسائل غير المقروءة
                                    database.ref('userMessages/' + currentUser.uid + '/' + friendId).orderByChild('read').equalTo(false).once('value')
                                        .then(unreadSnapshot => {
                                            const unreadMessages = unreadSnapshot.exists() ? Object.keys(unreadSnapshot.val()).length : 0;
                                            unreadCount += unreadMessages;
                                            
                                            const friendItem = document.createElement('div');
                                            friendItem.className = 'friend-item';
                                            
                                            friendItem.innerHTML = `
                                                <img src="${friendData.profilePic || 'https://via.placeholder.com/52'}" alt="${friendData.username}">
                                                <div class="friend-info">
                                                    <div class="friend-name">${friendData.username}</div>
                                                    <div class="friend-status">${friendData.status || ''}</div>
                                                </div>
                                                ${unreadMessages > 0 ? `<span class="unread-count">${unreadMessages}</span>` : ''}
                                                ${friendData.online ? '<span class="online-status"></span>' : ''}
                                            `;
                                            
                                            friendItem.addEventListener('click', () => openChat(friendId, friendData));
                                            friendsList.appendChild(friendItem);
                                            
                                            // تحديث العداد العام للرسائل غير المقروءة
                                            document.getElementById('unread-count').textContent = unreadCount;
                                            document.getElementById('unread-count').style.display = unreadCount > 0 ? 'flex' : 'none';
                                        });
                                }
                            });
                    });
                } else {
                    friendsList.innerHTML = '<p class="no-friends">لا يوجد أصدقاء حتى الآن</p>';
                }
            });
        }

      function openChat(friendId, friendData) {
    currentChatFriend = { id: friendId, ...friendData };
    showChatContainer();
    
    // تحديث رأس المحادثة
    const chatUserInfo = document.getElementById('chat-user-info-full');
    chatUserInfo.innerHTML = `
        <img src="${friendData.profilePic || 'https://via.placeholder.com/48'}" alt="${friendData.username}">
        <div>
            <div class="user-name">${friendData.username}</div>
            <div class="user-status">${friendData.online ? 'متصل الآن' : 'غير متصل'}</div>
        </div>
    `;
    
    // إعداد أزرار المكالمة
    document.getElementById('voice-call-btn').onclick = () => {
        if (voiceCall) {
            voiceCall.startCall(friendId);
        } else {
            showNotification('نظام المكالمات غير جاهز', 'error');
        }
    };
    
 // بدء مكالمة فيديو
        function startVideoCall(friendId) {
            showNotification('جاري بدء مكالمة الفيديو...');
            // هنا يمكنك إضافة كود لبدء مكالمة الفيديو باستخدام WebRTC أو أي خدمة أخرى
        }
    }
        // تحميل الرسائل
        function loadMessages(friendId) {
            const messagesContainer = document.getElementById('messages-container-full');
            messagesContainer.innerHTML = '';
            
            database.ref('messages').orderByChild('timestamp').on('value', snapshot => {
                messagesContainer.innerHTML = '';
                
                if (snapshot.exists()) {
                    const messages = [];
                    
                    snapshot.forEach(messageSnapshot => {
                        const message = messageSnapshot.val();
                        
                        if ((message.senderId === currentUser.uid && message.receiverId === friendId) || 
                            (message.senderId === friendId && message.receiverId === currentUser.uid)) {
                            messages.push({
                                id: messageSnapshot.key,
                                ...message
                            });
                        }
                    });
                    
                    // ترتيب الرسائل حسب الوقت
                    messages.sort((a, b) => a.timestamp - b.timestamp);
                    
                    // عرض الرسائل
                    messages.forEach(message => {
                        const isSent = message.senderId === currentUser.uid;
                        const messageDiv = document.createElement('div');
                        messageDiv.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
                        
                        let messageContent = '';
                        
                        if (message.type === 'text') {
                            messageContent = `<div class="message-text">${message.text}</div>`;
                        } else if (message.type === 'image') {
                            messageContent = `
                                <div class="message-text">${message.text || ''}</div>
                                <img src="${message.fileUrl}" class="message-image" alt="صورة مرسلة">
                            `;
                        } else if (message.type === 'audio') {
                            messageContent = `
                                <div class="message-text">${message.text || ''}</div>
                                <audio controls class="message-audio">
                                    <source src="${message.fileUrl}" type="audio/mpeg">
                                    متصفحك لا يدعم تشغيل الصوتيات.
                                </audio>
                            `;
                        } else if (message.type === 'file') {
                            messageContent = `
                                <div class="message-text">${message.text || ''}</div>
                                <a href="${message.fileUrl}" target="_blank" class="message-file">
                                    <i class="fas fa-file-download"></i>
                                    <div class="file-info">
                                        <div class="file-name">${message.fileName}</div>
                                        <div class="file-size">${formatFileSize(message.fileSize)}</div>
                                    </div>
                                </a>
                            `;
                        }
                        
                        messageDiv.innerHTML = `
                            <div class="message-bubble">
                                ${messageContent}
                            </div>
                            <div class="message-info">
                                <span>${formatTime(message.timestamp)}</span>
                                ${isSent ? `<span>${message.read ? '✓✓' : '✓'}</span>` : ''}
                            </div>
                        `;
                        
                        // إضافة حدث النقر لمعاينة الصورة
                        const imageElement = messageDiv.querySelector('.message-image');
                        if (imageElement) {
                            imageElement.addEventListener('click', () => previewImage(message.fileUrl));
                        }
                        
                        messagesContainer.appendChild(messageDiv);
                    });
                    
                    // التمرير إلى الأسفل
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    
                    // تحديث حالة القراءة للرسائل الواردة
                    updateReadStatus(friendId);
                } else {
                    messagesContainer.innerHTML = '<p class="no-messages">لا توجد رسائل بعد</p>';
                }
            });
        }

        // معاينة الصورة في نافذة منبثقة
        function previewImage(imageUrl) {
            const previewModal = document.getElementById('image-preview-modal');
            const previewedImage = document.getElementById('previewed-image');
            
            previewedImage.src = imageUrl;
            previewModal.style.display = 'flex';
            
            // إغلاق النافذة عند النقر خارج الصورة
            previewModal.addEventListener('click', (e) => {
                if (e.target === previewModal) {
                    previewModal.style.display = 'none';
                }
            });
            
            // إغلاق النافذة عند النقر على الزر
            previewModal.querySelector('.close-modal').addEventListener('click', () => {
                previewModal.style.display = 'none';
            });
        }

        // تنسيق حجم الملف
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 بايت';
            const k = 1024;
            const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // تحديث حالة قراءة الرسائل
        function updateReadStatus(friendId) {
            database.ref('messages').orderByChild('timestamp').once('value')
                .then(snapshot => {
                    const updates = {};
                    
                    snapshot.forEach(messageSnapshot => {
                        const message = messageSnapshot.val();
                        
                        if (message.senderId === friendId && message.receiverId === currentUser.uid && !message.read) {
                            updates[`messages/${messageSnapshot.key}/read`] = true;
                            updates[`userMessages/${currentUser.uid}/${friendId}/${messageSnapshot.key}/read`] = true;
                        }
                    });
                    
                    if (Object.keys(updates).length > 0) {
                        return database.ref().update(updates);
                    }
                });
        }

        // تنسيق الوقت
        function formatTime(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // إزالة صديق
        function removeFriend(friendId) {
            if (confirm('هل أنت متأكد من أنك تريد إزالة هذا الصديق؟')) {
                showLoading();
                
                const updates = {};
                updates[`friends/${currentUser.uid}/${friendId}`] = null;
                updates[`friends/${friendId}/${currentUser.uid}`] = null;
                
                database.ref().update(updates)
                    .then(() => {
                        hideLoading();
                        backToFriends();
                        showNotification('تم إزالة الصديق بنجاح');
                    })
                    .catch(error => {
                        hideLoading();
                        showNotification('حدث خطأ أثناء إزالة الصديق: ' + error.message, 'error');
                    });
            }
        }

        // تحميل طلبات الصداقة
        function loadFriendRequests() {
            const requestsList = document.getElementById('requests-list');
            
            database.ref('friendRequests').orderByChild('receiverId').equalTo(currentUser.uid).on('value', snapshot => {
                requestsList.innerHTML = '';
                let pendingCount = 0;
                
                if (snapshot.exists()) {
                    snapshot.forEach(requestSnapshot => {
                        const request = requestSnapshot.val();
                        
                        if (request.status === 'pending') {
                            pendingCount++;
                            database.ref('users/' + request.senderId).once('value')
                                .then(userSnapshot => {
                                    const userData = userSnapshot.val();
                                    
                                    if (userData) {
                                        const requestItem = document.createElement('div');
                                        requestItem.className = 'request-item';
                                        requestItem.innerHTML = `
                                            <img src="${userData.profilePic || 'https://via.placeholder.com/52'}" alt="${userData.username}">
                                            <div class="request-info">
                                                <div class="request-name">${userData.username}</div>
                                                <div class="request-status">طلب صداقة</div>
                                            </div>
                                            <div class="request-actions">
                                                <button class="btn btn-primary btn-sm accept-request" data-request-id="${requestSnapshot.key}" data-sender-id="${request.senderId}">
                                                    <i class="fas fa-check"></i> قبول
                                                </button>
                                                <button class="btn btn-secondary btn-sm reject-request" data-request-id="${requestSnapshot.key}">
                                                    <i class="fas fa-times"></i> رفض
                                                </button>
                                            </div>
                                        `;
                                        
                                        requestsList.appendChild(requestItem);
                                        
                                        // أحداث الأزرار
                                        requestItem.querySelector('.accept-request').addEventListener('click', acceptFriendRequest);
                                        requestItem.querySelector('.reject-request').addEventListener('click', rejectFriendRequest);
                                    }
                                });
                        }
                    });
                    
                    // تحديث عداد الطلبات
                    document.getElementById('requests-count').textContent = pendingCount;
                    document.getElementById('requests-count').style.display = pendingCount > 0 ? 'flex' : 'none';
                } else {
                    requestsList.innerHTML = '<p class="no-requests">لا توجد طلبات صداقة</p>';
                    document.getElementById('requests-count').style.display = 'none';
                }
            });
        }

        // قبول طلب الصداقة
        function acceptFriendRequest(e) {
            const requestId = e.target.getAttribute('data-request-id');
            const senderId = e.target.getAttribute('data-sender-id');
            
            showLoading();
            
            const updates = {};
            updates[`friendRequests/${requestId}/status`] = 'accepted';
            updates[`friends/${currentUser.uid}/${senderId}`] = true;
            updates[`friends/${senderId}/${currentUser.uid}`] = true;
            
            database.ref().update(updates)
                .then(() => {
                    hideLoading();
                    showNotification('تم قبول طلب الصداقة بنجاح');
                })
                .catch(error => {
                    hideLoading();
                    showNotification('حدث خطأ أثناء قبول طلب الصداقة: ' + error.message, 'error');
                });
        }

        // رفض طلب الصداقة
        function rejectFriendRequest(e) {
            const requestId = e.target.getAttribute('data-request-id');
            
            showLoading();
            
            database.ref('friendRequests/' + requestId).update({ status: 'rejected' })
                .then(() => {
                    hideLoading();
                    showNotification('تم رفض طلب الصداقة بنجاح');
                })
                .catch(error => {
                    hideLoading();
                    showNotification('حدث خطأ أثناء رفض طلب الصداقة: ' + error.message, 'error');
                });
        }

        // تحميل سجل المعاملات
        function loadTransactions() {
            const transactionsList = document.getElementById('transactions-list');
            
            database.ref('transactions').orderByChild('userId').equalTo(currentUser.uid).on('value', snapshot => {
                transactionsList.innerHTML = '';
                
                if (snapshot.exists()) {
                    const transactions = [];
                    
                    snapshot.forEach(transactionSnapshot => {
                        transactions.push({
                            id: transactionSnapshot.key,
                            ...transactionSnapshot.val()
                        });
                    });
                    
                    // ترتيب المعاملات حسب الوقت
                    transactions.sort((a, b) => b.timestamp - a.timestamp);
                    
                    // عرض المعاملات
                    transactions.forEach(transaction => {
                        const transactionItem = document.createElement('div');
                        transactionItem.className = 'transaction-item';
                        
                        let amountClass = '';
                        let amountPrefix = '';
                        
                        if (transaction.type === 'charge' || transaction.type === 'receive') {
                            amountClass = 'positive';
                            amountPrefix = '+';
                        } else if (transaction.type === 'withdraw' || transaction.type === 'send') {
                            amountClass = 'negative';
                            amountPrefix = '-';
                        }
                        
                        transactionItem.innerHTML = `
                            <div class="transaction-details">
                                <div class="transaction-title">${getTransactionDescription(transaction)}</div>
                                <div class="transaction-date">${formatDate(transaction.timestamp)}</div>
                            </div>
                            <div class="transaction-amount ${amountClass}">
                                ${amountPrefix}${transaction.amount} جنيه
                            </div>
                        `;
                        
                        transactionsList.appendChild(transactionItem);
                    });
                } else {
                    transactionsList.innerHTML = '<p class="no-transactions">لا توجد معاملات حتى الآن</p>';
                }
            });
        }

        // الحصول على وصف المعاملة
        function getTransactionDescription(transaction) {
            switch (transaction.type) {
                case 'charge':
                    return 'شحن المحفظة';
                case 'withdraw':
                    return 'سحب رصيد';
                case 'send':
                    return `تحويل إلى ${transaction.recipientName || 'مستخدم'}`;
                case 'receive':
                    return `تحويل من ${transaction.senderName || 'مستخدم'}`;
                default:
                    return 'معاملة';
            }
        }

        // تنسيق التاريخ
        function formatDate(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // إعداد التبويبات
        function setupTabs() {
            const tabBtns = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');
            
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabId = btn.getAttribute('data-tab');
                    
                    // إزالة النشاط من جميع الأزرار والمحتويات
                    tabBtns.forEach(b => b.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));
                    
                    // إضافة النشاط للزر والمحتوى المحدد
                    btn.classList.add('active');
                    document.getElementById(`${tabId}-tab`).classList.add('active');
                });
            });
        }

        // إعداد البحث عن أصدقاء
        function setupFriendSearch() {
            const searchModal = document.getElementById('search-modal');
            const searchBtn = document.getElementById('search-btn');
            const friendSearch = document.getElementById('friend-search');
            const closeModal = searchModal.querySelector('.close-modal');
            const executeSearch = document.getElementById('execute-search');
            const searchResults = document.getElementById('search-results');
            
            // فتح نافذة البحث
            searchBtn.addEventListener('click', () => {
                searchModal.style.display = 'flex';
                document.getElementById('search-query').focus();
            });
            
            friendSearch.addEventListener('click', () => {
                searchModal.style.display = 'flex';
                document.getElementById('search-query').focus();
            });
            
            // إغلاق نافذة البحث
            closeModal.addEventListener('click', () => {
                searchModal.style.display = 'none';
            });
            
            window.addEventListener('click', (e) => {
                if (e.target === searchModal) {
                    searchModal.style.display = 'none';
                }
            });
            
            // تنفيذ البحث
            executeSearch.addEventListener('click', () => {
                const searchType = document.getElementById('search-type').value;
                const query = document.getElementById('search-query').value.trim();
                
                if (!query) {
                    showNotification('يرجى إدخال كلمة البحث', 'error');
                    return;
                }
                
                showLoading();
                searchResults.innerHTML = '';
                
                let searchRef;
                
                if (searchType === 'id') {
                    // البحث بالمعرف (غير آمن في الواقع العملي، هنا للتوضيح فقط)
                    database.ref('users/' + query).once('value')
                        .then(snapshot => {
                            if (snapshot.exists() && snapshot.key !== currentUser.uid) {
                                displaySearchResult(snapshot.key, snapshot.val());
                            } else {
                                searchResults.innerHTML = '<p class="no-results" style="text-align: center; padding: 20px; color: var(--dark-gray);">لا توجد نتائج</p>';
                            }
                            hideLoading();
                        });
                } else if (searchType === 'phone') {
                    // البحث برقم الهاتف
                    searchRef = database.ref('users').orderByChild('phone').equalTo(query);
                } else if (searchType === 'handle') {
                    // البحث باليوزر
                    database.ref('userHandles/' + query).once('value')
                        .then(snapshot => {
                            if (snapshot.exists()) {
                                const userId = snapshot.val().userId;
                                return database.ref('users/' + userId).once('value');
                            } else {
                                return Promise.resolve(null);
                            }
                        })
                        .then(snapshot => {
                            if (snapshot && snapshot.exists() && snapshot.key !== currentUser.uid) {
                                displaySearchResult(snapshot.key, snapshot.val());
                            } else {
                                searchResults.innerHTML = '<p class="no-results" style="text-align: center; padding: 20px; color: var(--dark-gray);">لا توجد نتائج</p>';
                            }
                            hideLoading();
                        });
                } else if (searchType === 'name') {
                    // البحث بالاسم (هذا سيبحث عن تطابق كامل فقط)
                    searchRef = database.ref('users').orderByChild('username').equalTo(query);
                }
                
                if (searchRef) {
                    searchRef.once('value')
                        .then(snapshot => {
                            searchResults.innerHTML = '';
                            
                            if (snapshot.exists()) {
                                snapshot.forEach(childSnapshot => {
                                    if (childSnapshot.key !== currentUser.uid) {
                                        displaySearchResult(childSnapshot.key, childSnapshot.val());
                                    }
                                });
                                
                                if (searchResults.innerHTML === '') {
                                    searchResults.innerHTML = '<p class="no-results" style="text-align: center; padding: 20px; color: var(--dark-gray);">لا توجد نتائج</p>';
                                }
                            } else {
                                searchResults.innerHTML = '<p class="no-results" style="text-align: center; padding: 20px; color: var(--dark-gray);">لا توجد نتائج</p>';
                            }
                            
                            hideLoading();
                        });
                }
            });
            
            // عرض نتيجة البحث
            function displaySearchResult(userId, userData) {
                // التحقق من أن المستخدم ليس صديقًا بالفعل
                database.ref('friends/' + currentUser.uid + '/' + userId).once('value')
                    .then(friendSnapshot => {
                        const isFriend = friendSnapshot.exists();
                        
                        // التحقق من وجود طلب صداقة مسبق
                        return database.ref('friendRequests')
                            .orderByChild('senderId')
                            .equalTo(currentUser.uid)
                            .once('value')
                            .then(requestsSnapshot => {
                                let hasPendingRequest = false;
                                
                                if (requestsSnapshot.exists()) {
                                    requestsSnapshot.forEach(requestSnapshot => {
                                        const request = requestSnapshot.val();
                                        if (request.receiverId === userId && request.status === 'pending') {
                                            hasPendingRequest = true;
                                        }
                                    });
                                }
                                
                                const resultItem = document.createElement('div');
                                resultItem.className = 'search-result-item';
                                resultItem.innerHTML = `
                                    <img src="${userData.profilePic || 'https://via.placeholder.com/48'}" alt="${userData.username}">
                                    <div class="result-info">
                                        <div class="result-name">${userData.username}</div>
                                        <div class="result-handle">@${userData.handle}</div>
                                    </div>
                                `;
                                
                                const actionBtn = document.createElement('button');
                                
                                if (isFriend) {
                                    actionBtn.className = 'btn btn-secondary btn-sm';
                                    actionBtn.innerHTML = '<i class="fas fa-check"></i> صديق';
                                    actionBtn.disabled = true;
                                } else if (hasPendingRequest) {
                                    actionBtn.className = 'btn btn-secondary btn-sm';
                                    actionBtn.innerHTML = '<i class="fas fa-clock"></i> طلب مرسل';
                                    actionBtn.disabled = true;
                                } else {
                                    actionBtn.className = 'btn btn-primary btn-sm';
                                    actionBtn.innerHTML = '<i class="fas fa-user-plus"></i> إضافة';
                                    actionBtn.onclick = () => sendFriendRequest(userId);
                                }
                                
                                resultItem.appendChild(actionBtn);
                                searchResults.appendChild(resultItem);
                            });
                    });
            }
            
            // إرسال طلب صداقة
            function sendFriendRequest(receiverId) {
                showLoading();
                
                const newRequest = {
                    senderId: currentUser.uid,
                    receiverId: receiverId,
                    status: 'pending',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                
                const newRequestKey = database.ref('friendRequests').push().key;
                
                database.ref('friendRequests/' + newRequestKey).set(newRequest)
                    .then(() => {
                        hideLoading();
                        searchModal.style.display = 'none';
                        showNotification('تم إرسال طلب الصداقة بنجاح');
                    })
                    .catch(error => {
                        hideLoading();
                        showNotification('حدث خطأ أثناء إرسال طلب الصداقة: ' + error.message, 'error');
                    });
            }
        }

        // إعداد المحفظة
        function setupWallet() {
            const chargeModal = document.getElementById('charge-modal');
            const chargeBtn = document.getElementById('charge-wallet-btn');
            const closeChargeModal = chargeModal.querySelector('.close-modal');
            const submitCharge = document.getElementById('submit-charge');
            
            const withdrawModal = document.getElementById('withdraw-modal');
            const withdrawBtn = document.getElementById('withdraw-btn');
            const closeWithdrawModal = withdrawModal.querySelector('.close-modal');
            const submitWithdraw = document.getElementById('submit-withdraw');
            
            const sendMoneyModal = document.getElementById('send-money-modal');
            const sendMoneyBtn = document.getElementById('send-money-btn');
            const closeSendMoneyModal = sendMoneyModal.querySelector('.close-modal');
            const submitSend = document.getElementById('submit-send');
            
            // شحن المحفظة
            chargeBtn.addEventListener('click', () => {
                chargeModal.style.display = 'flex';
                document.getElementById('charge-amount').value = '';
                document.getElementById('sender-phone').value = '';
            });
            
            closeChargeModal.addEventListener('click', () => {
                chargeModal.style.display = 'none';
            });
            
            submitCharge.addEventListener('click', () => {
                const amount = parseFloat(document.getElementById('charge-amount').value);
                const senderPhone = document.getElementById('sender-phone').value.trim();
                
                if (!amount || amount <= 0) {
                    showNotification('يرجى إدخال مبلغ صحيح', 'error');
                    return;
                }
                
                if (!senderPhone || senderPhone.length !== 11) {
                    showNotification('يرجى إدخال رقم هاتف صحيح مكون من 11 رقمًا', 'error');
                    return;
                }
                
                showLoading();
                
                // إنشاء معاملة شحن
                const newTransaction = {
                    userId: currentUser.uid,
                    type: 'charge',
                    amount: amount,
                    senderPhone: senderPhone,
                    status: 'pending',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                
                database.ref('transactions').push(newTransaction)
                    .then(() => {
                        chargeModal.style.display = 'none';
                        hideLoading();
                        showNotification('تم إرسال طلب الشحن بنجاح، سيتم مراجعته من قبل الإدارة');
                    })
                    .catch(error => {
                        hideLoading();
                        showNotification('حدث خطأ أثناء إرسال طلب الشحن: ' + error.message, 'error');
                    });
            });
            
            // سحب الرصيد
            withdrawBtn.addEventListener('click', () => {
                withdrawModal.style.display = 'flex';
                document.getElementById('withdraw-amount').value = '';
                document.getElementById('withdraw-phone').value = '';
            });
            
            closeWithdrawModal.addEventListener('click', () => {
                withdrawModal.style.display = 'none';
            });
            
            submitWithdraw.addEventListener('click', () => {
                const amount = parseFloat(document.getElementById('withdraw-amount').value);
                const phone = document.getElementById('withdraw-phone').value.trim();
                
                if (!amount || amount <= 0) {
                    showNotification('يرجى إدخال مبلغ صحيح', 'error');
                    return;
                }
                
                if (!phone || phone.length !== 11) {
                    showNotification('يرجى إدخال رقم هاتف صحيح مكون من 11 رقمًا', 'error');
                    return;
                }
                
                showLoading();
                
                // التحقق من أن الرصيد كافٍ
                database.ref('users/' + currentUser.uid + '/walletBalance').once('value')
                    .then(snapshot => {
                        const balance = snapshot.val() || 0;
                        
                        if (balance < amount) {
                            throw new Error('الرصيد غير كافٍ لإتمام عملية السحب');
                        }
                        
                        // إنشاء معاملة سحب
                        const newTransaction = {
                            userId: currentUser.uid,
                            type: 'withdraw',
                            amount: amount,
                            withdrawPhone: phone,
                            status: 'pending',
                            timestamp: firebase.database.ServerValue.TIMESTAMP
                        };
                        
                        return database.ref('transactions').push(newTransaction);
                    })
                    .then(() => {
                        // خصم المبلغ من الرصيد
                        return database.ref('users/' + currentUser.uid).once('value')
                            .then(snapshot => {
                                const userData = snapshot.val();
                                const newBalance = (userData.walletBalance || 0) - amount;
                                
                                return database.ref('users/' + currentUser.uid + '/walletBalance').set(newBalance);
                            });
                    })
                    .then(() => {
                        withdrawModal.style.display = 'none';
                        hideLoading();
                        showNotification('تم إرسال طلب السحب بنجاح، سيتم مراجعته من قبل الإدارة');
                    })
                    .catch(error => {
                        hideLoading();
                        showNotification(error.message, 'error');
                    });
            });
            
            // إرسال أموال
            sendMoneyBtn.addEventListener('click', () => {
                sendMoneyModal.style.display = 'flex';
                document.getElementById('recipient-search').value = '';
                document.getElementById('send-amount').value = '';
                document.getElementById('recipient-results').innerHTML = '';
            });
            
            closeSendMoneyModal.addEventListener('click', () => {
                sendMoneyModal.style.display = 'none';
            });
            
            // البحث عن مستلم
            document.getElementById('recipient-search').addEventListener('input', (e) => {
                const query = e.target.value.trim();
                const resultsContainer = document.getElementById('recipient-results');
                
                if (query.length < 2) {
                    resultsContainer.innerHTML = '';
                    return;
                }
                
                // البحث في قائمة الأصدقاء
                database.ref('friends/' + currentUser.uid).once('value')
                    .then(snapshot => {
                        const friendIds = snapshot.exists() ? Object.keys(snapshot.val()) : [];
                        const promises = [];
                        
                        friendIds.forEach(friendId => {
                            promises.push(database.ref('users/' + friendId).once('value'));
                        });
                        
                        return Promise.all(promises);
                    })
                    .then(snapshots => {
                        resultsContainer.innerHTML = '';
                        
                        snapshots.forEach(friendSnapshot => {
                            if (friendSnapshot.exists()) {
                                const friendData = friendSnapshot.val();
                                
                                if (friendData.username.includes(query)) {
                                    const resultItem = document.createElement('div');
                                    resultItem.className = 'search-result-item';
                                    resultItem.innerHTML = `
                                        <img src="${friendData.profilePic || 'https://via.placeholder.com/48'}" alt="${friendData.username}">
                                        <div class="result-info">
                                            <div class="result-name">${friendData.username}</div>
                                            <div class="result-handle">@${friendData.handle}</div>
                                        </div>
                                    `;
                                    
                                    resultItem.addEventListener('click', () => {
                                        document.getElementById('recipient-search').value = friendData.username;
                                        document.getElementById('recipient-results').innerHTML = '';
                                        document.getElementById('send-amount').focus();
                                    });
                                    
                                    resultsContainer.appendChild(resultItem);
                                }
                            }
                        });
                    });
            });
            
            submitSend.addEventListener('click', () => {
                const recipientName = document.getElementById('recipient-search').value.trim();
                const amount = parseFloat(document.getElementById('send-amount').value);
                
                if (!recipientName) {
                    showNotification('يرجى اختيار مستلم', 'error');
                    return;
                }
                
                if (!amount || amount <= 0) {
                    showNotification('يرجى إدخال مبلغ صحيح', 'error');
                    return;
                }
                
                showLoading();
                
                // البحث عن المستلم في قائمة الأصدقاء
                database.ref('friends/' + currentUser.uid).once('value')
                    .then(snapshot => {
                        const friendIds = snapshot.exists() ? Object.keys(snapshot.val()) : [];
                        const promises = [];
                        
                        friendIds.forEach(friendId => {
                            promises.push(database.ref('users/' + friendId).once('value'));
                        });
                        
                        return Promise.all(promises);
                    })
                    .then(snapshots => {
                        let recipientFound = null;
                        
                        snapshots.forEach(friendSnapshot => {
                            if (friendSnapshot.exists()) {
                                const friendData = friendSnapshot.val();
                                
                                if (friendData.username === recipientName) {
                                    recipientFound = {
                                        id: friendSnapshot.key,
                                        ...friendData
                                    };
                                }
                            }
                        });
                        
                        if (!recipientFound) {
                            throw new Error('المستلم غير موجود في قائمة أصدقائك');
                        }
                        
                        // التحقق من أن الرصيد كافٍ
                        return database.ref('users/' + currentUser.uid + '/walletBalance').once('value')
                            .then(balanceSnapshot => {
                                const balance = balanceSnapshot.val() || 0;
                                
                                if (balance < amount) {
                                    throw new Error('الرصيد غير كافٍ لإتمام عملية التحويل');
                                }
                                
                                // بدء المعاملة
                                const updates = {};
                                
                                // خصم المبلغ من المرسل
                                const senderNewBalance = balance - amount;
                                updates[`users/${currentUser.uid}/walletBalance`] = senderNewBalance;
                                
                                // إضافة المبلغ للمستلم
                                const recipientNewBalance = (recipientFound.walletBalance || 0) + amount;
                                updates[`users/${recipientFound.id}/walletBalance`] = recipientNewBalance;
                                
                                // تسجيل معاملة الإرسال
                                const sendTransaction = {
                                    userId: currentUser.uid,
                                    type: 'send',
                                    amount: amount,
                                    recipientId: recipientFound.id,
                                    recipientName: recipientFound.username,
                                    status: 'completed',
                                    timestamp: firebase.database.ServerValue.TIMESTAMP
                                };
                                
                                const sendTransactionKey = database.ref('transactions').push().key;
                                updates[`transactions/${sendTransactionKey}`] = sendTransaction;
                                
                                // تسجيل معاملة الاستلام للمستلم
                                const receiveTransaction = {
                                    userId: recipientFound.id,
                                    type: 'receive',
                                    amount: amount,
                                    senderId: currentUser.uid,
                                    senderName: currentUser.displayName || '',
                                    status: 'completed',
                                    timestamp: firebase.database.ServerValue.TIMESTAMP
                                };
                                
                                const receiveTransactionKey = database.ref('transactions').push().key;
                                updates[`transactions/${receiveTransactionKey}`] = receiveTransaction;
                                
                                return database.ref().update(updates);
                            });
                    })
                    .then(() => {
                        sendMoneyModal.style.display = 'none';
                        hideLoading();
                        showNotification('تم إرسال الأموال بنجاح');
                    })
                    .catch(error => {
                        hideLoading();
                        showNotification(error.message, 'error');
                    });
            });
        }

        // إعداد الإعدادات
        function setupSettings() {
            const settingsModal = document.getElementById('settings-modal');
            const settingsBtn = document.getElementById('settings-btn');
            const closeSettingsModal = settingsModal.querySelector('.close-modal');
            const settingsTabs = document.querySelectorAll('.settings-tab-btn');
            const settingsTabContents = document.querySelectorAll('.settings-tab-content');
            const whatsappSupport = document.getElementById('whatsapp-support');
            const changePasswordBtn = document.getElementById('change-password-btn');
            const changePasswordModal = document.getElementById('change-password-modal');
            const closeChangePasswordModal = changePasswordModal.querySelector('.close-modal');
            const submitPasswordChange = document.getElementById('submit-password-change');
            
            // فتح إغلاق نافذة الإعدادات
            settingsBtn.addEventListener('click', () => {
                settingsModal.style.display = 'flex';
            });
            
            closeSettingsModal.addEventListener('click', () => {
                settingsModal.style.display = 'none';
            });
            
            window.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.style.display = 'none';
                }
            });
            
            // أحداث تبويبات الإعدادات
            settingsTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.getAttribute('data-tab');
                    
                    settingsTabs.forEach(t => t.classList.remove('active'));
                    settingsTabContents.forEach(c => c.classList.remove('active'));
                    
                    tab.classList.add('active');
                    document.getElementById(`${tabId}-settings`).classList.add('active');
                });
            });
            
            // دعم واتساب
            whatsappSupport.addEventListener('click', () => {
                window.open('https://wa.me/201206622787', '_blank');
            });
            
            // تغيير كلمة المرور
            changePasswordBtn.addEventListener('click', () => {
                changePasswordModal.style.display = 'flex';
            });
            
            closeChangePasswordModal.addEventListener('click', () => {
                changePasswordModal.style.display = 'none';
            });
            
            submitPasswordChange.addEventListener('click', () => {
                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-new-password').value;
                
                if (!currentPassword || !newPassword || !confirmPassword) {
                    showNotification('يرجى ملء جميع الحقول', 'error');
                    return;
                }
                
                if (newPassword !== confirmPassword) {
                    showNotification('كلمتا المرور غير متطابقتين', 'error');
                    return;
                }
                
                showLoading();
                
                // إعادة المصادقة للمستخدم
                const credential = firebase.auth.EmailAuthProvider.credential(
                    currentUser.email,
                    currentPassword
                );
                
                currentUser.reauthenticateWithCredential(credential)
                    .then(() => {
                        return currentUser.updatePassword(newPassword);
                    })
                    .then(() => {
                        changePasswordModal.style.display = 'none';
                        hideLoading();
                        showNotification('تم تغيير كلمة المرور بنجاح');
                    })
                    .catch(error => {
                        hideLoading();
                        showNotification('حدث خطأ أثناء تغيير كلمة المرور: ' + error.message, 'error');
                    });
            });
            
            // حفظ إعدادات الملف الشخصي
            document.getElementById('save-profile-settings').addEventListener('click', () => {
                const username = document.getElementById('settings-username').value;
                const userHandle = document.getElementById('settings-user-handle').value;
                const status = document.getElementById('settings-status').value;
                const profilePic = document.getElementById('settings-profile-pic').files[0];
                
                if (!username || !userHandle) {
                    showNotification('يرجى ملء الحقول المطلوبة', 'error');
                    return;
                }
                
                showLoading();
                
                // تحميل الصورة إذا تم اختيارها
                const updateProfilePic = profilePic ? 
                    storage.ref('profilePics/' + currentUser.uid).put(profilePic).then(snapshot => snapshot.ref.getDownloadURL()) : 
                    Promise.resolve(null);
                
                updateProfilePic
                    .then(profilePicUrl => {
                        const updates = {};
                        
                        if (profilePicUrl) {
                            updates['profilePic'] = profilePicUrl;
                        }
                        
                        updates['username'] = username;
                        updates['handle'] = userHandle;
                        updates['status'] = status;
                        
                        return database.ref('users/' + currentUser.uid).update(updates);
                    })
                    .then(() => {
                        hideLoading();
                        settingsModal.style.display = 'none';
                        showNotification('تم حفظ التغييرات بنجاح');
                    })
                    .catch(error => {
                        hideLoading();
                        showNotification('حدث خطأ أثناء حفظ التغييرات: ' + error.message, 'error');
                    });
            });
        }

        // إعداد الدردشة
        function setupChat() {
            const attachmentBtn = document.getElementById('attachment-btn');
            const attachmentMenu = document.getElementById('attachment-menu');
            const fileInput = document.getElementById('file-input');
            const imageInput = document.getElementById('image-input');
            const audioInput = document.getElementById('audio-input');
            const messageInput = document.getElementById('message-input');
            const sendBtn = document.getElementById('send-btn');
            
            // فتح/إغلاق قائمة المرفقات
            attachmentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                attachmentMenu.classList.toggle('show');
            });
            
            // إغلاق قائمة المرفقات عند النقر خارجها
            window.addEventListener('click', () => {
                attachmentMenu.classList.remove('show');
            });
            
            // أحداث خيارات المرفقات
            document.querySelectorAll('.attachment-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const type = option.getAttribute('data-type');
                    
                    switch (type) {
                        case 'image':
                            imageInput.click();
                            break;
                        case 'audio':
                            audioInput.click();
                            break;
                        case 'file':
                            fileInput.click();
                            break;
                    }
                    
                    attachmentMenu.classList.remove('show');
                });
            });
            
            // اختيار صورة
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    uploadFile(file, 'image');
                }
            });
            
            // اختيار ملف صوتي
            audioInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    uploadFile(file, 'audio');
                }
            });
            
            // اختيار ملف
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    uploadFile(file, 'file');
                }
            });
            
            // رفع الملف إلى التخزين
            function uploadFile(file, type) {
                if (!currentChatFriend) {
                    showNotification('يرجى اختيار محادثة أولاً', 'error');
                    return;
                }
                
                showLoading();
                
                const filePath = `chat_files/${currentUser.uid}_${Date.now()}_${file.name}`;
                const storageRef = storage.ref(filePath);
                const uploadTask = storageRef.put(file);
                
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        // يمكنك إضافة شريط تقدم هنا إذا أردت
                    }, 
                    (error) => {
                        hideLoading();
                        showNotification('حدث خطأ أثناء رفع الملف: ' + error.message, 'error');
                    }, 
                    () => {
                        uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                            // إرسال الرسالة مع الملف
                            sendMessage('', type, {
                                url: downloadURL,
                                name: file.name,
                                size: file.size
                            });
                        });
                    }
                );
            }
            
            // إرسال رسالة عند الضغط على Enter
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            sendBtn.addEventListener('click', (e) => {
    e.preventDefault(); // هذا مهم جدًا لمنع الإرسال الافتراضي
    sendMessage();
});

            
            // وظيفة إرسال الرسالة
            function sendMessage(text = null, type = 'text', fileInfo = null) {
                if (!currentChatFriend) {
                    showNotification('يرجى اختيار محادثة أولاً', 'error');
                    return;
                }
                
                const messageText = text !== null ? text : messageInput.value.trim();
                
                if (!messageText && type === 'text') {
                    showNotification('لا يمكن إرسال رسالة فارغة', 'error');
                    return;
                }
                
                const newMessage = {
                    senderId: currentUser.uid,
                    receiverId: currentChatFriend.id,
                    text: messageText,
                    type: type,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    read: false
                };
                
                // إضافة معلومات الملف إذا كان موجودًا
                if (fileInfo) {
                    newMessage.fileUrl = fileInfo.url;
                    if (type === 'file') {
                        newMessage.fileName = fileInfo.name;
                        newMessage.fileSize = fileInfo.size;
                    }
                }
                
                // حفظ الرسالة في قاعدة البيانات
                const newMessageKey = database.ref('messages').push().key;
                const updates = {};
                updates[`messages/${newMessageKey}`] = newMessage;
                updates[`userMessages/${currentUser.uid}/${currentChatFriend.id}/${newMessageKey}`] = {
                    read: false,
                    timestamp: newMessage.timestamp
                };
                updates[`userMessages/${currentChatFriend.id}/${currentUser.uid}/${newMessageKey}`] = {
                    read: false,
                    timestamp: newMessage.timestamp
                };
                
                database.ref().update(updates)
                    .then(() => {
                        if (text === null) {
                            messageInput.value = '';
                        }
                        hideLoading();
                    })
                    .catch(error => {
                        hideLoading();
                        showNotification('حدث خطأ أثناء إرسال الرسالة: ' + error.message, 'error');
                    });
            }
        }

        // عرض شاشة التحميل
        function showLoading() {
            loadingOverlay.style.display = 'flex';
        }

        // إخفاء شاشة التحميل
        function hideLoading() {
            loadingOverlay.style.display = 'none';
        }
       