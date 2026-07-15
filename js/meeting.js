/* ═══════════════════════════════════════════════════════════
   ماژول جلسات مجازی آرا
   مشابه Google Meet — ویدیو، چت، اشتراک‌گذاری
   ═══════════════════════════════════════════════════════════ */

var Meeting = (function(){

  var STORAGE_KEY = 'aora_meetings';
  var COLORS = ['#e91e63','#9c27b0','#673ab7','#3f51b5','#2196f3','#009688','#4caf50','#ff9800','#ff5722','#795548'];

  function getColor(name){
    var hash = 0;
    for(var i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return COLORS[Math.abs(hash) % COLORS.length];
  }

  function getInitials(name){
    var parts = name.trim().split(' ');
    if(parts.length >= 2) return parts[0].charAt(0) + parts[1].charAt(0);
    return name.charAt(0) + (name.charAt(1) || '');
  }

  function generateCode(){
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var code = '';
    for(var i = 0; i < 10; i++){
      if(i === 3 || i === 6) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function getAll(){
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }

  function save(meetings){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
  }

  function createMeeting(data){
    var meeting = {
      id: 'mt_' + Date.now(),
      title: data.title || 'جلسه جدید',
      code: generateCode(),
      host: data.host || 'میزبان',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      scheduledAt: data.scheduledAt || null,
      participants: [],
      maxParticipants: data.maxParticipants || 100,
      settings: {
        muteOnJoin: true,
        disableChat: false,
        lockRoom: false,
        password: data.password || ''
      }
    };
    var meetings = getAll();
    meetings.unshift(meeting);
    save(meetings);
    return meeting;
  }

  function getById(id){
    return getAll().find(function(m){ return m.id === id; });
  }

  function getByCode(code){
    return getAll().find(function(m){ return m.code === code; });
  }

  function updateMeeting(id, data){
    var meetings = getAll();
    var idx = meetings.findIndex(function(m){ return m.id === id; });
    if(idx >= 0){ Object.assign(meetings[idx], data); save(meetings); return meetings[idx]; }
    return null;
  }

  function deleteMeeting(id){
    save(getAll().filter(function(m){ return m.id !== id; }));
  }

  // ── شرکت‌کنندگان شبیه‌سازی‌شده ──
  var simulatedUsers = [
    { name: 'دکتر سارا احمدی', role: 'میزبان' },
    { name: 'علی محمدی', role: 'شرکت‌کننده' },
    { name: 'نیلوفر رضایی', role: 'شرکت‌کننده' },
    { name: 'محمد حسینی', role: 'شرکت‌کننده' },
    { name: 'زهرا کریمی', role: 'شرکت‌کننده' }
  ];

  var chatMessages = [
    { sender: 'دکتر سارا احمدی', text: 'سلام به همه خوش آمدید', time: '14:01' },
    { sender: 'علی محمدی', text: 'سلام استاد ممنون', time: '14:01' },
    { sender: 'نیلوفر رضایی', text: 'سلام وقت بخیر', time: '14:02' },
    { sender: 'دکتر سارا احمدی', text: 'جلسه امروز درباره مبانی توالی‌یابی DNA هست', time: '14:03' },
    { sender: 'محمد حسینی', text: 'آیا فایل اسلایدها را می‌توانید به اشتراک بگذارید؟', time: '14:05' }
  ];

  return {
    getAll: getAll,
    getById: getById,
    getByCode: getByCode,
    create: createMeeting,
    update: updateMeeting,
    delete: deleteMeeting,
    generateCode: generateCode,
    getColor: getColor,
    getInitials: getInitials,
    simulatedUsers: simulatedUsers,
    chatMessages: chatMessages
  };

})();