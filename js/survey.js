/* ═══════════════════════════════════════════════════════════
   ماژول نظرسنجی‌ساز آرا
   مشابه پرسلاین — ساخت، مشاهده، تحلیل
   ═══════════════════════════════════════════════════════════ */

var Survey = (function(){

  /* ── ذخیره‌سازی ── */
  var STORAGE_KEY = 'aora_surveys';
  var RESPONSES_KEY = 'aora_survey_responses';

  function getAll(){
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }

  function save(surveys){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
  }

  function getById(id){
    return getAll().find(function(s){ return s.id === id; });
  }

  function getResponses(surveyId){
    var all = JSON.parse(localStorage.getItem(RESPONSES_KEY) || '{}');
    return all[surveyId] || [];
  }

  function saveResponse(surveyId, answers){
    var all = JSON.parse(localStorage.getItem(RESPONSES_KEY) || '{}');
    if(!all[surveyId]) all[surveyId] = [];
    all[surveyId].push({ answers: answers, date: new Date().toISOString(), id: 'r_' + Date.now() });
    localStorage.setItem(RESPONSES_KEY, JSON.stringify(all));
  }

  /* ── ایجاد نظرسنجی جدید ── */
  function createSurvey(data){
    var survey = {
      id: 'sv_' + Date.now(),
      title: data.title || 'نظرسنجی بدون عنوان',
      description: data.description || '',
      questions: data.questions || [],
      status: 'active',
      createdAt: new Date().toISOString(),
      settings: data.settings || { requireLogin: false, allowMultiple: false, showResults: true }
    };
    var surveys = getAll();
    surveys.unshift(survey);
    save(surveys);
    return survey;
  }

  function updateSurvey(id, data){
    var surveys = getAll();
    var idx = surveys.findIndex(function(s){ return s.id === id; });
    if(idx >= 0){
      Object.assign(surveys[idx], data);
      save(surveys);
      return surveys[idx];
    }
    return null;
  }

  function deleteSurvey(id){
    var surveys = getAll().filter(function(s){ return s.id !== id; });
    save(surveys);
  }

  /* ── ساخت HTML نمایش سوال ── */
  function renderQuestionView(q, index){
    var html = '<div class="view-question" data-qid="' + q.id + '">';
    html += '<h3>' + (index + 1) + '. ' + q.text;
    if(q.required) html += ' <span class="q-required-star">*</span>';
    html += '</h3>';

    switch(q.type){
      case 'text':
        html += '<input type="text" name="q_' + q.id + '" placeholder="پاسخ خود را بنویسید...">';
        break;
      case 'textarea':
        html += '<textarea name="q_' + q.id + '" rows="3" placeholder="پاسخ تفصیلی..."></textarea>';
        break;
      case 'email':
        html += '<input type="email" name="q_' + q.id + '" placeholder="email@example.com" style="direction:ltr;text-align:left">';
        break;
      case 'number':
        html += '<input type="number" name="q_' + q.id + '" placeholder="عدد">';
        break;
      case 'radio':
        (q.options || []).forEach(function(opt, i){
          html += '<label class="radio-option"><input type="radio" name="q_' + q.id + '" value="' + i + '"> <span>' + opt + '</span></label>';
        });
        break;
      case 'checkbox':
        (q.options || []).forEach(function(opt, i){
          html += '<label class="checkbox-option"><input type="checkbox" name="q_' + q.id + '" value="' + i + '"> <span>' + opt + '</span></label>';
        });
        break;
      case 'select':
        html += '<select name="q_' + q.id + '" style="width:100%;padding:.6rem;background:var(--bg-deep);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font-fa);outline:none">';
        html += '<option value="">انتخاب کنید...</option>';
        (q.options || []).forEach(function(opt, i){
          html += '<option value="' + i + '">' + opt + '</option>';
        });
        html += '</select>';
        break;
      case 'rating':
        html += '<div class="star-rating" data-qid="' + q.id + '">';
        for(var s = 1; s <= 5; s++){
          html += '<span class="star" data-value="' + s + '">★</span>';
        }
        html += '<input type="hidden" name="q_' + q.id + '">';
        html += '</div>';
        break;
      case 'scale':
        html += '<div class="scale-row">';
        var min = q.min || 1, max = q.max || 10;
        for(var n = min; n <= max; n++){
          html += '<div class="scale-num" data-value="' + n + '">' + n + '</div>';
        }
        html += '<input type="hidden" name="q_' + q.id + '">';
        html += '</div>';
        if(q.minLabel || q.maxLabel){
          html += '<div style="display:flex;justify-content:space-between;font-size:.65rem;color:var(--text-muted);margin-top:.35rem">';
          html += '<span>' + (q.minLabel || '') + '</span><span>' + (q.maxLabel || '') + '</span></div>';
        }
        break;
      case 'date':
        html += '<input type="date" name="q_' + q.id + '">';
        break;
      case 'file':
        html += '<input type="file" name="q_' + q.id + '" style="font-size:.78rem;color:var(--text-muted)">';
        break;
    }
    html += '</div>';
    return html;
  }

  /* ── تحلیل نتایج ── */
  function analyzeResults(survey){
    var responses = getResponses(survey.id);
    var results = {};

    survey.questions.forEach(function(q){
      results[q.id] = { question: q.text, type: q.type, total: 0, data: {} };

      responses.forEach(function(resp){
        var answer = resp.answers[q.id];
        if(answer === undefined || answer === '' || answer === null) return;
        results[q.id].total++;

        if(q.type === 'radio' || q.type === 'select'){
          var optText = q.options[parseInt(answer)] || answer;
          results[q.id].data[optText] = (results[q.id].data[optText] || 0) + 1;
        }
        else if(q.type === 'checkbox'){
          (Array.isArray(answer) ? answer : [answer]).forEach(function(a){
            var optText = q.options[parseInt(a)] || a;
            results[q.id].data[optText] = (results[q.id].data[optText] || 0) + 1;
          });
        }
        else if(q.type === 'rating' || q.type === 'scale'){
          var val = String(answer);
          results[q.id].data[val] = (results[q.id].data[val] || 0) + 1;
          if(!results[q.id]._sum) results[q.id]._sum = 0;
          results[q.id]._sum += parseInt(answer);
        }
        else{
          results[q.id].data['answers'] = results[q.id].data['answers'] || [];
          results[q.id].data['answers'].push(answer);
        }
      });

      // محاسبه میانگین برای rating/scale
      if((q.type === 'rating' || q.type === 'scale') && results[q.id].total > 0){
        results[q.id].average = (results[q.id]._sum / results[q.id].total).toFixed(1);
      }
    });

    return { responses: responses, results: results, total: responses.length };
  }

  /* ── رندر نتایج ── */
  function renderResults(survey){
    var analysis = analyzeResults(survey);
    var html = '';

    // آمار کلی
    html += '<div class="stats-row">';
    html += '<div class="stat-card"><div class="num">' + analysis.total + '</div><div class="label">کل پاسخ‌ها</div></div>';
    html += '<div class="stat-card"><div class="num">' + survey.questions.length + '</div><div class="label">تعداد سوالات</div></div>';
    html += '<div class="stat-card"><div class="num">' + (analysis.total > 0 ? Math.round(analysis.total / survey.questions.length) : 0) + '</div><div class="label">میانگین پاسخ</div></div>';
    html += '</div>';

    // نتایج هر سوال
    var colors = ['', 'gold', 'green', 'blue'];
    survey.questions.forEach(function(q, qi){
      var r = analysis.results[q.id];
      html += '<div class="result-card">';
      html += '<h3>' + (qi + 1) + '. ' + r.question + '</h3>';

      if(r.type === 'radio' || r.type === 'checkbox' || r.type === 'select'){
        var entries = Object.entries(r.data);
        if(entries.length === 0){
          html += '<p style="font-size:.78rem;color:var(--text-muted)">هنوز پاسخی ثبت نشده.</p>';
        } else {
          entries.forEach(function(entry){
            var pct = r.total > 0 ? Math.round((entry[1] / r.total) * 100) : 0;
            html += '<div class="result-bar">';
            html += '<div class="bar-label"><span>' + entry[0] + '</span><span>' + entry[1] + ' (' + pct + '%)</span></div>';
            html += '<div class="bar-track"><div class="bar-fill ' + (colors[qi % colors.length]) + '" style="width:' + pct + '%"></div></div>';
            html += '</div>';
          });
        }
      }
      else if(r.type === 'rating' || r.type === 'scale'){
        html += '<div style="text-align:center;padding:1rem">';
        html += '<div style="font-size:2.5rem;font-weight:700;color:var(--accent);font-family:var(--font-mono);direction:ltr">' + (r.average || '—') + '</div>';
        html += '<div style="font-size:.72rem;color:var(--text-muted);margin-top:.25rem">از ' + (q.max || (r.type === 'rating' ? 5 : 10)) + ' — ' + r.total + ' پاسخ</div>';
        html += '</div>';
      }
      else{
        var answers = r.data['answers'] || [];
        if(answers.length === 0){
          html += '<p style="font-size:.78rem;color:var(--text-muted)">هنوز پاسخی ثبت نشده.</p>';
        } else {
          html += '<div style="max-height:200px;overflow-y:auto">';
          answers.slice(-10).reverse().forEach(function(a){
            html += '<div style="padding:.5rem;background:var(--bg-deep);border-radius:var(--radius-sm);margin-bottom:.35rem;font-size:.78rem;color:var(--text-body)">' + a + '</div>';
          });
          html += '</div>';
          if(answers.length > 10) html += '<p style="font-size:.65rem;color:var(--text-muted);margin-top:.5rem">و ' + (answers.length - 10) + ' پاسخ دیگر...</p>';
        }
      }

      html += '</div>';
    });

    return html;
  }

  /* ── فیلدهای قابل انتخاب ── */
  var fieldTypes = [
    { type: 'text', icon: '✏️', name: 'متن کوتاه', group: 'متنی' },
    { type: 'textarea', icon: '📝', name: 'متن بلند', group: 'متنی' },
    { type: 'email', icon: '📧', name: 'ایمیل', group: 'متنی' },
    { type: 'number', icon: '🔢', name: 'عدد', group: 'متنی' },
    { type: 'radio', icon: '◉', name: 'تک‌انتخابی', group: 'انتخابی' },
    { type: 'checkbox', icon: '☑️', name: 'چندانتخابی', group: 'انتخابی' },
    { type: 'select', icon: '▼', name: 'لیست کشویی', group: 'انتخابی' },
    { type: 'rating', icon: '⭐', name: 'امتیاز ستاره', group: 'مقیاس' },
    { type: 'scale', icon: '📊', name: 'مقیاس عددی', group: 'مقیاس' },
    { type: 'date', icon: '📅', name: 'تاریخ', group: 'متفرقه' },
    { type: 'file', icon: '📎', name: 'فایل پیوست', group: 'متفرقه' }
  ];

  /* ── API عمومی ── */
  return {
    getAll: getAll,
    getById: getById,
    create: createSurvey,
    update: updateSurvey,
    delete: deleteSurvey,
    getResponses: getResponses,
    saveResponse: saveResponse,
    analyzeResults: analyzeResults,
    renderResults: renderResults,
    renderQuestionView: renderQuestionView,
    fieldTypes: fieldTypes
  };

})();