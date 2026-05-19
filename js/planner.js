// ── 플래너 모듈 ───────────────────────────────────────
const Planner = (() => {
  let editRoutine = null; // 현재 편집 중인 루틴

  // ── 루틴 목록 렌더링 ────────────────────────────────
  function renderRoutineList() {
    const list = document.getElementById('routineList');
    list.innerHTML = '';
    const routines = Routines.getAll();
    if (!routines.length) {
      list.innerHTML = '<div class="empty-state">저장된 루틴이 없습니다.<br>템플릿을 선택하거나 새로 만들어보세요.</div>';
      return;
    }
    routines.forEach(r => {
      const item = document.createElement('div');
      item.className = 'routine-item';
      const exCount = r.exercises.length;
      const setCount = r.exercises.reduce((s, e) => s + e.sets, 0);
      item.innerHTML =
        '<div class="routine-info">' +
          '<div class="routine-name">' + r.name + '</div>' +
          '<div class="routine-meta">' + exCount + '종목 · ' + setCount + '세트</div>' +
        '</div>' +
        '<div class="routine-actions">' +
          '<button class="routine-start-btn" data-id="' + r.id + '">시작</button>' +
          '<button class="routine-edit-btn" data-id="' + r.id + '">✏</button>' +
          '<button class="routine-del-btn" data-id="' + r.id + '">×</button>' +
        '</div>';
      item.querySelector('.routine-start-btn').onclick = () => startRoutine(r.id);
      item.querySelector('.routine-edit-btn').onclick = () => openRoutineEditor(r.id);
      item.querySelector('.routine-del-btn').onclick = () => {
        if (confirm('"' + r.name + '" 루틴을 삭제할까요?')) {
          Routines.delete(r.id); renderRoutineList();
        }
      };
      list.appendChild(item);
    });
  }

  // ── 템플릿 목록 렌더링 ──────────────────────────────
  function renderTemplateList() {
    const list = document.getElementById('tplPickList');
    list.innerHTML = '';
    TEMPLATES.forEach(t => {
      const item = document.createElement('div');
      item.className = 'tpl-pick-item';
      item.innerHTML =
        '<div><div class="tpl-name">' + t.name + '</div><div class="tpl-desc">' + t.desc + '</div></div>' +
        '<button class="tpl-use-btn">사용</button>';
      item.querySelector('.tpl-use-btn').onclick = () => {
        openRoutineEditor(null, {
          name: t.name, exercises: t.exercises.map(e => ({ ...e }))
        });
      };
      list.appendChild(item);
    });
  }

  // ── 루틴 시작 ──────────────────────────────────────
  function startRoutine(id) {
    const r = Routines.getAll().find(r => r.id === id);
    if (!r) return;
    Timer.startSession(r.exercises, r.name);
    App.switchTab('timer');
  }

  let isSessionEdit = false; // 타이머 탭에서 열었는지 여부

  // ── 루틴 에디터 열기 ────────────────────────────────
  function openRoutineEditor(id = null, preset = null, fromTimer = false) {
    isSessionEdit = fromTimer;
    if (id) {
      editRoutine = JSON.parse(JSON.stringify(Routines.getAll().find(r => r.id === id)));
    } else if (preset) {
      editRoutine = { id: Routines.genId(), name: preset.name, exercises: preset.exercises.map(e => ({ name: e.name, sets: e.sets || 3 })) };
    } else {
      editRoutine = { id: Routines.genId(), name: '', exercises: [] };
    }
    document.getElementById('editorRoutineName').value = editRoutine.name;
    document.getElementById('applyToSessionBtn').style.display = fromTimer ? 'block' : 'none';
    document.querySelector('#routineEditorSheet .sheet-title').textContent = fromTimer ? '현재 운동 편집' : '루틴 편집';
    renderEditorExList();
    openSheet('routineEditorSheet');
  }

  function renderEditorExList() {
    const list = document.getElementById('editorExList');
    list.innerHTML = '';
    editRoutine.exercises.forEach((ex, i) => {
      const item = document.createElement('div');
      item.className = 'editor-ex-item';
      item.innerHTML =
        '<span class="editor-ex-num">' + (i+1) + '</span>' +
        '<input class="editor-ex-name" type="text" value="' + ex.name + '" placeholder="종목명">' +
        '<input class="editor-ex-sets" type="number" min="1" max="10" value="' + ex.sets + '" title="세트 수">' +
        '<span class="editor-ex-sets-label">세트</span>' +
        '<div class="sheet-move-btns">' +
          '<button class="sheet-move-btn" ' + (i===0?'disabled':'') + '>▲</button>' +
          '<button class="sheet-move-btn" ' + (i===editRoutine.exercises.length-1?'disabled':'') + '>▼</button>' +
        '</div>' +
        '<button class="sheet-del-btn">×</button>';
      const nameInput = item.querySelector('.editor-ex-name');
      nameInput.oninput = () => { editRoutine.exercises[i].name = nameInput.value; };
      const setsInput = item.querySelector('.editor-ex-sets');
      setsInput.oninput = () => { editRoutine.exercises[i].sets = parseInt(setsInput.value) || 1; };
      const [upBtn, dnBtn] = item.querySelectorAll('.sheet-move-btn');
      upBtn.onclick = () => { [editRoutine.exercises[i-1], editRoutine.exercises[i]] = [editRoutine.exercises[i], editRoutine.exercises[i-1]]; renderEditorExList(); };
      dnBtn.onclick = () => { [editRoutine.exercises[i], editRoutine.exercises[i+1]] = [editRoutine.exercises[i+1], editRoutine.exercises[i]]; renderEditorExList(); };
      item.querySelector('.sheet-del-btn').onclick = () => { editRoutine.exercises.splice(i, 1); renderEditorExList(); };
      list.appendChild(item);
    });
  }

  function saveEditRoutine() {
    const name = document.getElementById('editorRoutineName').value.trim();
    if (!name) { alert('루틴 이름을 입력해주세요.'); return; }
    const exs = editRoutine.exercises.filter(e => e.name.trim() !== '');
    if (!exs.length) { alert('종목을 1개 이상 입력해주세요.'); return; }
    editRoutine.name = name;
    editRoutine.exercises = exs;
    editRoutine.updatedAt = new Date().toISOString().slice(0,10);
    Routines.save(editRoutine);
    closeSheet('routineEditorSheet');
    renderRoutineList();
  }

  function addEditorEx() {
    editRoutine.exercises.push({ name: '', sets: 3 });
    renderEditorExList();
    const inputs = document.querySelectorAll('.editor-ex-name');
    if (inputs.length) inputs[inputs.length-1].focus();
  }

  // ── JSON 플래너 불러오기 ────────────────────────────
  function loadPlannerJSON() {
    const raw = document.getElementById('plannerInput').value.trim();
    const msg = document.getElementById('plannerMsg');
    msg.textContent = ''; msg.className = 'planner-msg';
    if (!raw) { msg.textContent = 'JSON을 붙여넣어 주세요.'; msg.className = 'planner-msg err'; return; }
    let parsed;
    try { parsed = JSON.parse(raw); } catch { msg.textContent = '올바른 JSON 형식이 아닙니다.'; msg.className = 'planner-msg err'; return; }
    if (!Array.isArray(parsed.exercises) || !parsed.exercises.length) {
      msg.textContent = 'exercises 항목이 없거나 비어 있습니다.'; msg.className = 'planner-msg err'; return;
    }
    const exs = parsed.exercises
      .map(e => ({ name: (e.name || '').trim(), sets: parseInt(e.sets) || 3 }))
      .filter(e => e.name !== '');
    if (!exs.length) { msg.textContent = '유효한 종목명이 없습니다.'; msg.className = 'planner-msg err'; return; }
    openRoutineEditor(null, { name: parsed.label || '플래너', exercises: exs });
    document.getElementById('plannerInput').value = '';
    msg.textContent = '✓ ' + exs.length + '개 종목 불러오기 완료. 에디터에서 확인 후 저장하세요.';
    msg.className = 'planner-msg ok';
  }

  // ── Claude AI 플래너 ────────────────────────────────
  async function callClaudePlanner() {
    const btn = document.getElementById('aiPlanBtn');
    const prompt = document.getElementById('aiPromptInput').value.trim();
    const msg = document.getElementById('aiMsg');
    const apiKey = Settings.claudeApiKey;

    if (!apiKey) { msg.textContent = '설정에서 Claude API 키를 입력해주세요.'; msg.className = 'planner-msg err'; return; }
    if (!prompt) { msg.textContent = '운동 요청을 입력해주세요. (예: 상체 덤벨 30분)'; msg.className = 'planner-msg err'; return; }

    btn.disabled = true; btn.textContent = '생성 중...';
    msg.textContent = ''; msg.className = 'planner-msg';

    const systemPrompt = `당신은 운동 전문가입니다. 사용자의 요청에 맞는 운동 루틴을 다음 JSON 형식으로만 응답하세요.
{"label":"루틴 이름","exercises":[{"name":"종목명","sets":3},...]}`

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || resp.statusText);
      }
      const data = await resp.json();
      const text = data.content?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('JSON 파싱 실패');
      document.getElementById('plannerInput').value = match[0];
      loadPlannerJSON();
    } catch (e) {
      msg.textContent = '오류: ' + e.message; msg.className = 'planner-msg err';
    } finally {
      btn.disabled = false; btn.textContent = 'AI 루틴 생성';
    }
  }

  // ── 바텀시트 헬퍼 ──────────────────────────────────
  function openSheet(id) {
    document.getElementById(id + 'Overlay').classList.add('open');
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSheet(id) {
    document.getElementById(id + 'Overlay').classList.remove('open');
    document.getElementById(id).classList.remove('open');
    document.body.style.overflow = '';
  }

  function applyToSession() {
    const name = document.getElementById('editorRoutineName').value.trim() || Session.routineName;
    const exs = editRoutine.exercises.filter(e => e.name.trim() !== '');
    if (!exs.length) { alert('종목을 1개 이상 입력해주세요.'); return; }
    Timer.startSession(exs, name);
    closeSheet('routineEditorSheet');
  }

  return {
    renderRoutineList, renderTemplateList,
    openRoutineEditor, saveEditRoutine, addEditorEx, applyToSession,
    loadPlannerJSON, callClaudePlanner,
    openSheet, closeSheet,
  };
})();
